import { supabase } from '../../lib/supabase'
import { sendPushNotifications } from '../push/push.provider'
import { sendEmail, buildReminderEmailHtml } from '../email/email.provider'
import { sendTelegramMessage } from '../telegram/telegram.provider'
import { getActiveTokensForUser } from '../devices/devices.service'
import { getVerifiedChatId } from '../channels/channels.service'
import type { Reminder } from '@takenotes/shared'
import { ReminderChannel } from '@takenotes/shared'
import { env } from '../../config/env'
import { logger } from '../../lib/logger'

export interface DeliveryContext {
  reminder: Reminder
  reminderJobId: string
  jobKey: string
}

export async function orchestrateDelivery(ctx: DeliveryContext): Promise<void> {
  const { reminder, reminderJobId, jobKey } = ctx
  const channels = reminder.deliveryPolicy.channels

  // NOTE: never log reminder.deliveryPolicy raw — it could contain channel configuration details.
  // We only log reminder_id, job context, and channel names (not tokens or credentials).
  const deliveryLog = logger.child({
    reminder_id: reminder.id,
    reminder_job_id: reminderJobId,
    job_key: jobKey,
  })

  for (const channel of channels) {
    const idempotencyKey = `${jobKey}:${channel}`
    const channelLog = deliveryLog.child({ channel_type: channel, idempotency_key: idempotencyKey })

    // Idempotency check
    const { data: existing } = await supabase
      .from('reminder_delivery_logs')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing?.status === 'sent') {
      channelLog.info('Skipping duplicate send — already delivered for this idempotency key')
      continue
    }

    const logBase = {
      reminder_id: reminder.id,
      reminder_job_id: reminderJobId,
      user_id: reminder.userId,
      channel,
      status: 'pending',
      idempotency_key: idempotencyKey,
    }

    const { data: logRecord } = await supabase
      .from('reminder_delivery_logs')
      .upsert(logBase, { onConflict: 'idempotency_key' })
      .select('id')
      .single()

    try {
      let success = false
      let providerMessageId: string | undefined
      let errorMessage: string | undefined

      channelLog.info('Attempting delivery')

      if (channel === ReminderChannel.Push) {
        // Do NOT log individual push tokens — they are device credentials
        const tokens = await getActiveTokensForUser(reminder.userId)
        if (!tokens.length) {
          channelLog.warn('No active push tokens for user — skipping')
          await updateLog(logRecord?.id, 'skipped', undefined, 'No active device tokens')
          continue
        }
        const results = await sendPushNotifications({
          userId: reminder.userId,
          tokens,
          title: reminder.title,
          body: reminder.description ?? `Due: ${new Date(reminder.dueAt).toLocaleString()}`,
          data: { reminderId: reminder.id, screen: 'reminder-detail' },
        })
        success = results.some((r) => r.success)
        providerMessageId = results.find((r) => r.ticketId)?.ticketId
        errorMessage = results.filter((r) => !r.success).map((r) => r.error).join('; ') || undefined

      } else if (channel === ReminderChannel.Email) {
        const { data: profile } = await supabase.from('users').select('email').eq('id', reminder.userId).single()
        const toEmail = profile?.email
        if (!toEmail) {
          channelLog.warn('No email on user profile — skipping')
          await updateLog(logRecord?.id, 'skipped', undefined, 'No email on profile')
          continue
        }
        // NOTE: toEmail is not logged — it is PII
        const deepLink = `${env.APP_DEEP_LINK_BASE}reminders/${reminder.id}`
        const html = buildReminderEmailHtml({ title: reminder.title, dueAt: reminder.dueAt, description: reminder.description, deepLink })
        const result = await sendEmail({ toEmail, subject: `Reminder: ${reminder.title}`, html })
        success = result.success
        providerMessageId = result.messageId
        errorMessage = result.error

      } else if (channel === ReminderChannel.Telegram) {
        // Do NOT log chat_id — it is a Telegram user identifier
        const chatId = await getVerifiedChatId(reminder.userId)
        if (!chatId) {
          channelLog.warn('No verified Telegram connection for user — skipping')
          await updateLog(logRecord?.id, 'skipped', undefined, 'No verified Telegram connection')
          continue
        }
        const text = `🔔 *${escapeMarkdown(reminder.title)}*\n` +
          (reminder.description ? `${escapeMarkdown(reminder.description)}\n` : '') +
          `⏰ Due: ${new Date(reminder.dueAt).toLocaleString()}`
        const result = await sendTelegramMessage({ chatId, text })
        success = result.success
        providerMessageId = result.messageId?.toString()
        errorMessage = result.error
      }

      await updateLog(logRecord?.id, success ? 'sent' : 'failed', providerMessageId, errorMessage)
      channelLog.info({ success, has_error: !!errorMessage }, 'Delivery attempt completed')

      if (!success && errorMessage) throw new Error(`${channel} delivery failed: ${errorMessage}`)

    } catch (err) {
      await updateLog(logRecord?.id, 'failed', undefined, (err as Error).message)
      channelLog.error({ err_message: (err as Error).message }, 'Delivery channel attempt failed')
      throw err
    }
  }
}

async function updateLog(id: string | undefined, status: string, providerMessageId?: string, errorMessage?: string) {
  if (!id) return
  await supabase.from('reminder_delivery_logs').update({
    status,
    provider_message_id: providerMessageId ?? null,
    error_message: errorMessage ?? null,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    attempted_at: new Date().toISOString(),
  }).eq('id', id)
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}

import { env } from '../../config/env'

export interface TelegramMessagePayload {
  chatId: string
  text: string
  parseMode?: 'Markdown' | 'HTML'
}

export interface TelegramResult {
  success: boolean
  messageId?: number
  error?: string
}

/**
 * Send a message via Telegram Bot API.
 */
export async function sendTelegramMessage(payload: TelegramMessagePayload): Promise<TelegramResult> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set — skipping')
    return { success: false, error: 'Telegram not configured' }
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: payload.chatId,
      text: payload.text,
      parse_mode: payload.parseMode ?? 'Markdown',
    }),
  })

  const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string }
  if (!data.ok) {
    return { success: false, error: data.description ?? 'Telegram API error' }
  }

  return { success: true, messageId: data.result?.message_id }
}

/**
 * Set the webhook URL for the Telegram bot.
 * Call once during deployment setup.
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) return false

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`
  const params = new URLSearchParams({ url: webhookUrl })
  if (env.TELEGRAM_WEBHOOK_SECRET) params.set('secret_token', env.TELEGRAM_WEBHOOK_SECRET)

  const response = await fetch(`${url}?${params}`)
  const data = await response.json() as { ok: boolean }
  return data.ok
}

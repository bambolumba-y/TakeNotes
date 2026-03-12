import type { FastifyRequest, FastifyReply } from 'fastify'
import {
  initiateTelegramConnect, getTelegramConnectionStatus,
  disconnectTelegram, verifyTelegramConnection,
} from './channels.service'
import { env } from '../../config/env'

export async function telegramConnectHandler(req: FastifyRequest, reply: FastifyReply) {
  const result = await initiateTelegramConnect(req.user!.id)
  return reply.send({
    success: true,
    data: {
      verificationToken: result.verificationToken,
      botLink: `https://t.me/${result.botUsername}?start=${result.verificationToken}`,
      instructions: `Open Telegram and send /start ${result.verificationToken} to @${result.botUsername}`,
    },
  })
}

export async function telegramStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const connection = await getTelegramConnectionStatus(req.user!.id)
  return reply.send({ success: true, data: { connected: !!connection, connection } })
}

export async function telegramDisconnectHandler(req: FastifyRequest, reply: FastifyReply) {
  await disconnectTelegram(req.user!.id)
  return reply.send({ success: true })
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; username?: string; first_name?: string }
    chat: { id: number }
    text?: string
  }
}

export async function telegramWebhookHandler(req: FastifyRequest, reply: FastifyReply) {
  // Verify webhook secret header
  const secretHeader = (req.headers['x-telegram-bot-api-secret-token'] as string) ?? ''
  if (env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    return reply.status(403).send({ error: 'Forbidden' })
  }

  const update = req.body as TelegramUpdate
  const message = update.message
  if (!message?.text) return reply.send({ ok: true })

  const text = message.text.trim()
  const chatId = String(message.chat.id)
  const telegramUserId = String(message.from?.id ?? '')
  const username = message.from?.username

  if (text.startsWith('/start ')) {
    const token = text.slice(7).trim()
    if (token) {
      const verified = await verifyTelegramConnection({ verificationToken: token, chatId, telegramUserId, username })
      if (verified) {
        // Send confirmation message back to user
        const botToken = env.TELEGRAM_BOT_TOKEN
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '✅ Connected! You will now receive TakeNotes reminders here.' }),
          })
        }
      }
    }
  }

  return reply.send({ ok: true })
}

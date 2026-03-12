import { env } from '../../config/env'

export interface PushPayload {
  userId: string
  tokens: string[]
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface PushResult {
  success: boolean
  ticketId?: string
  error?: string
  token: string
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

/**
 * Send push notifications via Expo Push API.
 * Sends to all active device tokens for the user.
 */
export async function sendPushNotifications(payload: PushPayload): Promise<PushResult[]> {
  if (!payload.tokens.length) return []

  const messages = payload.tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: 'default',
  }))

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  }

  if (env.EXPO_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${env.EXPO_ACCESS_TOKEN}`
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Expo Push API error ${response.status}: ${text}`)
  }

  const result = await response.json() as { data: ExpoPushTicket[] }
  const tickets = Array.isArray(result.data) ? result.data : [result.data]

  return payload.tokens.map((token, i) => {
    const ticket = tickets[i]
    if (ticket?.status === 'ok') {
      return { success: true, ticketId: ticket.id, token }
    }
    return { success: false, error: ticket?.message ?? 'Unknown error', token }
  })
}

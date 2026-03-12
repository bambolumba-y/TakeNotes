import { apiFetch } from '../lib/api'

export interface TelegramConnectResponse {
  verificationToken: string
  botLink: string
  instructions: string
}

export interface TelegramStatus {
  connected: boolean
  connection: { id: string; username?: string; telegram_user_id?: string } | null
}

export const channelsService = {
  telegramConnect: () =>
    apiFetch<{ success: true; data: TelegramConnectResponse }>('/integrations/telegram/connect', { method: 'POST' })
      .then((r) => r.data),
  telegramStatus: () =>
    apiFetch<{ success: true; data: TelegramStatus }>('/integrations/telegram/status')
      .then((r) => r.data),
  telegramDisconnect: () =>
    apiFetch('/integrations/telegram/disconnect', { method: 'POST' }),
}

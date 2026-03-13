import { supabase } from '../../lib/supabase'
import { env } from '../../config/env'
import crypto from 'node:crypto'

function generateVerificationToken(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase() // e.g. "A3F9C2B1"
}

export async function initiateTelegramConnect(userId: string): Promise<{ verificationToken: string; botUsername: string }> {
  const verificationToken = generateVerificationToken()

  // Remove any existing unverified connections
  await supabase.from('telegram_connections')
    .delete()
    .eq('user_id', userId)
    .eq('is_verified', false)

  const { error } = await supabase.from('telegram_connections').insert({
    user_id: userId,
    verification_token: verificationToken,
    is_verified: false,
  })

  if (error) throw new Error(error.message)

  const botUsername = env.TELEGRAM_BOT_USERNAME
  return { verificationToken, botUsername }
}

export async function getTelegramConnectionStatus(userId: string) {
  const { data } = await supabase.from('telegram_connections')
    .select('id, is_verified, username, telegram_user_id')
    .eq('user_id', userId)
    .eq('is_verified', true)
    .maybeSingle()

  return data ?? null
}

export async function disconnectTelegram(userId: string): Promise<void> {
  await supabase.from('telegram_connections').delete().eq('user_id', userId)
}

/**
 * Called from the Telegram webhook when a user sends /start <token>.
 * Server-side only — never trust client-provided chatId.
 */
export async function verifyTelegramConnection(opts: {
  verificationToken: string
  chatId: string
  telegramUserId: string
  username?: string
}): Promise<boolean> {
  const { data: pending } = await supabase.from('telegram_connections')
    .select('id, user_id')
    .eq('verification_token', opts.verificationToken)
    .eq('is_verified', false)
    .maybeSingle()

  if (!pending) return false

  // Invalidate any existing verified connection for this user
  await supabase.from('telegram_connections')
    .delete()
    .eq('user_id', pending.user_id)
    .eq('is_verified', true)

  const { error } = await supabase.from('telegram_connections')
    .update({
      chat_id: opts.chatId,
      telegram_user_id: opts.telegramUserId,
      username: opts.username ?? null,
      is_verified: true,
      verification_token: null,
    })
    .eq('id', pending.id)

  return !error
}

export async function getVerifiedChatId(userId: string): Promise<string | null> {
  const { data } = await supabase.from('telegram_connections')
    .select('chat_id')
    .eq('user_id', userId)
    .eq('is_verified', true)
    .maybeSingle()
  return data?.chat_id ?? null
}

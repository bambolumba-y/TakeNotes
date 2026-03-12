import { supabase } from '../../lib/supabase'

export async function registerDeviceToken(userId: string, input: {
  token: string; platform: string; appVersion?: string
}): Promise<{ id: string; token: string }> {
  // Deactivate existing tokens with the same value (device re-register)
  await supabase.from('device_tokens')
    .update({ is_active: false })
    .eq('token', input.token)
    .neq('user_id', userId)

  // Upsert by token value for this user
  const { data, error } = await supabase.from('device_tokens')
    .upsert({
      user_id: userId,
      token: input.token,
      platform: input.platform,
      app_version: input.appVersion ?? null,
      is_active: true,
    }, { onConflict: 'token' })
    .select('id, token')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Register failed')
  return data
}

export async function deactivateDeviceToken(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('device_tokens')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getActiveTokensForUser(userId: string): Promise<string[]> {
  const { data } = await supabase.from('device_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true)
  return (data ?? []).map((r: { token: string }) => r.token)
}

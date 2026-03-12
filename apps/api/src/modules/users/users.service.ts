import { supabase } from '../../lib/supabase'
import type { UpdateMeInput } from './users.schema'
import type { UserProfile } from '@takenotes/shared'

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return mapRow(data)
}

export async function upsertUserProfile(
  userId: string,
  email: string,
  defaults?: Partial<UpdateMeInput>,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { id: userId, email, ...toRow(defaults ?? {}) },
      { onConflict: 'id' },
    )
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to upsert profile: ${error?.message}`)
  return mapRow(data)
}

export async function updateUserProfile(
  userId: string,
  input: UpdateMeInput,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .update(toRow(input))
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to update profile: ${error?.message}`)
  return mapRow(data)
}

function toRow(input: Partial<UpdateMeInput>) {
  return {
    ...(input.displayName !== undefined && { display_name: input.displayName }),
    ...(input.timezone !== undefined && { timezone: input.timezone }),
    ...(input.locale !== undefined && { locale: input.locale }),
    ...(input.appearanceMode !== undefined && { appearance_mode: input.appearanceMode }),
  }
}

function mapRow(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    email: row.email as string,
    displayName: row.display_name as string | null,
    timezone: row.timezone as string,
    locale: row.locale as string,
    appearanceMode: row.appearance_mode as UserProfile['appearanceMode'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

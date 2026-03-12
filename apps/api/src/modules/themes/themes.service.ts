import { supabase } from '../../lib/supabase'
import type { ThemeEntity } from '@takenotes/shared'

function mapRow(r: Record<string,unknown>): ThemeEntity {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    color: r.color as string,
    icon: r.icon as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function listThemes(userId: string): Promise<ThemeEntity[]> {
  const { data, error } = await supabase.from('themes').select('*').eq('user_id', userId).order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function createTheme(userId: string, input: { name: string; color: string; icon: string }): Promise<ThemeEntity> {
  const { data, error } = await supabase.from('themes').insert({ user_id: userId, ...input }).select().single()
  if (error || !data) throw new Error(error?.message ?? 'Create failed')
  return mapRow(data)
}

export async function updateTheme(userId: string, id: string, input: Partial<{ name: string; color: string; icon: string }>): Promise<ThemeEntity> {
  const { data, error } = await supabase.from('themes').update(input).eq('id', id).eq('user_id', userId).select().single()
  if (error || !data) throw new Error(error?.message ?? 'Update failed')
  return mapRow(data)
}

export async function deleteTheme(userId: string, id: string): Promise<void> {
  // Deleting theme removes join records via cascade (note_themes has ON DELETE CASCADE on theme_id)
  const { error } = await supabase.from('themes').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

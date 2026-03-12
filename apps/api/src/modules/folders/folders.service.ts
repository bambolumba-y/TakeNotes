import { supabase } from '../../lib/supabase'
import type { Folder } from '@takenotes/shared'

function mapRow(r: Record<string,unknown>): Folder {
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

export async function listFolders(userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders').select('*').eq('user_id', userId).order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function createFolder(userId: string, input: { name: string; color: string; icon: string }): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders').insert({ user_id: userId, ...input }).select().single()
  if (error || !data) throw new Error(error?.message ?? 'Create failed')
  return mapRow(data)
}

export async function updateFolder(userId: string, id: string, input: Partial<{ name: string; color: string; icon: string }>): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders').update(input).eq('id', id).eq('user_id', userId).select().single()
  if (error || !data) throw new Error(error?.message ?? 'Update failed')
  return mapRow(data)
}

export async function deleteFolder(userId: string, id: string): Promise<void> {
  // null out folder_id in notes first
  await supabase.from('notes').update({ folder_id: null }).eq('folder_id', id).eq('user_id', userId)
  const { error } = await supabase.from('folders').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

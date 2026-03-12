import { supabase } from '../../lib/supabase'
import type { Note } from '@takenotes/shared'

function mapRow(r: Record<string, unknown>): Note {
  const folder = r.folders as { id: string; name: string; color: string; icon: string } | null
  const themes = (r.note_themes as Array<{ themes: { id: string; name: string; color: string; icon: string } }> ?? [])
    .map((nt) => nt.themes)

  return {
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    content: r.content as string,
    contentPlain: r.content_plain as string,
    folderId: r.folder_id as string | null,
    folder: folder ?? null,
    themes,
    isPinned: r.is_pinned as boolean,
    isArchived: r.is_archived as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    lastOpenedAt: r.last_opened_at as string | null,
  }
}

const NOTE_SELECT = `
  *,
  folders ( id, name, color, icon ),
  note_themes ( themes ( id, name, color, icon ) )
`

export async function listNotes(userId: string, query: {
  q?: string; folderId?: string; themeId?: string;
  archived?: string; sort?: string; order?: string
}): Promise<Note[]> {
  let q = supabase.from('notes').select(NOTE_SELECT).eq('user_id', userId)
    .eq('is_archived', query.archived === 'true')

  if (query.q) {
    q = q.or(`title.ilike.%${query.q}%,content_plain.ilike.%${query.q}%`)
  }
  if (query.folderId) q = q.eq('folder_id', query.folderId)

  const sortCol = query.sort ?? 'updated_at'
  const ascending = (query.order ?? 'desc') === 'asc'
  q = q.order(sortCol, { ascending })

  const { data, error } = await q
  if (error) throw new Error(error.message)

  let notes = (data ?? []).map(mapRow)

  // Theme filter applied post-query (join filter is complex in Supabase)
  if (query.themeId) {
    notes = notes.filter((n) => n.themes.some((t) => t.id === query.themeId))
  }

  return notes
}

export async function getNoteById(userId: string, id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes').select(NOTE_SELECT).eq('id', id).eq('user_id', userId).single()
  if (error || !data) return null
  // Update last_opened_at
  await supabase.from('notes').update({ last_opened_at: new Date().toISOString() }).eq('id', id)
  return mapRow(data)
}

export async function createNote(userId: string, input: {
  title: string; content: string; folderId?: string | null;
  themeIds?: string[]; isPinned?: boolean
}): Promise<Note> {
  // Verify folder ownership
  if (input.folderId) {
    const { data: folder } = await supabase.from('folders').select('id').eq('id', input.folderId).eq('user_id', userId).single()
    if (!folder) throw new Error('Folder not found or not owned by user')
  }

  const { data: note, error } = await supabase.from('notes').insert({
    user_id: userId,
    title: input.title,
    content: input.content,
    content_plain: input.content.replace(/<[^>]+>/g, ''),
    folder_id: input.folderId ?? null,
    is_pinned: input.isPinned ?? false,
  }).select('id').single()

  if (error || !note) throw new Error(error?.message ?? 'Create failed')

  // Attach themes
  if (input.themeIds?.length) {
    // Verify ownership
    const { data: ownedThemes } = await supabase.from('themes').select('id').in('id', input.themeIds).eq('user_id', userId)
    const ownedIds = (ownedThemes ?? []).map((t: { id: string }) => t.id)
    if (ownedIds.length) {
      await supabase.from('note_themes').insert(ownedIds.map((tid: string) => ({ note_id: note.id, theme_id: tid })))
    }
  }

  return (await getNoteById(userId, note.id))!
}

export async function updateNote(userId: string, id: string, input: {
  title?: string; content?: string; folderId?: string | null;
  themeIds?: string[]; isPinned?: boolean
}): Promise<Note> {
  if (input.folderId) {
    const { data: folder } = await supabase.from('folders').select('id').eq('id', input.folderId).eq('user_id', userId).single()
    if (!folder) throw new Error('Folder not found or not owned by user')
  }

  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) updateData.title = input.title
  if (input.content !== undefined) {
    updateData.content = input.content
    updateData.content_plain = input.content.replace(/<[^>]+>/g, '')
  }
  if ('folderId' in input) updateData.folder_id = input.folderId ?? null
  if (input.isPinned !== undefined) updateData.is_pinned = input.isPinned

  if (Object.keys(updateData).length) {
    const { error } = await supabase.from('notes').update(updateData).eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  if (input.themeIds !== undefined) {
    await supabase.from('note_themes').delete().eq('note_id', id)
    if (input.themeIds.length) {
      const { data: ownedThemes } = await supabase.from('themes').select('id').in('id', input.themeIds).eq('user_id', userId)
      const ownedIds = (ownedThemes ?? []).map((t: { id: string }) => t.id)
      if (ownedIds.length) {
        await supabase.from('note_themes').insert(ownedIds.map((tid: string) => ({ note_id: id, theme_id: tid })))
      }
    }
  }

  return (await getNoteById(userId, id))!
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function pinNote(userId: string, id: string, pin: boolean): Promise<Note> {
  const { error } = await supabase.from('notes').update({ is_pinned: pin }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (await getNoteById(userId, id))!
}

export async function archiveNote(userId: string, id: string): Promise<Note> {
  const { error } = await supabase.from('notes').update({ is_archived: true, is_pinned: false }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (await getNoteById(userId, id))!
}

export async function restoreNote(userId: string, id: string): Promise<Note> {
  const { error } = await supabase.from('notes').update({ is_archived: false }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (await getNoteById(userId, id))!
}

import { apiFetch } from '../lib/api'
import type { ApiResponse, Note, CreateNoteInput, UpdateNoteInput, NoteQuery } from '@takenotes/shared'

export const notesService = {
  list: (query?: Partial<NoteQuery>) => {
    const params = new URLSearchParams()
    if (query?.q) params.set('q', query.q)
    if (query?.folderId) params.set('folderId', query.folderId)
    if (query?.themeId) params.set('themeId', query.themeId)
    if (query?.archived) params.set('archived', query.archived)
    if (query?.sort) params.set('sort', query.sort)
    if (query?.order) params.set('order', query.order)
    const qs = params.toString()
    return apiFetch<ApiResponse<Note[]>>(`/notes${qs ? '?' + qs : ''}`).then((r) => r.data)
  },
  get: (id: string) => apiFetch<ApiResponse<Note>>(`/notes/${id}`).then((r) => r.data),
  create: (input: CreateNoteInput) => apiFetch<ApiResponse<Note>>('/notes', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),
  update: (id: string, input: UpdateNoteInput) => apiFetch<ApiResponse<Note>>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(input) }).then((r) => r.data),
  delete: (id: string) => apiFetch<void>(`/notes/${id}`, { method: 'DELETE' }),
  pin: (id: string) => apiFetch<ApiResponse<Note>>(`/notes/${id}/pin`, { method: 'POST' }).then((r) => r.data),
  unpin: (id: string) => apiFetch<ApiResponse<Note>>(`/notes/${id}/unpin`, { method: 'POST' }).then((r) => r.data),
  archive: (id: string) => apiFetch<ApiResponse<Note>>(`/notes/${id}/archive`, { method: 'POST' }).then((r) => r.data),
  restore: (id: string) => apiFetch<ApiResponse<Note>>(`/notes/${id}/restore`, { method: 'POST' }).then((r) => r.data),
}

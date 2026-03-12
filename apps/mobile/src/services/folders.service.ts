import { apiFetch } from '../lib/api'
import type { ApiResponse, Folder, CreateFolderInput, UpdateFolderInput } from '@takenotes/shared'

export const foldersService = {
  list: () => apiFetch<ApiResponse<Folder[]>>('/folders').then((r) => r.data),
  create: (input: CreateFolderInput) => apiFetch<ApiResponse<Folder>>('/folders', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),
  update: (id: string, input: UpdateFolderInput) => apiFetch<ApiResponse<Folder>>(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(input) }).then((r) => r.data),
  delete: (id: string) => apiFetch<void>(`/folders/${id}`, { method: 'DELETE' }),
}

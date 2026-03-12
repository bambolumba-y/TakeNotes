import { apiFetch } from '../lib/api'
import type { ApiResponse, ThemeEntity, CreateThemeEntityInput, UpdateThemeEntityInput } from '@takenotes/shared'

export const themesService = {
  list: () => apiFetch<ApiResponse<ThemeEntity[]>>('/themes').then((r) => r.data),
  create: (input: CreateThemeEntityInput) => apiFetch<ApiResponse<ThemeEntity>>('/themes', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),
  update: (id: string, input: UpdateThemeEntityInput) => apiFetch<ApiResponse<ThemeEntity>>(`/themes/${id}`, { method: 'PATCH', body: JSON.stringify(input) }).then((r) => r.data),
  delete: (id: string) => apiFetch<void>(`/themes/${id}`, { method: 'DELETE' }),
}

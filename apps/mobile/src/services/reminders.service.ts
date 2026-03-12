import { apiFetch } from '../lib/api'
import type { ApiResponse, Reminder, CreateReminderInput, UpdateReminderInput, ReminderQuery } from '@takenotes/shared'

export const remindersService = {
  list: (query?: Partial<ReminderQuery>) => {
    const params = new URLSearchParams()
    if (query?.view) params.set('view', query.view)
    if (query?.status) params.set('status', query.status)
    if (query?.folderId) params.set('folderId', query.folderId)
    if (query?.themeId) params.set('themeId', query.themeId)
    if (query?.q) params.set('q', query.q)
    if (query?.sort) params.set('sort', query.sort)
    if (query?.order) params.set('order', query.order)
    if (query?.timezone) params.set('timezone', query.timezone)
    const qs = params.toString()
    return apiFetch<ApiResponse<Reminder[]>>(`/reminders${qs ? '?' + qs : ''}`).then((r) => r.data)
  },
  get: (id: string) => apiFetch<ApiResponse<Reminder>>(`/reminders/${id}`).then((r) => r.data),
  create: (input: CreateReminderInput) => apiFetch<ApiResponse<Reminder>>('/reminders', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.data),
  update: (id: string, input: UpdateReminderInput) => apiFetch<ApiResponse<Reminder>>(`/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(input) }).then((r) => r.data),
  delete: (id: string) => apiFetch<void>(`/reminders/${id}`, { method: 'DELETE' }),
  complete: (id: string) => apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/complete`, { method: 'POST' }).then((r) => r.data),
  snooze: (id: string, snoozeUntil: string) => apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/snooze`, { method: 'POST', body: JSON.stringify({ snoozeUntil }) }).then((r) => r.data),
  cancel: (id: string) => apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/cancel`, { method: 'POST' }).then((r) => r.data),
  restore: (id: string) => apiFetch<ApiResponse<Reminder>>(`/reminders/${id}/restore`, { method: 'POST' }).then((r) => r.data),
  listArchived: () => apiFetch<ApiResponse<Reminder[]>>('/reminders/archived').then((r) => r.data),
}

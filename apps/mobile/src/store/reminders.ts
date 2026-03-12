import { create } from 'zustand'
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '@takenotes/shared'
import { remindersService } from '../services/reminders.service'

type ReminderView = 'active' | 'today' | 'upcoming' | 'overdue'

interface RemindersState {
  reminders: Reminder[]
  archivedReminders: Reminder[]
  activeView: ReminderView
  isLoading: boolean
  setView: (view: ReminderView) => void
  fetch: (view?: ReminderView) => Promise<void>
  fetchArchived: () => Promise<void>
  create: (input: CreateReminderInput) => Promise<Reminder>
  update: (id: string, input: UpdateReminderInput) => Promise<void>
  remove: (id: string) => Promise<void>
  complete: (id: string) => Promise<void>
  snooze: (id: string, snoozeUntil: string) => Promise<void>
  cancel: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  reminders: [],
  archivedReminders: [],
  activeView: 'active',
  isLoading: false,
  setView: (view) => { set({ activeView: view }); get().fetch(view) },
  fetch: async (view) => {
    const v = view ?? get().activeView
    set({ isLoading: true })
    const reminders = await remindersService.list({ view: v })
    set({ reminders, isLoading: false })
  },
  fetchArchived: async () => {
    const archived = await remindersService.listArchived()
    set({ archivedReminders: archived })
  },
  create: async (input) => {
    const r = await remindersService.create(input)
    set((s) => ({ reminders: [r, ...s.reminders] }))
    return r
  },
  update: async (id, input) => {
    const updated = await remindersService.update(id, input)
    set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? updated : r)) }))
  },
  remove: async (id) => {
    await remindersService.delete(id)
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
  },
  complete: async (id) => {
    await remindersService.complete(id)
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
  },
  snooze: async (id, snoozeUntil) => {
    const updated = await remindersService.snooze(id, snoozeUntil)
    set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? updated : r)) }))
  },
  cancel: async (id) => {
    await remindersService.cancel(id)
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
  },
  restore: async (id) => {
    const restored = await remindersService.restore(id)
    set((s) => ({
      archivedReminders: s.archivedReminders.filter((r) => r.id !== id),
      reminders: [restored, ...s.reminders],
    }))
  },
}))

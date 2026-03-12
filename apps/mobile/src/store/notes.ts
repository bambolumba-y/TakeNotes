import { create } from 'zustand'
import type { Note, CreateNoteInput, UpdateNoteInput, NoteQuery } from '@takenotes/shared'
import { notesService } from '../services/notes.service'

interface NotesState {
  notes: Note[]
  archivedNotes: Note[]
  isLoading: boolean
  query: Partial<NoteQuery>
  setQuery: (q: Partial<NoteQuery>) => void
  fetch: () => Promise<void>
  fetchArchived: () => Promise<void>
  create: (input: CreateNoteInput) => Promise<Note>
  update: (id: string, input: UpdateNoteInput) => Promise<void>
  remove: (id: string) => Promise<void>
  pin: (id: string) => Promise<void>
  unpin: (id: string) => Promise<void>
  archive: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  archivedNotes: [],
  isLoading: false,
  query: {},
  setQuery: (q) => set({ query: q }),
  fetch: async () => {
    set({ isLoading: true })
    const notes = await notesService.list({ ...get().query, archived: 'false' })
    set({ notes, isLoading: false })
  },
  fetchArchived: async () => {
    const archivedNotes = await notesService.list({ archived: 'true' })
    set({ archivedNotes })
  },
  create: async (input) => {
    const note = await notesService.create(input)
    set((s) => ({ notes: [note, ...s.notes] }))
    return note
  },
  update: async (id, input) => {
    const updated = await notesService.update(id, input)
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? updated : n)) }))
  },
  remove: async (id) => {
    await notesService.delete(id)
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
  },
  pin: async (id) => {
    const updated = await notesService.pin(id)
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? updated : n)) }))
  },
  unpin: async (id) => {
    const updated = await notesService.unpin(id)
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? updated : n)) }))
  },
  archive: async (id) => {
    await notesService.archive(id)
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
  },
  restore: async (id) => {
    const restored = await notesService.restore(id)
    set((s) => ({
      archivedNotes: s.archivedNotes.filter((n) => n.id !== id),
      notes: [restored, ...s.notes],
    }))
  },
}))

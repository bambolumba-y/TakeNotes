import { create } from 'zustand'
import type { ThemeEntity, CreateThemeEntityInput, UpdateThemeEntityInput } from '@takenotes/shared'
import { themesService } from '../services/themes.service'

interface ThemesState {
  themes: ThemeEntity[]
  isLoading: boolean
  fetch: () => Promise<void>
  create: (input: CreateThemeEntityInput) => Promise<void>
  update: (id: string, input: UpdateThemeEntityInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useThemesStore = create<ThemesState>((set) => ({
  themes: [],
  isLoading: false,
  fetch: async () => {
    set({ isLoading: true })
    const themes = await themesService.list()
    set({ themes, isLoading: false })
  },
  create: async (input) => {
    const theme = await themesService.create(input)
    set((s) => ({ themes: [...s.themes, theme] }))
  },
  update: async (id, input) => {
    const updated = await themesService.update(id, input)
    set((s) => ({ themes: s.themes.map((t) => (t.id === id ? updated : t)) }))
  },
  remove: async (id) => {
    await themesService.delete(id)
    set((s) => ({ themes: s.themes.filter((t) => t.id !== id) }))
  },
}))

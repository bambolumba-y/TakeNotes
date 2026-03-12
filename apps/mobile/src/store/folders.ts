import { create } from 'zustand'
import type { Folder, CreateFolderInput, UpdateFolderInput } from '@takenotes/shared'
import { foldersService } from '../services/folders.service'

interface FoldersState {
  folders: Folder[]
  isLoading: boolean
  fetch: () => Promise<void>
  create: (input: CreateFolderInput) => Promise<void>
  update: (id: string, input: UpdateFolderInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  isLoading: false,
  fetch: async () => {
    set({ isLoading: true })
    const folders = await foldersService.list()
    set({ folders, isLoading: false })
  },
  create: async (input) => {
    const folder = await foldersService.create(input)
    set((s) => ({ folders: [...s.folders, folder] }))
  },
  update: async (id, input) => {
    const updated = await foldersService.update(id, input)
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? updated : f)) }))
  },
  remove: async (id) => {
    await foldersService.delete(id)
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }))
  },
}))

import { create } from 'zustand'
import type { UserProfile } from '@takenotes/shared'
import { ThemeMode } from '@takenotes/shared'
import { fetchProfile, updateProfile } from '../services/profile.service'
import type { UpdateProfileInput } from '@takenotes/shared'

interface ProfileState {
  profile: UserProfile | null
  isLoading: boolean
  fetch: () => Promise<void>
  update: (input: UpdateProfileInput) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  fetch: async () => {
    set({ isLoading: true })
    try {
      const profile = await fetchProfile()
      set({ profile, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },
  update: async (input) => {
    const profile = await updateProfile(input)
    set({ profile })
  },
}))

import { z } from 'zod'
import { ThemeMode } from '../enums/theme-mode'

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  appearanceMode: z.nativeEnum(ThemeMode).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export interface UserProfile {
  id: string
  email: string
  displayName: string | null
  timezone: string
  locale: string
  appearanceMode: ThemeMode
  createdAt: string
  updatedAt: string
}

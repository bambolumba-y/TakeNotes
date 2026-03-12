import { z } from 'zod'
import { ThemeMode } from '@takenotes/shared'

export const updateMeSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
  locale: z.string().min(2).max(10).optional(),
  appearanceMode: z.nativeEnum(ThemeMode).optional(),
})

export type UpdateMeInput = z.infer<typeof updateMeSchema>

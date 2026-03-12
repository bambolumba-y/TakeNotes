import { z } from 'zod'
import { FOLDER_COLORS, FOLDER_ICONS } from './folder'

export const createThemeEntitySchema = z.object({
  name: z.string().min(1,'Name is required').max(100),
  color: z.enum(FOLDER_COLORS),
  icon: z.enum(FOLDER_ICONS),
})

export const updateThemeEntitySchema = createThemeEntitySchema.partial()

export type CreateThemeEntityInput = z.infer<typeof createThemeEntitySchema>
export type UpdateThemeEntityInput = z.infer<typeof updateThemeEntitySchema>

export interface ThemeEntity {
  id: string
  userId: string
  name: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
}

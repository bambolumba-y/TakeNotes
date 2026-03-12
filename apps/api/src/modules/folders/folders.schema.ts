import { z } from 'zod'
import { FOLDER_COLORS, FOLDER_ICONS } from '@takenotes/shared'

export const createFolderBodySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.enum(FOLDER_COLORS),
  icon: z.enum(FOLDER_ICONS),
})

export const updateFolderBodySchema = createFolderBodySchema.partial()
export const folderIdParamSchema = z.object({ id: z.string().uuid() })

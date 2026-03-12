import { z } from 'zod'

export const FOLDER_COLORS = ['#6EA8FE','#A78BFA','#F472B6','#FB923C','#4ADE80','#2DD4BF','#FACC15','#F87171'] as const
export const FOLDER_ICONS = ['folder','star','heart','bookmark','tag','home','briefcase','book','music','camera','code','coffee','globe','map','shopping-bag','sun','moon','zap','flag','gift'] as const

export const createFolderSchema = z.object({
  name: z.string().min(1,'Name is required').max(100),
  color: z.enum(FOLDER_COLORS),
  icon: z.enum(FOLDER_ICONS),
})

export const updateFolderSchema = createFolderSchema.partial()

export type CreateFolderInput = z.infer<typeof createFolderSchema>
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>

export interface Folder {
  id: string
  userId: string
  name: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
}

import { z } from 'zod'

export const createNoteSchema = z.object({
  title: z.string().min(1,'Title is required').max(500),
  content: z.string().default(''),
  folderId: z.string().uuid().nullable().optional(),
  themeIds: z.array(z.string().uuid()).optional().default([]),
  isPinned: z.boolean().optional().default(false),
})

export const updateNoteSchema = createNoteSchema.partial()

export const noteQuerySchema = z.object({
  q: z.string().optional(),
  folderId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
  archived: z.enum(['true','false']).optional().default('false'),
  sort: z.enum(['updated_at','created_at','title']).optional().default('updated_at'),
  order: z.enum(['asc','desc']).optional().default('desc'),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type NoteQuery = z.infer<typeof noteQuerySchema>

export interface Note {
  id: string
  userId: string
  title: string
  content: string
  contentPlain: string
  folderId: string | null
  folder?: { id: string; name: string; color: string; icon: string } | null
  themes: Array<{ id: string; name: string; color: string; icon: string }>
  isPinned: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  lastOpenedAt: string | null
}

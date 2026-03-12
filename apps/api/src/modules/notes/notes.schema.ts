import { z } from 'zod'

export const createNoteBodySchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().default(''),
  folderId: z.string().uuid().nullable().optional(),
  themeIds: z.array(z.string().uuid()).optional().default([]),
  isPinned: z.boolean().optional().default(false),
})

export const updateNoteBodySchema = createNoteBodySchema.partial()

export const noteIdParamSchema = z.object({ id: z.string().uuid() })

export const noteQuerySchema = z.object({
  q: z.string().optional(),
  folderId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
  archived: z.enum(['true','false']).optional().default('false'),
  sort: z.enum(['updated_at','created_at','title']).optional().default('updated_at'),
  order: z.enum(['asc','desc']).optional().default('desc'),
})

import { z } from 'zod'
import { ReminderStatus, ReminderPriority, ReminderChannel, RecurrenceType, RecurrenceEndType } from '@takenotes/shared'

export const createReminderBodySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  dueAt: z.string().datetime(),
  timezone: z.string().min(1).default('UTC'),
  priority: z.nativeEnum(ReminderPriority).default(ReminderPriority.Medium),
  folderId: z.string().uuid().nullable().optional(),
  themeIds: z.array(z.string().uuid()).optional().default([]),
  deliveryPolicy: z.object({
    channels: z.array(z.nativeEnum(ReminderChannel)).min(1),
  }),
  repeatRule: z.object({
    type: z.nativeEnum(RecurrenceType),
    interval: z.number().int().min(1).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endType: z.nativeEnum(RecurrenceEndType).optional(),
    endCount: z.number().int().positive().nullable().optional(),
    endDate: z.string().nullable().optional(),
  }).optional().default({ type: RecurrenceType.None }),
})

export const updateReminderBodySchema = createReminderBodySchema.partial()
export const reminderIdParamSchema = z.object({ id: z.string().uuid() })
export const snoozeBodySchema = z.object({ snoozeUntil: z.string().datetime() })

export const reminderQuerySchema = z.object({
  view: z.enum(['active', 'today', 'upcoming', 'overdue']).optional(),
  status: z.nativeEnum(ReminderStatus).optional(),
  folderId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
  q: z.string().optional(),
  sort: z.enum(['due_at', 'updated_at']).optional().default('due_at'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  timezone: z.string().optional(),
})

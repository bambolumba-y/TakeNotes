import { z } from 'zod'
import { ReminderStatus, ReminderPriority, ReminderChannel, RecurrenceType, RecurrenceEndType } from '../enums/index'

export const repeatRuleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(RecurrenceType.None) }),
  z.object({ type: z.literal(RecurrenceType.Daily), interval: z.number().int().min(1).default(1), endType: z.nativeEnum(RecurrenceEndType).default(RecurrenceEndType.Never), endCount: z.number().int().positive().nullable().optional(), endDate: z.string().nullable().optional() }),
  z.object({ type: z.literal(RecurrenceType.Weekly), interval: z.number().int().min(1).default(1), daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1), endType: z.nativeEnum(RecurrenceEndType).default(RecurrenceEndType.Never), endCount: z.number().int().positive().nullable().optional(), endDate: z.string().nullable().optional() }),
  z.object({ type: z.literal(RecurrenceType.Monthly), interval: z.number().int().min(1).default(1), endType: z.nativeEnum(RecurrenceEndType).default(RecurrenceEndType.Never), endCount: z.number().int().positive().nullable().optional(), endDate: z.string().nullable().optional() }),
  z.object({ type: z.literal(RecurrenceType.Yearly), interval: z.number().int().min(1).default(1), endType: z.nativeEnum(RecurrenceEndType).default(RecurrenceEndType.Never), endCount: z.number().int().positive().nullable().optional(), endDate: z.string().nullable().optional() }),
  z.object({ type: z.literal(RecurrenceType.Custom), interval: z.number().int().min(1), daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), endType: z.nativeEnum(RecurrenceEndType).default(RecurrenceEndType.Never), endCount: z.number().int().positive().nullable().optional(), endDate: z.string().nullable().optional() }),
])

export const deliveryPolicySchema = z.object({
  channels: z.array(z.nativeEnum(ReminderChannel)).min(1, 'At least one channel required'),
})

export const createReminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  dueAt: z.string().datetime({ message: 'Valid due date/time required' }),
  timezone: z.string().min(1).default('UTC'),
  priority: z.nativeEnum(ReminderPriority).default(ReminderPriority.Medium),
  folderId: z.string().uuid().nullable().optional(),
  themeIds: z.array(z.string().uuid()).optional().default([]),
  deliveryPolicy: deliveryPolicySchema,
  repeatRule: repeatRuleSchema.optional().default({ type: RecurrenceType.None }),
})

export const updateReminderSchema = createReminderSchema.partial().omit({ deliveryPolicy: true }).extend({
  deliveryPolicy: deliveryPolicySchema.optional(),
})

export const snoozeReminderSchema = z.object({
  snoozeUntil: z.string().datetime({ message: 'Valid snooze time required' }),
})

export const reminderQuerySchema = z.object({
  status: z.nativeEnum(ReminderStatus).optional(),
  view: z.enum(['active', 'today', 'upcoming', 'overdue']).optional(),
  folderId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
  q: z.string().optional(),
  sort: z.enum(['due_at', 'updated_at']).optional().default('due_at'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  timezone: z.string().optional(),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>
export type SnoozeReminderInput = z.infer<typeof snoozeReminderSchema>
export type ReminderQuery = z.infer<typeof reminderQuerySchema>
export type RepeatRule = z.infer<typeof repeatRuleSchema>
export type DeliveryPolicy = z.infer<typeof deliveryPolicySchema>

export interface Reminder {
  id: string
  userId: string
  title: string
  description: string | null
  dueAt: string
  timezone: string
  priority: ReminderPriority
  status: ReminderStatus
  folderId: string | null
  folder?: { id: string; name: string; color: string; icon: string } | null
  themes: Array<{ id: string; name: string; color: string; icon: string }>
  deliveryPolicy: DeliveryPolicy
  repeatRule: RepeatRule
  snoozeUntil: string | null
  completedAt: string | null
  cancelledAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

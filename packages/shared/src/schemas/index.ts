import { z } from 'zod'
import { ReminderStatus } from '../enums/reminder-status'
import { ReminderPriority } from '../enums/reminder-priority'
import { ReminderChannel } from '../enums/reminder-channel'

export const reminderStatusSchema = z.nativeEnum(ReminderStatus)
export const reminderPrioritySchema = z.nativeEnum(ReminderPriority)
export const reminderChannelSchema = z.nativeEnum(ReminderChannel)

import { Queue } from 'bullmq'
import { redis } from '../lib/redis'

export interface ReminderDeliveryJobData {
  reminderId: string
  userId: string
  jobKey: string
  reminderJobId: string
  scheduledFor: string
}

export const reminderDeliveryQueue = new Queue<ReminderDeliveryJobData>('reminder-delivery', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
})

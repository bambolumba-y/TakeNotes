import { Worker, type Job } from 'bullmq'
import { redis } from '../lib/redis'
import { supabase } from '../lib/supabase'
import { orchestrateDelivery } from '../modules/delivery/delivery.service'
import type { ReminderDeliveryJobData } from '../queues/reminder-delivery.queue'
import { ReminderStatus } from '@takenotes/shared'
import { logger } from '../lib/logger'
import { Sentry } from '../lib/sentry'

const REMINDER_SELECT = `
  *,
  folders ( id, name, color, icon ),
  reminder_themes ( themes ( id, name, color, icon ) )
`

function mapReminder(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    description: r.description as string | null,
    dueAt: r.due_at as string,
    timezone: r.timezone as string,
    priority: r.priority as string,
    status: r.status as ReminderStatus,
    folderId: r.folder_id as string | null,
    folder: (r.folders ?? null) as never,
    themes: ((r.reminder_themes as Array<{ themes: unknown }> ?? []).map((rt) => rt.themes)) as never,
    deliveryPolicy: r.delivery_policy as { channels: string[] },
    repeatRule: r.repeat_rule as never,
    snoozeUntil: r.snooze_until as string | null,
    completedAt: r.completed_at as string | null,
    cancelledAt: r.cancelled_at as string | null,
    archivedAt: r.archived_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

async function processJob(job: Job<ReminderDeliveryJobData>): Promise<void> {
  const { reminderId, userId, jobKey, reminderJobId, scheduledFor } = job.data

  const workerLog = logger.child({
    reminder_id: reminderId,
    job_id: job.id,
    job_key: jobKey,
    reminder_job_id: reminderJobId,
  })

  workerLog.info('Processing reminder delivery job')

  // 1. Re-check: load current reminder state
  const { data: reminderRow, error } = await supabase
    .from('reminders')
    .select(REMINDER_SELECT)
    .eq('id', reminderId)
    .eq('user_id', userId) // ownership enforced: WHERE user_id = userId
    .single()

  if (error || !reminderRow) {
    workerLog.warn('Reminder not found — skipping stale job')
    await supabase.from('reminder_jobs').update({ status: 'cancelled', last_error: 'Reminder not found' }).eq('id', reminderJobId)
    return
  }

  const reminder = mapReminder(reminderRow)

  // 2. Stale job guard: must still be active
  if (reminder.status !== ReminderStatus.Active) {
    workerLog.warn({ reminder_status: reminder.status }, 'Reminder is not active — skipping stale job')
    await supabase.from('reminder_jobs').update({ status: 'superseded', last_error: `Reminder status is ${reminder.status}` }).eq('id', reminderJobId)
    return
  }

  // 3. Re-check: job record must still be 'scheduled' (not superseded by a snooze/edit)
  const { data: jobRecord } = await supabase
    .from('reminder_jobs')
    .select('status')
    .eq('id', reminderJobId)
    .single()

  if (!jobRecord || jobRecord.status !== 'scheduled') {
    workerLog.warn({ db_job_status: jobRecord?.status ?? 'missing' }, 'Job is not in scheduled state — skipping')
    return
  }

  // 4. Snooze guard: skip if snoozed past this job's scheduled time
  if (reminder.snoozeUntil && new Date(reminder.snoozeUntil) > new Date(scheduledFor)) {
    workerLog.warn({ snooze_until: reminder.snoozeUntil }, 'Reminder is snoozed past scheduled time — skipping job')
    await supabase.from('reminder_jobs').update({ status: 'superseded', last_error: 'Snoozed past this schedule' }).eq('id', reminderJobId)
    return
  }

  // 5. Mark as processing
  await supabase.from('reminder_jobs').update({ status: 'processing' }).eq('id', reminderJobId)

  try {
    // 6. Orchestrate delivery
    await orchestrateDelivery({ reminder: reminder as never, reminderJobId, jobKey })

    // 7. Mark job as completed
    await supabase.from('reminder_jobs').update({ status: 'completed' }).eq('id', reminderJobId)
    workerLog.info('Job completed successfully')
  } catch (err) {
    const errMsg = (err as Error).message
    await supabase.from('reminder_jobs').update({ status: 'failed', last_error: errMsg }).eq('id', reminderJobId)
    workerLog.error({ err_message: errMsg }, 'Job failed — will be retried by BullMQ')

    // Capture to Sentry with delivery context (never log secret tokens or credentials)
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        extra: {
          reminderId,
          jobId: job.id,
          jobKey,
          reminderJobId,
          // channel info is available through orchestrateDelivery logs
        },
      })
    }

    throw err // allow BullMQ retry
  }
}

export function startReminderWorker() {
  const worker = new Worker<ReminderDeliveryJobData>(
    'reminder-delivery',
    processJob,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: redis as any,
      concurrency: 5,
    },
  )

  worker.on('completed', (job) => {
    logger.info({ job_key: job.data.jobKey, job_id: job.id }, 'BullMQ job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error({ job_key: job?.data?.jobKey, job_id: job?.id, err_message: err.message }, 'BullMQ job failed')
  })

  worker.on('error', (err) => {
    logger.error({ err_message: err.message }, 'BullMQ worker error')
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err)
    }
  })

  logger.info('Reminder delivery worker started')
  return worker
}

import { supabase } from '../../lib/supabase'
import { reminderDeliveryQueue } from '../../queues/reminder-delivery.queue'

export function buildJobKey(reminderId: string, scheduledFor: string): string {
  return `${reminderId}:${scheduledFor}:v1`
}

/**
 * Schedule a new delivery job for a reminder.
 * Supersedes any existing pending jobs for the same reminder first.
 */
export async function scheduleReminderJob(opts: {
  reminderId: string
  userId: string
  scheduledFor: Date
}): Promise<string> {
  const { reminderId, userId, scheduledFor } = opts
  const jobKey = buildJobKey(reminderId, scheduledFor.toISOString())
  const delayMs = Math.max(0, scheduledFor.getTime() - Date.now())

  // Write job record first so we have an ID for the BullMQ job data
  const { data: jobRecord, error: jobErr } = await supabase
    .from('reminder_jobs')
    .insert({
      reminder_id: reminderId,
      user_id: userId,
      job_key: jobKey,
      queue_name: 'reminder-delivery',
      scheduled_for: scheduledFor.toISOString(),
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (jobErr || !jobRecord) throw new Error(`Failed to create job record: ${jobErr?.message}`)

  const bullJob = await reminderDeliveryQueue.add(
    'deliver',
    {
      reminderId,
      userId,
      jobKey,
      reminderJobId: jobRecord.id,
      scheduledFor: scheduledFor.toISOString(),
    },
    { delay: delayMs, jobId: `${reminderId}:${scheduledFor.getTime()}` },
  )

  // Store the BullMQ job ID back
  await supabase
    .from('reminder_jobs')
    .update({ bullmq_job_id: bullJob.id })
    .eq('id', jobRecord.id)

  console.info(`[Scheduler] Scheduled job ${jobKey} for reminder ${reminderId} at ${scheduledFor.toISOString()}`)
  return jobRecord.id
}

/**
 * Supersede all pending scheduled jobs for a given reminder.
 * Call before rescheduling due to edit, snooze, complete, or cancel.
 */
export async function supersedePendingJobs(reminderId: string): Promise<void> {
  const { data: pendingJobs } = await supabase
    .from('reminder_jobs')
    .select('id, bullmq_job_id')
    .eq('reminder_id', reminderId)
    .eq('status', 'scheduled')

  if (!pendingJobs?.length) return

  for (const job of pendingJobs) {
    // Remove from BullMQ queue if not yet picked up
    if (job.bullmq_job_id) {
      try {
        const bullJob = await reminderDeliveryQueue.getJob(job.bullmq_job_id)
        if (bullJob) await bullJob.remove()
      } catch {
        // Job may have already been picked up; we still mark it superseded
      }
    }

    await supabase
      .from('reminder_jobs')
      .update({ status: 'superseded' })
      .eq('id', job.id)

    console.info(`[Scheduler] Superseded job ${job.id} for reminder ${reminderId}`)
  }
}

/**
 * Cancel pending jobs (used on reminder completion/cancellation).
 * Semantically different from supersede: this is a terminal operation.
 */
export async function cancelPendingJobs(reminderId: string): Promise<void> {
  const { data: pendingJobs } = await supabase
    .from('reminder_jobs')
    .select('id, bullmq_job_id')
    .eq('reminder_id', reminderId)
    .eq('status', 'scheduled')

  if (!pendingJobs?.length) return

  for (const job of pendingJobs) {
    if (job.bullmq_job_id) {
      try {
        const bullJob = await reminderDeliveryQueue.getJob(job.bullmq_job_id)
        if (bullJob) await bullJob.remove()
      } catch { /* already executing */ }
    }

    await supabase
      .from('reminder_jobs')
      .update({ status: 'cancelled' })
      .eq('id', job.id)
  }

  console.info(`[Scheduler] Cancelled all pending jobs for reminder ${reminderId}`)
}

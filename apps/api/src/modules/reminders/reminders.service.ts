import { supabase } from '../../lib/supabase'
import type { Reminder } from '@takenotes/shared'
import { ReminderStatus } from '@takenotes/shared'
import { scheduleReminderJob, supersedePendingJobs, cancelPendingJobs } from '../scheduler/scheduler.service'

const REMINDER_SELECT = `
  *,
  folders ( id, name, color, icon ),
  reminder_themes ( themes ( id, name, color, icon ) )
`

function mapRow(r: Record<string, unknown>): Reminder {
  const folder = r.folders as Reminder['folder']
  const themes = (r.reminder_themes as Array<{ themes: { id: string; name: string; color: string; icon: string } }> ?? []).map((rt) => rt.themes)
  return {
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    description: r.description as string | null,
    dueAt: r.due_at as string,
    timezone: r.timezone as string,
    priority: r.priority as Reminder['priority'],
    status: r.status as ReminderStatus,
    folderId: r.folder_id as string | null,
    folder: folder ?? null,
    themes,
    deliveryPolicy: r.delivery_policy as Reminder['deliveryPolicy'],
    repeatRule: r.repeat_rule as Reminder['repeatRule'],
    snoozeUntil: r.snooze_until as string | null,
    completedAt: r.completed_at as string | null,
    cancelledAt: r.cancelled_at as string | null,
    archivedAt: r.archived_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

/**
 * Compute start-of-day and end-of-day ISO strings in the given IANA timezone.
 * Falls back to UTC if the timezone is invalid.
 */
function getTodayBoundsInTz(timezone: string): { todayStart: string; todayEnd: string } {
  let tz = timezone
  try {
    // Validate by formatting a date — throws if timezone is invalid
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
  } catch {
    tz = 'UTC'
  }

  // Use Intl to find the current date parts in the target timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const localDateStr = formatter.format(now) // "YYYY-MM-DD" due to en-CA locale

  // Build midnight boundaries in that timezone by using the local date string
  // and interpreting them as if they were UTC, then adjusting by the tz offset.
  // The robust approach: create a Date representing midnight in the tz.
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  // Determine the UTC offset at midnight of the local date by binary search approach
  // Simpler: use the fact that `new Date(localDateStr + 'T00:00:00')` is local machine time;
  // instead, find the offset by comparing a known UTC timestamp to its local interpretation.
  const utcNow = now.getTime()
  const utcMidnightApprox = new Date(`${localDateStr}T00:00:00Z`).getTime()

  // Get what time it currently is in the tz
  const parts = offsetFormatter.formatToParts(now)
  const p = (type: string) => parts.find((x) => x.type === type)?.value ?? '0'
  const localHour = parseInt(p('hour'), 10)
  const localMinute = parseInt(p('minute'), 10)
  const localSecond = parseInt(p('second'), 10)

  // Compute today's midnight in UTC: subtract the elapsed time since midnight in the tz
  const elapsedSinceMidnightMs = (localHour * 3600 + localMinute * 60 + localSecond) * 1000
  const todayStartUtcMs = utcNow - elapsedSinceMidnightMs
  const todayEndUtcMs = todayStartUtcMs + 24 * 60 * 60 * 1000 - 1

  return {
    todayStart: new Date(todayStartUtcMs).toISOString(),
    todayEnd: new Date(todayEndUtcMs).toISOString(),
  }
}

export async function listReminders(userId: string, query: {
  view?: string; status?: string; folderId?: string;
  themeId?: string; q?: string; sort?: string; order?: string; timezone?: string
}): Promise<Reminder[]> {
  const now = new Date().toISOString()

  // Fetch the user's stored timezone if not provided in the query
  let userTimezone = query.timezone ?? 'UTC'
  if (!query.timezone) {
    const { data: userRow } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', userId)
      .single()
    if (userRow?.timezone) userTimezone = userRow.timezone
  }

  const { todayStart, todayEnd } = getTodayBoundsInTz(userTimezone)

  let q = supabase.from('reminders').select(REMINDER_SELECT).eq('user_id', userId)

  if (query.view === 'active') {
    q = q.eq('status', ReminderStatus.Active)
  } else if (query.view === 'today') {
    q = q.eq('status', ReminderStatus.Active)
      .gte('due_at', todayStart)
      .lte('due_at', todayEnd)
  } else if (query.view === 'upcoming') {
    q = q.eq('status', ReminderStatus.Active).gt('due_at', now)
  } else if (query.view === 'overdue') {
    q = q.eq('status', ReminderStatus.Active)
      .lt('due_at', now)
      .or(`snooze_until.is.null,snooze_until.lt.${now}`)
  } else if (query.status) {
    q = q.eq('status', query.status)
  }

  if (query.folderId) q = q.eq('folder_id', query.folderId)
  if (query.q) q = q.or(`title.ilike.%${query.q}%,description.ilike.%${query.q}%`)

  const sortCol = query.sort === 'updated_at' ? 'updated_at' : 'due_at'
  q = q.order(sortCol, { ascending: (query.order ?? 'asc') === 'asc' })

  const { data, error } = await q
  if (error) throw new Error(error.message)

  let reminders = (data ?? []).map(mapRow)
  if (query.themeId) {
    reminders = reminders.filter((r) => r.themes.some((t) => t.id === query.themeId))
  }
  return reminders
}

export async function getReminderById(userId: string, id: string): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from('reminders').select(REMINDER_SELECT).eq('id', id).eq('user_id', userId).single()
  if (error || !data) return null
  return mapRow(data)
}

export async function createReminder(userId: string, input: {
  title: string; description?: string; dueAt: string; timezone: string;
  priority: string; folderId?: string | null; themeIds?: string[];
  deliveryPolicy: { channels: string[] }; repeatRule?: Record<string, unknown>
}): Promise<Reminder> {
  if (input.folderId) {
    const { data: folder } = await supabase.from('folders').select('id').eq('id', input.folderId).eq('user_id', userId).single()
    if (!folder) throw new Error('Folder not found or not owned by user')
  }

  const { data: reminder, error } = await supabase.from('reminders').insert({
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    due_at: input.dueAt,
    timezone: input.timezone,
    priority: input.priority,
    folder_id: input.folderId ?? null,
    delivery_policy: input.deliveryPolicy,
    repeat_rule: input.repeatRule ?? { type: 'none' },
  }).select('id').single()

  if (error || !reminder) throw new Error(error?.message ?? 'Create failed')

  if (input.themeIds?.length) {
    const { data: ownedThemes } = await supabase.from('themes').select('id').in('id', input.themeIds).eq('user_id', userId)
    const ownedIds = (ownedThemes ?? []).map((t: { id: string }) => t.id)
    if (ownedIds.length) {
      await supabase.from('reminder_themes').insert(ownedIds.map((tid: string) => ({ reminder_id: reminder.id, theme_id: tid })))
    }
  }

  const created = (await getReminderById(userId, reminder.id))!

  // Schedule delivery job
  try {
    await scheduleReminderJob({ reminderId: created.id, userId, scheduledFor: new Date(created.dueAt) })
  } catch (err) {
    console.error(`[Scheduler] Failed to schedule job for reminder ${created.id}:`, (err as Error).message)
  }

  return created
}

export async function updateReminder(userId: string, id: string, input: Partial<{
  title: string; description: string | null; dueAt: string; timezone: string;
  priority: string; folderId: string | null; themeIds: string[];
  deliveryPolicy: { channels: string[] }; repeatRule: Record<string, unknown>
}>): Promise<Reminder> {
  if (input.folderId) {
    const { data: folder } = await supabase.from('folders').select('id').eq('id', input.folderId).eq('user_id', userId).single()
    if (!folder) throw new Error('Folder not found or not owned by user')
  }

  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.dueAt !== undefined) updateData.due_at = input.dueAt
  if (input.timezone !== undefined) updateData.timezone = input.timezone
  if (input.priority !== undefined) updateData.priority = input.priority
  if ('folderId' in input) updateData.folder_id = input.folderId ?? null
  if (input.deliveryPolicy !== undefined) updateData.delivery_policy = input.deliveryPolicy
  if (input.repeatRule !== undefined) updateData.repeat_rule = input.repeatRule

  if (Object.keys(updateData).length) {
    const { error } = await supabase.from('reminders').update(updateData).eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  if (input.themeIds !== undefined) {
    await supabase.from('reminder_themes').delete().eq('reminder_id', id)
    if (input.themeIds.length) {
      const { data: owned } = await supabase.from('themes').select('id').in('id', input.themeIds).eq('user_id', userId)
      const ownedIds = (owned ?? []).map((t: { id: string }) => t.id)
      if (ownedIds.length) {
        await supabase.from('reminder_themes').insert(ownedIds.map((tid: string) => ({ reminder_id: id, theme_id: tid })))
      }
    }
  }

  const updated = (await getReminderById(userId, id))!

  // Reschedule if timing or channels changed
  if (input.dueAt !== undefined || input.deliveryPolicy !== undefined) {
    try {
      await supersedePendingJobs(id)
      await scheduleReminderJob({ reminderId: id, userId, scheduledFor: new Date(updated.dueAt) })
    } catch (err) {
      console.error(`[Scheduler] Failed to reschedule reminder ${id}:`, (err as Error).message)
    }
  }

  return updated
}

export async function deleteReminder(userId: string, id: string): Promise<void> {
  try { await cancelPendingJobs(id) } catch { /* best effort */ }
  const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function completeReminder(userId: string, id: string): Promise<Reminder> {
  const { error } = await supabase.from('reminders').update({
    status: ReminderStatus.Completed,
    completed_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)

  try { await cancelPendingJobs(id) } catch (err) {
    console.error(`[Scheduler] Failed to cancel jobs on complete for reminder ${id}:`, (err as Error).message)
  }

  return (await getReminderById(userId, id))!
}

export async function snoozeReminder(userId: string, id: string, snoozeUntil: string): Promise<Reminder> {
  const now = new Date()
  if (new Date(snoozeUntil) <= now) throw new Error('Snooze time must be in the future')
  const { error } = await supabase.from('reminders').update({
    snooze_until: snoozeUntil,
  }).eq('id', id).eq('user_id', userId).eq('status', ReminderStatus.Active)
  if (error) throw new Error(error.message)

  try {
    await supersedePendingJobs(id)
    await scheduleReminderJob({ reminderId: id, userId, scheduledFor: new Date(snoozeUntil) })
  } catch (err) {
    console.error(`[Scheduler] Failed to reschedule snoozed reminder ${id}:`, (err as Error).message)
  }

  return (await getReminderById(userId, id))!
}

export async function cancelReminder(userId: string, id: string): Promise<Reminder> {
  const { error } = await supabase.from('reminders').update({
    status: ReminderStatus.Cancelled,
    cancelled_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)

  try { await cancelPendingJobs(id) } catch (err) {
    console.error(`[Scheduler] Failed to cancel jobs for reminder ${id}:`, (err as Error).message)
  }

  return (await getReminderById(userId, id))!
}

export async function restoreReminder(userId: string, id: string): Promise<Reminder> {
  const reminder = await getReminderById(userId, id)
  if (!reminder) throw new Error('Reminder not found')
  const restorable = [ReminderStatus.Completed, ReminderStatus.Cancelled, ReminderStatus.Archived]
  if (!restorable.includes(reminder.status)) throw new Error('Reminder cannot be restored from current status')

  const { error } = await supabase.from('reminders').update({
    status: ReminderStatus.Active,
    completed_at: null,
    cancelled_at: null,
    archived_at: null,
    snooze_until: null,
  }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)

  const restored = (await getReminderById(userId, id))!

  // Schedule for original due_at, or 5 minutes from now if already past
  const scheduleAt = new Date(restored.dueAt) > new Date() ? new Date(restored.dueAt) : new Date(Date.now() + 5 * 60 * 1000)
  try {
    await scheduleReminderJob({ reminderId: id, userId, scheduledFor: scheduleAt })
  } catch (err) {
    console.error(`[Scheduler] Failed to schedule restored reminder ${id}:`, (err as Error).message)
  }

  return restored
}

export async function listArchivedReminders(userId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders').select(REMINDER_SELECT)
    .eq('user_id', userId)
    .in('status', [ReminderStatus.Completed, ReminderStatus.Archived])
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

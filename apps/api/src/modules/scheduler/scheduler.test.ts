import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'
process.env.REDIS_URL = 'redis://localhost:6379'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: { id: 'test-job-id' }, error: null })) })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })) })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ data: [], error: null })) })) })),
    })),
  },
}))

vi.mock('../../queues/reminder-delivery.queue', () => ({
  reminderDeliveryQueue: {
    add: vi.fn(() => Promise.resolve({ id: 'bullmq-job-123' })),
    getJob: vi.fn(() => Promise.resolve(null)),
  },
}))

vi.mock('../../lib/redis', () => ({ redis: {} }))

describe('buildJobKey', () => {
  it('generates deterministic key for same inputs', async () => {
    const { buildJobKey } = await import('./scheduler.service')
    const key1 = buildJobKey('reminder-id-1', '2026-03-15T10:00:00.000Z')
    const key2 = buildJobKey('reminder-id-1', '2026-03-15T10:00:00.000Z')
    expect(key1).toBe(key2)
    expect(key1).toContain('reminder-id-1')
  })

  it('generates different keys for different times', async () => {
    const { buildJobKey } = await import('./scheduler.service')
    const key1 = buildJobKey('r1', '2026-03-15T10:00:00.000Z')
    const key2 = buildJobKey('r1', '2026-03-15T11:00:00.000Z')
    expect(key1).not.toBe(key2)
  })
})

describe('scheduleReminderJob', () => {
  it('creates a DB record and enqueues a BullMQ job', async () => {
    const { reminderDeliveryQueue } = await import('../../queues/reminder-delivery.queue')
    const { scheduleReminderJob } = await import('./scheduler.service')

    await scheduleReminderJob({
      reminderId: 'test-reminder',
      userId: 'test-user',
      scheduledFor: new Date(Date.now() + 60000),
    })

    expect(reminderDeliveryQueue.add).toHaveBeenCalledWith(
      'deliver',
      expect.objectContaining({ reminderId: 'test-reminder' }),
      expect.any(Object),
    )
  })
})

describe('Worker stale job prevention', () => {
  it('job key encodes reminderId and scheduledFor for staleness check', async () => {
    const { buildJobKey } = await import('./scheduler.service')
    const reminderId = 'abc-123'
    const originalTime = '2026-03-15T10:00:00.000Z'
    const snoozeTime = '2026-03-15T11:00:00.000Z'

    const originalKey = buildJobKey(reminderId, originalTime)
    const snoozeKey = buildJobKey(reminderId, snoozeTime)

    // When snoozed, original key != snooze key — worker can detect stale jobs
    expect(originalKey).not.toBe(snoozeKey)
  })
})

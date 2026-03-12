import { describe, it, expect, vi } from 'vitest'

describe('buildReminderEmailHtml', () => {
  it('includes reminder title and due date in email body', async () => {
    const { buildReminderEmailHtml } = await import('./email.provider')
    const html = buildReminderEmailHtml({
      title: 'Test Reminder',
      dueAt: '2026-03-15T10:00:00.000Z',
      description: 'Test description',
      deepLink: 'takenotes://reminders/123',
    })
    expect(html).toContain('Test Reminder')
    expect(html).toContain('Test description')
    expect(html).toContain('takenotes://reminders/123')
  })
})

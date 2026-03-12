import { describe, it, expect, vi } from 'vitest'
import { verifyTelegramConnection } from './channels.service'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null, error: null })) })),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({})) })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })),
    })),
  },
}))

describe('Telegram connection security', () => {
  it('returns false when no pending connection matches the token', async () => {
    const result = await verifyTelegramConnection({
      verificationToken: 'INVALID',
      chatId: '12345',
      telegramUserId: '67890',
    })
    expect(result).toBe(false)
  })
})

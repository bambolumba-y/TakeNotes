import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildServer } from '../../server'

// Mock env
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.REDIS_URL = 'redis://localhost:6379'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('GET /me', () => {
  it('returns 401 when no token is provided', async () => {
    const app = buildServer()
    const res = await app.inject({ method: 'GET', url: '/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const { supabase } = await import('../../lib/supabase')
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' } as never,
    })

    const app = buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer invalid-token' },
    })
    expect(res.statusCode).toBe(401)
  })
})

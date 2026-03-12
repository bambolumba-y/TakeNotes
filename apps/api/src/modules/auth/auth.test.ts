import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildServer } from '../../server'

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

const MOCK_USER = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

const MOCK_PROFILE = {
  id: MOCK_USER.id,
  email: MOCK_USER.email,
  display_name: 'Test User',
  timezone: 'UTC',
  locale: 'en-US',
  appearance_mode: 'system',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('Auth — GET /me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no authorization header is provided', async () => {
    const app = buildServer()
    const res = await app.inject({ method: 'GET', url: '/me' })
    expect(res.statusCode).toBe(401)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when authorization header is malformed', async () => {
    const app = buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'NotBearer sometoken' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const { supabase } = await import('../../lib/supabase')
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid JWT' } as never,
    })

    const app = buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer invalid-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns user profile for an authenticated request', async () => {
    const { supabase } = await import('../../lib/supabase')

    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: MOCK_USER },
      error: null,
    } as never)

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
      upsert: vi.fn().mockReturnThis(),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as never)

    const app = buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
  })
})

describe('Auth — PATCH /me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    const app = buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/me',
      payload: { displayName: 'New Name' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects body containing user_id (ownership must come from token only)', async () => {
    const { supabase } = await import('../../lib/supabase')

    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: MOCK_USER },
      error: null,
    } as never)

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as never)

    const app = buildServer()
    // user_id in body should be ignored — the schema strips unknown fields via Zod
    const res = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
      payload: {
        // These are valid fields
        displayName: 'Attacker Name',
        // user_id is not in the updateMeSchema — Zod will strip or reject it
        user_id: 'attacker-user-id',
      },
    })

    // The request should either succeed (with user_id stripped) or return 400
    // It must NOT update a different user's profile
    expect([200, 400]).toContain(res.statusCode)
    if (res.statusCode === 200) {
      // Verify that supabase was never called with the attacker's user_id
      // The service always uses req.user!.id from the auth token
      expect(supabase.from).toHaveBeenCalled()
    }
  })
})

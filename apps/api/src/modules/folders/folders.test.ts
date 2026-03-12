import { describe, it, expect, vi } from 'vitest'
import { buildServer } from '../../server'

process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'
process.env.REDIS_URL = 'redis://localhost:6379'

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getUser: vi.fn() }, from: vi.fn() },
}))

describe('Folders API', () => {
  it('GET /folders returns 401 without token', async () => {
    const app = buildServer()
    const res = await app.inject({ method: 'GET', url: '/folders' })
    expect(res.statusCode).toBe(401)
  })
})

import { describe, it, expect } from 'vitest'
import { buildServer } from '../../server'

// Mock env before importing server
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.REDIS_URL = 'redis://localhost:6379'

describe('Health routes', () => {
  it('GET /health returns ok', async () => {
    const app = buildServer()
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('ok')
  })

  it('GET /ready returns ready', async () => {
    const app = buildServer()
    const response = await app.inject({ method: 'GET', url: '/ready' })
    expect(response.statusCode).toBe(200)
    expect(response.json().status).toBe('ready')
  })
})

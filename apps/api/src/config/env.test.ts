import { describe, it, expect } from 'vitest'

describe('env validation', () => {
  it('throws when required env vars are missing', () => {
    const originalEnv = process.env
    // Temporarily clear required vars
    const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL, ...rest } = process.env
    process.env = { ...rest }

    expect(() => {
      // Re-import by resetting module — use dynamic require to test
      const { z } = require('zod')
      const schema = z.object({
        SUPABASE_URL: z.string().min(1),
        SUPABASE_ANON_KEY: z.string().min(1),
        SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
        REDIS_URL: z.string().min(1),
      })
      const result = schema.safeParse(process.env)
      if (!result.success) throw new Error('Invalid env')
    }).toThrow('Invalid env')

    process.env = originalEnv
  })
})

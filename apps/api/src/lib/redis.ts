import Redis from 'ioredis'
import { env } from '../config/env'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: false,
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message)
})

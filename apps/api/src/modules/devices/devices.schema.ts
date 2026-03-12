import { z } from 'zod'

export const registerTokenSchema = z.object({
  token: z.string().min(1, 'Token required'),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().optional(),
})

export const deviceIdParamSchema = z.object({ id: z.string().uuid() })

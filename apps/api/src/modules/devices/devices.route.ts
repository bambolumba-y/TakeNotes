import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../lib/auth'
import { registerTokenHandler, deactivateTokenHandler } from './devices.handler'

export async function devicesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.post('/devices/register-push-token', registerTokenHandler)
  app.delete('/devices/:id', deactivateTokenHandler)
}

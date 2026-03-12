import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../lib/auth'
import { getMeHandler, patchMeHandler } from './users.handler'

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/me', getMeHandler)
  app.patch('/me', patchMeHandler)
}

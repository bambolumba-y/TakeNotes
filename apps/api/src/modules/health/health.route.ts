import type { FastifyInstance } from 'fastify'
import { healthHandler, readyHandler } from './health.handler'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', healthHandler)
  app.get('/ready', readyHandler)
}

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../lib/auth'
import {
  telegramConnectHandler, telegramStatusHandler,
  telegramDisconnectHandler, telegramWebhookHandler,
} from './channels.handler'

export async function channelsRoutes(app: FastifyInstance) {
  // Authenticated routes
  app.register(async (authed) => {
    authed.addHook('preHandler', requireAuth)
    authed.post('/integrations/telegram/connect', telegramConnectHandler)
    authed.get('/integrations/telegram/status', telegramStatusHandler)
    authed.post('/integrations/telegram/disconnect', telegramDisconnectHandler)
  })

  // Webhook — no auth, validated by secret header
  app.post('/integrations/telegram/webhook', telegramWebhookHandler)
}

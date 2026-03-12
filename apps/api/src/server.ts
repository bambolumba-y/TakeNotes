import Fastify from 'fastify'
import cors from '@fastify/cors'
import * as Sentry from '@sentry/node'
import { healthRoutes } from './modules/health/health.route'
import { usersRoutes } from './modules/users/users.route'
import { foldersRoutes } from './modules/folders/folders.route'
import { themesRoutes } from './modules/themes/themes.route'
import { notesRoutes } from './modules/notes/notes.route'
import { remindersRoutes } from './modules/reminders/reminders.route'
import { devicesRoutes } from './modules/devices/devices.route'
import { channelsRoutes } from './modules/channels/channels.route'

export function buildServer() {
  const app = Fastify({ logger: true })
  app.register(cors, { origin: true })

  // Public routes — no authentication required
  app.register(healthRoutes, { prefix: '/' })

  // All other routes require authentication (enforced per-route via preHandler hooks)
  app.register(usersRoutes, { prefix: '/' })
  app.register(foldersRoutes, { prefix: '/' })
  app.register(themesRoutes, { prefix: '/' })
  app.register(notesRoutes, { prefix: '/' })
  app.register(remindersRoutes, { prefix: '/' })
  app.register(devicesRoutes, { prefix: '/' })
  // channelsRoutes: authenticated sub-routes + public Telegram webhook (validated by secret header)
  app.register(channelsRoutes, { prefix: '/' })

  // Sentry error handler — must be registered after routes
  app.setErrorHandler((error, _request, reply) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error)
    }
    app.log.error(error)
    const statusCode = error.statusCode ?? 500
    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'Internal server error' : error.message,
      },
    })
  })

  return app
}

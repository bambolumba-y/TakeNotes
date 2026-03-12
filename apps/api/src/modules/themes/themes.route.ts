import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../lib/auth'
import { listThemesHandler, createThemeHandler, updateThemeHandler, deleteThemeHandler } from './themes.handler'

export async function themesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/themes', listThemesHandler)
  app.post('/themes', createThemeHandler)
  app.patch('/themes/:id', updateThemeHandler)
  app.delete('/themes/:id', deleteThemeHandler)
}

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../lib/auth'
import { listFoldersHandler, createFolderHandler, updateFolderHandler, deleteFolderHandler } from './folders.handler'

export async function foldersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/folders', listFoldersHandler)
  app.post('/folders', createFolderHandler)
  app.patch('/folders/:id', updateFolderHandler)
  app.delete('/folders/:id', deleteFolderHandler)
}

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../lib/auth'
import {
  listNotesHandler, getNoteHandler, createNoteHandler,
  updateNoteHandler, deleteNoteHandler,
  pinNoteHandler, unpinNoteHandler,
  archiveNoteHandler, restoreNoteHandler,
} from './notes.handler'

export async function notesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/notes', listNotesHandler)
  app.post('/notes', createNoteHandler)
  app.get('/notes/:id', getNoteHandler)
  app.patch('/notes/:id', updateNoteHandler)
  app.delete('/notes/:id', deleteNoteHandler)
  app.post('/notes/:id/pin', pinNoteHandler)
  app.post('/notes/:id/unpin', unpinNoteHandler)
  app.post('/notes/:id/archive', archiveNoteHandler)
  app.post('/notes/:id/restore', restoreNoteHandler)
}

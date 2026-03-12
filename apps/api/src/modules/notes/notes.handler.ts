import type { FastifyRequest, FastifyReply } from 'fastify'
import { createNoteBodySchema, updateNoteBodySchema, noteIdParamSchema, noteQuerySchema } from './notes.schema'
import * as svc from './notes.service'

export async function listNotesHandler(req: FastifyRequest, reply: FastifyReply) {
  const q = noteQuerySchema.parse(req.query)
  return reply.send({ success: true, data: await svc.listNotes(req.user!.id, q) })
}

export async function getNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = noteIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  const note = await svc.getNoteById(req.user!.id, param.data.id)
  if (!note) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } })
  return reply.send({ success: true, data: note })
}

export async function createNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = createNoteBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  return reply.status(201).send({ success: true, data: await svc.createNote(req.user!.id, parsed.data) })
}

export async function updateNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = noteIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  const parsed = updateNoteBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  return reply.send({ success: true, data: await svc.updateNote(req.user!.id, param.data.id, parsed.data) })
}

export async function deleteNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = noteIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  await svc.deleteNote(req.user!.id, param.data.id)
  return reply.status(204).send()
}

export async function pinNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = noteIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  return reply.send({ success: true, data: await svc.pinNote(req.user!.id, param.data.id, true) })
}

export async function unpinNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = noteIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  return reply.send({ success: true, data: await svc.pinNote(req.user!.id, param.data.id, false) })
}

export async function archiveNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = noteIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  return reply.send({ success: true, data: await svc.archiveNote(req.user!.id, param.data.id) })
}

export async function restoreNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = noteIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  return reply.send({ success: true, data: await svc.restoreNote(req.user!.id, param.data.id) })
}

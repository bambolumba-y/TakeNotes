import type { FastifyRequest, FastifyReply } from 'fastify'
import { createFolderBodySchema, updateFolderBodySchema, folderIdParamSchema } from './folders.schema'
import * as svc from './folders.service'

export async function listFoldersHandler(req: FastifyRequest, reply: FastifyReply) {
  const folders = await svc.listFolders(req.user!.id)
  return reply.send({ success: true, data: folders })
}

export async function createFolderHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = createFolderBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  const folder = await svc.createFolder(req.user!.id, parsed.data)
  return reply.status(201).send({ success: true, data: folder })
}

export async function updateFolderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = folderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  const parsed = updateFolderBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  const folder = await svc.updateFolder(req.user!.id, param.data.id, parsed.data)
  return reply.send({ success: true, data: folder })
}

export async function deleteFolderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = folderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  await svc.deleteFolder(req.user!.id, param.data.id)
  return reply.status(204).send()
}

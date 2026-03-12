import type { FastifyRequest, FastifyReply } from 'fastify'
import { createThemeBodySchema, updateThemeBodySchema, themeIdParamSchema } from './themes.schema'
import * as svc from './themes.service'

export async function listThemesHandler(req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ success: true, data: await svc.listThemes(req.user!.id) })
}

export async function createThemeHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = createThemeBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  return reply.status(201).send({ success: true, data: await svc.createTheme(req.user!.id, parsed.data) })
}

export async function updateThemeHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = themeIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  const parsed = updateThemeBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  return reply.send({ success: true, data: await svc.updateTheme(req.user!.id, param.data.id, parsed.data) })
}

export async function deleteThemeHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = themeIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  await svc.deleteTheme(req.user!.id, param.data.id)
  return reply.status(204).send()
}

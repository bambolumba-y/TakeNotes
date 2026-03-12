import type { FastifyRequest, FastifyReply } from 'fastify'
import { registerTokenSchema, deviceIdParamSchema } from './devices.schema'
import { registerDeviceToken, deactivateDeviceToken } from './devices.service'

export async function registerTokenHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = registerTokenSchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  const result = await registerDeviceToken(req.user!.id, parsed.data)
  return reply.status(201).send({ success: true, data: result })
}

export async function deactivateTokenHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = deviceIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  await deactivateDeviceToken(req.user!.id, param.data.id)
  return reply.status(204).send()
}

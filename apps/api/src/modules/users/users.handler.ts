import type { FastifyRequest, FastifyReply } from 'fastify'
import { getUserProfile, upsertUserProfile, updateUserProfile } from './users.service'
import { updateMeSchema } from './users.schema'

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user!
  let profile = await getUserProfile(user.id)

  if (!profile) {
    profile = await upsertUserProfile(user.id, user.email ?? '')
  }

  return reply.send({ success: true, data: profile })
}

export async function patchMeHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user!
  const result = updateMeSchema.safeParse(request.body)

  if (!result.success) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: result.error.message },
    })
  }

  const profile = await updateUserProfile(user.id, result.data)
  return reply.send({ success: true, data: profile })
}

import type { FastifyRequest, FastifyReply } from 'fastify'

export async function healthHandler(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ status: 'ok', uptime: process.uptime() })
}

export async function readyHandler(_req: FastifyRequest, reply: FastifyReply) {
  // In Phase 1 we verify the process is alive and env is loaded.
  // DB/Redis connectivity checks are added in later phases.
  return reply.send({ status: 'ready' })
}

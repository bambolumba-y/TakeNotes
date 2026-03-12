import type { FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from './supabase'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } })
  }

  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
  }

  request.user = data.user
}

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    user?: import('@supabase/supabase-js').User
  }
}

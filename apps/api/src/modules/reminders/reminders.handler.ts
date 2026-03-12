import type { FastifyRequest, FastifyReply } from 'fastify'
import { createReminderBodySchema, updateReminderBodySchema, reminderIdParamSchema, snoozeBodySchema, reminderQuerySchema } from './reminders.schema'
import * as svc from './reminders.service'

export async function listRemindersHandler(req: FastifyRequest, reply: FastifyReply) {
  const q = reminderQuerySchema.parse(req.query)
  return reply.send({ success: true, data: await svc.listReminders(req.user!.id, q) })
}

export async function getReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = reminderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  const r = await svc.getReminderById(req.user!.id, param.data.id)
  if (!r) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found' } })
  return reply.send({ success: true, data: r })
}

export async function createReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = createReminderBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  return reply.status(201).send({ success: true, data: await svc.createReminder(req.user!.id, parsed.data) })
}

export async function updateReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = reminderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  const parsed = updateReminderBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  return reply.send({ success: true, data: await svc.updateReminder(req.user!.id, param.data.id, parsed.data) })
}

export async function deleteReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = reminderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  await svc.deleteReminder(req.user!.id, param.data.id)
  return reply.status(204).send()
}

export async function completeReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = reminderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  return reply.send({ success: true, data: await svc.completeReminder(req.user!.id, param.data.id) })
}

export async function snoozeReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = reminderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  const parsed = snoozeBodySchema.safeParse(req.body)
  if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
  try {
    return reply.send({ success: true, data: await svc.snoozeReminder(req.user!.id, param.data.id, parsed.data.snoozeUntil) })
  } catch (e) {
    return reply.status(400).send({ success: false, error: { code: 'INVALID_SNOOZE', message: (e as Error).message } })
  }
}

export async function cancelReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = reminderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  return reply.send({ success: true, data: await svc.cancelReminder(req.user!.id, param.data.id) })
}

export async function restoreReminderHandler(req: FastifyRequest, reply: FastifyReply) {
  const param = reminderIdParamSchema.safeParse(req.params)
  if (!param.success) return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'Invalid id' } })
  try {
    return reply.send({ success: true, data: await svc.restoreReminder(req.user!.id, param.data.id) })
  } catch (e) {
    return reply.status(400).send({ success: false, error: { code: 'INVALID_RESTORE', message: (e as Error).message } })
  }
}

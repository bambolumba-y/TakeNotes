import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../lib/auth'
import {
  listRemindersHandler, getReminderHandler, createReminderHandler,
  updateReminderHandler, deleteReminderHandler,
  completeReminderHandler, snoozeReminderHandler, cancelReminderHandler, restoreReminderHandler,
} from './reminders.handler'

export async function remindersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  app.get('/reminders', listRemindersHandler)
  app.post('/reminders', createReminderHandler)
  app.get('/reminders/:id', getReminderHandler)
  app.patch('/reminders/:id', updateReminderHandler)
  app.delete('/reminders/:id', deleteReminderHandler)
  app.post('/reminders/:id/complete', completeReminderHandler)
  app.post('/reminders/:id/snooze', snoozeReminderHandler)
  app.post('/reminders/:id/cancel', cancelReminderHandler)
  app.post('/reminders/:id/restore', restoreReminderHandler)
}

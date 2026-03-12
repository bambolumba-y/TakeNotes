import { startReminderWorker } from './reminder.worker'

export function startAllWorkers() {
  const reminderWorker = startReminderWorker()
  return { reminderWorker }
}

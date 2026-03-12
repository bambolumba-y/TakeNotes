// Load .env file before anything else (must be first import)
import 'dotenv/config'

// Initialize Sentry before any other imports so all errors are captured
import { initSentry } from './lib/sentry'
initSentry()

import { applyProductionGuards } from './config/production'
applyProductionGuards()

import { env } from './config/env'
import { buildServer } from './server'
import { startAllWorkers } from './workers/index'

async function main() {
  // Start BullMQ workers
  startAllWorkers()

  const app = buildServer()
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()

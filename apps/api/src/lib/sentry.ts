import * as Sentry from '@sentry/node'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json') as { version?: string }

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: pkg.version ?? '0.0.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,
  })
}

export { Sentry }

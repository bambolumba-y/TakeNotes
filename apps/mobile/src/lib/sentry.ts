import * as Sentry from 'sentry-expo'
import Constants from 'expo-constants'

export function initSentry(): void {
  const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    enableInExpoDevelopment: false,
    debug: process.env.NODE_ENV === 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,
  })
}

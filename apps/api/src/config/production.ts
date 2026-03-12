/**
 * Production-specific configuration checks.
 *
 * This module is imported at startup when NODE_ENV=production to enforce
 * production-only constraints. It does not override env.ts validation;
 * it adds extra runtime guards that are not appropriate in development.
 */

export function applyProductionGuards(): void {
  if (process.env.NODE_ENV !== 'production') return

  // Enforce HTTPS for Supabase URL in production
  const supabaseUrl = process.env.SUPABASE_URL ?? ''
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error('SUPABASE_URL must use HTTPS in production')
  }

  // Enforce that Sentry DSN is configured in production (warn if missing)
  if (!process.env.SENTRY_DSN) {
    // Use console.warn here intentionally — logger may not be initialized yet
    console.warn('[Production] WARNING: SENTRY_DSN is not set. Errors will not be tracked.')
  }

  // Enforce a non-default log level in production
  if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = 'info'
  }
}

/**
 * Route error helpers — surface error messages outside of production so
 * verification doesn't have to roundtrip through Postgres logs to diagnose
 * a 500. Vercel sets VERCEL_ENV to 'preview' on preview deploys and
 * 'production' on prod URLs.
 */

export function errorDetail(error: unknown): string | undefined {
  if (process.env.VERCEL_ENV === 'production') return undefined
  if (error instanceof Error) return error.message
  return String(error)
}

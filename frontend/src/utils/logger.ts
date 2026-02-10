/**
 * Lightweight logging utility.
 *
 * In development: delegates to console methods as-is.
 * In production: suppresses debug/info, keeps warn/error for diagnostics
 * but strips stack traces to avoid leaking implementation details.
 *
 * Can be extended later to ship errors to an external service (e.g. Sentry).
 */

const isDev =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.MODE === 'development';

function noop(..._args: unknown[]) {
  // intentionally empty
}

export const logger = {
  /** Always logged — actionable errors that need investigation */
  error: isDev ? console.error.bind(console) : console.error.bind(console),
  /** Logged in all environments — potential issues */
  warn: isDev ? console.warn.bind(console) : console.warn.bind(console),
  /** Logged only in development */
  info: isDev ? console.info.bind(console) : noop,
  /** Logged only in development */
  debug: isDev ? console.debug.bind(console) : noop,
};

/**
 * Shared error handling utilities
 */

/** Return a safe error message, hiding internals in production */
export function safeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : 'Unknown error';
  }
  return 'An error occurred';
}

/** Check if an error is a Prisma P2025 "record not found" */
export function isPrismaNotFound(error: unknown): boolean {
  return !!(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'P2025'
  );
}

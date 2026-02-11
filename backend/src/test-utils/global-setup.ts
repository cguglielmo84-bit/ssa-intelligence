/**
 * Global setup for integration tests.
 * Runs once before all test files.
 * Resets the test database schema via prisma db push.
 */

import { execSync } from 'child_process';

export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL || '';

  // Safety guard: never truncate a non-test database
  if (!dbUrl.includes('_test')) {
    throw new Error(
      `DATABASE_URL must point to a test database (must contain "_test"). Got: ${dbUrl}`
    );
  }

  console.log('[global-setup] Resetting test database schema...');
  execSync('npx prisma db push --force-reset --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      // Required for non-interactive environments (CI, test runners)
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
    },
    cwd: new URL('../../', import.meta.url).pathname,
  });
  console.log('[global-setup] Test database ready.');
}

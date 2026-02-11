/**
 * Auth helpers for integration tests.
 * Inject proxy auth headers into supertest requests.
 */

import type { Test } from 'supertest';

interface TestUser {
  email: string;
  name?: string;
  groups?: string;
}

/**
 * Inject proxy auth headers for a given user.
 * The auth middleware auto-creates users in the DB on first request.
 */
export function asUser(request: Test, user: TestUser): Test {
  return request
    .set('x-auth-request-email', user.email)
    .set('x-auth-request-user', user.name || user.email.split('@')[0])
    .set('x-auth-request-groups', user.groups || '');
}

/**
 * Inject auth headers for the default admin user.
 * Must match ADMIN_EMAILS env var set in setup.ts.
 */
export function asAdmin(request: Test): Test {
  return asUser(request, {
    email: 'admin@ssaandco.com',
    name: 'Admin User',
  });
}

/**
 * Inject auth headers for a regular member user.
 */
export function asMember(request: Test): Test {
  return asUser(request, {
    email: 'member@ssaandco.com',
    name: 'Member User',
  });
}

/**
 * Inject auth headers for a second member user (for visibility tests).
 */
export function asOtherMember(request: Test): Test {
  return asUser(request, {
    email: 'other@ssaandco.com',
    name: 'Other User',
  });
}

/**
 * Test data factories.
 * Thin wrappers around prisma.create() with sensible defaults.
 */

import { testPrisma } from './db-helpers.js';
import type { ReportType, VisibilityScope, UserRole, UserStatus, FeedbackType, FeedbackStatus } from '@prisma/client';

let counter = 0;
const unique = () => `${Date.now()}-${++counter}`;

// ─── User ────────────────────────────────────────────────────────────────────

export async function createTestUser(overrides: {
  email?: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
} = {}) {
  return testPrisma.user.create({
    data: {
      email: overrides.email ?? `user-${unique()}@ssaandco.com`,
      name: overrides.name ?? 'Test User',
      role: overrides.role ?? 'MEMBER',
      status: overrides.status ?? 'ACTIVE',
    },
  });
}

// ─── Group ───────────────────────────────────────────────────────────────────

export async function createTestGroup(overrides: {
  name?: string;
  slug?: string;
} = {}) {
  const slug = overrides.slug ?? `group-${unique()}`;
  return testPrisma.group.create({
    data: {
      name: overrides.name ?? `Test Group ${slug}`,
      slug,
    },
  });
}

export async function addUserToGroup(userId: string, groupId: string) {
  return testPrisma.groupMembership.create({
    data: { userId, groupId },
  });
}

// ─── Research Job ────────────────────────────────────────────────────────────

export async function createTestJob(overrides: {
  userId: string;
  companyName?: string;
  status?: string;
  reportType?: ReportType;
  visibilityScope?: VisibilityScope;
  groupIds?: string[];
  selectedSections?: string[];
} & Record<string, unknown>) {
  const u = unique();
  const {
    userId,
    companyName = `Test Company ${u}`,
    status = 'queued',
    reportType = 'GENERIC',
    visibilityScope = 'PRIVATE',
    groupIds = [],
    selectedSections = [],
    ...rest
  } = overrides;

  const normalizedCompany = companyName.trim().toLowerCase().replace(/\s+/g, ' ');
  const job = await testPrisma.researchJob.create({
    data: {
      companyName,
      normalizedCompany,
      geography: 'Global',
      normalizedGeography: 'global',
      status,
      reportType,
      visibilityScope,
      selectedSections,
      userId,
      ...rest,
    },
  });

  // Link groups if provided
  for (const groupId of groupIds) {
    await testPrisma.researchJobGroup.create({
      data: { jobId: job.id, groupId },
    });
  }

  return job;
}

// ─── Research Sub-Job ────────────────────────────────────────────────────────

export async function createTestSubJob(overrides: {
  researchId: string;
  stage: string;
  status?: string;
  dependencies?: string[];
}) {
  return testPrisma.researchSubJob.create({
    data: {
      researchId: overrides.researchId,
      stage: overrides.stage,
      status: overrides.status ?? 'pending',
      dependencies: overrides.dependencies ?? [],
    },
  });
}

// ─── Pricing Rate ────────────────────────────────────────────────────────────

export async function createTestPricingRate(overrides: {
  provider?: string;
  model?: string;
  inputRate?: number;
  outputRate?: number;
  cacheReadRate?: number;
  cacheWriteRate?: number;
  effectiveTo?: Date | null;
} = {}) {
  return testPrisma.pricingRate.create({
    data: {
      provider: overrides.provider ?? 'anthropic',
      model: overrides.model ?? 'claude-sonnet-4-5',
      inputRate: overrides.inputRate ?? 3.0,
      outputRate: overrides.outputRate ?? 15.0,
      cacheReadRate: overrides.cacheReadRate ?? 0.3,
      cacheWriteRate: overrides.cacheWriteRate ?? 3.75,
      effectiveTo: overrides.effectiveTo ?? null,
    },
  });
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export async function createTestFeedback(overrides: {
  type?: FeedbackType;
  title?: string;
  message?: string;
  status?: FeedbackStatus;
  email?: string;
  name?: string;
} = {}) {
  return testPrisma.feedback.create({
    data: {
      type: overrides.type ?? 'bug',
      title: overrides.title ?? 'Test feedback title',
      message: overrides.message ?? 'This is a test feedback message for integration testing.',
      status: overrides.status ?? 'new_feedback',
      email: overrides.email ?? null,
      name: overrides.name ?? null,
    },
  });
}

// ─── News ────────────────────────────────────────────────────────────────────

export async function createTestTrackedCompany(overrides: {
  name?: string;
  ticker?: string;
} = {}) {
  return testPrisma.trackedCompany.create({
    data: {
      name: overrides.name ?? `Company ${unique()}`,
      ticker: overrides.ticker ?? null,
    },
  });
}

export async function createTestNewsArticle(overrides: {
  headline?: string;
  sourceUrl?: string;
  companyId?: string | null;
  isSent?: boolean;
  isArchived?: boolean;
  publishedAt?: Date;
} = {}) {
  const u = unique();
  return testPrisma.newsArticle.create({
    data: {
      headline: overrides.headline ?? `Article headline ${u}`,
      sourceUrl: overrides.sourceUrl ?? `https://example.com/article-${u}`,
      companyId: overrides.companyId ?? null,
      isSent: overrides.isSent ?? false,
      isArchived: overrides.isArchived ?? false,
      publishedAt: overrides.publishedAt ?? new Date(),
    },
  });
}

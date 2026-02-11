/**
 * Database helpers for integration tests.
 * Provides truncation and cleanup utilities.
 */

import { PrismaClient } from '@prisma/client';

export const testPrisma = new PrismaClient();

/**
 * Delete all rows from every table in dependency order (children first).
 * Uses a single transaction for performance.
 */
export async function truncateAll() {
  await testPrisma.$transaction([
    // Junction tables first
    testPrisma.articleRevenueOwner.deleteMany(),
    testPrisma.articleSource.deleteMany(),
    testPrisma.callDietCompany.deleteMany(),
    testPrisma.callDietPerson.deleteMany(),
    testPrisma.callDietTag.deleteMany(),
    testPrisma.researchJobGroup.deleteMany(),
    testPrisma.groupMembership.deleteMany(),
    // Children
    testPrisma.costEvent.deleteMany(),
    testPrisma.researchSubJob.deleteMany(),
    testPrisma.newsArticle.deleteMany(),
    testPrisma.promptTestRun.deleteMany(),
    testPrisma.promptVersion.deleteMany(),
    testPrisma.prompt.deleteMany(),
    testPrisma.seenUrl.deleteMany(),
    testPrisma.newsConfig.deleteMany(),
    // Parents
    testPrisma.researchJob.deleteMany(),
    testPrisma.trackedPerson.deleteMany(),
    testPrisma.trackedCompany.deleteMany(),
    testPrisma.newsTag.deleteMany(),
    testPrisma.revenueOwner.deleteMany(),
    testPrisma.pricingRate.deleteMany(),
    testPrisma.feedback.deleteMany(),
    testPrisma.apiKey.deleteMany(),
    testPrisma.group.deleteMany(),
    testPrisma.user.deleteMany(),
  ]);
}

/**
 * Disconnect the Prisma client. Call in afterAll().
 */
export async function disconnectPrisma() {
  await testPrisma.$disconnect();
}

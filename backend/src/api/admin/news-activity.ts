/**
 * Admin News Activity API Routes
 * GET /api/admin/news/activity - Overview metrics (summary, weekly, users, companies, articles)
 * GET /api/admin/news/activity/companies - Company detail with reader breakdowns
 * GET /api/admin/news/activity/:userId - Per-user activity detail
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

const router = Router();

// Meaningful event types for tier classification
const MEANINGFUL_TYPES = ['article_open', 'article_link_click', 'pin', 'unpin', 'export_pdf', 'export_markdown', 'export_docx'];

function classifyTier(meaningfulEvents: number): string {
  if (meaningfulEvents >= 20) return 'Power';
  if (meaningfulEvents >= 5) return 'Regular';
  if (meaningfulEvents >= 1) return 'Occasional';
  return 'Inactive';
}

function parseDays(query: any): { daysNum: number; since: Date } {
  const daysNum = Math.min(Math.max(Number(query.days) || 30, 1), 365);
  const since = new Date();
  since.setDate(since.getDate() - daysNum);
  return { daysNum, since };
}

// ============================================================================
// GET /api/admin/news/activity - Overview
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const { since } = parseDays(req.query);

    // Optional user filter
    const userIdsParam = typeof req.query.userIds === 'string' ? req.query.userIds : '';
    const filterUserIds = userIdsParam ? userIdsParam.split(',').filter(Boolean) : [];
    const hasUserFilter = filterUserIds.length > 0;
    const userFilterSql = hasUserFilter
      ? Prisma.sql`AND ua.user_id IN (${Prisma.join(filterUserIds)})`
      : Prisma.empty;
    const userFilterSqlNoAlias = hasUserFilter
      ? Prisma.sql`AND user_id IN (${Prisma.join(filterUserIds)})`
      : Prisma.empty;
    const userFilterPrisma = hasUserFilter ? { userId: { in: filterUserIds } } : {};

    const [
      readThroughResult,
      avgReadTimeResult,
      totalArticleReads,
      totalExports,
      totalLinkClicksRaw,
      weeklyEngagement,
      userMeaningfulCounts,
      totalUsersWithCallDiet,
      topCompaniesRaw,
      topArticlesRaw,
    ] = await Promise.all([
      // 1. Read-through rate
      prisma.$queryRaw<[{ total_opens: bigint; meaningful_reads: bigint }]>`
        SELECT
          COUNT(DISTINCT ao.id) AS total_opens,
          COUNT(DISTINCT ac.id) AS meaningful_reads
        FROM user_activities ao
        LEFT JOIN user_activities ac
          ON ac.user_id = ao.user_id
          AND ac.article_id = ao.article_id
          AND ac.type = 'article_close'
          AND ac.duration_ms > 15000
          AND ac.created_at >= ${since}
        WHERE ao.type = 'article_open'
          AND ao.created_at >= ${since}
          ${hasUserFilter ? Prisma.sql`AND ao.user_id IN (${Prisma.join(filterUserIds)})` : Prisma.empty}
      `,

      // 2. Total read time from article_close events
      prisma.userActivity.aggregate({
        where: {
          type: 'article_close',
          durationMs: { not: null, gt: 0 },
          createdAt: { gte: since },
          ...userFilterPrisma,
        },
        _sum: { durationMs: true },
      }),

      // 3. Total article reads
      prisma.userActivity.count({
        where: { type: 'article_open', createdAt: { gte: since }, ...userFilterPrisma },
      }),

      // 4. Total exports
      prisma.userActivity.count({
        where: {
          type: { in: ['export_pdf', 'export_markdown', 'export_docx'] },
          createdAt: { gte: since },
          ...userFilterPrisma,
        },
      }),

      // 5. Total link clicks
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count FROM user_activities
        WHERE type = 'article_link_click' AND created_at >= ${since}
        ${userFilterSqlNoAlias}
      `,

      // 6. Weekly engagement time series
      prisma.$queryRaw<Array<{
        week_start: Date;
        unique_users: bigint;
        article_reads: bigint;
        meaningful_reads: bigint;
        exports: bigint;
      }>>`
        SELECT
          DATE_TRUNC('week', created_at) AS week_start,
          COUNT(DISTINCT user_id) AS unique_users,
          COUNT(*) FILTER (WHERE type = 'article_open') AS article_reads,
          COUNT(*) FILTER (WHERE type = 'article_open' OR type = 'pin' OR type = 'unpin'
            OR type = 'export_pdf' OR type = 'export_markdown' OR type = 'export_docx') AS meaningful_reads,
          COUNT(*) FILTER (WHERE type = 'export_pdf' OR type = 'export_markdown' OR type = 'export_docx') AS exports
        FROM user_activities
        WHERE created_at >= ${since}
        ${userFilterSqlNoAlias}
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week_start ASC
      `,

      // 7. Per-user meaningful event counts (for tier classification)
      prisma.$queryRaw<Array<{
        user_id: string;
        meaningful_count: bigint;
        article_reads: bigint;
        link_clicks: bigint;
        exports: bigint;
        pins: bigint;
        total_read_time_ms: bigint;
        last_active: Date | null;
      }>>`
        SELECT
          ua.user_id,
          COUNT(*) FILTER (WHERE ua.type IN ('article_open','article_link_click','pin','unpin','export_pdf','export_markdown','export_docx')) AS meaningful_count,
          COUNT(*) FILTER (WHERE ua.type = 'article_open') AS article_reads,
          COUNT(*) FILTER (WHERE ua.type = 'article_link_click') AS link_clicks,
          COUNT(*) FILTER (WHERE ua.type IN ('export_pdf','export_markdown','export_docx')) AS exports,
          COUNT(*) FILTER (WHERE ua.type IN ('pin','unpin')) AS pins,
          COALESCE(SUM(ua.duration_ms) FILTER (WHERE ua.type = 'article_close' AND ua.duration_ms > 0), 0) AS total_read_time_ms,
          MAX(ua.created_at) AS last_active
        FROM user_activities ua
        WHERE ua.created_at >= ${since}
        ${userFilterSql}
        GROUP BY ua.user_id
      `,

      // 8. Total users with call diets
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId") AS count FROM user_call_diet_companies
      `,

      // 9. Top companies by reads
      prisma.$queryRaw<Array<{
        company_id: string;
        company_name: string;
        ticker: string | null;
        total_reads: bigint;
        unique_readers: bigint;
        total_read_time_ms: bigint;
        link_clicks: bigint;
        exports: bigint;
        call_diet_user_count: bigint;
      }>>`
        SELECT
          tc.id AS company_id,
          tc.name AS company_name,
          tc.ticker,
          COUNT(ua.id) FILTER (WHERE ua.type = 'article_open') AS total_reads,
          COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.type = 'article_open') AS unique_readers,
          COALESCE(SUM(ua.duration_ms) FILTER (WHERE ua.type = 'article_close' AND ua.duration_ms > 0), 0) AS total_read_time_ms,
          COUNT(ua.id) FILTER (WHERE ua.type = 'article_link_click') AS link_clicks,
          COUNT(ua.id) FILTER (WHERE ua.type IN ('export_pdf', 'export_markdown', 'export_docx')) AS exports,
          (SELECT COUNT(*) FROM user_call_diet_companies ucd WHERE ucd."companyId" = tc.id) AS call_diet_user_count
        FROM user_activities ua
        JOIN news_articles na ON na.id = ua.article_id
        JOIN tracked_companies tc ON tc.id = na.company_id
        WHERE ua.type IN ('article_open', 'article_close', 'article_link_click', 'export_pdf', 'export_markdown', 'export_docx')
          AND ua.created_at >= ${since}
          ${userFilterSql}
        GROUP BY tc.id, tc.name, tc.ticker
        ORDER BY total_reads DESC
        LIMIT 20
      `,

      // 10. Top articles by reads
      prisma.$queryRaw<Array<{
        article_id: string;
        headline: string;
        company_name: string | null;
        ticker: string | null;
        reads: bigint;
        unique_readers: bigint;
        avg_read_time_ms: number | null;
        link_clicks: bigint;
        exports: bigint;
      }>>`
        SELECT
          na.id AS article_id,
          na.headline,
          tc.name AS company_name,
          tc.ticker,
          COUNT(ua.id) FILTER (WHERE ua.type = 'article_open') AS reads,
          COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.type = 'article_open') AS unique_readers,
          CASE WHEN COUNT(*) FILTER (WHERE ua.type = 'article_close' AND ua.duration_ms > 0) > 0
            THEN SUM(ua.duration_ms) FILTER (WHERE ua.type = 'article_close' AND ua.duration_ms > 0)
                 / COUNT(*) FILTER (WHERE ua.type = 'article_close' AND ua.duration_ms > 0)
            ELSE NULL
          END AS avg_read_time_ms,
          COUNT(ua.id) FILTER (WHERE ua.type = 'article_link_click') AS link_clicks,
          COUNT(ua.id) FILTER (WHERE ua.type IN ('export_pdf', 'export_markdown', 'export_docx')) AS exports
        FROM user_activities ua
        JOIN news_articles na ON na.id = ua.article_id
        LEFT JOIN tracked_companies tc ON tc.id = na.company_id
        WHERE ua.type IN ('article_open', 'article_close', 'article_link_click', 'export_pdf', 'export_markdown', 'export_docx')
          AND ua.created_at >= ${since}
          ${userFilterSql}
        GROUP BY na.id, na.headline, tc.name, tc.ticker
        ORDER BY reads DESC
        LIMIT 15
      `,
    ]);

    // Process read-through rate
    const rtr = readThroughResult[0];
    const totalOpens = Number(rtr?.total_opens ?? 0);
    const meaningfulReadsCount = Number(rtr?.meaningful_reads ?? 0);
    const readThroughRate = totalOpens > 0 ? meaningfulReadsCount / totalOpens : 0;

    // Process total read time
    const totalReadTimeMs = avgReadTimeResult._sum.durationMs || 0;
    const totalReadTimeSec = Math.round(totalReadTimeMs / 1000);

    // Process users - merge activity data with all call-diet users
    const callDietUsers = await prisma.user.findMany({
      where: { callDietCompanies: { some: {} } },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { callDietCompanies: true } },
      },
    });

    const activityMap = new Map(
      userMeaningfulCounts.map(u => [u.user_id, u])
    );

    // Build user rows: all users who have call diets OR have activity
    const allUserIds = new Set([
      ...callDietUsers.map(u => u.id),
      ...userMeaningfulCounts.map(u => u.user_id),
    ]);

    // Fetch user details for activity-only users
    const activityOnlyIds = userMeaningfulCounts
      .filter(u => !callDietUsers.some(cu => cu.id === u.user_id))
      .map(u => u.user_id);
    const activityOnlyUsers = activityOnlyIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: activityOnlyIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    // Read-through per user
    const userReadThrough = await prisma.$queryRaw<Array<{ user_id: string; meaningful_reads: bigint }>>`
      SELECT
        ao.user_id,
        COUNT(DISTINCT ac.id) AS meaningful_reads
      FROM user_activities ao
      LEFT JOIN user_activities ac
        ON ac.user_id = ao.user_id
        AND ac.article_id = ao.article_id
        AND ac.type = 'article_close'
        AND ac.duration_ms > 15000
        AND ac.created_at >= ${since}
      WHERE ao.type = 'article_open'
        AND ao.created_at >= ${since}
        ${hasUserFilter ? Prisma.sql`AND ao.user_id IN (${Prisma.join(filterUserIds)})` : Prisma.empty}
      GROUP BY ao.user_id
    `;
    const userReadThroughMap = new Map(
      userReadThrough.map(u => [u.user_id, Number(u.meaningful_reads)])
    );

    const users = Array.from(allUserIds).map(userId => {
      const callDietUser = callDietUsers.find(u => u.id === userId);
      const actOnlyUser = activityOnlyUsers.find(u => u.id === userId);
      const activity = activityMap.get(userId);
      const meaningfulCount = Number(activity?.meaningful_count ?? 0);
      const articleReads = Number(activity?.article_reads ?? 0);
      const userMeaningfulReads = userReadThroughMap.get(userId) || 0;

      return {
        userId,
        name: callDietUser?.name ?? actOnlyUser?.name ?? null,
        email: callDietUser?.email ?? actOnlyUser?.email ?? '',
        tier: classifyTier(meaningfulCount),
        articleReads,
        meaningfulReads: userMeaningfulReads,
        totalReadTimeSec: Math.round(Number(activity?.total_read_time_ms ?? 0) / 1000),
        linkClicks: Number(activity?.link_clicks ?? 0),
        exports: Number(activity?.exports ?? 0),
        pins: Number(activity?.pins ?? 0),
        callDietCompanyCount: callDietUser?._count.callDietCompanies ?? 0,
        lastActiveAt: activity?.last_active?.toISOString() ?? null,
      };
    });

    // Unique active users (those with >= 1 meaningful event)
    const uniqueActiveUsers = userMeaningfulCounts.filter(
      u => Number(u.meaningful_count) >= 1
    ).length;

    // Compute readersOnDiet for top companies
    const topCompanies = topCompaniesRaw.map(c => ({
      companyId: c.company_id,
      companyName: c.company_name,
      ticker: c.ticker,
      totalReads: Number(c.total_reads),
      uniqueReaders: Number(c.unique_readers),
      totalReadTimeSec: Math.round(Number(c.total_read_time_ms) / 1000),
      linkClicks: Number(c.link_clicks),
      exports: Number(c.exports),
      callDietUserCount: Number(c.call_diet_user_count),
      readersOnDiet: 0, // will be computed below
    }));

    // Compute readersOnDiet: unique readers who also have this company in their call diet
    if (topCompanies.length > 0) {
      const companyIds = topCompanies.map(c => c.companyId);
      const readersOnDietRaw = await prisma.$queryRaw<Array<{
        company_id: string;
        readers_on_diet: bigint;
      }>>`
        SELECT
          tc.id AS company_id,
          COUNT(DISTINCT ua.user_id) AS readers_on_diet
        FROM user_activities ua
        JOIN news_articles na ON na.id = ua.article_id
        JOIN tracked_companies tc ON tc.id = na.company_id
        JOIN user_call_diet_companies ucd ON ucd."companyId" = tc.id AND ucd."userId" = ua.user_id
        WHERE ua.type = 'article_open'
          AND ua.created_at >= ${since}
          AND tc.id IN (${Prisma.join(companyIds)})
          ${userFilterSql}
        GROUP BY tc.id
      `;
      const rodMap = new Map(readersOnDietRaw.map(r => [r.company_id, Number(r.readers_on_diet)]));
      topCompanies.forEach(c => { c.readersOnDiet = rodMap.get(c.companyId) || 0; });
    }

    const topArticles = topArticlesRaw.map(a => ({
      articleId: a.article_id,
      headline: a.headline,
      companyName: a.company_name,
      ticker: a.ticker,
      reads: Number(a.reads),
      uniqueReaders: Number(a.unique_readers),
      avgReadTimeSec: a.avg_read_time_ms ? Math.round(Number(a.avg_read_time_ms) / 1000) : 0,
      linkClicks: Number(a.link_clicks),
      exports: Number(a.exports),
    }));

    res.json({
      summary: {
        readThroughRate: Math.round(readThroughRate * 100),
        totalReadTimeSec,
        totalArticleReads,
        totalExports,
        totalLinkClicks: Number(totalLinkClicksRaw[0]?.count ?? 0),
        uniqueActiveUsers,
        totalUsersWithCallDiet: Number(totalUsersWithCallDiet[0]?.count ?? 0),
      },
      weeklyEngagement: weeklyEngagement.map(w => ({
        weekStart: w.week_start.toISOString().split('T')[0],
        uniqueUsers: Number(w.unique_users),
        articleReads: Number(w.article_reads),
        meaningfulReads: Number(w.meaningful_reads),
        exports: Number(w.exports),
      })),
      users,
      topCompanies,
      topArticles,
    });
  } catch (error) {
    console.error('Error fetching activity metrics:', error);
    res.status(500).json({ error: 'Failed to fetch activity metrics' });
  }
});

// ============================================================================
// GET /api/admin/news/activity/companies - Company detail
// MUST be registered BEFORE /:userId to avoid Express param matching
// ============================================================================
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const { since } = parseDays(req.query);

    // All companies with reads in the period
    const companiesRaw = await prisma.$queryRaw<Array<{
      company_id: string;
      company_name: string;
      ticker: string | null;
      total_reads: bigint;
      unique_readers: bigint;
      total_read_time_ms: bigint;
      exports: bigint;
    }>>`
      SELECT
        tc.id AS company_id,
        tc.name AS company_name,
        tc.ticker,
        COUNT(ua.id) FILTER (WHERE ua.type = 'article_open') AS total_reads,
        COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.type = 'article_open') AS unique_readers,
        COALESCE(SUM(ua.duration_ms) FILTER (WHERE ua.type = 'article_close'), 0) AS total_read_time_ms,
        COUNT(ua.id) FILTER (WHERE ua.type IN ('export_pdf','export_markdown','export_docx')) AS exports
      FROM user_activities ua
      JOIN news_articles na ON na.id = ua.article_id
      JOIN tracked_companies tc ON tc.id = na.company_id
      WHERE ua.created_at >= ${since}
      GROUP BY tc.id, tc.name, tc.ticker
      ORDER BY total_reads DESC
    `;

    // For each company, get call diet users and readers
    const companyIds = companiesRaw.map(c => c.company_id);

    // Call diet users per company
    const callDietEntries = companyIds.length > 0
      ? await prisma.userCallDietCompany.findMany({
          where: { companyId: { in: companyIds } },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      : [];

    // Readers per company
    const readersRaw = companyIds.length > 0
      ? await prisma.$queryRaw<Array<{
          company_id: string;
          user_id: string;
          reads: bigint;
          last_read: Date | null;
        }>>`
          SELECT
            na.company_id,
            ua.user_id,
            COUNT(*) AS reads,
            MAX(ua.created_at) AS last_read
          FROM user_activities ua
          JOIN news_articles na ON na.id = ua.article_id
          WHERE ua.type = 'article_open'
            AND ua.created_at >= ${since}
            AND na.company_id IN (${Prisma.join(companyIds)})
          GROUP BY na.company_id, ua.user_id
        `
      : [];

    // Get user details for readers
    const readerUserIds = [...new Set(readersRaw.map(r => r.user_id))];
    const readerUsers = readerUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: readerUserIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const readerUserMap = new Map(readerUsers.map(u => [u.id, u]));

    const companies = companiesRaw.map(c => {
      const companyId = c.company_id;
      const totalReadTimeMs = Number(c.total_read_time_ms);
      const totalReads = Number(c.total_reads);

      // Call diet users for this company
      const dietEntries = callDietEntries.filter(e => e.companyId === companyId);
      const dietUserIds = new Set(dietEntries.map(e => e.userId));

      // All readers for this company
      const companyReaders = readersRaw.filter(r => r.company_id === companyId);
      const readerMap = new Map(companyReaders.map(r => [r.user_id, r]));

      // Diet users with their read counts
      const callDietUsersOut = dietEntries.map(e => ({
        userId: e.userId,
        name: e.user.name,
        email: e.user.email,
        reads: Number(readerMap.get(e.userId)?.reads ?? 0),
        lastReadAt: readerMap.get(e.userId)?.last_read?.toISOString() ?? null,
      }));

      // Non-diet readers
      const otherReaders = companyReaders
        .filter(r => !dietUserIds.has(r.user_id))
        .map(r => {
          const user = readerUserMap.get(r.user_id);
          return {
            userId: r.user_id,
            name: user?.name ?? null,
            email: user?.email ?? '',
            reads: Number(r.reads),
          };
        });

      return {
        companyId,
        companyName: c.company_name,
        ticker: c.ticker,
        totalReads,
        uniqueReaders: Number(c.unique_readers),
        totalReadTimeSec: Math.round(totalReadTimeMs / 1000),
        avgReadTimeSec: totalReads > 0 ? Math.round(totalReadTimeMs / totalReads / 1000) : 0,
        exports: Number(c.exports),
        callDietUsers: callDietUsersOut,
        otherReaders,
      };
    });

    res.json({ companies });
  } catch (error) {
    console.error('Error fetching company activity:', error);
    res.status(500).json({ error: 'Failed to fetch company activity' });
  }
});

// ============================================================================
// GET /api/admin/news/activity/:userId - User detail
// ============================================================================
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { since } = parseDays(req.query);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [
      activityCounts,
      readThroughResult,
      avgReadTimeResult,
      weeklyTrend,
      companyBreakdownRaw,
      callDietCompanies,
      linkClickCount,
      uniqueArticlesResult,
      searchCount,
      articlesByCompanyRaw,
    ] = await Promise.all([
      // Activity counts
      prisma.$queryRaw<[{
        article_reads: bigint;
        meaningful_events: bigint;
        exports: bigint;
        pins: bigint;
      }]>`
        SELECT
          COUNT(*) FILTER (WHERE type = 'article_open') AS article_reads,
          COUNT(*) FILTER (WHERE type IN ('article_open','pin','unpin','export_pdf','export_markdown','export_docx')) AS meaningful_events,
          COUNT(*) FILTER (WHERE type IN ('export_pdf','export_markdown','export_docx')) AS exports,
          COUNT(*) FILTER (WHERE type IN ('pin','unpin')) AS pins
        FROM user_activities
        WHERE user_id = ${userId} AND created_at >= ${since}
      `,

      // Read-through rate for this user
      prisma.$queryRaw<[{ total_opens: bigint; meaningful_reads: bigint }]>`
        SELECT
          COUNT(DISTINCT ao.id) AS total_opens,
          COUNT(DISTINCT ac.id) AS meaningful_reads
        FROM user_activities ao
        LEFT JOIN user_activities ac
          ON ac.user_id = ao.user_id
          AND ac.article_id = ao.article_id
          AND ac.type = 'article_close'
          AND ac.duration_ms > 15000
          AND ac.created_at >= ${since}
        WHERE ao.type = 'article_open'
          AND ao.user_id = ${userId}
          AND ao.created_at >= ${since}
      `,

      // Avg + total read time
      prisma.userActivity.aggregate({
        where: {
          userId,
          type: 'article_close',
          durationMs: { not: null, gt: 0 },
          createdAt: { gte: since },
        },
        _avg: { durationMs: true },
        _sum: { durationMs: true },
      }),

      // Weekly trend
      prisma.$queryRaw<Array<{
        week_start: Date;
        reads: bigint;
        meaningful_reads: bigint;
        exports: bigint;
      }>>`
        SELECT
          DATE_TRUNC('week', created_at) AS week_start,
          COUNT(*) FILTER (WHERE type = 'article_open') AS reads,
          COUNT(*) FILTER (WHERE type IN ('article_open','pin','unpin','export_pdf','export_markdown','export_docx')) AS meaningful_reads,
          COUNT(*) FILTER (WHERE type IN ('export_pdf','export_markdown','export_docx')) AS exports
        FROM user_activities
        WHERE user_id = ${userId} AND created_at >= ${since}
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week_start ASC
      `,

      // Company breakdown
      prisma.$queryRaw<Array<{
        company_id: string;
        company_name: string;
        ticker: string | null;
        reads: bigint;
      }>>`
        SELECT
          tc.id AS company_id,
          tc.name AS company_name,
          tc.ticker,
          COUNT(*) AS reads
        FROM user_activities ua
        JOIN news_articles na ON na.id = ua.article_id
        JOIN tracked_companies tc ON tc.id = na.company_id
        WHERE ua.user_id = ${userId}
          AND ua.type = 'article_open'
          AND ua.created_at >= ${since}
        GROUP BY tc.id, tc.name, tc.ticker
        ORDER BY reads DESC
      `,

      // Call diet companies
      prisma.userCallDietCompany.findMany({
        where: { userId },
        include: { company: { select: { id: true, name: true, ticker: true } } },
      }),

      // Link click count
      prisma.userActivity.count({
        where: { userId, type: 'article_link_click', createdAt: { gte: since } },
      }),

      // Unique articles read
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT article_id) AS count
        FROM user_activities
        WHERE user_id = ${userId}
          AND type = 'article_open'
          AND created_at >= ${since}
      `,

      // Search count
      prisma.userActivity.count({
        where: { userId, type: 'search', createdAt: { gte: since } },
      }),

      // Articles by company (with per-article stats)
      prisma.$queryRaw<Array<{
        article_id: string;
        headline: string;
        source_name: string | null;
        company_id: string;
        company_name: string;
        ticker: string | null;
        read_count: bigint;
        total_read_time_ms: bigint;
        last_read_at: Date;
        link_clicks: bigint;
      }>>`
        SELECT
          na.id AS article_id,
          na.headline,
          na.source_name,
          tc.id AS company_id,
          tc.name AS company_name,
          tc.ticker,
          COUNT(*) FILTER (WHERE ua.type = 'article_open') AS read_count,
          COALESCE(SUM(ua.duration_ms) FILTER (WHERE ua.type = 'article_close'), 0) AS total_read_time_ms,
          MAX(ua.created_at) AS last_read_at,
          COUNT(*) FILTER (WHERE ua.type = 'article_link_click') AS link_clicks
        FROM user_activities ua
        JOIN news_articles na ON na.id = ua.article_id
        JOIN tracked_companies tc ON tc.id = na.company_id
        WHERE ua.user_id = ${userId}
          AND ua.type IN ('article_open', 'article_close', 'article_link_click')
          AND ua.created_at >= ${since}
        GROUP BY na.id, na.headline, na.source_name, tc.id, tc.name, tc.ticker
        ORDER BY tc.name ASC, read_count DESC
      `,
    ]);

    const counts = activityCounts[0];
    const articleReads = Number(counts?.article_reads ?? 0);
    const meaningfulEvents = Number(counts?.meaningful_events ?? 0);
    const exports = Number(counts?.exports ?? 0);
    const pins = Number(counts?.pins ?? 0);

    const rtr = readThroughResult[0];
    const totalOpens = Number(rtr?.total_opens ?? 0);
    const meaningfulReads = Number(rtr?.meaningful_reads ?? 0);
    const readThroughRate = totalOpens > 0 ? Math.round((meaningfulReads / totalOpens) * 100) : 0;

    const avgReadTimeSec = avgReadTimeResult._avg.durationMs
      ? Math.round(avgReadTimeResult._avg.durationMs / 1000)
      : 0;
    const totalReadTimeSec = avgReadTimeResult._sum.durationMs
      ? Math.round(avgReadTimeResult._sum.durationMs / 1000)
      : 0;
    const uniqueArticlesRead = Number(uniqueArticlesResult[0]?.count ?? 0);

    // Build company breakdown with call diet flag
    const dietCompanyIds = new Set(callDietCompanies.map(c => c.companyId));
    const companyReadMap = new Map(companyBreakdownRaw.map(c => [c.company_id, Number(c.reads)]));

    const companyBreakdown = companyBreakdownRaw.map(c => ({
      companyId: c.company_id,
      companyName: c.company_name,
      ticker: c.ticker,
      reads: Number(c.reads),
      isInCallDiet: dietCompanyIds.has(c.company_id),
    }));

    // Add call diet companies with 0 reads
    for (const cd of callDietCompanies) {
      if (!companyReadMap.has(cd.companyId)) {
        companyBreakdown.push({
          companyId: cd.company.id,
          companyName: cd.company.name,
          ticker: cd.company.ticker,
          reads: 0,
          isInCallDiet: true,
        });
      }
    }

    const totalCallDietCompanies = callDietCompanies.length;
    const companiesWithReads = callDietCompanies.filter(
      c => companyReadMap.has(c.companyId)
    ).length;
    const callDietCoverage = totalCallDietCompanies > 0
      ? Math.round((companiesWithReads / totalCallDietCompanies) * 100)
      : 0;

    // Build articlesByCompany nested structure
    const articlesByCompanyMap = new Map<string, {
      companyId: string; companyName: string; ticker: string | null; isInCallDiet: boolean;
      articles: Array<{ articleId: string; headline: string; sourceName: string | null; readCount: number; totalReadTimeSec: number; lastReadAt: string; linkClicks: number }>;
    }>();
    for (const row of articlesByCompanyRaw) {
      if (!articlesByCompanyMap.has(row.company_id)) {
        articlesByCompanyMap.set(row.company_id, {
          companyId: row.company_id,
          companyName: row.company_name,
          ticker: row.ticker,
          isInCallDiet: dietCompanyIds.has(row.company_id),
          articles: [],
        });
      }
      articlesByCompanyMap.get(row.company_id)!.articles.push({
        articleId: row.article_id,
        headline: row.headline,
        sourceName: row.source_name,
        readCount: Number(row.read_count),
        totalReadTimeSec: Math.round(Number(row.total_read_time_ms) / 1000),
        lastReadAt: row.last_read_at.toISOString(),
        linkClicks: Number(row.link_clicks),
      });
    }
    // Add call diet companies with no articles
    for (const cd of callDietCompanies) {
      if (!articlesByCompanyMap.has(cd.companyId)) {
        articlesByCompanyMap.set(cd.companyId, {
          companyId: cd.company.id,
          companyName: cd.company.name,
          ticker: cd.company.ticker,
          isInCallDiet: true,
          articles: [],
        });
      }
    }
    const articlesByCompany = Array.from(articlesByCompanyMap.values())
      .sort((a, b) => {
        // Call diet companies first, then by article count desc
        if (a.isInCallDiet !== b.isInCallDiet) return a.isInCallDiet ? -1 : 1;
        return b.articles.length - a.articles.length;
      });

    res.json({
      user,
      metrics: {
        tier: classifyTier(meaningfulEvents),
        articleReads,
        meaningfulReads,
        readThroughRate,
        avgReadTimeSec,
        exports,
        pins,
        callDietCoverage,
        totalReadTimeSec,
        linkClicks: linkClickCount,
        uniqueArticlesRead,
        searchCount,
      },
      companyBreakdown,
      articlesByCompany,
      weeklyTrend: weeklyTrend.map(w => ({
        weekStart: w.week_start.toISOString().split('T')[0],
        reads: Number(w.reads),
        meaningfulReads: Number(w.meaningful_reads),
        exports: Number(w.exports),
      })),
      callDiet: {
        companies: callDietCompanies.map(c => ({
          companyId: c.company.id,
          companyName: c.company.name,
          ticker: c.company.ticker,
        })),
        totalCompanies: totalCallDietCompanies,
        companiesWithReads,
      },
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

export default router;

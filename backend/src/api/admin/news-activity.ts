/**
 * Admin News Activity API Routes
 * GET /api/admin/news/activity - Aggregated metrics
 * GET /api/admin/news/activity/:userId - Per-user activity detail
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// GET /api/admin/news/activity - Aggregated metrics
router.get('/', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    // Total events
    const totalEvents = await prisma.userActivity.count({
      where: { createdAt: { gte: since } },
    });

    // Unique active users
    const activeUsersResult = await prisma.userActivity.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
    });

    // Daily article opens (for chart)
    const dailyOpens = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("created_at") as date, COUNT(*) as count
      FROM user_activities
      WHERE type = 'article_open' AND "created_at" >= ${since}
      GROUP BY DATE("created_at")
      ORDER BY date ASC
    `;

    // Top 10 most viewed articles
    const topArticles = await prisma.userActivity.groupBy({
      by: ['articleId'],
      where: {
        type: 'article_open',
        articleId: { not: null },
        createdAt: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Get article details for top articles
    const topArticleIds = topArticles.map(a => a.articleId!).filter(Boolean);
    const articleDetails = topArticleIds.length > 0
      ? await prisma.newsArticle.findMany({
          where: { id: { in: topArticleIds } },
          select: { id: true, headline: true, companyId: true, company: { select: { name: true } } },
        })
      : [];

    // Most active users
    const activeUsers = await prisma.userActivity.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const activeUserIds = activeUsers.map(u => u.userId);
    const userDetails = activeUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: activeUserIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    // Average time per article
    const avgTimeResult = await prisma.userActivity.aggregate({
      where: {
        type: 'article_close',
        durationMs: { not: null },
        createdAt: { gte: since },
      },
      _avg: { durationMs: true },
    });

    // Recent events
    const recentEvents = await prisma.userActivity.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      summary: {
        totalEvents,
        uniqueActiveUsers: activeUsersResult.length,
        avgTimePerArticleMs: avgTimeResult._avg.durationMs || 0,
      },
      dailyOpens: dailyOpens.map(d => ({
        date: d.date,
        count: Number(d.count),
      })),
      topArticles: topArticles.map(a => ({
        articleId: a.articleId,
        views: a._count.id,
        headline: articleDetails.find(d => d.id === a.articleId)?.headline || 'Unknown',
        company: articleDetails.find(d => d.id === a.articleId)?.company?.name || null,
      })),
      activeUsers: activeUsers.map(u => ({
        userId: u.userId,
        eventCount: u._count.id,
        name: userDetails.find(d => d.id === u.userId)?.name || null,
        email: userDetails.find(d => d.id === u.userId)?.email || '',
      })),
      recentEvents,
    });
  } catch (error) {
    console.error('Error fetching activity metrics:', error);
    res.status(500).json({ error: 'Failed to fetch activity metrics' });
  }
});

// GET /api/admin/news/activity/:userId - Per-user activity detail
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = '30', limit = '100', offset = '0' } = req.query;

    const daysNum = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [events, total] = await Promise.all([
      prisma.userActivity.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit) || 100, 500),
        skip: Number(offset) || 0,
      }),
      prisma.userActivity.count({
        where: { userId, createdAt: { gte: since } },
      }),
    ]);

    // Event type breakdown
    const typeCounts = await prisma.userActivity.groupBy({
      by: ['type'],
      where: { userId, createdAt: { gte: since } },
      _count: { id: true },
    });

    res.json({
      user,
      total,
      typeCounts: typeCounts.map(t => ({ type: t.type, count: t._count.id })),
      events,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

export default router;

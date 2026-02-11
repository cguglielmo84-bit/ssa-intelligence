/**
 * User Activity Tracking API Routes
 * POST /api/news/activity - Record activity events (fire-and-forget)
 * GET /api/admin/news/activity - Aggregated metrics (admin only)
 * GET /api/admin/news/activity/:userId - Per-user activity detail (admin only)
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ActivityType } from '@prisma/client';

const router = Router();

const VALID_TYPES: ActivityType[] = [
  'article_open', 'article_close', 'page_view', 'page_leave',
  'pin', 'unpin', 'export_pdf', 'export_markdown', 'search', 'filter_change',
];

// POST /api/news/activity - Record events (fire-and-forget, returns 202)
router.post('/', async (req: Request, res: Response) => {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Accept single event or batch
  const events = Array.isArray(req.body) ? req.body : [req.body];

  // Return immediately
  res.status(202).json({ accepted: events.length });

  // Process in background
  try {
    const records = events
      .filter((e: any) => e.type && VALID_TYPES.includes(e.type))
      .map((e: any) => ({
        userId: req.auth!.userId,
        type: e.type as ActivityType,
        articleId: e.articleId || null,
        pagePath: e.pagePath || null,
        durationMs: typeof e.durationMs === 'number' ? e.durationMs : null,
        metadata: e.metadata || {},
      }));

    if (records.length > 0) {
      await prisma.userActivity.createMany({ data: records });
    }
  } catch (error) {
    console.error('[activity] Error recording events:', error);
  }
});

export default router;

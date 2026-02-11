/**
 * News Article Pinning API Routes
 * POST /api/news/articles/:id/pin - Pin article for current user
 * DELETE /api/news/articles/:id/pin - Unpin article for current user
 * GET /api/news/pins - Get current user's pinned article IDs
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// GET /api/news/pins - Get current user's pinned article IDs
router.get('/pins', async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const pins = await prisma.userPinnedArticle.findMany({
      where: { userId: req.auth.userId },
      select: { articleId: true },
    });

    res.json({ articleIds: pins.map(p => p.articleId) });
  } catch (error) {
    console.error('Error fetching pins:', error);
    res.status(500).json({ error: 'Failed to fetch pins' });
  }
});

// POST /api/news/articles/:id/pin - Pin article for current user
router.post('/articles/:id/pin', async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id: articleId } = req.params;

    const article = await prisma.newsArticle.findUnique({ where: { id: articleId } });
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    await prisma.userPinnedArticle.upsert({
      where: {
        userId_articleId: {
          userId: req.auth.userId,
          articleId,
        },
      },
      create: {
        userId: req.auth.userId,
        articleId,
      },
      update: {},
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error pinning article:', error);
    res.status(500).json({ error: 'Failed to pin article' });
  }
});

// DELETE /api/news/articles/:id/pin - Unpin article for current user
router.delete('/articles/:id/pin', async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id: articleId } = req.params;

    await prisma.userPinnedArticle.delete({
      where: {
        userId_articleId: {
          userId: req.auth.userId,
          articleId,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error unpinning article:', error);
    res.status(500).json({ error: 'Failed to unpin article' });
  }
});

export default router;

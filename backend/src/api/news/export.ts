/**
 * News Export API Routes
 * GET /api/news/export/pdf/:userId - Export as PDF for a user
 * GET /api/news/export/markdown/:userId - Export as Markdown for a user
 * GET /api/news/export/pdf?articleIds=id1,id2 - Export specific articles as PDF
 * GET /api/news/export/markdown?articleIds=id1,id2 - Export specific articles as Markdown
 */

import { Router, Request, Response } from 'express';
import { generateNewsDigestPDF } from '../../services/pdf-export.js';
import { generateNewsDigestMarkdown } from '../../services/markdown-export.js';

const router = Router();

// GET /api/news/export/pdf/:userId - Export user's articles as PDF
router.get('/pdf/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query;

    // Auth: scoped to self or admin
    if (req.auth && !req.auth.isAdmin && req.auth.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const dateFrom = from ? new Date(from as string) : undefined;
    const dateTo = to ? new Date(to as string) : undefined;

    const pdf = await generateNewsDigestPDF({
      userId,
      dateFrom,
      dateTo,
    });

    const filename = `news-digest-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    console.error('PDF export error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/news/export/markdown/:userId - Export user's articles as Markdown
router.get('/markdown/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query;

    if (req.auth && !req.auth.isAdmin && req.auth.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const dateFrom = from ? new Date(from as string) : undefined;
    const dateTo = to ? new Date(to as string) : undefined;

    const markdown = await generateNewsDigestMarkdown({
      userId,
      dateFrom,
      dateTo,
    });

    const filename = `news-digest-${new Date().toISOString().split('T')[0]}.md`;
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(markdown);
  } catch (error) {
    console.error('Markdown export error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to generate Markdown' });
  }
});

// GET /api/news/export/pdf?articleIds=id1,id2 - Export specific articles as PDF
router.get('/pdf', async (req: Request, res: Response) => {
  try {
    const { articleIds } = req.query;

    if (!articleIds || typeof articleIds !== 'string') {
      res.status(400).json({ error: 'articleIds query parameter is required' });
      return;
    }

    const ids = articleIds.split(',').filter(Boolean);
    if (ids.length === 0) {
      res.status(400).json({ error: 'At least one articleId is required' });
      return;
    }

    const pdf = await generateNewsDigestPDF({
      userId: req.auth?.userId,
      articleIds: ids,
    });

    const filename = `news-digest-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/news/export/markdown?articleIds=id1,id2 - Export specific articles as Markdown
router.get('/markdown', async (req: Request, res: Response) => {
  try {
    const { articleIds } = req.query;

    if (!articleIds || typeof articleIds !== 'string') {
      res.status(400).json({ error: 'articleIds query parameter is required' });
      return;
    }

    const ids = articleIds.split(',').filter(Boolean);
    if (ids.length === 0) {
      res.status(400).json({ error: 'At least one articleId is required' });
      return;
    }

    const markdown = await generateNewsDigestMarkdown({
      userId: req.auth?.userId,
      articleIds: ids,
    });

    const filename = `news-digest-${new Date().toISOString().split('T')[0]}.md`;
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(markdown);
  } catch (error) {
    console.error('Markdown export error:', error);
    res.status(500).json({ error: 'Failed to generate Markdown' });
  }
});

export default router;

/**
 * Admin Bug Reports API
 * CRUD + agent-queryable endpoints for automatic bug reports
 */

import type { RequestHandler } from 'express';
import { prisma } from '../../lib/prisma.js';
import { safeErrorMessage, isPrismaNotFound } from '../../lib/error-utils.js';
import type { BugReportStatus, BugReportSeverity, BugReportCategory } from '@prisma/client';

const VALID_STATUSES: BugReportStatus[] = ['open', 'acknowledged', 'investigating', 'resolved', 'wont_fix'];
const VALID_SEVERITIES: BugReportSeverity[] = ['critical', 'error', 'warning'];
const VALID_CATEGORIES: BugReportCategory[] = ['rate_limit', 'server_error', 'parse_error', 'content_error', 'timeout', 'unknown'];

/**
 * GET /api/admin/bug-reports/agent-query
 * AI-agent-queryable endpoint — grouped by fingerprint with patterns
 */
export const agentQueryBugReports: RequestHandler = async (req, res) => {
  try {
    const sinceParam = req.query.since as string | undefined;
    const limitParam = parseInt(req.query.limit as string, 10);
    const groupBy = req.query.groupBy as string | undefined;

    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // default 7 days
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const bugs = await prisma.bugReport.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Build pattern summary
    const fingerprints = new Map<string, { count: number; category: string; stage: string; latestError: string; severity: string }>();
    for (const bug of bugs) {
      const existing = fingerprints.get(bug.errorFingerprint);
      if (existing) {
        existing.count++;
      } else {
        fingerprints.set(bug.errorFingerprint, {
          count: 1,
          category: bug.category,
          stage: bug.stage,
          latestError: bug.errorMessage.slice(0, 200),
          severity: bug.severity,
        });
      }
    }

    const suggestedActions: Record<string, string> = {
      rate_limit: 'Consider increasing retry delays or reducing parallel requests',
      server_error: 'Check upstream API status; may be transient',
      parse_error: 'Review prompt output format instructions; check Zod schemas',
      content_error: 'Review prompt instructions for completeness requirements',
      timeout: 'Consider increasing timeouts or breaking into smaller requests',
      unknown: 'Manual investigation required',
    };

    const patterns = Array.from(fingerprints.entries())
      .map(([fingerprint, data]) => ({
        fingerprint,
        ...data,
        suggestedAction: suggestedActions[data.category] ?? suggestedActions.unknown,
      }))
      .sort((a, b) => b.count - a.count);

    const meta = {
      since: since.toISOString(),
      totalBugs: bugs.length,
      uniquePatterns: patterns.length,
      criticalCount: bugs.filter((b) => b.severity === 'critical').length,
      openCount: bugs.filter((b) => b.status === 'open').length,
    };

    const response: Record<string, unknown> = { meta, patterns };

    if (groupBy !== 'fingerprint') {
      response.bugs = bugs.map((b) => ({
        id: b.id,
        severity: b.severity,
        status: b.status,
        category: b.category,
        stage: b.stage,
        companyName: b.companyName,
        errorMessage: b.errorMessage.slice(0, 300),
        errorFingerprint: b.errorFingerprint,
        attempts: b.attempts,
        maxAttempts: b.maxAttempts,
        createdAt: b.createdAt,
      }));
    }

    return res.json(response);
  } catch (error) {
    console.error('Error querying bug reports for agent:', error);
    return res.status(500).json({
      error: 'Failed to query bug reports',
      message: safeErrorMessage(error),
    });
  }
};

/**
 * GET /api/admin/bug-reports
 * List bug reports with filters, pagination, and summary
 */
export const listBugReports: RequestHandler = async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const severity = req.query.severity as string | undefined;
    const category = req.query.category as string | undefined;
    const stage = req.query.stage as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status as BugReportStatus)) {
      where.status = status;
    }
    if (severity && VALID_SEVERITIES.includes(severity as BugReportSeverity)) {
      where.severity = severity;
    }
    if (category && VALID_CATEGORIES.includes(category as BugReportCategory)) {
      where.category = category;
    }
    if (stage) {
      where.stage = stage;
    }

    const [bugReports, total] = await Promise.all([
      prisma.bugReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bugReport.count({ where }),
    ]);

    // Summary stats (always unfiltered)
    const [openCount, criticalCount, categoryGroups] = await Promise.all([
      prisma.bugReport.count({ where: { status: 'open' } }),
      prisma.bugReport.count({ where: { severity: 'critical', status: { not: 'resolved' } } }),
      prisma.bugReport.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { status: { not: 'resolved' } },
      }),
    ]);

    const byCategory = Object.fromEntries(
      categoryGroups.map((g) => [g.category, g._count.id])
    );

    return res.json({
      bugReports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: { open: openCount, critical: criticalCount, byCategory },
    });
  } catch (error) {
    console.error('Error listing bug reports:', error);
    return res.status(500).json({
      error: 'Failed to list bug reports',
      message: safeErrorMessage(error),
    });
  }
};

/**
 * GET /api/admin/bug-reports/:id
 * Full bug report detail
 */
export const getBugReport: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const bugReport = await prisma.bugReport.findUnique({ where: { id } });

    if (!bugReport) {
      return res.status(404).json({ error: 'Bug report not found' });
    }

    return res.json({ bugReport });
  } catch (error) {
    console.error('Error fetching bug report:', error);
    return res.status(500).json({
      error: 'Failed to fetch bug report',
      message: safeErrorMessage(error),
    });
  }
};

/**
 * PATCH /api/admin/bug-reports/:id
 * Update status, resolution notes, etc.
 */
export const updateBugReport: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    const existing = await prisma.bugReport.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Bug report not found' });
    }

    const data: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as BugReportStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      data.status = status;

      // Auto-set resolvedAt/resolvedBy when transitioning to resolved
      if (status === 'resolved' && existing.status !== 'resolved') {
        data.resolvedAt = new Date();
        data.resolvedBy = (req as any).auth?.email ?? 'admin';
      }
      // Clear resolved fields if un-resolving
      if (status !== 'resolved' && existing.status === 'resolved') {
        data.resolvedAt = null;
        data.resolvedBy = null;
      }
    }

    if (resolutionNotes !== undefined) {
      data.resolutionNotes = resolutionNotes;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const bugReport = await prisma.bugReport.update({ where: { id }, data });

    return res.json({ bugReport });
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return res.status(404).json({ error: 'Bug report not found' });
    }
    console.error('Error updating bug report:', error);
    return res.status(500).json({
      error: 'Failed to update bug report',
      message: safeErrorMessage(error),
    });
  }
};

/**
 * DELETE /api/admin/bug-reports/:id
 * Delete a bug report
 */
export const deleteBugReport: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.bugReport.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Bug report not found' });
    }

    await prisma.bugReport.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return res.status(404).json({ error: 'Bug report not found' });
    }
    console.error('Error deleting bug report:', error);
    return res.status(500).json({
      error: 'Failed to delete bug report',
      message: safeErrorMessage(error),
    });
  }
};

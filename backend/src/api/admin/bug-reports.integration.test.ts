import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma, testPrisma } from '../../test-utils/db-helpers.js';
import { asAdmin, asMember } from '../../test-utils/auth-helpers.js';
import { createTestUser, createTestBugReport } from '../../test-utils/factories.js';

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('Admin Bug Reports API', () => {
  // ── LIST ──────────────────────────────────────────────────────────────────

  describe('GET /api/admin/bug-reports', () => {
    it('rejects non-admin (403)', async () => {
      await createTestUser({ email: 'member@ssaandco.com' });
      const res = await asMember(request(app).get('/api/admin/bug-reports'));
      expect(res.status).toBe(403);
    });

    it('returns empty list when no bug reports', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const res = await asAdmin(request(app).get('/api/admin/bug-reports'));
      expect(res.status).toBe(200);
      expect(res.body.bugReports).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
      expect(res.body.summary.open).toBe(0);
    });

    it('returns bug reports with summary', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ severity: 'critical', status: 'open' });
      await createTestBugReport({ severity: 'error', status: 'open' });
      await createTestBugReport({ severity: 'error', status: 'resolved' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports'));
      expect(res.status).toBe(200);
      expect(res.body.bugReports).toHaveLength(3);
      expect(res.body.summary.open).toBe(2);
      expect(res.body.summary.critical).toBe(1);
    });

    it('filters by status', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ status: 'open' });
      await createTestBugReport({ status: 'resolved' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports?status=open'));
      expect(res.status).toBe(200);
      expect(res.body.bugReports).toHaveLength(1);
      expect(res.body.bugReports[0].status).toBe('open');
    });

    it('filters by severity', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ severity: 'critical' });
      await createTestBugReport({ severity: 'error' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports?severity=critical'));
      expect(res.status).toBe(200);
      expect(res.body.bugReports).toHaveLength(1);
      expect(res.body.bugReports[0].severity).toBe('critical');
    });

    it('filters by category', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ category: 'rate_limit' });
      await createTestBugReport({ category: 'timeout' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports?category=rate_limit'));
      expect(res.status).toBe(200);
      expect(res.body.bugReports).toHaveLength(1);
      expect(res.body.bugReports[0].category).toBe('rate_limit');
    });

    it('filters by stage', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ stage: 'foundation' });
      await createTestBugReport({ stage: 'exec_summary' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports?stage=foundation'));
      expect(res.status).toBe(200);
      expect(res.body.bugReports).toHaveLength(1);
      expect(res.body.bugReports[0].stage).toBe('foundation');
    });

    it('paginates results', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      for (let i = 0; i < 5; i++) {
        await createTestBugReport();
      }

      const res = await asAdmin(request(app).get('/api/admin/bug-reports?page=1&limit=2'));
      expect(res.status).toBe(200);
      expect(res.body.bugReports).toHaveLength(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });
  });

  // ── DETAIL ────────────────────────────────────────────────────────────────

  describe('GET /api/admin/bug-reports/:id', () => {
    it('returns 404 for missing report', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const res = await asAdmin(request(app).get('/api/admin/bug-reports/nonexistent'));
      expect(res.status).toBe(404);
    });

    it('returns full bug report detail', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport({
        stage: 'foundation',
        severity: 'critical',
        errorMessage: 'Test error',
      });

      const res = await asAdmin(request(app).get(`/api/admin/bug-reports/${report.id}`));
      expect(res.status).toBe(200);
      expect(res.body.bugReport.id).toBe(report.id);
      expect(res.body.bugReport.severity).toBe('critical');
      expect(res.body.bugReport.errorMessage).toBe('Test error');
    });
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────

  describe('PATCH /api/admin/bug-reports/:id', () => {
    it('returns 404 for missing report', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const res = await asAdmin(
        request(app).patch('/api/admin/bug-reports/nonexistent').send({ status: 'acknowledged' })
      );
      expect(res.status).toBe(404);
    });

    it('updates status', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport();

      const res = await asAdmin(
        request(app).patch(`/api/admin/bug-reports/${report.id}`).send({ status: 'investigating' })
      );
      expect(res.status).toBe(200);
      expect(res.body.bugReport.status).toBe('investigating');
    });

    it('auto-sets resolvedAt when status changes to resolved', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport();

      const res = await asAdmin(
        request(app).patch(`/api/admin/bug-reports/${report.id}`).send({ status: 'resolved' })
      );
      expect(res.status).toBe(200);
      expect(res.body.bugReport.resolvedAt).toBeTruthy();
      expect(res.body.bugReport.resolvedBy).toBeTruthy();
    });

    it('clears resolvedAt when un-resolving', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport({ status: 'resolved' });
      await testPrisma.bugReport.update({
        where: { id: report.id },
        data: { resolvedAt: new Date(), resolvedBy: 'admin' },
      });

      const res = await asAdmin(
        request(app).patch(`/api/admin/bug-reports/${report.id}`).send({ status: 'open' })
      );
      expect(res.status).toBe(200);
      expect(res.body.bugReport.resolvedAt).toBeNull();
      expect(res.body.bugReport.resolvedBy).toBeNull();
    });

    it('rejects invalid status', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport();

      const res = await asAdmin(
        request(app).patch(`/api/admin/bug-reports/${report.id}`).send({ status: 'invalid_status' })
      );
      expect(res.status).toBe(400);
    });

    it('updates resolution notes', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport();

      const res = await asAdmin(
        request(app).patch(`/api/admin/bug-reports/${report.id}`).send({ resolutionNotes: 'Fixed by updating prompt' })
      );
      expect(res.status).toBe(200);
      expect(res.body.bugReport.resolutionNotes).toBe('Fixed by updating prompt');
    });

    it('rejects empty body', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport();

      const res = await asAdmin(
        request(app).patch(`/api/admin/bug-reports/${report.id}`).send({})
      );
      expect(res.status).toBe(400);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  describe('DELETE /api/admin/bug-reports/:id', () => {
    it('returns 404 for missing report', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const res = await asAdmin(request(app).delete('/api/admin/bug-reports/nonexistent'));
      expect(res.status).toBe(404);
    });

    it('deletes a bug report', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const report = await createTestBugReport();

      const res = await asAdmin(request(app).delete(`/api/admin/bug-reports/${report.id}`));
      expect(res.status).toBe(204);

      const check = await testPrisma.bugReport.findUnique({ where: { id: report.id } });
      expect(check).toBeNull();
    });
  });

  // ── AGENT QUERY ───────────────────────────────────────────────────────────

  describe('GET /api/admin/bug-reports/agent-query', () => {
    it('returns structured response for agent consumption', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ severity: 'critical', category: 'rate_limit', errorFingerprint: 'fp-abc' });
      await createTestBugReport({ severity: 'error', category: 'rate_limit', errorFingerprint: 'fp-abc' });
      await createTestBugReport({ severity: 'error', category: 'timeout', errorFingerprint: 'fp-xyz' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports/agent-query'));
      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.totalBugs).toBe(3);
      expect(res.body.meta.uniquePatterns).toBe(2);
      expect(res.body.patterns).toHaveLength(2);
      expect(res.body.bugs).toBeDefined();
    });

    it('respects since filter', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport();

      // Future date should return nothing
      const future = new Date(Date.now() + 86400000).toISOString();
      const res = await asAdmin(request(app).get(`/api/admin/bug-reports/agent-query?since=${future}`));
      expect(res.status).toBe(200);
      expect(res.body.meta.totalBugs).toBe(0);
    });

    it('groups by fingerprint when requested', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ errorFingerprint: 'fp-same' });
      await createTestBugReport({ errorFingerprint: 'fp-same' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports/agent-query?groupBy=fingerprint'));
      expect(res.status).toBe(200);
      expect(res.body.patterns).toHaveLength(1);
      expect(res.body.patterns[0].count).toBe(2);
      expect(res.body.bugs).toBeUndefined();
    });

    it('includes suggested actions per pattern', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestBugReport({ category: 'rate_limit' });

      const res = await asAdmin(request(app).get('/api/admin/bug-reports/agent-query'));
      expect(res.status).toBe(200);
      expect(res.body.patterns[0].suggestedAction).toBeTruthy();
    });
  });
});

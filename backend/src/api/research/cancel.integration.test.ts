import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma, testPrisma } from '../../test-utils/db-helpers.js';
import { asAdmin, asMember, asOtherMember } from '../../test-utils/auth-helpers.js';
import { createTestUser, createTestJob, createTestSubJob } from '../../test-utils/factories.js';

// Mock the orchestrator to avoid real queue processing
vi.mock('../../services/orchestrator.js', () => ({
  getResearchOrchestrator: () => ({
    processQueue: vi.fn().mockResolvedValue(undefined),
  }),
}));

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('POST /api/research/:id/cancel', () => {
  it('cancels a queued job (200)', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    const job = await createTestJob({ userId: user.id, status: 'queued' });

    const res = await asMember(
      request(app).post(`/api/research/${job.id}/cancel`)
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('cancelled');

    // Verify DB status updated
    const updated = await testPrisma.researchJob.findUnique({ where: { id: job.id } });
    expect(updated?.status).toBe('cancelled');
    expect(updated?.completedAt).toBeTruthy();
  });

  it('cancels a running job and its sub-jobs (200)', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    const job = await createTestJob({ userId: user.id, status: 'running' });
    await createTestSubJob({ researchId: job.id, stage: 'foundation', status: 'completed' });
    await createTestSubJob({ researchId: job.id, stage: 'exec_summary', status: 'running' });
    await createTestSubJob({ researchId: job.id, stage: 'financial_snapshot', status: 'pending' });

    const res = await asMember(
      request(app).post(`/api/research/${job.id}/cancel`)
    );

    expect(res.status).toBe(200);

    // Verify sub-jobs: running and pending should be cancelled
    const subJobs = await testPrisma.researchSubJob.findMany({
      where: { researchId: job.id },
      orderBy: { stage: 'asc' },
    });
    const statuses = subJobs.reduce((acc, sj) => {
      acc[sj.stage] = sj.status;
      return acc;
    }, {} as Record<string, string>);

    expect(statuses['exec_summary']).toBe('cancelled');
    expect(statuses['financial_snapshot']).toBe('cancelled');
    // Completed sub-job should remain completed
    expect(statuses['foundation']).toBe('completed');
  });

  it('returns 404 for non-existent job', async () => {
    const res = await asMember(
      request(app).post('/api/research/nonexistent-id/cancel')
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 for already-cancelled job', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    const job = await createTestJob({ userId: user.id, status: 'cancelled' });

    const res = await asMember(
      request(app).post(`/api/research/${job.id}/cancel`)
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already cancelled/i);
  });

  it('returns 400 for completed job', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    const job = await createTestJob({ userId: user.id, status: 'completed' });

    const res = await asMember(
      request(app).post(`/api/research/${job.id}/cancel`)
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/terminal state/i);
  });

  it('returns 404 for non-owner non-admin (visibility hides private jobs)', async () => {
    const owner = await createTestUser({ email: 'owner@ssaandco.com' });
    const job = await createTestJob({ userId: owner.id, status: 'queued' });

    // other@ssaandco.com is not the owner and not admin — visibility filter
    // returns 404 (not 403) to avoid leaking job existence
    const res = await asOtherMember(
      request(app).post(`/api/research/${job.id}/cancel`)
    );

    expect(res.status).toBe(404);
  });

  it('admin can cancel any job', async () => {
    const owner = await createTestUser({ email: 'owner@ssaandco.com' });
    const job = await createTestJob({ userId: owner.id, status: 'queued' });

    const res = await asAdmin(
      request(app).post(`/api/research/${job.id}/cancel`)
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

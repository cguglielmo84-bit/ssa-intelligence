import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma } from '../../test-utils/db-helpers.js';
import { asAdmin, asMember, asOtherMember } from '../../test-utils/auth-helpers.js';
import { createTestUser, createTestJob, createTestSubJob } from '../../test-utils/factories.js';

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('GET /api/research/:id', () => {
  it('returns full job detail with sub-jobs', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    const job = await createTestJob({ userId: user.id, status: 'running' });
    await createTestSubJob({ researchId: job.id, stage: 'foundation', status: 'completed' });
    await createTestSubJob({ researchId: job.id, stage: 'exec_summary', status: 'running' });

    const res = await asMember(
      request(app).get(`/api/research/${job.id}`)
    );

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(job.id);
    expect(res.body.metadata.companyName).toBe(job.companyName);
    expect(res.body.sectionStatuses).toHaveLength(2);
    expect(res.body.sections).toBeDefined();
  });

  it('returns 404 for non-existent job', async () => {
    const res = await asMember(
      request(app).get('/api/research/nonexistent-id')
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 404 for job user cannot see (visibility)', async () => {
    const owner = await createTestUser({ email: 'private-owner@ssaandco.com' });
    const job = await createTestJob({
      userId: owner.id,
      visibilityScope: 'PRIVATE',
    });

    // other@ssaandco.com is not the owner
    const res = await asOtherMember(
      request(app).get(`/api/research/${job.id}`)
    );

    expect(res.status).toBe(404);
  });

  it('includes correct derived status', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    const job = await createTestJob({ userId: user.id, status: 'completed' });
    await createTestSubJob({ researchId: job.id, stage: 'foundation', status: 'completed' });
    await createTestSubJob({ researchId: job.id, stage: 'exec_summary', status: 'failed' });

    const res = await asMember(
      request(app).get(`/api/research/${job.id}`)
    );

    expect(res.status).toBe(200);
    // completed job with a failed sub-job => completed_with_errors
    expect(res.body.status).toBe('completed_with_errors');
  });

  it('admin can see any job', async () => {
    const otherUser = await createTestUser({ email: 'someone-else@ssaandco.com' });
    const job = await createTestJob({
      userId: otherUser.id,
      visibilityScope: 'PRIVATE',
    });

    const res = await asAdmin(
      request(app).get(`/api/research/${job.id}`)
    );

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(job.id);
  });
});

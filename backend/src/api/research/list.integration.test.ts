import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma } from '../../test-utils/db-helpers.js';
import { asAdmin, asMember, asOtherMember } from '../../test-utils/auth-helpers.js';
import {
  createTestUser,
  createTestJob,
  createTestGroup,
  addUserToGroup,
} from '../../test-utils/factories.js';

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('GET /api/research', () => {
  it('returns paginated results with defaults', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    await createTestJob({ userId: user.id, companyName: 'Company A' });
    await createTestJob({ userId: user.id, companyName: 'Company B' });

    const res = await asMember(
      request(app).get('/api/research')
    );

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({
      total: 2,
      limit: 50,
      offset: 0,
    });
  });

  it('respects limit and offset', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    for (let i = 0; i < 5; i++) {
      await createTestJob({ userId: user.id, companyName: `Company ${i}` });
    }

    const res = await asMember(
      request(app).get('/api/research?limit=2&offset=1')
    );

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.offset).toBe(1);
  });

  it('caps limit at 100', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    await createTestJob({ userId: user.id });

    const res = await asMember(
      request(app).get('/api/research?limit=999')
    );

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('admin sees all jobs', async () => {
    const adminUser = await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
    const otherUser = await createTestUser({ email: 'someone@ssaandco.com' });

    await createTestJob({ userId: adminUser.id, companyName: 'Admin Company' });
    await createTestJob({ userId: otherUser.id, companyName: 'Other Company', visibilityScope: 'PRIVATE' });

    const res = await asAdmin(
      request(app).get('/api/research')
    );

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(2);
  });

  it('member sees own jobs + GENERAL + their GROUP jobs', async () => {
    const member = await createTestUser({ email: 'member@ssaandco.com' });
    const otherUser = await createTestUser({ email: 'other-owner@ssaandco.com' });
    const group = await createTestGroup({ slug: 'team-alpha' });
    await addUserToGroup(member.id, group.id);

    // Member's own PRIVATE job
    await createTestJob({ userId: member.id, companyName: 'My Company' });
    // GENERAL job by another user
    await createTestJob({ userId: otherUser.id, companyName: 'General Company', visibilityScope: 'GENERAL' });
    // GROUP job visible to team-alpha
    await createTestJob({
      userId: otherUser.id,
      companyName: 'Group Company',
      visibilityScope: 'GROUP',
      groupIds: [group.id],
    });
    // PRIVATE job by another user (should NOT be visible)
    await createTestJob({ userId: otherUser.id, companyName: 'Hidden Company', visibilityScope: 'PRIVATE' });

    const res = await asMember(
      request(app).get('/api/research')
    );

    expect(res.status).toBe(200);
    const names = res.body.results.map((r: any) => r.companyName);
    expect(names).toContain('My Company');
    expect(names).toContain('General Company');
    expect(names).toContain('Group Company');
    expect(names).not.toContain('Hidden Company');
    expect(res.body.results.length).toBe(3);
  });

  it('member does NOT see other users PRIVATE jobs', async () => {
    const otherUser = await createTestUser({ email: 'private-owner@ssaandco.com' });
    await createTestJob({ userId: otherUser.id, companyName: 'Secret Company', visibilityScope: 'PRIVATE' });

    // member@ssaandco.com is created automatically by auth middleware
    const res = await asMember(
      request(app).get('/api/research')
    );

    expect(res.status).toBe(200);
    const names = res.body.results.map((r: any) => r.companyName);
    expect(names).not.toContain('Secret Company');
  });

  it('returns correct total count', async () => {
    const user = await createTestUser({ email: 'member@ssaandco.com' });
    for (let i = 0; i < 7; i++) {
      await createTestJob({ userId: user.id, companyName: `Count Company ${i}` });
    }

    const res = await asMember(
      request(app).get('/api/research?limit=3')
    );

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
    expect(res.body.pagination.total).toBe(7);
    expect(res.body.pagination.hasMore).toBe(true);
  });
});

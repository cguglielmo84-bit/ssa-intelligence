import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma } from '../../test-utils/db-helpers.js';
import { asAdmin } from '../../test-utils/auth-helpers.js';
import {
  createTestUser,
  createTestNewsArticle,
  createTestTrackedCompany,
} from '../../test-utils/factories.js';

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('GET /api/news/articles', () => {
  it('returns articles with default pagination', async () => {
    await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
    await createTestNewsArticle({ headline: 'Article One' });
    await createTestNewsArticle({ headline: 'Article Two' });

    const res = await asAdmin(
      request(app).get('/api/news/articles')
    );

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.limit).toBe(50);
    expect(res.body.offset).toBe(0);
  });

  it('filters by companyId', async () => {
    await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
    const company = await createTestTrackedCompany({ name: 'Target Corp' });
    await createTestNewsArticle({ headline: 'Target News', companyId: company.id });
    await createTestNewsArticle({ headline: 'Unrelated News', companyId: null });

    const res = await asAdmin(
      request(app).get(`/api/news/articles?companyId=${company.id}`)
    );

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(1);
    expect(res.body.articles[0].headline).toBe('Target News');
  });

  it('filters by isSent', async () => {
    await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
    await createTestNewsArticle({ headline: 'Sent Article', isSent: true });
    await createTestNewsArticle({ headline: 'Unsent Article', isSent: false });

    const res = await asAdmin(
      request(app).get('/api/news/articles?isSent=true')
    );

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(1);
    expect(res.body.articles[0].headline).toBe('Sent Article');
  });

  it('filters by isArchived', async () => {
    await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
    await createTestNewsArticle({ headline: 'Archived', isArchived: true });
    await createTestNewsArticle({ headline: 'Active', isArchived: false });

    const res = await asAdmin(
      request(app).get('/api/news/articles?isArchived=false')
    );

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(1);
    expect(res.body.articles[0].headline).toBe('Active');
  });

  it('returns correct total count', async () => {
    await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
    for (let i = 0; i < 5; i++) {
      await createTestNewsArticle({ headline: `Article ${i}` });
    }

    const res = await asAdmin(
      request(app).get('/api/news/articles?limit=2')
    );

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(2);
    expect(res.body.total).toBe(5);
  });

  it('returns empty array when no articles match', async () => {
    await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });

    const res = await asAdmin(
      request(app).get('/api/news/articles?companyId=nonexistent')
    );

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

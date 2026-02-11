import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma, testPrisma } from '../../test-utils/db-helpers.js';
import { asMember } from '../../test-utils/auth-helpers.js';
import { createTestUser } from '../../test-utils/factories.js';

// Mock fetchNewsHybrid to avoid real API calls
vi.mock('../../services/news-fetcher.js', () => ({
  fetchNewsHybrid: vi.fn().mockResolvedValue({
    articles: [],
    coverageGaps: [],
    stats: { layer1Articles: 0, layer2Articles: 0, totalRaw: 0, afterDedup: 0, afterProcessing: 0 },
  }),
}));

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('POST /api/news/refresh', () => {
  it('returns 409 if refresh already in progress', async () => {
    await createTestUser({ email: 'member@ssaandco.com' });

    // Seed a refresh-in-progress state
    const refreshState = {
      isRefreshing: true,
      startedAt: new Date().toISOString(),
      lastRefreshedAt: null,
      lastError: null,
      articlesFound: 0,
      coverageGaps: [],
      progress: 50,
      progressMessage: 'Processing...',
      currentStep: 'layer1',
      steps: [],
      stats: null,
    };
    await testPrisma.newsConfig.upsert({
      where: { key: 'refresh_status' },
      create: { key: 'refresh_status', value: JSON.stringify(refreshState) },
      update: { value: JSON.stringify(refreshState) },
    });

    const res = await asMember(
      request(app).post('/api/news/refresh').send({})
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in progress/i);
  });

  it('returns success with mocked fetch results (no revenue owners)', async () => {
    await createTestUser({ email: 'member@ssaandco.com' });

    const res = await asMember(
      request(app).post('/api/news/refresh').send({ days: 1 })
    );

    // With no revenue owners configured, should succeed with 0 articles
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.articlesFound).toBe(0);
  });

  it('auto-recovers stale refresh (>10 min old)', async () => {
    await createTestUser({ email: 'member@ssaandco.com' });

    // Seed a stale refresh state (started 15 minutes ago)
    const staleState = {
      isRefreshing: true,
      startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      lastRefreshedAt: null,
      lastError: null,
      articlesFound: 0,
      coverageGaps: [],
      progress: 30,
      progressMessage: 'Stuck...',
      currentStep: 'layer1',
      steps: [],
      stats: null,
    };
    await testPrisma.newsConfig.upsert({
      where: { key: 'refresh_status' },
      create: { key: 'refresh_status', value: JSON.stringify(staleState) },
      update: { value: JSON.stringify(staleState) },
    });

    const res = await asMember(
      request(app).post('/api/news/refresh').send({})
    );

    // Should auto-recover and proceed (no revenue owners = 200 with 0 articles)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('clamps days parameter between 1 and 30', async () => {
    await createTestUser({ email: 'member@ssaandco.com' });

    // Even with days=999, it should proceed normally (clamped to 30)
    const res = await asMember(
      request(app).post('/api/news/refresh').send({ days: 999 })
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/news/refresh/status', () => {
  it('returns refresh status', async () => {
    await createTestUser({ email: 'member@ssaandco.com' });

    const res = await asMember(
      request(app).get('/api/news/refresh/status')
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isRefreshing');
    expect(res.body).toHaveProperty('lastRefreshedAt');
  });
});

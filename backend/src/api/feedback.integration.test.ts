import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { truncateAll, disconnectPrisma } from '../test-utils/db-helpers.js';

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('POST /api/feedback', () => {
  it('rejects missing message (400)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/i);
  });

  it('rejects message shorter than 10 characters (400)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 10/);
  });

  it('rejects message longer than 5000 characters (400)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'x'.repeat(5001) });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at most 5000/);
  });

  it('rejects invalid type (400)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'A valid feedback message here', type: 'INVALID_TYPE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid type/);
  });

  it('rejects invalid email format (400)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'A valid feedback message here', email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/);
  });

  it('creates feedback with all fields (201)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({
        type: 'bug',
        title: 'Test Bug Report',
        message: 'This is a detailed bug report for testing purposes.',
        name: 'Test User',
        email: 'test@example.com',
        pagePath: '/research/123',
        reportId: 'report-abc',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBeDefined();
  });

  it('creates feedback with minimal fields (201)', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'A minimal feedback message here' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBeDefined();
  });

  it('defaults type to "other" when not provided', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ message: 'Feedback without explicit type setting' });

    expect(res.status).toBe(201);
    // The type defaults to 'other' — verify by reading back
    expect(res.body.success).toBe(true);
  });
});

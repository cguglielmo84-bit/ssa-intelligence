import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma, testPrisma } from '../../test-utils/db-helpers.js';
import { asAdmin, asMember } from '../../test-utils/auth-helpers.js';
import { createTestUser, createTestPricingRate } from '../../test-utils/factories.js';

beforeEach(() => truncateAll());
afterAll(() => disconnectPrisma());

describe('Admin Pricing API', () => {
  describe('GET /api/admin/pricing', () => {
    it('rejects non-admin (403)', async () => {
      await createTestUser({ email: 'member@ssaandco.com' });

      const res = await asMember(
        request(app).get('/api/admin/pricing')
      );

      expect(res.status).toBe(403);
    });

    it('returns pricing rates for admin', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      await createTestPricingRate();

      const res = await asAdmin(
        request(app).get('/api/admin/pricing')
      );

      expect(res.status).toBe(200);
      expect(res.body.rates).toHaveLength(1);
      expect(res.body.rates[0].provider).toBe('anthropic');
    });
  });

  describe('POST /api/admin/pricing', () => {
    it('rejects missing fields (400)', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });

      const res = await asAdmin(
        request(app)
          .post('/api/admin/pricing')
          .send({ provider: 'anthropic' }) // missing model, rates
      );

      expect(res.status).toBe(400);
    });

    it('rejects negative rates (400)', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });

      const res = await asAdmin(
        request(app)
          .post('/api/admin/pricing')
          .send({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            inputRate: -1,
            outputRate: 15,
          })
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/non-negative/i);
    });

    it('creates rate and deactivates previous active rate atomically (201)', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });

      // Create initial rate
      const oldRate = await createTestPricingRate({
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
      });

      // Create new rate for same provider/model
      const res = await asAdmin(
        request(app)
          .post('/api/admin/pricing')
          .send({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            inputRate: 4.0,
            outputRate: 20.0,
          })
      );

      expect(res.status).toBe(201);
      expect(res.body.rate.inputRate).toBe(4.0);

      // Verify old rate was deactivated
      const deactivated = await testPrisma.pricingRate.findUnique({
        where: { id: oldRate.id },
      });
      expect(deactivated?.effectiveTo).toBeTruthy();
    });
  });

  describe('PATCH /api/admin/pricing/:id', () => {
    it('updates active rate', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const rate = await createTestPricingRate();

      const res = await asAdmin(
        request(app)
          .patch(`/api/admin/pricing/${rate.id}`)
          .send({ inputRate: 5.0 })
      );

      expect(res.status).toBe(200);
      expect(res.body.rate.inputRate).toBe(5.0);
    });

    it('rejects update of inactive rate (400)', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const rate = await createTestPricingRate({
        effectiveTo: new Date(), // already deactivated
      });

      const res = await asAdmin(
        request(app)
          .patch(`/api/admin/pricing/${rate.id}`)
          .send({ inputRate: 5.0 })
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inactive/i);
    });

    it('returns 404 for non-existent rate', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });

      const res = await asAdmin(
        request(app)
          .patch('/api/admin/pricing/nonexistent-id')
          .send({ inputRate: 5.0 })
      );

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/pricing/:id', () => {
    it('deletes a rate (204)', async () => {
      await createTestUser({ email: 'admin@ssaandco.com', role: 'ADMIN' });
      const rate = await createTestPricingRate();

      const res = await asAdmin(
        request(app).delete(`/api/admin/pricing/${rate.id}`)
      );

      expect(res.status).toBe(204);

      // Verify deleted
      const deleted = await testPrisma.pricingRate.findUnique({
        where: { id: rate.id },
      });
      expect(deleted).toBeNull();
    });
  });
});

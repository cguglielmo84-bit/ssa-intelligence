import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { truncateAll, disconnectPrisma } from '../../test-utils/db-helpers.js';
import { asAdmin, asMember } from '../../test-utils/auth-helpers.js';
import { createTestUser, createTestJob } from '../../test-utils/factories.js';

// Mock the orchestrator to avoid real job creation and queue processing
const mockCreateJob = vi.fn();
const mockGetQueuePosition = vi.fn().mockResolvedValue(1);
const mockProcessQueue = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/orchestrator.js', () => ({
  getResearchOrchestrator: () => ({
    createJob: mockCreateJob,
    getQueuePosition: mockGetQueuePosition,
    processQueue: mockProcessQueue,
  }),
}));

// Mock domain inference to avoid real API calls
vi.mock('../../services/domain-infer.js', () => ({
  ensureDomainForJob: vi.fn().mockResolvedValue(undefined),
}));

// All blueprints require timeHorizon — include it in valid requests
const validBase = {
  companyName: 'Test Company',
  reportInputs: { timeHorizon: 'Last Year' },
};

let testMember: Awaited<ReturnType<typeof createTestUser>>;
beforeEach(async () => {
  await truncateAll();
  testMember = await createTestUser({ email: 'member@ssaandco.com' });
  mockCreateJob.mockReset();
  mockGetQueuePosition.mockReset().mockResolvedValue(1);
});
afterAll(() => disconnectPrisma());

describe('POST /api/research/generate', () => {
  it('rejects missing companyName (400)', async () => {
    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({})
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/companyName/i);
  });

  it('rejects empty companyName (400)', async () => {
    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({ companyName: '   ' })
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/companyName/i);
  });

  it('rejects companyName shorter than 2 characters (400)', async () => {
    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({ companyName: 'A' })
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/companyName/i);
  });

  it('rejects invalid reportType (400)', async () => {
    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({ companyName: 'Test Company', reportType: 'INVALID' })
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reportType/i);
  });

  it('rejects invalid selectedSections (400)', async () => {
    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({
          ...validBase,
          selectedSections: ['nonexistent_section'],
        })
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/selectedSections/i);
  });

  it('rejects GROUP visibility without groupIds (400)', async () => {
    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({
          ...validBase,
          visibilityScope: 'GROUP',
          groupIds: [],
        })
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/groupIds/i);
  });

  it('returns 409 for duplicate queued job', async () => {
    await createTestJob({
      userId: testMember.id,
      companyName: 'Acme Corp',
      status: 'queued',
      reportType: 'GENERIC',
    });

    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({
          companyName: 'Acme Corp',
          reportInputs: { timeHorizon: 'Last Year' },
        })
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 409 for duplicate running job even with force=true', async () => {
    await createTestJob({
      userId: testMember.id,
      companyName: 'Acme Corp',
      status: 'running',
      reportType: 'GENERIC',
    });

    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({
          companyName: 'Acme Corp',
          reportInputs: { timeHorizon: 'Last Year' },
          force: true,
        })
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active job/i);
  });

  it('allows force=true for completed job (201)', async () => {
    await createTestJob({
      userId: testMember.id,
      companyName: 'Acme Corp',
      status: 'completed',
      reportType: 'GENERIC',
    });

    mockCreateJob.mockResolvedValue({
      id: 'new-job-id',
      companyName: 'Acme Corp',
      geography: 'Global',
    });

    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({
          companyName: 'Acme Corp',
          reportInputs: { timeHorizon: 'Last Year' },
          force: true,
        })
    );

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBe('new-job-id');
    expect(res.body.status).toBe('queued');
  });

  it('creates job with defaults (201, correct shape)', async () => {

    mockCreateJob.mockResolvedValue({
      id: 'job-123',
      companyName: 'New Company',
      geography: 'Global',
    });

    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({
          companyName: 'New Company',
          reportInputs: { timeHorizon: 'Last Year' },
        })
    );

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      jobId: 'job-123',
      status: 'queued',
      companyName: 'New Company',
      geography: 'Global',
    });
    expect(res.body.queuePosition).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  it('auto-expands section dependencies', async () => {

    mockCreateJob.mockImplementation(async (args: any) => {
      return {
        id: 'job-deps',
        companyName: args.companyName,
        geography: args.geography,
      };
    });

    const res = await asMember(
      request(app)
        .post('/api/research/generate')
        .send({
          companyName: 'Dep Test Company',
          reportInputs: { timeHorizon: 'Last Year' },
          // exec_summary depends on financial_snapshot and company_overview
          selectedSections: ['exec_summary'],
        })
    );

    expect(res.status).toBe(201);

    // Verify dependencies were auto-added
    const createJobCall = mockCreateJob.mock.calls[0][0];
    expect(createJobCall.selectedSections).toContain('financial_snapshot');
    expect(createJobCall.selectedSections).toContain('company_overview');
    expect(createJobCall.selectedSections).toContain('exec_summary');
  });
});

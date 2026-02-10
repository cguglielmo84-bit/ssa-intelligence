import { describe, it, expect } from 'vitest';
import { deriveJobStatus } from './status-utils.js';

type SubJob = { status: string };

describe('status-utils', () => {
  const base = { status: 'running', subJobs: [] as SubJob[] };

  it('returns completed_with_errors when all terminal and at least one failed', () => {
    expect(
      deriveJobStatus({
        ...base,
        status: 'completed',
        subJobs: [{ status: 'completed' }, { status: 'failed' }]
      }),
    ).toBe('completed_with_errors');
  });

  it('returns completed_with_errors when only failed subjobs exist', () => {
    expect(
      deriveJobStatus({
        ...base,
        status: 'completed',
        subJobs: [{ status: 'failed' }]
      }),
    ).toBe('completed_with_errors');
  });

  it('returns completed when all terminal and none failed', () => {
    expect(
      deriveJobStatus({
        ...base,
        status: 'completed',
        subJobs: [{ status: 'completed' }, { status: 'completed' }]
      }),
    ).toBe('completed');
  });

  it('returns failed when job status is failed', () => {
    expect(
      deriveJobStatus({
        ...base,
        status: 'failed',
        subJobs: [{ status: 'failed' }]
      }),
    ).toBe('failed');
  });
});

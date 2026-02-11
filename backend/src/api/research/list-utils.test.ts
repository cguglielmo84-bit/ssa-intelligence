import { describe, it, expect } from 'vitest';
import { filterJobsByDerivedStatus } from './list-utils.js';

describe('list-utils', () => {
  const jobs = [
    {
      id: 'job-1',
      status: 'completed',
      subJobs: [{ status: 'completed' }]
    },
    {
      id: 'job-2',
      status: 'completed',
      subJobs: [{ status: 'completed' }, { status: 'failed' }]
    },
    {
      id: 'job-3',
      status: 'queued',
      subJobs: [{ status: 'pending' }]
    }
  ];

  it('filters jobs by completed_with_errors status', () => {
    expect(
      filterJobsByDerivedStatus(jobs, 'completed_with_errors').map((job) => job.id),
    ).toEqual(['job-2']);
  });

  it('filters jobs by queued status', () => {
    expect(
      filterJobsByDerivedStatus(jobs, 'queued').map((job) => job.id),
    ).toEqual(['job-3']);
  });

  it('returns all jobs when no status filter provided', () => {
    expect(filterJobsByDerivedStatus(jobs).length).toBe(3);
  });
});

import { describe, it, expect } from 'vitest';
import { collectBlockedStages } from './dependency-utils.js';

describe('dependency-utils', () => {
  const deps = {
    foundation: [],
    financial_snapshot: ['foundation'],
    company_overview: ['foundation'],
    exec_summary: ['foundation', 'financial_snapshot', 'company_overview']
  } as const;

  const subJobs = [
    { stage: 'financial_snapshot', status: 'failed' },
    { stage: 'exec_summary', status: 'pending' }
  ];

  it('collects stages blocked by a failed dependency', () => {
    const blocked = collectBlockedStages(['financial_snapshot'], subJobs, deps);
    expect(blocked).toEqual(['exec_summary']);
  });
});

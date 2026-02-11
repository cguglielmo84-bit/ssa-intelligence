import { describe, it, expect } from 'vitest';
import { computeRerunStages } from './rerun-utils.js';

describe('rerun-utils', () => {
  const deps = {
    foundation: [],
    financial_snapshot: ['foundation'],
    company_overview: ['foundation'],
    exec_summary: ['foundation', 'financial_snapshot', 'company_overview']
  } as const;

  const subJobs = [
    { stage: 'financial_snapshot', status: 'failed' },
    { stage: 'company_overview', status: 'completed' },
    { stage: 'exec_summary', status: 'failed' }
  ];

  it('includes failed dependencies when computing rerun stages', () => {
    const stages = computeRerunStages(['exec_summary'], subJobs, deps);
    expect(stages.sort()).toEqual(['exec_summary', 'financial_snapshot'].sort());
  });
});

import { describe, it, expect } from 'vitest';
import { buildCompletedStages } from './stage-tracking-utils.js';

describe('stage-tracking-utils', () => {
  const subJobs = [
    { stage: 'foundation', status: 'completed' },
    { stage: 'exec_summary', status: 'completed' },
    { stage: 'investment_strategy', status: 'completed' },
    { stage: 'financial_snapshot', status: 'failed' },
  ];

  it('returns completed stages in specified order', () => {
    expect(
      buildCompletedStages(subJobs, ['investment_strategy', 'exec_summary']),
    ).toEqual(['investment_strategy', 'exec_summary']);
  });

  it('returns completed stages in alphabetical order when no order specified', () => {
    expect(buildCompletedStages(subJobs)).toEqual(['exec_summary', 'investment_strategy']);
  });
});

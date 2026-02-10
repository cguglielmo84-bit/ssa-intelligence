import { describe, it, expect } from 'vitest';
import {
  computeFinalStatus,
  computeOverallConfidence,
  computeTerminalProgress
} from '../services/orchestrator-utils.js';

describe('orchestrator-utils', () => {
  const subJobs = [
    { status: 'completed' },
    { status: 'failed' },
    { status: 'cancelled' }
  ];

  it('computes terminal progress', () => {
    expect(computeTerminalProgress(subJobs)).toBe(1);
  });

  it('computes final status with mixed results', () => {
    expect(computeFinalStatus('running', subJobs)).toBe('completed_with_errors');
  });

  it('computes overall confidence with failure', () => {
    const result = computeOverallConfidence([
      { status: 'completed', confidence: 'HIGH' },
      { status: 'failed' }
    ]);
    expect(result.score).toBe(0.6);
    expect(result.label).toBe('MEDIUM');
  });

  it('computes overall confidence for failed only', () => {
    const result = computeOverallConfidence([{ status: 'failed' }]);
    expect(result.score).toBe(0.3);
    expect(result.label).toBe('LOW');
  });

  it('computes overall confidence for empty array', () => {
    const result = computeOverallConfidence([]);
    expect(result.score).toBe(null);
    expect(result.label).toBe(null);
  });
});

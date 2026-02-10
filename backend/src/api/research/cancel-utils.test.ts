import { describe, it, expect } from 'vitest';
import { buildCancelResponse } from './cancel-utils.js';

describe('cancel-utils', () => {
  it('builds a cancel response', () => {
    expect(buildCancelResponse('job-123')).toEqual({
      success: true,
      jobId: 'job-123',
      status: 'cancelled'
    });
  });
});

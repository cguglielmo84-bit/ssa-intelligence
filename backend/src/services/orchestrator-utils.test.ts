import assert from 'node:assert/strict';
import {
  computeFinalStatus,
  computeTerminalProgress
} from '../services/orchestrator-utils.js';

const subJobs = [
  { status: 'completed' },
  { status: 'failed' },
  { status: 'cancelled' }
];

assert.equal(computeTerminalProgress(subJobs), 1);
assert.equal(computeFinalStatus('running', subJobs), 'completed_with_errors');
console.log('orchestrator utils tests passed');

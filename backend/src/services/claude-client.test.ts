import { describe, it, expect } from 'vitest';
import { ClaudeClient } from '../services/claude-client.js';

describe('ClaudeClient', () => {
  const client = new ClaudeClient({ apiKey: 'test-key' });

  const invalidResponse = {
    content: '{"foo":"bar",}',
    stopReason: 'stop',
    usage: { inputTokens: 0, outputTokens: 0 }
  };

  it('throws on invalid JSON', () => {
    expect(() => client.parseJSON(invalidResponse)).toThrow(/Invalid JSON response/);
  });

  it('repairs invalid JSON when allowRepair is true', () => {
    const repaired = client.parseJSON<{ foo: string }>(invalidResponse, { allowRepair: true });
    expect(repaired.foo).toBe('bar');
  });
});

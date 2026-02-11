import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    globalSetup: ['src/test-utils/global-setup.ts'],
    setupFiles: ['src/test-utils/setup.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    // Integration tests share a single database — run files sequentially
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage-integration',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@prompts': path.resolve(__dirname, 'prompts'),
    },
  },
});

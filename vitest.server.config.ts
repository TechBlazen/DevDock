/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Separate config for server-side tests (Node environment, no React plugin).
// Run with `npm run test:server`. The Postgres contract test is gated by
// TEST_POSTGRES_URL — without it set, the spec just records a skip and exits 0.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['server/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    reporters: ['default'],
    // DB containers can be slow to come up; keep the per-test budget generous.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

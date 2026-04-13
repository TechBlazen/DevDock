/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**', 'server/**'],
    css: false,
    reporters: process.env.CI
      ? ['default', ['junit', { outputFile: 'results/vitest-junit.xml' }]]
      : ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      // Scoped to files the Phase 1 suite actually exercises — will expand as tests grow.
      include: [
        'src/lib/rbac.ts',
        'src/lib/auth.ts',
        'src/lib/bookmark-utils.ts',
        'src/lib/ai.ts',
        'src/store/forum-store.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
      ],
      thresholds: {
        statements: 50,
        branches: 55,
        functions: 55,
        lines: 50,
      },
    },
  },
});

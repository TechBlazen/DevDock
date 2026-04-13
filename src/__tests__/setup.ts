import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Reset DOM between tests
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Deterministic crypto for auth/PKCE tests (jsdom provides webcrypto in Node 20+)
beforeEach(() => {
  // No-op hook reserved for per-test bootstrap
});

// Stub matchMedia (used by some UI libs)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Stub IntersectionObserver
if (typeof window !== 'undefined' && !(window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver) {
  class IntersectionObserverStub {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  (window as unknown as { IntersectionObserver: typeof IntersectionObserverStub }).IntersectionObserver =
    IntersectionObserverStub;
}

// Stub ResizeObserver
if (typeof window !== 'undefined' && !(window as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  class ResizeObserverStub {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  (window as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

// Silence OpenTelemetry initialization in tests
vi.mock('../otel', () => ({
  initOTel: vi.fn(),
  traceAICall: vi.fn(() => ({
    end: vi.fn((_status: string, _error?: string) => `trace-${Math.random().toString(36).slice(2)}`),
  })),
}));

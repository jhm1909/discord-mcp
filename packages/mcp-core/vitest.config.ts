import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['../mcp-server-mocks/src/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
    // Plan 12 Phase E.1 — benchmarks run only via `vitest bench`. The explicit
    // `include` above scopes `vitest run` (test mode) to *.test.ts so .bench.ts
    // never executes as a test. In bench mode vitest swaps in its own include
    // (defaults to *.{bench,benchmark}.?(c|m)[jt]s?(x)), so we set
    // `benchmark.include` explicitly to be unambiguous.
    benchmark: {
      include: ['src/**/*.bench.ts'],
      reporters: ['default'],
    },
  },
});

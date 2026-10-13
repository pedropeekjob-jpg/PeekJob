import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**'], reporter: ['text-summary', 'lcov'], reportsDirectory: 'coverage', thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 } },
  },
});

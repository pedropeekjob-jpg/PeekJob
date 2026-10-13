/** Testes unitários (test/unit) e de integração contra PostgreSQL real (test/e2e). */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '^@peekjob/shared$': '<rootDir>/../../packages/shared/src' },
  globalSetup: '<rootDir>/test/global-setup.ts',
  testTimeout: 20000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*-cli.ts', '!src/main.ts'],
  coverageReporters: ['text-summary', 'lcov'],
  coverageDirectory: 'coverage',
  coverageThreshold: { global: { lines: 90, statements: 90, functions: 90, branches: 75 } },
};

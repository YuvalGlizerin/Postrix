// jest.config.ts in services/core directory
import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  // The root of your source code, typically "/src"
  // "<rootDir>" is a token Jest substitutes
//   rootDir: './services/core',

  // Jest transformations -- this adds support for TypeScript
  // using ts-jest
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },

  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.ts', // Matches any .test.ts files in the tests directory
    '**/tests/**/*.spec.ts', // Matches any .spec.ts files in the tests directory
  ],

  // Code coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};

export default config;

const config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true
      }
    ]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/tests/**/*.test.{js,jsx,ts,tsx}'],
  collectCoverage: true,
  collectCoverageFrom: ['**/src/**/*.{ts,tsx}', '!**/.history/**/*.{ts,tsx}'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1'
  },
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Capish Test Report',
        outputPath: '<rootDir>/coverage/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true
      }
    ]
  ]
};

export default config;
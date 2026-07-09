export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['<rootDir>/src/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.config.js',
    '!src/public/**',
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 10000,
  verbose: true,
};

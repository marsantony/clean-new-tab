module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['./tests/setup/polyfills.js', 'fake-indexeddb/auto'],
  setupFilesAfterEnv: ['./tests/setup/jest.setup.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js',
    '<rootDir>/tests/security/**/*.test.js',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/', '/tests/performance/'],
};

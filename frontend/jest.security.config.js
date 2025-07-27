/**
 * Jest configuration for security tests
 * Focused on testing authentication, authorization, and security controls
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Security Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Test file patterns for security tests
  testMatch: [
    '<rootDir>/src/**/__tests__/security.test.{js,ts,tsx}',
    '<rootDir>/src/**/*.security.test.{js,ts,tsx}',
    '<rootDir>/tests/security/**/*.test.{js,ts,tsx}'
  ],
  
  // Module name mapping
  moduleNameMap: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1'
  },
  
  // Coverage configuration for security-related files
  collectCoverageFrom: [
    'src/shared/config/environment.ts',
    'src/shared/config/demo-users.ts',
    'src/shared/hooks/useDemoSecurity.ts',
    'src/shared/stores/auth-store.ts',
    'src/shared/services/api.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts,tsx}',
    '!src/**/*.test.{js,ts,tsx}'
  ],
  
  // Coverage thresholds for security code
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/shared/config/environment.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/shared/hooks/useDemoSecurity.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Security-specific test environment setup
  setupFiles: [
    '<rootDir>/tests/security/setup.js'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Mock configuration for security tests
  moduleNameMap: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Test timeout for security tests (can be longer for crypto operations)
  testTimeout: 10000,
  
  // Verbose output for security test debugging
  verbose: true,
  
  // Globals for security testing
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
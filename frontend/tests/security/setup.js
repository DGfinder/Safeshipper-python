/**
 * Security Test Setup
 * Configures the testing environment for security-related tests
 */

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_MODE = 'demo';
process.env.NEXT_PUBLIC_DEMO_SESSION_TIMEOUT = '60';
process.env.NEXT_PUBLIC_DEMO_MAX_SESSIONS = '3';
process.env.NEXT_PUBLIC_ALLOW_DEMO_IN_PRODUCTION = 'false';

// Security testing utilities
global.mockSecureEnvironment = (overrides = {}) => {
  const defaultEnv = {
    NODE_ENV: 'test',
    NEXT_PUBLIC_API_MODE: 'demo',
    NEXT_PUBLIC_DEMO_SESSION_TIMEOUT: '60',
    NEXT_PUBLIC_DEMO_MAX_SESSIONS: '3',
    NEXT_PUBLIC_ALLOW_DEMO_IN_PRODUCTION: 'false',
    ...overrides
  };
  
  Object.keys(defaultEnv).forEach(key => {
    process.env[key] = defaultEnv[key];
  });
};

global.mockProductionEnvironment = () => {
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_API_MODE = 'production';
  process.env.NEXT_PUBLIC_ALLOW_DEMO_IN_PRODUCTION = 'false';
};

// Mock localStorage for browser APIs
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console.warn to track security warnings
const originalWarn = console.warn;
global.mockConsoleWarn = jest.fn();
console.warn = global.mockConsoleWarn;

// Cleanup function
global.cleanupSecurityMocks = () => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  global.mockConsoleWarn.mockClear();
  console.warn = originalWarn;
};

// Security test helpers
global.securityTestHelpers = {
  createExpiredSession: (minutesAgo = 61) => {
    return Date.now() - (minutesAgo * 60 * 1000);
  },
  
  createValidSession: (minutesAgo = 30) => {
    return Date.now() - (minutesAgo * 60 * 1000);
  },
  
  restrictedActions: [
    'user_management',
    'system_configuration',
    'delete_shipments',
    'delete_customers',
    'modify_audit_logs'
  ],
  
  allowedActions: [
    'view_shipments',
    'create_shipments',
    'update_shipments',
    'view_customers',
    'create_customers',
    'update_customers',
    'view_reports',
    'export_data'
  ]
};

console.log('🔒 Security test environment initialized');
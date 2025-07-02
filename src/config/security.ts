// Security configuration for SafeShipper
export const securityConfig = {
  // Authentication settings
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    jwtExpiry: '15m',
    jwtRefreshExpiry: '7d',
    bcryptRounds: 12,
    maxLoginAttempts: parseInt(process.env.SECURITY_FAILED_LOGIN_ATTEMPTS || '5'),
    accountLockoutDuration: parseInt(process.env.SECURITY_ACCOUNT_LOCKOUT_DURATION || '1800000'), // 30 minutes
  },

  // Rate limiting settings
  rateLimit: {
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'),
    loginAttempts: 5,
    loginWindowMs: 15 * 60 * 1000, // 15 minutes
    strictLimitRequests: 10,
    strictLimitWindowMs: 60 * 1000, // 1 minute
  },

  // Encryption settings
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
    algorithm: 'AES-256-GCM',
  },

  // Session settings
  session: {
    secret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
    timeout: parseInt(process.env.SESSION_TIMEOUT || '900000'), // 15 minutes
    cookieName: 'safeshipper_session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },

  // Security headers
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"], // React needs these
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXSSProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    optionsSuccessStatus: 200,
  },

  // Audit logging
  audit: {
    level: process.env.SECURITY_AUDIT_LOG_LEVEL || 'info',
    maxEvents: 10000,
    retentionDays: 90,
    exportFormats: ['json', 'csv'],
    alertThresholds: {
      failedLogins: 3,
      securityViolations: 1,
      suspiciousActivity: 5,
    },
  },

  // Feature flags
  features: {
    enableMFA: process.env.ENABLE_MFA === 'true',
    enableIPWhitelist: process.env.ENABLE_IP_WHITELIST === 'true',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
  },

  // Password policy
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    historyCount: 5, // Don't reuse last 5 passwords
    forbiddenPasswords: [
      'password', '123456', 'admin123', 'password123', 'qwerty',
      'abc123', 'admin', 'letmein', 'welcome', 'monkey', 'dragon'
    ],
  },

  // Compliance settings
  compliance: {
    dataRetentionDays: 2555, // 7 years for compliance
    encryptPII: true,
    auditTrail: true,
    gdprCompliant: true,
    soc2Compliant: false, // Not yet implemented
    iso27001Compliant: false, // Not yet implemented
  },

  // Notification settings
  notifications: {
    securityAlerts: {
      email: process.env.SECURITY_ALERT_EMAIL || 'security@safeshipper.com',
      slack: process.env.SLACK_WEBHOOK_URL || '',
      sms: process.env.SECURITY_ALERT_SMS || '',
    },
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'SafeShipper <noreply@safeshipper.com>',
    },
  },

  // Development settings
  development: {
    enableDebugLogging: process.env.LOG_LEVEL === 'debug',
    bypassRateLimit: process.env.NODE_ENV === 'development',
    mockExternalServices: process.env.NODE_ENV === 'development',
  },
}

// Security risk levels
export enum SecurityRiskLevel {
  LOW = 1,
  MEDIUM = 5,
  HIGH = 8,
  CRITICAL = 10,
}

// Security event categories
export enum SecurityEventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  SYSTEM_SECURITY = 'system_security',
  COMPLIANCE = 'compliance',
}

// Admin IP whitelist (in production, manage via database)
export const adminIPWhitelist = [
  '127.0.0.1',
  '::1',
  '192.168.1.0/24', // Local network
  // Add production admin IPs here
]

// Validate security configuration on startup
export function validateSecurityConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check JWT secrets
  if (securityConfig.auth.jwtSecret.length < 32) {
    errors.push('JWT secret must be at least 32 characters long')
  }

  if (securityConfig.auth.jwtRefreshSecret.length < 32) {
    errors.push('JWT refresh secret must be at least 32 characters long')
  }

  if (securityConfig.auth.jwtSecret === securityConfig.auth.jwtRefreshSecret) {
    errors.push('JWT secret and refresh secret must be different')
  }

  // Check encryption key
  if (securityConfig.encryption.key.length < 32) {
    errors.push('Encryption key must be at least 32 characters long')
  }

  // Check production settings
  if (process.env.NODE_ENV === 'production') {
    if (securityConfig.auth.jwtSecret.includes('dev-secret')) {
      errors.push('Production environment must not use default JWT secret')
    }

    if (securityConfig.encryption.key.includes('default-key')) {
      errors.push('Production environment must not use default encryption key')
    }

    if (!securityConfig.session.secure) {
      errors.push('Production environment must use secure cookies')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export default configuration
export default securityConfig 
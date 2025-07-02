import { RateLimiterMemory } from 'rate-limiter-flexible'
import { logSecurityViolation, logAuditEvent, AuditLevel, AuditEventType } from '../services/audit'
import { verifyToken } from '../services/auth'

// Rate limiter configurations
const loginLimiter = new RateLimiterMemory({
  keyGenerator: (req: any) => req.ip,
  points: 5, // 5 attempts
  duration: 15 * 60, // per 15 minutes
  blockDuration: 30 * 60, // block for 30 minutes
})

const apiLimiter = new RateLimiterMemory({
  keyGenerator: (req: any) => req.ip,
  points: 100, // 100 requests
  duration: 60, // per minute
  blockDuration: 60, // block for 1 minute
})

const strictApiLimiter = new RateLimiterMemory({
  keyGenerator: (req: any) => req.ip,
  points: 10, // 10 requests
  duration: 60, // per minute
  blockDuration: 5 * 60, // block for 5 minutes
})

// Security headers middleware
export function securityHeaders() {
  return (req: any, res: any, next: any) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // React needs unsafe-eval and unsafe-inline
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
    
    res.setHeader('Content-Security-Policy', csp)
    
    next()
  }
}

// Rate limiting middleware
export function rateLimit(limiter: RateLimiterMemory, blockMessage = 'Too many requests') {
  return async (req: any, res: any, next: any) => {
    try {
      await limiter.consume(req.ip)
      next()
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1
      
      // Log rate limit violation
      logSecurityViolation(
        'Rate limit exceeded',
        undefined,
        undefined,
        {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
          remainingPoints: rejRes.remainingPoints,
          msBeforeNext: rejRes.msBeforeNext
        },
        req.ip,
        req.headers['user-agent']
      )
      
      logAuditEvent({
        level: AuditLevel.WARN,
        eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        action: `Rate limit exceeded for ${req.method} ${req.path}`,
        result: 'error',
        details: {
          method: req.method,
          path: req.path,
          remainingPoints: rejRes.remainingPoints,
          retryAfter: secs
        }
      })
      
      res.set('Retry-After', String(secs))
      res.status(429).json({
        error: blockMessage,
        retryAfter: secs
      })
    }
  }
}

// Authentication middleware
export function requireAuth() {
  return async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logAuditEvent({
          level: AuditLevel.WARN,
          eventType: AuditEventType.ACCESS_DENIED,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          action: 'Missing or invalid authorization header',
          result: 'error',
          details: {
            method: req.method,
            path: req.path,
            hasAuthHeader: !!authHeader,
            authHeaderFormat: authHeader ? 'invalid' : 'missing'
          }
        })
        
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      
      // Attach user info to request
      req.user = decoded
      
      logAuditEvent({
        level: AuditLevel.INFO,
        eventType: AuditEventType.PERMISSION_GRANTED,
        userId: decoded.id,
        userEmail: decoded.email,
        userRole: decoded.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        action: `Authenticated access to ${req.method} ${req.path}`,
        result: 'success',
        details: {
          method: req.method,
          path: req.path,
          tokenType: decoded.type
        }
      })
      
      next()
    } catch (error) {
      logAuditEvent({
        level: AuditLevel.WARN,
        eventType: AuditEventType.ACCESS_DENIED,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        action: 'Invalid or expired token',
        result: 'error',
        details: {
          method: req.method,
          path: req.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      res.status(401).json({ error: 'Invalid or expired token' })
    }
  }
}

// Role-based authorization middleware
export function requireRole(roles: string | string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    
    if (!allowedRoles.includes(user.role)) {
      logAuditEvent({
        level: AuditLevel.WARN,
        eventType: AuditEventType.ACCESS_DENIED,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        action: `Insufficient privileges for ${req.method} ${req.path}`,
        result: 'error',
        details: {
          method: req.method,
          path: req.path,
          userRole: user.role,
          requiredRoles: allowedRoles
        }
      })
      
      return res.status(403).json({ 
        error: 'Insufficient privileges',
        required: allowedRoles,
        current: user.role
      })
    }
    
    next()
  }
}

// Input validation middleware
export function validateInput(schema: any) {
  return (req: any, res: any, next: any) => {
    try {
      // Basic validation - in production use Joi, Yup, or Zod
      const errors: string[] = []
      
      if (schema.email && req.body.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(req.body.email)) {
          errors.push('Invalid email format')
        }
      }
      
      if (schema.password && req.body.password) {
        if (req.body.password.length < 8) {
          errors.push('Password must be at least 8 characters')
        }
      }
      
      if (schema.required) {
        for (const field of schema.required) {
          if (!req.body[field]) {
            errors.push(`${field} is required`)
          }
        }
      }
      
      if (errors.length > 0) {
        logSecurityViolation(
          'Input validation failed',
          req.user?.id,
          req.user?.email,
          {
            errors,
            path: req.path,
            method: req.method,
            body: JSON.stringify(req.body)
          },
          req.ip,
          req.headers['user-agent']
        )
        
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors 
        })
      }
      
      next()
    } catch (error) {
      res.status(500).json({ error: 'Validation error' })
    }
  }
}

// Request sanitization middleware
export function sanitizeInput() {
  return (req: any, res: any, next: any) => {
    if (req.body) {
      // Remove potential XSS and injection attempts
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim()
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitize)
        }
        
        if (obj && typeof obj === 'object') {
          const sanitized: any = {}
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitize(value)
          }
          return sanitized
        }
        
        return obj
      }
      
      req.body = sanitize(req.body)
    }
    
    next()
  }
}

// SQL injection protection middleware
export function sqlInjectionProtection() {
  return (req: any, res: any, next: any) => {
    const checkForSQLInjection = (value: string): boolean => {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(\'|\"|;|--|\*|\||&)/g,
        /(\bOR\b|\bAND\b)/gi
      ]
      
      return sqlPatterns.some(pattern => pattern.test(value))
    }
    
    const checkObject = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return checkForSQLInjection(obj)
      }
      
      if (Array.isArray(obj)) {
        return obj.some(checkObject)
      }
      
      if (obj && typeof obj === 'object') {
        return Object.values(obj).some(checkObject)
      }
      
      return false
    }
    
    // Check query parameters
    if (req.query && checkObject(req.query)) {
      logSecurityViolation(
        'SQL injection attempt detected in query parameters',
        req.user?.id,
        req.user?.email,
        {
          query: JSON.stringify(req.query),
          path: req.path,
          method: req.method
        },
        req.ip,
        req.headers['user-agent']
      )
      
      return res.status(400).json({ error: 'Invalid request parameters' })
    }
    
    // Check request body
    if (req.body && checkObject(req.body)) {
      logSecurityViolation(
        'SQL injection attempt detected in request body',
        req.user?.id,
        req.user?.email,
        {
          body: JSON.stringify(req.body),
          path: req.path,
          method: req.method
        },
        req.ip,
        req.headers['user-agent']
      )
      
      return res.status(400).json({ error: 'Invalid request data' })
    }
    
    next()
  }
}

// IP whitelist middleware (for admin endpoints)
export function ipWhitelist(allowedIPs: string[]) {
  return (req: any, res: any, next: any) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress
    
    if (!allowedIPs.includes(clientIP)) {
      logSecurityViolation(
        'Access attempt from non-whitelisted IP',
        req.user?.id,
        req.user?.email,
        {
          clientIP,
          allowedIPs,
          path: req.path,
          method: req.method
        },
        clientIP,
        req.headers['user-agent']
      )
      
      return res.status(403).json({ error: 'Access denied' })
    }
    
    next()
  }
}

// Session validation middleware
export function validateSession() {
  return async (req: any, res: any, next: any) => {
    if (req.user) {
      // Check if session is still valid
      const sessionId = req.headers['x-session-id']
      
      if (!sessionId) {
        logSecurityViolation(
          'Missing session ID',
          req.user.id,
          req.user.email,
          {
            path: req.path,
            method: req.method
          },
          req.ip,
          req.headers['user-agent']
        )
        
        return res.status(401).json({ error: 'Invalid session' })
      }
      
      // In production, validate against active sessions in database
      // For now, we'll just check the format
      if (!/^[a-f0-9]{32}$/.test(sessionId)) {
        logSecurityViolation(
          'Invalid session ID format',
          req.user.id,
          req.user.email,
          {
            sessionId,
            path: req.path,
            method: req.method
          },
          req.ip,
          req.headers['user-agent']
        )
        
        return res.status(401).json({ error: 'Invalid session' })
      }
    }
    
    next()
  }
}

// Export rate limiters for specific use cases
export const rateLimiters = {
  login: rateLimit(loginLimiter, 'Too many login attempts. Please try again later.'),
  api: rateLimit(apiLimiter, 'API rate limit exceeded. Please slow down.'),
  strict: rateLimit(strictApiLimiter, 'Strict rate limit exceeded. Please wait before retrying.')
}

// Combined security middleware stack
export function securityStack() {
  return [
    securityHeaders(),
    sanitizeInput(),
    sqlInjectionProtection(),
    rateLimiters.api
  ]
}

// Admin-only security stack
export function adminSecurityStack(allowedIPs?: string[]) {
  const middleware = [
    securityHeaders(),
    sanitizeInput(),
    sqlInjectionProtection(),
    rateLimiters.strict,
    requireAuth(),
    requireRole(['admin'])
  ]
  
  if (allowedIPs && allowedIPs.length > 0) {
    middleware.splice(-2, 0, ipWhitelist(allowedIPs))
  }
  
  return middleware
} 
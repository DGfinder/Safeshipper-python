import winston from 'winston'
import { encryptData } from './auth'

// Audit log levels
export enum AuditLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Audit event types
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  ACCOUNT_LOCKED = 'account_locked',
  
  // Authorization events
  ACCESS_DENIED = 'access_denied',
  PERMISSION_GRANTED = 'permission_granted',
  ROLE_CHANGED = 'role_changed',
  
  // Data events
  DATA_ACCESS = 'data_access',
  DATA_CREATED = 'data_created',
  DATA_UPDATED = 'data_updated',
  DATA_DELETED = 'data_deleted',
  DATA_EXPORTED = 'data_exported',
  
  // System events
  SYSTEM_ERROR = 'system_error',
  SECURITY_VIOLATION = 'security_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  
  // Load planning events
  LOAD_CREATED = 'load_created',
  LOAD_UPDATED = 'load_updated',
  LOAD_ASSIGNED = 'load_assigned',
  VEHICLE_ASSIGNED = 'vehicle_assigned',
  DG_COMPLIANCE_CHECK = 'dg_compliance_check'
}

// Audit log entry interface
export interface AuditLogEntry {
  timestamp: Date
  level: AuditLevel
  eventType: AuditEventType
  userId?: string
  userEmail?: string
  userRole?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  resourceId?: string
  resourceType?: string
  action: string
  result: 'success' | 'failure' | 'error'
  details?: Record<string, any>
  riskScore?: number
  correlationId?: string
}

// Risk scoring for security events
const RISK_SCORES = {
  [AuditEventType.LOGIN_SUCCESS]: 1,
  [AuditEventType.LOGIN_FAILED]: 5,
  [AuditEventType.ACCOUNT_LOCKED]: 8,
  [AuditEventType.ACCESS_DENIED]: 6,
  [AuditEventType.SECURITY_VIOLATION]: 9,
  [AuditEventType.SUSPICIOUS_ACTIVITY]: 10,
  [AuditEventType.RATE_LIMIT_EXCEEDED]: 7,
  [AuditEventType.DATA_EXPORTED]: 4,
  [AuditEventType.ROLE_CHANGED]: 6,
  [AuditEventType.PASSWORD_CHANGE]: 2,
  [AuditEventType.MFA_DISABLED]: 5
}

// Configure Winston logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  defaultMeta: { service: 'safeshipper-audit' },
  transports: [
    // File transport for audit logs
    new winston.transports.File({ 
      filename: 'logs/audit-error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.File({ 
      filename: 'logs/audit-combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 20
    }),
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

// In-memory storage for recent audit events (for monitoring dashboard)
const recentAuditEvents: AuditLogEntry[] = []
const MAX_RECENT_EVENTS = 1000

/**
 * Log an audit event
 */
export function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp' | 'riskScore'>): void {
  const auditEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
    riskScore: RISK_SCORES[entry.eventType] || 1
  }
  
  // Log to Winston
  auditLogger.log(entry.level, 'Audit Event', auditEntry)
  
  // Store in memory for recent events
  recentAuditEvents.unshift(auditEntry)
  if (recentAuditEvents.length > MAX_RECENT_EVENTS) {
    recentAuditEvents.pop()
  }
  
  // Check for security alerts
  checkSecurityAlerts(auditEntry)
}

/**
 * Log authentication events
 */
export function logAuthEvent(
  eventType: AuditEventType,
  userId: string | undefined,
  userEmail: string | undefined,
  result: 'success' | 'failure' | 'error',
  details?: Record<string, any>,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logAuditEvent({
    level: result === 'success' ? AuditLevel.INFO : AuditLevel.WARN,
    eventType,
    userId,
    userEmail,
    sessionId,
    ipAddress,
    userAgent,
    action: `Authentication: ${eventType}`,
    result,
    details
  })
}

/**
 * Log data access events
 */
export function logDataAccess(
  userId: string,
  userEmail: string,
  userRole: string,
  resourceType: string,
  resourceId: string,
  action: string,
  result: 'success' | 'failure' | 'error',
  details?: Record<string, any>
): void {
  logAuditEvent({
    level: AuditLevel.INFO,
    eventType: AuditEventType.DATA_ACCESS,
    userId,
    userEmail,
    userRole,
    resourceType,
    resourceId,
    action: `Data Access: ${action}`,
    result,
    details
  })
}

/**
 * Log security violations
 */
export function logSecurityViolation(
  description: string,
  userId?: string,
  userEmail?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): void {
  logAuditEvent({
    level: AuditLevel.ERROR,
    eventType: AuditEventType.SECURITY_VIOLATION,
    userId,
    userEmail,
    ipAddress,
    userAgent,
    action: `Security Violation: ${description}`,
    result: 'error',
    details
  })
}

/**
 * Log load planning activities
 */
export function logLoadPlanningEvent(
  eventType: AuditEventType,
  userId: string,
  userEmail: string,
  userRole: string,
  resourceId: string,
  action: string,
  result: 'success' | 'failure' | 'error',
  details?: Record<string, any>
): void {
  logAuditEvent({
    level: AuditLevel.INFO,
    eventType,
    userId,
    userEmail,
    userRole,
    resourceType: 'load',
    resourceId,
    action: `Load Planning: ${action}`,
    result,
    details
  })
}

/**
 * Check for security alerts based on audit events
 */
function checkSecurityAlerts(entry: AuditLogEntry): void {
  // Multiple failed login attempts
  if (entry.eventType === AuditEventType.LOGIN_FAILED && entry.userId) {
    const recentFailures = recentAuditEvents.filter(
      e => e.eventType === AuditEventType.LOGIN_FAILED &&
           e.userId === entry.userId &&
           e.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    ).length
    
    if (recentFailures >= 3) {
      logSecurityViolation(
        `Multiple failed login attempts detected for user ${entry.userEmail}`,
        entry.userId,
        entry.userEmail,
        { failedAttempts: recentFailures, timeWindow: '15 minutes' },
        entry.ipAddress,
        entry.userAgent
      )
    }
  }
  
  // Suspicious IP activity
  if (entry.ipAddress) {
    const recentFromIP = recentAuditEvents.filter(
      e => e.ipAddress === entry.ipAddress &&
           e.timestamp > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
    ).length
    
    if (recentFromIP >= 20) {
      logSecurityViolation(
        `Suspicious activity detected from IP ${entry.ipAddress}`,
        entry.userId,
        entry.userEmail,
        { requestsFromIP: recentFromIP, timeWindow: '10 minutes' },
        entry.ipAddress,
        entry.userAgent
      )
    }
  }
  
  // High-risk event patterns
  if (entry.riskScore && entry.riskScore >= 8) {
    const highRiskEvents = recentAuditEvents.filter(
      e => e.riskScore && e.riskScore >= 6 &&
           e.timestamp > new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
    ).length
    
    if (highRiskEvents >= 5) {
      logSecurityViolation(
        'Pattern of high-risk security events detected',
        entry.userId,
        entry.userEmail,
        { highRiskEventCount: highRiskEvents, timeWindow: '30 minutes' }
      )
    }
  }
}

/**
 * Get recent audit events for monitoring dashboard
 */
export function getRecentAuditEvents(limit = 100): AuditLogEntry[] {
  return recentAuditEvents.slice(0, limit)
}

/**
 * Get security metrics for dashboard
 */
export function getSecurityMetrics(timeWindow = 24): {
  totalEvents: number
  securityViolations: number
  failedLogins: number
  highRiskEvents: number
  avgRiskScore: number
  topEventTypes: { eventType: string; count: number }[]
} {
  const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000)
  const events = recentAuditEvents.filter(e => e.timestamp > since)
  
  const securityViolations = events.filter(e => e.eventType === AuditEventType.SECURITY_VIOLATION).length
  const failedLogins = events.filter(e => e.eventType === AuditEventType.LOGIN_FAILED).length
  const highRiskEvents = events.filter(e => e.riskScore && e.riskScore >= 7).length
  
  const totalRiskScore = events.reduce((sum, e) => sum + (e.riskScore || 0), 0)
  const avgRiskScore = events.length > 0 ? totalRiskScore / events.length : 0
  
  // Count event types
  const eventTypeCounts = events.reduce((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topEventTypes = Object.entries(eventTypeCounts)
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return {
    totalEvents: events.length,
    securityViolations,
    failedLogins,
    highRiskEvents,
    avgRiskScore: Math.round(avgRiskScore * 100) / 100,
    topEventTypes
  }
}

/**
 * Export audit logs for compliance
 */
export function exportAuditLogs(
  startDate: Date,
  endDate: Date,
  eventTypes?: AuditEventType[]
): string {
  const filteredEvents = recentAuditEvents.filter(e => {
    const inDateRange = e.timestamp >= startDate && e.timestamp <= endDate
    const matchesType = !eventTypes || eventTypes.includes(e.eventType)
    return inDateRange && matchesType
  })
  
  // Convert to CSV format for compliance exports
  const headers = [
    'Timestamp', 'Level', 'Event Type', 'User ID', 'User Email', 'User Role',
    'Session ID', 'IP Address', 'Resource Type', 'Resource ID', 'Action',
    'Result', 'Risk Score', 'Details'
  ]
  
  const rows = filteredEvents.map(e => [
    e.timestamp.toISOString(),
    e.level,
    e.eventType,
    e.userId || '',
    e.userEmail || '',
    e.userRole || '',
    e.sessionId || '',
    e.ipAddress || '',
    e.resourceType || '',
    e.resourceId || '',
    e.action,
    e.result,
    e.riskScore?.toString() || '',
    JSON.stringify(e.details || {})
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n')
  
  return csvContent
}

/**
 * Middleware to automatically log HTTP requests
 */
export function createAuditMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    
    // Extract user info from token if available
    const authHeader = req.headers.authorization
    let userId, userEmail, userRole
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        // This would integrate with your auth service
        // const token = authHeader.substring(7)
        // const user = await getUserFromToken(token)
        // userId = user?.id
        // userEmail = user?.email
        // userRole = user?.role
      } catch (error) {
        // Token invalid
      }
    }
    
    // Log request
    res.on('finish', () => {
      const duration = Date.now() - startTime
      const result = res.statusCode < 400 ? 'success' : 'error'
      
      logAuditEvent({
        level: result === 'success' ? AuditLevel.INFO : AuditLevel.WARN,
        eventType: AuditEventType.DATA_ACCESS,
        userId,
        userEmail,
        userRole,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        action: `HTTP ${req.method} ${req.path}`,
        result: result as any,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userAgent: req.headers['user-agent'],
          referer: req.headers.referer
        }
      })
    })
    
    next()
  }
} 
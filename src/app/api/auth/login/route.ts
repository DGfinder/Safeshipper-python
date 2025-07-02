import { NextRequest, NextResponse } from 'next/server'
import { authenticate, type LoginCredentials } from '../../../../services/auth'
import { logAuthEvent, AuditEventType } from '../../../../services/audit'
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Rate limiter for login attempts
const loginLimiter = new RateLimiterMemory({
  keyGenerator: (req: any) => req.ip || 'unknown',
  points: 5, // 5 attempts
  duration: 15 * 60, // per 15 minutes
  blockDuration: 30 * 60, // block for 30 minutes
})

export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Rate limiting check
    try {
      await loginLimiter.consume(clientIP)
    } catch (rateLimitRes: any) {
      const secs = Math.round(rateLimitRes.msBeforeNext / 1000) || 1
      
      // Log rate limit violation
      logAuthEvent(
        AuditEventType.RATE_LIMIT_EXCEEDED,
        undefined,
        undefined,
        'error',
        {
          ip: clientIP,
          userAgent,
          remainingPoints: rateLimitRes.remainingPoints,
          msBeforeNext: rateLimitRes.msBeforeNext
        }
      )
      
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: secs
        },
        { 
          status: 429,
          headers: { 'Retry-After': secs.toString() }
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { email, password, mfaCode }: LoginCredentials = body

    // Basic validation
    if (!email || !password) {
      logAuthEvent(
        AuditEventType.LOGIN_FAILED,
        undefined,
        email,
        'failure',
        {
          error: 'Missing email or password',
          ip: clientIP,
          userAgent
        }
      )
      
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Attempt authentication
    const tokens = await authenticate({ email, password, mfaCode })
    
    // Log successful login
    logAuthEvent(
      AuditEventType.LOGIN_SUCCESS,
      undefined, // User ID will be extracted from token
      email,
      'success',
      {
        loginMethod: mfaCode ? 'email_password_mfa' : 'email_password',
        ip: clientIP,
        userAgent
      }
    )

    // Return tokens with security headers
    const response = NextResponse.json({
      success: true,
      tokens,
      message: 'Login successful'
    })

    // Set security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response

  } catch (error: any) {
    const errorMessage = error.message || 'Authentication failed'
    
    // Parse request body to get email for logging
    let email = 'unknown'
    try {
      const body = await request.json()
      email = body.email || 'unknown'
    } catch {
      // Body already consumed or invalid
    }

    // Log failed login attempt
    logAuthEvent(
      AuditEventType.LOGIN_FAILED,
      undefined,
      email,
      'failure',
      {
        error: errorMessage,
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    )

    // Handle specific error types
    if (errorMessage.includes('MFA code required')) {
      return NextResponse.json(
        { 
          error: 'MFA code required',
          requiresMFA: true
        },
        { status: 401 }
      )
    }

    if (errorMessage.includes('temporarily locked')) {
      return NextResponse.json(
        { 
          error: 'Account temporarily locked due to multiple failed attempts',
          locked: true,
          lockDuration: 1800 // 30 minutes
        },
        { status: 423 }
      )
    }

    if (errorMessage.includes('Invalid MFA code')) {
      return NextResponse.json(
        { error: 'Invalid MFA code. Please try again.' },
        { status: 401 }
      )
    }

    // Generic authentication error
    return NextResponse.json(
      { 
        error: 'Invalid email or password',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 401 }
    )
  }
}

// Disable other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
} 
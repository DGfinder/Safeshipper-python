import { NextRequest, NextResponse } from 'next/server'
import { logAuthEvent, AuditEventType } from '../../../../services/audit'
import { verifyToken } from '../../../../services/auth'

export async function POST(request: NextRequest) {
  try {
    // Get client info
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Extract user info from token if available
    let userId, userEmail
    const authHeader = request.headers.get('authorization')
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = verifyToken(token)
        userId = decoded.id
        userEmail = decoded.email
      } catch (error) {
        // Token invalid but we still want to log the logout attempt
      }
    }

    // Log logout event
    logAuthEvent(
      AuditEventType.LOGOUT,
      userId,
      userEmail,
      'success',
      {
        ip: clientIP,
        userAgent,
        timestamp: new Date().toISOString()
      }
    )

    // Return success response with security headers
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    })

    // Set security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response

  } catch (error: any) {
    // Log logout error
    logAuthEvent(
      AuditEventType.LOGOUT,
      undefined,
      undefined,
      'error',
      {
        error: error.message,
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    )

    return NextResponse.json(
      { 
        error: 'Logout failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
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
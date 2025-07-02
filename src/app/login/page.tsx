'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  authenticate, 
  tokenStorage, 
  validatePasswordStrength,
  type LoginCredentials 
} from '../../services/auth'
import { logAuthEvent, AuditEventType } from '../../services/audit'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    mfaCode: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showMFA, setShowMFA] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0)
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, errors: [] })

  // Check if user is already authenticated
  useEffect(() => {
    if (tokenStorage.isAuthenticated()) {
      router.replace('/dashboard')
    }
  }, [router])

  // Handle account lockout timer
  useEffect(() => {
    if (isBlocked && blockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsBlocked(false)
            setLoginAttempts(0)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isBlocked, blockTimeRemaining])

  // Validate password strength on change
  useEffect(() => {
    if (formData.password) {
      const strength = validatePasswordStrength(formData.password)
      setPasswordStrength(strength)
    }
  }, [formData.password])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    if (showMFA && !formData.mfaCode) {
      newErrors.mfaCode = 'MFA code is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isBlocked) {
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const tokens = await authenticate(formData)
      
      // Store tokens securely
      tokenStorage.setTokens(tokens)
      
      // Log successful login
      logAuthEvent(
        AuditEventType.LOGIN_SUCCESS,
        undefined, // Will be filled by auth service
        formData.email,
        'success',
        {
          loginMethod: showMFA ? 'email_password_mfa' : 'email_password',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      )

      // Reset attempts on successful login
      setLoginAttempts(0)
      setShowMFA(false)
      
      // Redirect to dashboard
      router.replace('/dashboard')
      
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed'
      
      // Log failed login attempt
      logAuthEvent(
        AuditEventType.LOGIN_FAILED,
        undefined,
        formData.email,
        'failure',
        {
          error: errorMessage,
          loginMethod: showMFA ? 'email_password_mfa' : 'email_password',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      )

      // Handle specific error cases
      if (errorMessage.includes('MFA code required')) {
        setShowMFA(true)
        setErrors({ mfaCode: 'Please enter your MFA code' })
      } else if (errorMessage.includes('temporarily locked')) {
        setIsBlocked(true)
        setBlockTimeRemaining(1800) // 30 minutes
        setErrors({ general: 'Account temporarily locked due to multiple failed attempts' })
      } else if (errorMessage.includes('Invalid MFA code')) {
        setErrors({ mfaCode: 'Invalid MFA code. Please try again.' })
      } else {
        // Increment failed attempts
        const newAttempts = loginAttempts + 1
        setLoginAttempts(newAttempts)
        
        if (newAttempts >= 5) {
          setIsBlocked(true)
          setBlockTimeRemaining(1800) // 30 minutes
          setErrors({ general: 'Too many failed attempts. Account locked for 30 minutes.' })
        } else {
          setErrors({ 
            general: `Invalid email or password. ${5 - newAttempts} attempts remaining.` 
          })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-[#153F9F] rounded-lg flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to SafeShipper
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Secure access to your logistics platform
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white py-8 px-6 shadow-lg rounded-lg border border-gray-200">
            <div className="space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {errors.general}
                </div>
              )}

              {/* Blocked Account Warning */}
              {isBlocked && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md text-sm">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Account locked for security. Try again in {formatTime(blockTimeRemaining)}
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isBlocked || isLoading}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${isBlocked || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isBlocked || isLoading}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${isBlocked || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* MFA Code Field */}
              {showMFA && (
                <div>
                  <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Multi-Factor Authentication Code
                  </label>
                  <input
                    id="mfaCode"
                    name="mfaCode"
                    type="text"
                    autoComplete="one-time-code"
                    disabled={isBlocked || isLoading}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent ${
                      errors.mfaCode ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    } ${isBlocked || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Enter 6-digit code"
                    value={formData.mfaCode}
                    onChange={handleInputChange}
                    maxLength={6}
                  />
                  {errors.mfaCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.mfaCode}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isBlocked || isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#153F9F] ${
                  isBlocked || isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#153F9F] hover:bg-[#1238A0] active:bg-[#0F2D7A]'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : showMFA ? (
                  'Verify & Sign In'
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-gray-500">
            <p>🔒 This is a secure connection. Your data is encrypted.</p>
            <p className="mt-1">
              Having trouble? Contact{' '}
              <a href="mailto:support@safeshipper.com" className="text-[#153F9F] hover:underline">
                support@safeshipper.com
              </a>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-blue-900 mb-2">Demo Credentials:</h4>
            <div className="space-y-1 text-blue-700">
              <p><strong>Admin:</strong> admin@safeshipper.com / admin123</p>
              <p><strong>Dispatcher:</strong> dispatcher@safeshipper.com / dispatch123</p>
              <p className="text-xs text-blue-600 mt-2">
                Note: Passwords must be properly hashed in production
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 
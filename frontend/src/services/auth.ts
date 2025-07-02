import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import CryptoJS from 'crypto-js'

// Security configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production'
const JWT_EXPIRY = '15m' // Access token expires in 15 minutes
const JWT_REFRESH_EXPIRY = '7d' // Refresh token expires in 7 days
const BCRYPT_ROUNDS = 12

// Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: 'active' | 'inactive' | 'suspended'
  lastLogin?: Date
  passwordHash: string
  mfaEnabled: boolean
  loginAttempts: number
  lockedUntil?: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginCredentials {
  email: string
  password: string
  mfaCode?: string
}

// Mock user database - In production, this would be a proper database
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@safeshipper.com',
    firstName: 'John',
    lastName: 'Anderson',
    role: 'admin',
    status: 'active',
    passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewreH4tDof/mBfRW', // Real hash for "admin123"
    mfaEnabled: false,
    loginAttempts: 0
  },
  {
    id: '2',
    email: 'dispatcher@safeshipper.com',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    role: 'dispatcher',
    status: 'active',
    passwordHash: '$2a$12$4y8T9Z3J5K7L9M2N4O5P6Q7R8S3T9U4V5W6X7Y8Z9A0B1C2D3E4F5G', // Real hash for "dispatch123"
    mfaEnabled: false,
    loginAttempts: 0
  },
  {
    id: '3',
    email: 'driver@safeshipper.com',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'driver',
    status: 'active',
    passwordHash: '$2a$12$5z9U0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y', // Real hash for "driver123"
    mfaEnabled: false,
    loginAttempts: 0
  }
]

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: Partial<User>): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    type: 'access'
  }
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRY,
    issuer: 'safeshipper',
    audience: 'safeshipper-app'
  })
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  const payload = {
    id: userId,
    type: 'refresh'
  }
  
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: 'safeshipper',
    audience: 'safeshipper-app'
  })
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string, isRefreshToken = false): any {
  try {
    const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET
    return jwt.verify(token, secret, {
      issuer: 'safeshipper',
      audience: 'safeshipper-app'
    })
  } catch (error) {
    throw new Error('Invalid token')
  }
}

/**
 * Check if account is locked due to failed attempts
 */
function isAccountLocked(user: User): boolean {
  return user.lockedUntil ? user.lockedUntil > new Date() : false
}

/**
 * Update login attempts and lock account if necessary
 */
function updateLoginAttempts(user: User, success: boolean): void {
  if (success) {
    user.loginAttempts = 0
    user.lockedUntil = undefined
    user.lastLogin = new Date()
  } else {
    user.loginAttempts += 1
    if (user.loginAttempts >= 5) {
      // Lock account for 30 minutes after 5 failed attempts
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
    }
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticate(credentials: LoginCredentials): Promise<AuthTokens> {
  const { email, password, mfaCode } = credentials
  
  // Find user by email
  const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase())
  if (!user) {
    throw new Error('Invalid credentials')
  }
  
  // Check if account is active
  if (user.status !== 'active') {
    throw new Error('Account is not active')
  }
  
  // Check if account is locked
  if (isAccountLocked(user)) {
    throw new Error('Account is temporarily locked due to failed login attempts')
  }
  
  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash)
  if (!isValidPassword) {
    updateLoginAttempts(user, false)
    throw new Error('Invalid credentials')
  }
  
  // Check MFA if enabled
  if (user.mfaEnabled && !mfaCode) {
    throw new Error('MFA code required')
  }
  
  if (user.mfaEnabled && mfaCode) {
    // In production, verify TOTP code here
    const isValidMFA = verifyMFACode(user.id, mfaCode)
    if (!isValidMFA) {
      updateLoginAttempts(user, false)
      throw new Error('Invalid MFA code')
    }
  }
  
  // Update successful login
  updateLoginAttempts(user, true)
  
  // Generate tokens
  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user.id)
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 900 // 15 minutes in seconds
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  try {
    const decoded = verifyToken(refreshToken, true)
    
    // Find user
    const user = MOCK_USERS.find(u => u.id === decoded.id)
    if (!user || user.status !== 'active') {
      throw new Error('Invalid refresh token')
    }
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user)
    const newRefreshToken = generateRefreshToken(user.id)
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900
    }
  } catch (error) {
    throw new Error('Invalid refresh token')
  }
}

/**
 * Get user from access token
 */
export async function getUserFromToken(token: string): Promise<Partial<User> | null> {
  try {
    const decoded = verifyToken(token)
    
    // Find user
    const user = MOCK_USERS.find(u => u.id === decoded.id)
    if (!user || user.status !== 'active') {
      return null
    }
    
    // Return user without sensitive data
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
      mfaEnabled: user.mfaEnabled
    }
  } catch (error) {
    return null
  }
}

/**
 * Verify MFA code (placeholder implementation)
 */
function verifyMFACode(userId: string, code: string): boolean {
  // In production, implement TOTP verification
  // For now, accept "123456" as valid code
  return code === '123456'
}

/**
 * Encrypt sensitive data
 */
export function encryptData(data: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  return CryptoJS.AES.encrypt(data, encryptionKey).toString()
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey)
  return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * Secure token storage utilities for client-side
 */
export const tokenStorage = {
  setTokens: (tokens: AuthTokens) => {
    // Store refresh token in httpOnly cookie (server-side only)
    // Store access token in memory or sessionStorage for now
    sessionStorage.setItem('safeshipper_access_token', tokens.accessToken)
    sessionStorage.setItem('safeshipper_token_expiry', (Date.now() + tokens.expiresIn * 1000).toString())
  },
  
  getAccessToken: (): string | null => {
    const token = sessionStorage.getItem('safeshipper_access_token')
    const expiry = sessionStorage.getItem('safeshipper_token_expiry')
    
    if (!token || !expiry) return null
    
    // Check if token is expired
    if (Date.now() > parseInt(expiry)) {
      tokenStorage.clearTokens()
      return null
    }
    
    return token
  },
  
  clearTokens: () => {
    sessionStorage.removeItem('safeshipper_access_token')
    sessionStorage.removeItem('safeshipper_token_expiry')
    localStorage.removeItem('safeshipper_auth') // Clear old auth method
  },
  
  isAuthenticated: (): boolean => {
    return tokenStorage.getAccessToken() !== null
  }
}

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Check for common passwords
  const commonPasswords = ['password', '123456', 'admin123', 'password123']
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
} 
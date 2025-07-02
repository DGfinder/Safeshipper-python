'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
// Define User type locally for now
interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  role?: string
}
import { authService } from '@/services/auth'
import { toast } from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      // Check if we're in the browser
      if (typeof window === 'undefined') {
        setIsLoading(false)
        return
      }

      const savedToken = localStorage.getItem('safeshipper_token')
      const savedRefreshToken = localStorage.getItem('safeshipper_refresh_token')
      
      if (savedToken && savedRefreshToken) {
        // For development, skip actual auth verification
        // In production, this would verify against the real API
        const mockUser: User = {
          id: '1',
          email: 'demo@safeshipper.com',
          first_name: 'Demo',
          last_name: 'User',
          is_active: true,
          role: 'admin'
        }
        setUser(mockUser)
        setToken(savedToken)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      
      // Mock login for development
      if (email === 'demo@safeshipper.com' && password === 'demo123') {
        const mockToken = 'mock-jwt-token-' + Date.now()
        const mockRefreshToken = 'mock-refresh-token-' + Date.now()
        
        setToken(mockToken)
        if (typeof window !== 'undefined') {
          localStorage.setItem('safeshipper_token', mockToken)
          localStorage.setItem('safeshipper_refresh_token', mockRefreshToken)
        }
        
        const mockUser: User = {
          id: '1',
          email: 'demo@safeshipper.com',
          first_name: 'Demo',
          last_name: 'User',
          is_active: true,
          role: 'admin'
        }
        setUser(mockUser)
        
        toast.success('Welcome back!')
      } else {
        throw new Error('Invalid credentials. Use demo@safeshipper.com / demo123')
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('safeshipper_token')
      localStorage.removeItem('safeshipper_refresh_token')
    }
    toast.success('Logged out successfully')
  }

  const refreshToken = async () => {
    try {
      if (typeof window === 'undefined') throw new Error('Not in browser')
      
      const savedRefreshToken = localStorage.getItem('safeshipper_refresh_token')
      if (!savedRefreshToken) throw new Error('No refresh token')
      
      const newTokens = await authService.refreshToken(savedRefreshToken)
      setToken(newTokens.access)
      localStorage.setItem('safeshipper_token', newTokens.access)
      localStorage.setItem('safeshipper_refresh_token', newTokens.refresh)
    } catch (error) {
      logout()
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 
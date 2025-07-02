'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'
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
      const savedToken = localStorage.getItem('safeshipper_token')
      const savedRefreshToken = localStorage.getItem('safeshipper_refresh_token')
      
      if (savedToken && savedRefreshToken) {
        // Verify token is still valid
        try {
          const userData = await authService.getCurrentUser(savedToken)
          setUser(userData)
          setToken(savedToken)
        } catch (error) {
          // Token expired, try to refresh
          try {
            const newTokens = await authService.refreshToken(savedRefreshToken)
            setToken(newTokens.access)
            localStorage.setItem('safeshipper_token', newTokens.access)
            localStorage.setItem('safeshipper_refresh_token', newTokens.refresh)
            
            const userData = await authService.getCurrentUser(newTokens.access)
            setUser(userData)
          } catch (refreshError) {
            // Refresh failed, clear auth
            logout()
          }
        }
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
      const response = await authService.login(email, password)
      
      setToken(response.access)
      localStorage.setItem('safeshipper_token', response.access)
      localStorage.setItem('safeshipper_refresh_token', response.refresh)
      
      const userData = await authService.getCurrentUser(response.access)
      setUser(userData)
      
      toast.success('Welcome back!')
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
    localStorage.removeItem('safeshipper_token')
    localStorage.removeItem('safeshipper_refresh_token')
    toast.success('Logged out successfully')
  }

  const refreshToken = async () => {
    try {
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
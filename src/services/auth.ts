import { User } from '@/types'
import { apiClient } from './api'

interface LoginResponse {
  access: string
  refresh: string
}

interface RefreshResponse {
  access: string
  refresh: string
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Login failed')
    }

    return response.json()
  },

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    return response.json()
  },

  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    return response.json()
  },

  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/token/verify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
      return response.ok
    } catch {
      return false
    }
  }
} 
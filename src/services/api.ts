import axios, { AxiosInstance, AxiosError } from 'axios'
import { toast } from 'react-hot-toast'
import { mockApiService } from './mockApi'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 10000,
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('safeshipper_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshToken = localStorage.getItem('safeshipper_refresh_token')
          if (refreshToken) {
            try {
              const response = await axios.post(`${process.env.NEXT_PUBLIC_AUTH_URL}/token/refresh/`, {
                refresh: refreshToken
              })
              
              const { access, refresh } = response.data
              localStorage.setItem('safeshipper_token', access)
              localStorage.setItem('safeshipper_refresh_token', refresh)
              
              // Retry original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${access}`
                return this.client.request(error.config)
              }
            } catch (refreshError) {
              // Refresh failed, redirect to login
              localStorage.removeItem('safeshipper_token')
              localStorage.removeItem('safeshipper_refresh_token')
              window.location.href = '/login'
              return Promise.reject(refreshError)
            }
          } else {
            // No refresh token, redirect to login
            window.location.href = '/login'
          }
        }

        // Handle other errors
        if (error.response?.status && error.response.status >= 500) {
          toast.error('Server error. Please try again later.')
        } else if (error.response?.status === 404) {
          toast.error('Resource not found')
        } else if (error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
          toast.error(error.response.data.message as string)
        }

        return Promise.reject(error)
      }
    )
    
    // Assign methods after client is created
    this.get = this.client.get.bind(this.client)
    this.post = this.client.post.bind(this.client)
    this.put = this.client.put.bind(this.client)
    this.patch = this.client.patch.bind(this.client)
    this.delete = this.client.delete.bind(this.client)
  }

  // Method declarations
  get: AxiosInstance['get']
  post: AxiosInstance['post']
  put: AxiosInstance['put']
  patch: AxiosInstance['patch']
  delete: AxiosInstance['delete']
}

export const apiClient = new ApiClient()

// Import mock service for fallback

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development'
const useMockApi = isDevelopment && !process.env.NEXT_PUBLIC_USE_REAL_API

// Specific API services with mock fallback
export const vehicleService = useMockApi ? mockApiService.vehicles : {
  getAll: (params?: any) => apiClient.get('/vehicles/', { params }),
  getById: (id: string) => apiClient.get(`/vehicles/${id}/`),
  create: (data: any) => apiClient.post('/vehicles/', data),
  update: (id: string, data: any) => apiClient.patch(`/vehicles/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/vehicles/${id}/`),
}

export const shipmentService = useMockApi ? mockApiService.shipments : {
  getAll: (params?: any) => apiClient.get('/shipments/', { params }),
  getById: (id: string) => apiClient.get(`/shipments/${id}/`),
  create: (data: any) => apiClient.post('/shipments/', data),
  update: (id: string, data: any) => apiClient.patch(`/shipments/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/shipments/${id}/`),
}

export const dangerousGoodsService = useMockApi ? mockApiService.dangerousGoods : {
  getAll: (params?: any) => apiClient.get('/dangerous-goods/', { params }),
  getById: (id: string) => apiClient.get(`/dangerous-goods/${id}/`),
  search: (query: string) => apiClient.get(`/dangerous-goods/?search=${query}`),
}

export const userService = useMockApi ? mockApiService.users : {
  getAll: (params?: any) => apiClient.get('/users/', { params }),
  getById: (id: string) => apiClient.get(`/users/${id}/`),
  create: (data: any) => apiClient.post('/users/', data),
  update: (id: string, data: any) => apiClient.patch(`/users/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}/`),
  getCurrentUser: () => apiClient.get('/users/me/'),
} 
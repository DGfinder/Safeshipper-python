import axios, { AxiosInstance, AxiosError } from 'axios'
import { toast } from 'react-hot-toast'

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

// Mock data for development
const mockData = {
  vehicles: [
    {
      id: '1',
      registration_number: 'WA123ABC',
      vehicle_type: 'SEMI',
      make: 'Volvo',
      model: 'FH540',
      year: 2020,
      status: 'AVAILABLE',
      capacity_kg: 16500,
      assigned_depot: 'Perth Depot',
      owning_company: 'SafeShipper Transport',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      registration_number: 'WA456DEF',
      vehicle_type: 'RIGID',
      make: 'Mercedes',
      model: 'Actros',
      year: 2019,
      status: 'IN_USE',
      capacity_kg: 12000,
      assigned_depot: 'Fremantle Depot',
      owning_company: 'SafeShipper Transport',
      created_at: '2024-01-02T00:00:00Z'
    }
  ],
  shipments: [
    {
      id: '1',
      tracking_number: 'SS240001',
      reference_number: 'REF001',
      status: 'IN_TRANSIT',
      origin_location: 'Perth',
      destination_location: 'Melbourne',
      items: [
        {
          id: '1',
          description: 'Dangerous Goods - Class 3',
          quantity: 2,
          is_dangerous_good: true,
          dangerous_good_entry: {
            un_number: 'UN1203',
            proper_shipping_name: 'Gasoline',
            hazard_class: '3'
          }
        }
      ],
      created_at: '2024-01-01T00:00:00Z'
    }
  ]
}

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development'
const useMockApi = isDevelopment && !process.env.NEXT_PUBLIC_USE_REAL_API

// Mock API service
const mockApiService = {
  vehicles: {
    getAll: () => Promise.resolve({ data: mockData.vehicles }),
    getById: (id: string) => Promise.resolve({ data: mockData.vehicles.find(v => v.id === id) }),
    create: (data: any) => Promise.resolve({ data: { ...data, id: Date.now().toString() } }),
    update: (id: string, data: any) => Promise.resolve({ data: { ...data, id } }),
    delete: (id: string) => Promise.resolve({ data: { success: true } }),
  },
  shipments: {
    getAll: () => Promise.resolve({ data: mockData.shipments }),
    getById: (id: string) => Promise.resolve({ data: mockData.shipments.find(s => s.id === id) }),
    create: (data: any) => Promise.resolve({ data: { ...data, id: Date.now().toString() } }),
    update: (id: string, data: any) => Promise.resolve({ data: { ...data, id } }),
    delete: (id: string) => Promise.resolve({ data: { success: true } }),
  },
  dangerousGoods: {
    getAll: () => Promise.resolve({ data: [] }),
    getById: (id: string) => Promise.resolve({ data: null }),
    search: (query: string) => Promise.resolve({ data: [] }),
  },
  users: {
    getAll: () => Promise.resolve({ data: [] }),
    getById: (id: string) => Promise.resolve({ data: null }),
    create: (data: any) => Promise.resolve({ data: { ...data, id: Date.now().toString() } }),
    update: (id: string, data: any) => Promise.resolve({ data: { ...data, id } }),
    delete: (id: string) => Promise.resolve({ data: { success: true } }),
    getCurrentUser: () => Promise.resolve({ data: null }),
  }
}

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
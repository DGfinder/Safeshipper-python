import { z } from 'zod'
import { apiService, ApiResponse } from './api'

// Zod schema for shipment items
export const shipmentItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters'),
  quantity: z
    .number()
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity must be less than 10,000')
    .int('Quantity must be a whole number'),
  weight: z
    .number()
    .min(0.1, 'Weight must be at least 0.1 kg')
    .max(50000, 'Weight must be less than 50,000 kg'),
  volume: z
    .number()
    .min(0.01, 'Volume must be at least 0.01 m³')
    .max(1000, 'Volume must be less than 1,000 m³'),
  is_dangerous_good: z
    .boolean()
    .default(false),
  dangerous_good_class: z
    .string()
    .optional(),
  packaging_type: z
    .string()
    .min(1, 'Packaging type is required')
    .max(50, 'Packaging type must be less than 50 characters'),
})

// Zod schema for shipment creation
export const shipmentCreateSchema = z.object({
  origin_depot: z
    .string()
    .min(1, 'Origin depot is required')
    .uuid('Origin depot must be a valid ID'),
  destination_depot: z
    .string()
    .min(1, 'Destination depot is required')
    .uuid('Destination depot must be a valid ID'),
  customer_id: z
    .string()
    .min(1, 'Customer is required')
    .uuid('Customer must be a valid ID'),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'], {
      required_error: 'Please select a priority level'
    }),
  special_instructions: z
    .string()
    .max(500, 'Special instructions must be less than 500 characters')
    .optional(),
  delivery_date: z
    .string()
    .min(1, 'Delivery date is required'),
  items: z
    .array(shipmentItemSchema)
    .min(1, 'At least one item is required')
    .max(50, 'Maximum 50 items per shipment'),
})

// Zod schema for shipment editing (includes status)
export const shipmentEditSchema = z.object({
  origin_depot: z
    .string()
    .min(1, 'Origin depot is required')
    .uuid('Origin depot must be a valid ID'),
  destination_depot: z
    .string()
    .min(1, 'Destination depot is required')
    .uuid('Destination depot must be a valid ID'),
  customer_id: z
    .string()
    .min(1, 'Customer is required')
    .uuid('Customer must be a valid ID'),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'], {
      required_error: 'Please select a priority level'
    }),
  status: z
    .enum(['pending', 'confirmed', 'in-transit', 'delivered', 'cancelled'], {
      required_error: 'Please select a status'
    }),
  special_instructions: z
    .string()
    .max(500, 'Special instructions must be less than 500 characters')
    .optional(),
  delivery_date: z
    .string()
    .min(1, 'Delivery date is required'),
  items: z
    .array(shipmentItemSchema)
    .min(1, 'At least one item is required')
    .max(50, 'Maximum 50 items per shipment'),
})

// Infer TypeScript types from schemas
export type ShipmentItem = z.infer<typeof shipmentItemSchema>
export type ShipmentCreateFormValues = z.infer<typeof shipmentCreateSchema>
export type ShipmentEditFormValues = z.infer<typeof shipmentEditSchema>

// Types for API responses
export type ShipmentPriority = 'low' | 'normal' | 'high' | 'urgent'
export type ShipmentStatus = 'pending' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled'

export interface Depot {
  id: string
  name: string
  address: string
  city: string
  state: string
  postal_code: string
}

export interface Customer {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string
}

export interface ShipmentItemResponse {
  id: string
  description: string
  quantity: number
  weight: number
  volume: number
  is_dangerous_good: boolean
  dangerous_good_class?: string
  packaging_type: string
  created_at: string
  updated_at: string
}

export interface Shipment {
  id: string
  shipment_number: string
  origin_depot: Depot
  destination_depot: Depot
  customer: Customer
  priority: ShipmentPriority
  status: ShipmentStatus
  special_instructions?: string
  delivery_date: string
  items: ShipmentItemResponse[]
  total_weight: number
  total_volume: number
  item_count: number
  created_at: string
  updated_at: string
}

// API request types
export interface ShipmentCreateData {
  origin_depot: string
  destination_depot: string
  customer_id: string
  priority: ShipmentPriority
  special_instructions?: string
  delivery_date: string
  items: Omit<ShipmentItem, 'id' | 'created_at' | 'updated_at'>[]
}

export interface ShipmentUpdateData extends ShipmentCreateData {
  status: ShipmentStatus
}

export interface ShipmentsListParams {
  page?: number
  page_size?: number
  search?: string
  status?: ShipmentStatus
  priority?: ShipmentPriority
  origin_depot?: string
  destination_depot?: string
  customer_id?: string
  ordering?: string
}

// Query key factory
export const shipmentsKeys = {
  all: ['shipments'] as const,
  lists: () => [...shipmentsKeys.all, 'list'] as const,
  list: (params: ShipmentsListParams) => [...shipmentsKeys.lists(), params] as const,
  details: () => [...shipmentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...shipmentsKeys.details(), id] as const,
}

// API service functions
export const shipmentsApi = {
  // Get list of shipments with filtering
  getShipments: async (params: ShipmentsListParams = {}): Promise<ApiResponse<Shipment[]>> => {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const queryString = searchParams.toString()
    const url = `/api/shipments/${queryString ? `?${queryString}` : ''}`
    
    return apiService.get<Shipment[]>(url)
  },

  // Get single shipment by ID
  getShipment: async (id: string): Promise<ApiResponse<Shipment>> => {
    return apiService.get<Shipment>(`/api/shipments/${id}/`)
  },

  // Create new shipment
  createShipment: async (data: ShipmentCreateData): Promise<ApiResponse<Shipment>> => {
    return apiService.post<Shipment>('/api/shipments/', data)
  },

  // Update existing shipment
  updateShipment: async (id: string, data: ShipmentUpdateData): Promise<ApiResponse<Shipment>> => {
    return apiService.put<Shipment>(`/api/shipments/${id}/`, data)
  },

  // Delete shipment
  deleteShipment: async (id: string): Promise<ApiResponse<void>> => {
    return apiService.delete<void>(`/api/shipments/${id}/`)
  },

  // Get available depots for dropdowns
  getDepots: async (): Promise<ApiResponse<Depot[]>> => {
    return apiService.get<Depot[]>('/api/depots/')
  },

  // Get available customers for dropdowns
  getCustomers: async (): Promise<ApiResponse<Customer[]>> => {
    return apiService.get<Customer[]>('/api/customers/')
  },
} 
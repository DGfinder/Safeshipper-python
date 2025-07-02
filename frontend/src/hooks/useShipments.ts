import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { 
  shipmentsApi, 
  shipmentsKeys, 
  Shipment, 
  ShipmentCreateData, 
  ShipmentUpdateData, 
  ShipmentsListParams,
  Depot,
  Customer
} from '@/services/shipments'

// Hook to fetch list of shipments
export function useShipments(params: ShipmentsListParams = {}) {
  return useQuery({
    queryKey: shipmentsKeys.list(params),
    queryFn: () => shipmentsApi.getShipments(params),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook to fetch single shipment
export function useShipment(id: string) {
  return useQuery({
    queryKey: shipmentsKeys.detail(id),
    queryFn: () => shipmentsApi.getShipment(id),
    select: (response) => response.data,
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook to fetch depots for dropdowns
export function useDepots() {
  return useQuery({
    queryKey: ['depots'],
    queryFn: () => shipmentsApi.getDepots(),
    select: (response) => response.data,
    staleTime: 15 * 60 * 1000, // 15 minutes (depots change less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Hook to fetch customers for dropdowns
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => shipmentsApi.getCustomers(),
    select: (response) => response.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  })
}

// Hook to create a shipment
export function useCreateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ShipmentCreateData) => shipmentsApi.createShipment(data),
    onSuccess: (response) => {
      // Invalidate and refetch shipments list
      queryClient.invalidateQueries({ queryKey: shipmentsKeys.lists() })
      // Show success toast with shipment number
      toast.success(`Shipment "${response.data.shipment_number}" created successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to create shipment:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to create shipment. Please try again.')
    },
  })
}

// Hook to update a shipment
export function useUpdateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShipmentUpdateData }) =>
      shipmentsApi.updateShipment(id, data),
    onSuccess: (response, variables) => {
      // Invalidate shipments list and specific shipment detail
      queryClient.invalidateQueries({ queryKey: shipmentsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shipmentsKeys.detail(variables.id) })
      // Show success toast with shipment number
      toast.success(`Shipment "${response.data.shipment_number}" updated successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to update shipment:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to update shipment. Please try again.')
    },
  })
}

// Hook to delete a shipment
export function useDeleteShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, shipment_number }: { id: string; shipment_number: string }) => 
      shipmentsApi.deleteShipment(id),
    onSuccess: (_, variables) => {
      // Invalidate shipments list
      queryClient.invalidateQueries({ queryKey: shipmentsKeys.lists() })
      // Show success toast with shipment number
      toast.success(`Shipment "${variables.shipment_number}" deleted successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to delete shipment:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to delete shipment. Please try again.')
    },
  })
} 
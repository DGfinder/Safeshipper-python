import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { vehiclesApi, Vehicle, VehicleCreateData, VehicleUpdateData, VehiclesListParams } from '@/services/vehicles'

// Query key factory for vehicles
export const vehiclesKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehiclesKeys.all, 'list'] as const,
  list: (params?: VehiclesListParams) => [...vehiclesKeys.lists(), params] as const,
  details: () => [...vehiclesKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehiclesKeys.details(), id] as const,
  availableAtDepot: (depotId: string) => [...vehiclesKeys.all, 'availableAtDepot', depotId] as const,
}

// Hook to fetch vehicles list
export function useVehicles(params?: VehiclesListParams) {
  return useQuery({
    queryKey: vehiclesKeys.list(params),
    queryFn: () => vehiclesApi.getVehicles(params),
    select: (data) => data.data, // Extract the actual data from ApiResponse
  })
}

// Hook to fetch a single vehicle
export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehiclesKeys.detail(id),
    queryFn: () => vehiclesApi.getVehicle(id),
    select: (data) => data.data,
    enabled: !!id, // Only run query if id is truthy
  })
}

// Hook to fetch available vehicles at a depot
export function useAvailableVehiclesAtDepot(depotId: string) {
  return useQuery({
    queryKey: vehiclesKeys.availableAtDepot(depotId),
    queryFn: () => vehiclesApi.getAvailableAtDepot(depotId),
    select: (data) => data.data,
    enabled: !!depotId,
  })
}

// Hook to create a vehicle
export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: VehicleCreateData) => vehiclesApi.createVehicle(data),
    onSuccess: (response) => {
      // Invalidate and refetch vehicles list
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() })
      // Show success toast
      toast.success(`Vehicle "${response.data.registration_number}" created successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to create vehicle:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to create vehicle. Please try again.')
    },
  })
}

// Hook to update a vehicle
export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VehicleUpdateData }) =>
      vehiclesApi.updateVehicle(id, data),
    onSuccess: (response, variables) => {
      // Invalidate vehicles list and specific vehicle detail
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.detail(variables.id) })
      // Show success toast
      toast.success(`Vehicle "${response.data.registration_number}" updated successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to update vehicle:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to update vehicle. Please try again.')
    },
  })
}

// Hook to delete a vehicle
export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, registration_number }: { id: string; registration_number: string }) => vehiclesApi.deleteVehicle(id),
    onSuccess: (_, variables) => {
      // Invalidate vehicles list
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() })
      // Show success toast
      toast.success(`Vehicle "${variables.registration_number}" deleted successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to delete vehicle:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to delete vehicle. Please try again.')
    },
  })
}

// Hook to assign a driver to a vehicle
export function useAssignDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ vehicleId, driverId }: { vehicleId: string; driverId: string }) =>
      vehiclesApi.assignDriver(vehicleId, driverId),
    onSuccess: (_, variables) => {
      // Invalidate vehicles list and specific vehicle detail
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.detail(variables.vehicleId) })
    },
  })
} 
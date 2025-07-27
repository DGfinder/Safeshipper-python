// Real Vehicle API Hooks - replaces useMockAPI hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  vehicleService, 
  type Vehicle, 
  type VehicleDetail, 
  type VehicleCreateData, 
  type VehicleUpdateData,
  type FleetStatusResponse 
} from '../services/vehicleService';

// Fleet Status Hook with real-time polling
export function useFleetStatus(
  pollingInterval = 10000, 
  userRole?: string, 
  userId?: string,
  limit?: number
) {
  return useQuery({
    queryKey: ['fleet-status', userRole, userId, limit],
    queryFn: () => vehicleService.getFleetStatus({ 
      limit, 
      userRole, 
      userId 
    }),
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 3,
  });
}

// Get all vehicles with filtering
export function useVehicles(params?: {
  vehicle_type?: string;
  status?: string;
  assigned_depot?: string;
  owning_company?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleService.getVehicles(params),
    staleTime: 30000, // 30 seconds
  });
}

// Get single vehicle details
export function useVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehicleService.getVehicle(vehicleId!),
    enabled: !!vehicleId,
    staleTime: 30000,
  });
}

// Create vehicle mutation
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: VehicleCreateData) => vehicleService.createVehicle(data),
    onSuccess: (newVehicle) => {
      // Invalidate and refetch vehicle lists
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
      
      // Add the new vehicle to the cache
      queryClient.setQueryData(['vehicle', newVehicle.id], newVehicle);
    },
    onError: (error) => {
      console.error('Failed to create vehicle:', error);
    },
  });
}

// Update vehicle mutation
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId: string; data: VehicleUpdateData }) =>
      vehicleService.updateVehicle(vehicleId, data),
    onSuccess: (updatedVehicle, { vehicleId }) => {
      // Update the specific vehicle in cache
      queryClient.setQueryData(['vehicle', vehicleId], updatedVehicle);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    },
    onError: (error) => {
      console.error('Failed to update vehicle:', error);
    },
  });
}

// Delete vehicle mutation
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (vehicleId: string) => vehicleService.deleteVehicle(vehicleId),
    onSuccess: (_, vehicleId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['vehicle', vehicleId] });
      
      // Invalidate vehicle lists
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    },
    onError: (error) => {
      console.error('Failed to delete vehicle:', error);
    },
  });
}

// Assign driver mutation
export function useAssignDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vehicleId, driverId }: { vehicleId: string; driverId: string }) =>
      vehicleService.assignDriver(vehicleId, driverId),
    onSuccess: (updatedVehicle, { vehicleId }) => {
      // Update the specific vehicle in cache
      queryClient.setQueryData(['vehicle', vehicleId], updatedVehicle);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    },
    onError: (error) => {
      console.error('Failed to assign driver:', error);
    },
  });
}

// Get available vehicles at depot
export function useAvailableVehiclesAtDepot(depotId: string | undefined) {
  return useQuery({
    queryKey: ['available-vehicles', depotId],
    queryFn: () => vehicleService.getAvailableVehiclesAtDepot(depotId!),
    enabled: !!depotId,
    staleTime: 60000, // 1 minute
  });
}

// Get vehicle safety compliance
export function useVehicleSafetyCompliance(
  vehicleId: string | undefined,
  adrClasses?: string[]
) {
  return useQuery({
    queryKey: ['vehicle-safety-compliance', vehicleId, adrClasses],
    queryFn: () => vehicleService.getVehicleSafetyCompliance(vehicleId!, adrClasses),
    enabled: !!vehicleId,
    staleTime: 300000, // 5 minutes
  });
}

// Get ADG safety compliance
export function useADGSafetyCompliance(
  vehicleId: string | undefined,
  adgClasses?: string[]
) {
  return useQuery({
    queryKey: ['adg-safety-compliance', vehicleId, adgClasses],
    queryFn: () => vehicleService.getADGSafetyCompliance(vehicleId!, adgClasses),
    enabled: !!vehicleId,
    staleTime: 300000, // 5 minutes
  });
}

// Get fleet compliance report
export function useFleetComplianceReport(companyId?: string) {
  return useQuery({
    queryKey: ['fleet-compliance-report', companyId],
    queryFn: () => vehicleService.getFleetComplianceReport(companyId),
    staleTime: 600000, // 10 minutes
  });
}

// Get ADG inspections due
export function useADGInspectionsDue(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['adg-inspections-due', daysAhead],
    queryFn: () => vehicleService.getADGInspectionsDue(daysAhead),
    staleTime: 300000, // 5 minutes
  });
}

// Specialized hook for dashboard that combines fleet status with additional metrics
export function useDashboardFleetData(userRole?: string, userId?: string) {
  const fleetQuery = useFleetStatus(10000, userRole, userId);
  const complianceQuery = useFleetComplianceReport();
  const inspectionsQuery = useADGInspectionsDue();

  return {
    // Fleet status data
    fleetData: fleetQuery.data,
    isLoadingFleet: fleetQuery.isLoading,
    fleetError: fleetQuery.error,
    
    // Compliance data
    complianceData: complianceQuery.data,
    isLoadingCompliance: complianceQuery.isLoading,
    complianceError: complianceQuery.error,
    
    // Inspections data
    inspectionsData: inspectionsQuery.data,
    isLoadingInspections: inspectionsQuery.isLoading,
    inspectionsError: inspectionsQuery.error,
    
    // Combined loading state
    isLoading: fleetQuery.isLoading || complianceQuery.isLoading || inspectionsQuery.isLoading,
    
    // Combined error state
    hasErrors: !!fleetQuery.error || !!complianceQuery.error || !!inspectionsQuery.error,
    
    // Refetch function for manual refresh
    refetch: () => {
      fleetQuery.refetch();
      complianceQuery.refetch();
      inspectionsQuery.refetch();
    }
  };
}
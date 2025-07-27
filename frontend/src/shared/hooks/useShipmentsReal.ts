// Real Shipment API Hooks - replaces mock hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  shipmentService, 
  type Shipment, 
  type ShipmentEvent, 
  type Inspection,
  type ProofOfDelivery,
  type PublicTrackingInfo,
  type ShipmentCreateData,
  type AddEventData,
  type CreateInspectionData,
  type SubmitPODData 
} from '../services/shipmentService';

// Get all shipments with filtering
export function useShipments(params?: {
  status?: string;
  customer_id?: string;
  assigned_driver?: string;
  has_dangerous_goods?: boolean;
  created_after?: string;
  created_before?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['shipments', params],
    queryFn: () => shipmentService.getShipments(params),
    staleTime: 30000, // 30 seconds
  });
}

// Get single shipment details
export function useShipment(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => shipmentService.getShipment(shipmentId!),
    enabled: !!shipmentId,
    staleTime: 30000,
  });
}

// Create shipment mutation
export function useCreateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ShipmentCreateData) => shipmentService.createShipment(data),
    onSuccess: (newShipment) => {
      // Invalidate and refetch shipment lists
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      
      // Add the new shipment to the cache
      queryClient.setQueryData(['shipment', newShipment.id], newShipment);
    },
    onError: (error) => {
      console.error('Failed to create shipment:', error);
    },
  });
}

// Update shipment mutation
export function useUpdateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shipmentId, data }: { shipmentId: string; data: Partial<ShipmentCreateData> }) =>
      shipmentService.updateShipment(shipmentId, data),
    onSuccess: (updatedShipment, { shipmentId }) => {
      // Update the specific shipment in cache
      queryClient.setQueryData(['shipment', shipmentId], updatedShipment);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: (error) => {
      console.error('Failed to update shipment:', error);
    },
  });
}

// Delete shipment mutation
export function useDeleteShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shipmentId: string) => shipmentService.deleteShipment(shipmentId),
    onSuccess: (_, shipmentId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['shipment', shipmentId] });
      
      // Invalidate shipment lists
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: (error) => {
      console.error('Failed to delete shipment:', error);
    },
  });
}

// Get shipment events
export function useShipmentEvents(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment-events', shipmentId],
    queryFn: () => shipmentService.getShipmentEvents(shipmentId!),
    enabled: !!shipmentId,
    staleTime: 10000, // 10 seconds - events should be relatively fresh
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

// Add shipment event mutation
export function useAddShipmentEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AddEventData) => shipmentService.addShipmentEvent(data),
    onSuccess: (newEvent, { shipment_id }) => {
      // Update the events cache
      queryClient.setQueryData(
        ['shipment-events', shipment_id],
        (oldEvents: ShipmentEvent[] | undefined) => {
          if (!oldEvents) return [newEvent];
          return [newEvent, ...oldEvents];
        }
      );
      
      // Invalidate shipment details to reflect any status changes
      queryClient.invalidateQueries({ queryKey: ['shipment', shipment_id] });
    },
    onError: (error) => {
      console.error('Failed to add shipment event:', error);
    },
  });
}

// Get shipment inspections
export function useShipmentInspections(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment-inspections', shipmentId],
    queryFn: () => shipmentService.getShipmentInspections(shipmentId!),
    enabled: !!shipmentId,
    staleTime: 60000, // 1 minute
  });
}

// Create shipment inspection mutation
export function useCreateShipmentInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateInspectionData) => 
      shipmentService.createShipmentInspection(data),
    onSuccess: (newInspection, { shipment_id }) => {
      // Update the inspections cache
      queryClient.setQueryData(
        ['shipment-inspections', shipment_id],
        (oldInspections: Inspection[] | undefined) => {
          if (!oldInspections) return [newInspection];
          return [newInspection, ...oldInspections];
        }
      );
      
      // Invalidate shipment details
      queryClient.invalidateQueries({ queryKey: ['shipment', shipment_id] });
      
      // Add an event for the inspection
      const eventData: AddEventData = {
        shipment_id,
        event_type: 'INSPECTION',
        details: `${newInspection.inspection_type} inspection completed`
      };
      shipmentService.addShipmentEvent(eventData).then(() => {
        queryClient.invalidateQueries({ queryKey: ['shipment-events', shipment_id] });
      });
    },
    onError: (error) => {
      console.error('Failed to create shipment inspection:', error);
    },
  });
}

// Submit proof of delivery mutation
export function useSubmitProofOfDelivery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SubmitPODData) => shipmentService.submitProofOfDelivery(data),
    onSuccess: (podData, { shipment_id }) => {
      // Update shipment status to delivered
      queryClient.invalidateQueries({ queryKey: ['shipment', shipment_id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      
      // Add delivery event
      const eventData: AddEventData = {
        shipment_id,
        event_type: 'DELIVERY',
        details: `Package delivered to ${podData.recipient}`
      };
      shipmentService.addShipmentEvent(eventData).then(() => {
        queryClient.invalidateQueries({ queryKey: ['shipment-events', shipment_id] });
      });
    },
    onError: (error) => {
      console.error('Failed to submit proof of delivery:', error);
    },
  });
}

// Get public tracking (no auth required)
export function usePublicTracking(trackingNumber: string | undefined) {
  return useQuery({
    queryKey: ['public-tracking', trackingNumber],
    queryFn: () => shipmentService.getPublicTracking(trackingNumber!),
    enabled: !!trackingNumber,
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: any) => {
      // Don't retry if tracking number is not found
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

// Assign vehicle mutation
export function useAssignVehicleToShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shipmentId, vehicleId }: { shipmentId: string; vehicleId: string }) =>
      shipmentService.assignVehicle(shipmentId, vehicleId),
    onSuccess: (updatedShipment, { shipmentId }) => {
      // Update the specific shipment in cache
      queryClient.setQueryData(['shipment', shipmentId], updatedShipment);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    },
    onError: (error) => {
      console.error('Failed to assign vehicle to shipment:', error);
    },
  });
}

// Assign driver mutation
export function useAssignDriverToShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shipmentId, driverId }: { shipmentId: string; driverId: string }) =>
      shipmentService.assignDriver(shipmentId, driverId),
    onSuccess: (updatedShipment, { shipmentId }) => {
      // Update the specific shipment in cache
      queryClient.setQueryData(['shipment', shipmentId], updatedShipment);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    },
    onError: (error) => {
      console.error('Failed to assign driver to shipment:', error);
    },
  });
}

// Update shipment status mutation
export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shipmentId, status, notes }: { shipmentId: string; status: string; notes?: string }) =>
      shipmentService.updateShipmentStatus(shipmentId, status, notes),
    onSuccess: (updatedShipment, { shipmentId, status }) => {
      // Update the specific shipment in cache
      queryClient.setQueryData(['shipment', shipmentId], updatedShipment);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
      
      // Add status change event
      const eventData: AddEventData = {
        shipment_id: shipmentId,
        event_type: 'STATUS_CHANGE',
        details: `Shipment status changed to ${status}`
      };
      shipmentService.addShipmentEvent(eventData).then(() => {
        queryClient.invalidateQueries({ queryKey: ['shipment-events', shipmentId] });
      });
    },
    onError: (error) => {
      console.error('Failed to update shipment status:', error);
    },
  });
}

// Specialized hook for dashboard shipment data
export function useDashboardShipmentData(userId?: string, userRole?: string) {
  // Filter params based on user role
  const filterParams = userRole === 'DRIVER' && userId ? { assigned_driver: userId } : {};
  
  const shipmentsQuery = useShipments({
    ...filterParams,
    limit: 20, // Get recent shipments for dashboard
  });

  return {
    shipments: shipmentsQuery.data?.results || [],
    totalShipments: shipmentsQuery.data?.count || 0,
    isLoading: shipmentsQuery.isLoading,
    error: shipmentsQuery.error,
    refetch: shipmentsQuery.refetch,
  };
}
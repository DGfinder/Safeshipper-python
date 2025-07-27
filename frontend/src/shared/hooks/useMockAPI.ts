// hooks/useMockAPI.ts
// Mock API system for demo purposes - bypasses all authentication

import { useQuery, useMutation } from "@tanstack/react-query";
import { simulatedDataService } from "@/shared/services/simulatedDataService";

// Get realistic fleet data from simulated service with role-based filtering
const getSimulatedFleetData = (userRole?: string, userId?: string) => {
  const fleetData = simulatedDataService.getFleetStatus();
  
  // Filter vehicles based on user role
  let filteredVehicles = fleetData.vehicles;
  
  if (userRole === 'DRIVER' && userId) {
    // Drivers should only see their assigned vehicle
    filteredVehicles = fleetData.vehicles.filter(vehicle => 
      vehicle.assignedDriver?.id === userId
    );
  }
  
  // Transform the data to match the expected API format
  return {
    vehicles: filteredVehicles.map(vehicle => ({
      id: vehicle.id,
      registration_number: vehicle.registration,
      vehicle_type: vehicle.type,
      status: vehicle.status,
      location: vehicle.location,
      location_is_fresh: vehicle.locationIsFresh,
      assigned_driver: vehicle.assignedDriver ? {
        id: vehicle.assignedDriver.id,
        name: vehicle.assignedDriver.name,
        email: vehicle.assignedDriver.email,
      } : null,
      active_shipment: vehicle.activeShipment ? {
        id: vehicle.activeShipment.id,
        tracking_number: vehicle.activeShipment.trackingNumber,
        status: vehicle.activeShipment.status,
        origin_location: vehicle.activeShipment.origin,
        destination_location: vehicle.activeShipment.destination,
        customer_name: vehicle.activeShipment.customerName,
        estimated_delivery_date: vehicle.activeShipment.estimatedDelivery,
        has_dangerous_goods: vehicle.activeShipment.hasDangerousGoods,
        dangerous_goods: vehicle.activeShipment.dangerousGoods.map((dg: any) => ({
          un_number: dg.unNumber,
          proper_shipping_name: dg.properShippingName,
          hazard_class: dg.class,
          packing_group: dg.packingGroup,
          quantity: dg.quantity,
          is_marine_pollutant: false,
        })),
        emergency_contact: vehicle.activeShipment.emergencyContact,
        special_instructions: vehicle.activeShipment.specialInstructions,
      } : null,
      company: {
        id: "outbackhaul-1",
        name: simulatedDataService.getCompanyInfo().name,
      },
      make: vehicle.make,
      year: vehicle.year,
      configuration: vehicle.configuration,
      max_weight: vehicle.maxWeight,
      max_length: vehicle.maxLength,
      axles: vehicle.axles,
      engine_spec: vehicle.engineSpec,
      gearbox: vehicle.gearbox,
      fuel: vehicle.fuel,
      odometer: vehicle.odometer,
      next_service: vehicle.nextService,
      last_inspection: vehicle.lastInspection,
    })),
    total_vehicles: filteredVehicles.length,
    timestamp: fleetData.timestamp,
  };
};

// Mock Shipment Events
const mockShipmentEvents = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: { name: "Dispatch Officer", role: "DISPATCHER" },
    event_type: "STATUS_CHANGE",
    details: "Shipment status changed to IN_TRANSIT",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    user: { name: "John Smith", role: "DRIVER" },
    event_type: "COMMENT",
    details: "Started route to Melbourne. Weather conditions good.",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user: { name: "Safety Inspector", role: "INSPECTOR" },
    event_type: "INSPECTION",
    details: "Pre-trip hazard inspection completed. All items passed.",
  },
];

// Mock Inspections
const mockInspections = [
  {
    id: "1",
    shipment_id: "demo-shipment",
    inspector: { name: "John Smith", role: "DRIVER" },
    inspection_type: "PRE_TRIP",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "COMPLETED",
    items: [
      {
        id: "1",
        description: "Check for vehicle leaks",
        status: "PASS",
        photos: ["photo1.jpg"],
        notes: "No leaks detected",
      },
      {
        id: "2",
        description: "Verify dangerous goods placarding",
        status: "PASS",
        photos: ["photo2.jpg"],
        notes: "All placards properly displayed",
      },
      {
        id: "3",
        description: "Inspect load securing",
        status: "PASS",
        photos: [],
        notes: "Load properly secured with straps",
      },
    ],
  },
];

// Mock API Functions
async function mockAPICall<T>(data: T, delay = 1000): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return data;
}

// Fleet Status Hook with role-based filtering
export function useMockFleetStatus(pollingInterval = 10000, userRole?: string, userId?: string) {
  return useQuery({
    queryKey: ["mock-fleet-status", userRole, userId],
    queryFn: () => mockAPICall(getSimulatedFleetData(userRole, userId)),
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
  });
}

// Shipment Events Hook
export function useMockShipmentEvents(shipmentId: string) {
  return useQuery({
    queryKey: ["mock-shipment-events", shipmentId],
    queryFn: () => mockAPICall(mockShipmentEvents),
  });
}

// Add Event Mutation
export function useMockAddEvent() {
  return useMutation({
    mutationFn: async ({
      shipmentId,
      eventType,
      details,
    }: {
      shipmentId: string;
      eventType: string;
      details: string;
    }) => {
      const newEvent = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        user: { name: "Demo User", role: "DISPATCHER" },
        event_type: eventType,
        details,
      };
      await mockAPICall(newEvent, 500);
      mockShipmentEvents.unshift(newEvent);
      return newEvent;
    },
  });
}

// Inspections Hook
export function useMockInspections(shipmentId: string) {
  return useQuery({
    queryKey: ["mock-inspections", shipmentId],
    queryFn: () => mockAPICall(mockInspections),
  });
}

// Create Inspection Mutation
export function useMockCreateInspection() {
  return useMutation({
    mutationFn: async ({
      shipmentId,
      inspectionType,
      items,
    }: {
      shipmentId: string;
      inspectionType: string;
      items: any[];
    }) => {
      const newInspection = {
        id: Math.random().toString(),
        shipment_id: shipmentId,
        inspector: { name: "Demo User", role: "DRIVER" },
        inspection_type: inspectionType,
        timestamp: new Date().toISOString(),
        status: "COMPLETED",
        items,
      };
      await mockAPICall(newInspection, 1500);
      mockInspections.unshift(newInspection);
      return newInspection;
    },
  });
}

// Proof of Delivery Mutation
export function useMockSubmitPOD() {
  return useMutation({
    mutationFn: async ({
      shipmentId,
      signature,
      photos,
      recipient,
    }: {
      shipmentId: string;
      signature: string;
      photos: string[];
      recipient: string;
    }) => {
      const podData = {
        id: Math.random().toString(),
        shipment_id: shipmentId,
        signature,
        photos,
        recipient,
        timestamp: new Date().toISOString(),
        driver: { name: "Demo Driver", id: "demo-driver" },
      };
      await mockAPICall(podData, 2000);
      return podData;
    },
  });
}

// Public Tracking with POD
export function useMockPublicTracking(trackingNumber: string) {
  const baseData = {
    tracking_number: trackingNumber,
    status: "DELIVERED",
    status_display: "Delivered",
    customer_reference: "REF-12345",
    origin_location: "Sydney, NSW, Australia",
    destination_location: "Melbourne, VIC, Australia",
    estimated_delivery_date: new Date().toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    vehicle_location: {
      latitude: -37.8136,
      longitude: 144.9631,
      last_updated: new Date().toISOString(),
      is_fresh: true,
    },
    driver_name: "John",
    vehicle_registration: "1234",
    status_timeline: [
      {
        status: "CREATED",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Shipment created and prepared for dispatch",
      },
      {
        status: "IN_TRANSIT",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Shipment picked up and in transit",
      },
      {
        status: "DELIVERED",
        timestamp: new Date().toISOString(),
        description: "Shipment delivered successfully",
      },
    ],
    route_info: {
      has_live_tracking: false,
      tracking_available: false,
      note: "Shipment has been delivered",
    },
    documents: [
      {
        id: "doc-1",
        type: "manifest",
        type_display: "Shipping Manifest",
        filename: "manifest.pdf",
        status: "available",
        status_display: "Available",
        upload_date: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        download_url: "#",
      },
    ],
    communications: [
      {
        id: "comm-1",
        type: "sms",
        type_display: "SMS Notification",
        subject: "Shipment Status Update",
        message: "Your shipment has been delivered successfully.",
        sent_at: new Date().toISOString(),
        sender: "SafeShipper System",
        status: "delivered",
      },
    ],
    items_summary: {
      total_items: 3,
      total_weight_kg: 15.5,
      has_dangerous_goods: false,
      dangerous_goods_count: 0,
    },
    proof_of_delivery: {
      delivery_date: new Date().toISOString(),
      recipient_name: "Jane Doe",
      recipient_signature_url:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      delivery_photos: [
        "https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=POD+Photo+1",
        "https://via.placeholder.com/400x300/2196F3/FFFFFF?text=POD+Photo+2",
      ],
      delivery_notes: "Package delivered to front door",
      delivered_by: "John Smith",
    },
  };

  return useQuery({
    queryKey: ["mock-public-tracking", trackingNumber],
    queryFn: () => mockAPICall(baseData),
    enabled: !!trackingNumber,
  });
}

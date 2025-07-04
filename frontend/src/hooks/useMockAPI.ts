// hooks/useMockAPI.ts
// Mock API system for demo purposes - bypasses all authentication

import { useQuery, useMutation } from '@tanstack/react-query';

// Mock Fleet Data
const mockFleetData = {
  vehicles: [
    {
      id: 'vehicle-1',
      registration_number: 'TRK-001',
      vehicle_type: 'Heavy Duty Truck',
      status: 'IN_TRANSIT',
      location: { lat: -33.8688, lng: 151.2093 }, // Sydney
      location_is_fresh: true,
      assigned_driver: {
        id: 'driver-1',
        name: 'John Smith',
        email: 'john.smith@safeshipper.com'
      },
      active_shipment: {
        id: 'demo-shipment',
        tracking_number: 'SS-DEMO-2024',
        status: 'IN_TRANSIT',
        origin_location: 'Sydney, NSW',
        destination_location: 'Melbourne, VIC',
        customer_name: 'Global Manufacturing Inc.',
        estimated_delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      company: {
        id: 'company-1',
        name: 'SafeShipper Logistics'
      }
    },
    {
      id: 'vehicle-2', 
      registration_number: 'TRK-002',
      vehicle_type: 'Medium Truck',
      status: 'AVAILABLE',
      location: { lat: -37.8136, lng: 144.9631 }, // Melbourne
      location_is_fresh: true,
      assigned_driver: {
        id: 'driver-2',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@safeshipper.com'
      },
      active_shipment: null,
      company: {
        id: 'company-1',
        name: 'SafeShipper Logistics'
      }
    }
  ],
  total_vehicles: 2,
  timestamp: new Date().toISOString()
};

// Mock Shipment Events
const mockShipmentEvents = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Dispatch Officer', role: 'DISPATCHER' },
    event_type: 'STATUS_CHANGE',
    details: 'Shipment status changed to IN_TRANSIT'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    user: { name: 'John Smith', role: 'DRIVER' },
    event_type: 'COMMENT',
    details: 'Started route to Melbourne. Weather conditions good.'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user: { name: 'Safety Inspector', role: 'INSPECTOR' },
    event_type: 'INSPECTION',
    details: 'Pre-trip hazard inspection completed. All items passed.'
  }
];

// Mock Inspections
const mockInspections = [
  {
    id: '1',
    shipment_id: 'demo-shipment',
    inspector: { name: 'John Smith', role: 'DRIVER' },
    inspection_type: 'PRE_TRIP',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'COMPLETED',
    items: [
      {
        id: '1',
        description: 'Check for vehicle leaks',
        status: 'PASS',
        photos: ['photo1.jpg'],
        notes: 'No leaks detected'
      },
      {
        id: '2', 
        description: 'Verify dangerous goods placarding',
        status: 'PASS',
        photos: ['photo2.jpg'],
        notes: 'All placards properly displayed'
      },
      {
        id: '3',
        description: 'Inspect load securing',
        status: 'PASS',
        photos: [],
        notes: 'Load properly secured with straps'
      }
    ]
  }
];

// Mock API Functions
async function mockAPICall<T>(data: T, delay = 1000): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, delay));
  return data;
}

// Fleet Status Hook
export function useMockFleetStatus(pollingInterval = 10000) {
  return useQuery({
    queryKey: ['mock-fleet-status'],
    queryFn: () => mockAPICall(mockFleetData),
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
  });
}

// Shipment Events Hook
export function useMockShipmentEvents(shipmentId: string) {
  return useQuery({
    queryKey: ['mock-shipment-events', shipmentId],
    queryFn: () => mockAPICall(mockShipmentEvents),
  });
}

// Add Event Mutation
export function useMockAddEvent() {
  return useMutation({
    mutationFn: async ({ shipmentId, eventType, details }: { 
      shipmentId: string; 
      eventType: string; 
      details: string; 
    }) => {
      const newEvent = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        user: { name: 'Demo User', role: 'DISPATCHER' },
        event_type: eventType,
        details
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
    queryKey: ['mock-inspections', shipmentId],
    queryFn: () => mockAPICall(mockInspections),
  });
}

// Create Inspection Mutation
export function useMockCreateInspection() {
  return useMutation({
    mutationFn: async ({ shipmentId, inspectionType, items }: {
      shipmentId: string;
      inspectionType: string;
      items: any[];
    }) => {
      const newInspection = {
        id: Math.random().toString(),
        shipment_id: shipmentId,
        inspector: { name: 'Demo User', role: 'DRIVER' },
        inspection_type: inspectionType,
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        items
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
    mutationFn: async ({ shipmentId, signature, photos, recipient }: {
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
        driver: { name: 'Demo Driver', id: 'demo-driver' }
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
    status: 'DELIVERED',
    customer_reference: 'REF-12345',
    origin_location: 'Sydney, NSW, Australia',
    destination_location: 'Melbourne, VIC, Australia',
    estimated_delivery_date: new Date().toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    vehicle_location: {
      latitude: -37.8136,
      longitude: 144.9631,
      last_updated: new Date().toISOString(),
      is_fresh: true
    },
    driver_name: 'John',
    vehicle_registration: '1234',
    status_timeline: [
      {
        status: 'CREATED',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Shipment created and prepared for dispatch'
      },
      {
        status: 'IN_TRANSIT',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Shipment picked up and in transit'
      },
      {
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        description: 'Shipment delivered successfully'
      }
    ],
    route_info: {
      has_live_tracking: false,
      tracking_available: false,
      note: 'Shipment has been delivered'
    },
    proof_of_delivery: {
      signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      photos: [
        'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=POD+Photo+1',
        'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=POD+Photo+2'
      ],
      recipient: 'Jane Doe',
      timestamp: new Date().toISOString(),
      driver: 'John Smith'
    }
  };

  return useQuery({
    queryKey: ['mock-public-tracking', trackingNumber],
    queryFn: () => mockAPICall(baseData),
    enabled: !!trackingNumber,
  });
}
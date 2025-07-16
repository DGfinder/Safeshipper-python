// hooks/useMockAPI.ts
// Mock API system for demo purposes - bypasses all authentication

import { useQuery, useMutation } from "@tanstack/react-query";

// Mock Fleet Data
const mockFleetData = {
  vehicles: [
    {
      id: "vehicle-1",
      registration_number: "TRK-001",
      vehicle_type: "Heavy Duty Truck",
      status: "IN_TRANSIT",
      location: { lat: -33.8688, lng: 151.2093 }, // Sydney
      location_is_fresh: true,
      assigned_driver: {
        id: "driver-1",
        name: "John Smith",
        email: "john.smith@safeshipper.com",
      },
      active_shipment: {
        id: "demo-shipment",
        tracking_number: "SS-DEMO-2024",
        status: "IN_TRANSIT",
        origin_location: "Sydney, NSW",
        destination_location: "Melbourne, VIC",
        customer_name: "Global Manufacturing Inc.",
        estimated_delivery_date: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        has_dangerous_goods: true,
        dangerous_goods: [
          {
            un_number: "1203",
            proper_shipping_name: "GASOLINE",
            hazard_class: "3",
            packing_group: "II",
            quantity: "2000L",
            is_marine_pollutant: false,
          },
          {
            un_number: "1791", 
            proper_shipping_name: "HYPOCHLORITE SOLUTION",
            hazard_class: "8",
            packing_group: "III",
            quantity: "500L",
            is_marine_pollutant: false,
          },
        ],
        emergency_contact: "+61-1800-555-0123",
        special_instructions: "Handle with extreme care - flammable and corrosive materials. Keep away from heat sources.",
      },
      company: {
        id: "company-1",
        name: "SafeShipper Logistics",
      },
    },
    {
      id: "vehicle-2",
      registration_number: "TRK-002",
      vehicle_type: "Medium Truck",
      status: "AVAILABLE",
      location: { lat: -37.8136, lng: 144.9631 }, // Melbourne
      location_is_fresh: true,
      assigned_driver: {
        id: "driver-2",
        name: "Sarah Johnson",
        email: "sarah.johnson@safeshipper.com",
      },
      active_shipment: null,
      company: {
        id: "company-1",
        name: "SafeShipper Logistics",
      },
    },
    {
      id: "vehicle-3",
      registration_number: "TRK-003",
      vehicle_type: "Hazmat Tanker",
      status: "IN_TRANSIT",
      location: { lat: -34.9285, lng: 138.6007 }, // Adelaide
      location_is_fresh: true,
      assigned_driver: {
        id: "driver-3",
        name: "Mike Chen",
        email: "mike.chen@safeshipper.com",
      },
      active_shipment: {
        id: "hazmat-shipment-1",
        tracking_number: "SS-HAZ-2024-001",
        status: "IN_TRANSIT",
        origin_location: "Adelaide, SA",
        destination_location: "Perth, WA",
        customer_name: "ChemTech Industries",
        estimated_delivery_date: new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toISOString(),
        has_dangerous_goods: true,
        dangerous_goods: [
          {
            un_number: "2794",
            proper_shipping_name: "BATTERIES, WET, FILLED WITH ACID",
            hazard_class: "8",
            packing_group: "III",
            quantity: "50 units",
            is_marine_pollutant: false,
          },
        ],
        emergency_contact: "+61-1800-HAZ-CHEM",
        special_instructions: "Corrosive material - avoid tipping or rough handling. Keep upright at all times.",
      },
      company: {
        id: "company-2",
        name: "HazChem Logistics",
      },
    },
    {
      id: "vehicle-4",
      registration_number: "TRK-004",
      vehicle_type: "Light Truck",
      status: "OUT_FOR_DELIVERY",
      location: { lat: -27.4698, lng: 153.0251 }, // Brisbane
      location_is_fresh: false, // Offline/stale location
      assigned_driver: {
        id: "driver-4",
        name: "Emma Wilson",
        email: "emma.wilson@safeshipper.com",
      },
      active_shipment: {
        id: "medical-shipment-1",
        tracking_number: "SS-MED-2024-007",
        status: "OUT_FOR_DELIVERY",
        origin_location: "Brisbane, QLD",
        destination_location: "Gold Coast, QLD",
        customer_name: "Metro Hospital",
        estimated_delivery_date: new Date(
          Date.now() + 6 * 60 * 60 * 1000,
        ).toISOString(),
        has_dangerous_goods: true,
        dangerous_goods: [
          {
            un_number: "3373",
            proper_shipping_name: "BIOLOGICAL SUBSTANCE, CATEGORY B",
            hazard_class: "6.2",
            packing_group: "",
            quantity: "12 packages",
            is_marine_pollutant: false,
          },
        ],
        emergency_contact: "+61-7-3000-1234",
        special_instructions: "Medical specimens - maintain cold chain. Priority delivery required.",
      },
      company: {
        id: "company-3",
        name: "MedTrans Express",
      },
    },
    {
      id: "vehicle-5",
      registration_number: "TRK-005",
      vehicle_type: "Box Truck",
      status: "AVAILABLE",
      location: { lat: -12.4634, lng: 130.8456 }, // Darwin
      location_is_fresh: false, // Parked/offline
      assigned_driver: null,
      active_shipment: null,
      company: {
        id: "company-1",
        name: "SafeShipper Logistics",
      },
    },
  ],
  total_vehicles: 5,
  timestamp: new Date().toISOString(),
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

// Fleet Status Hook
export function useMockFleetStatus(pollingInterval = 10000) {
  return useQuery({
    queryKey: ["mock-fleet-status"],
    queryFn: () => mockAPICall(mockFleetData),
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

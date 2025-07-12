// hooks/usePublicTracking.ts
import { useQuery } from "@tanstack/react-query";

// Types
export interface VehicleLocation {
  latitude: number;
  longitude: number;
  last_updated: string;
  is_fresh: boolean;
}

export interface StatusTimelineItem {
  status: string;
  timestamp: string;
  description: string;
}

export interface RouteInfo {
  has_live_tracking: boolean;
  tracking_available: boolean;
  privacy_note?: string;
  note?: string;
}

export interface DocumentInfo {
  id: string;
  type: string;
  type_display: string;
  filename: string;
  status: string;
  status_display: string;
  upload_date: string;
  download_url: string;
}

export interface CommunicationInfo {
  id: string;
  type: string;
  type_display: string;
  subject: string;
  message: string;
  sent_at: string;
  sender: string;
  status: string;
}

export interface ProofOfDeliveryInfo {
  delivery_date: string;
  recipient_name?: string;
  recipient_signature_url?: string;
  delivery_photos: string[];
  delivery_notes?: string;
  delivered_by: string;
  status?: string;
}

export interface ItemsSummary {
  total_items: number;
  total_weight_kg: number;
  has_dangerous_goods: boolean;
  dangerous_goods_count: number;
}

export interface PublicShipmentData {
  tracking_number: string;
  status: string;
  status_display: string;
  customer_reference?: string;
  origin_location: string;
  destination_location: string;
  estimated_pickup_date?: string;
  actual_pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  created_at: string;
  updated_at: string;
  vehicle_location?: VehicleLocation;
  driver_name?: string;
  vehicle_registration?: string;
  status_timeline: StatusTimelineItem[];
  route_info: RouteInfo;
  documents: DocumentInfo[];
  communications: CommunicationInfo[];
  proof_of_delivery?: ProofOfDeliveryInfo;
  items_summary: ItemsSummary;
}

const API_BASE_URL = "/api/v1";

// API Functions
async function getPublicShipmentTracking(
  trackingNumber: string,
): Promise<PublicShipmentData> {
  const response = await fetch(
    `${API_BASE_URL}/tracking/public/shipment/${trackingNumber}/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Shipment not found. Please check your tracking number.");
    }
    const errorData = await response.json();
    throw new Error(
      errorData.error || "Failed to get shipment tracking information",
    );
  }

  return response.json();
}

// Hooks
export function usePublicShipmentTracking(
  trackingNumber: string | null,
  pollingInterval = 30000,
) {
  return useQuery({
    queryKey: ["public-shipment-tracking", trackingNumber],
    queryFn: () => {
      if (!trackingNumber) throw new Error("No tracking number provided");
      return getPublicShipmentTracking(trackingNumber);
    },
    enabled: !!trackingNumber,
    refetchInterval: (query) => {
      // Only poll if shipment is in transit and has live tracking
      const data = query.state.data;
      if (
        data?.status === "IN_TRANSIT" &&
        data?.route_info?.has_live_tracking
      ) {
        return pollingInterval;
      }
      return false;
    },
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      // Don't retry for 404 errors (shipment not found)
      if (error.message.includes("not found")) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

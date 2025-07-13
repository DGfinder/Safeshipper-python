// hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

// Types for dashboard data
export interface DashboardStats {
  totalShipments: number;
  pendingReviews: number;
  complianceRate: number;
  activeRoutes: number;
  trends: {
    shipments_change: string;
    weekly_shipments: number;
    compliance_trend: string;
    routes_change: string;
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
  last_updated: string;
}

export interface InspectionStats {
  total_inspections: number;
  pass_rate: number;
  completed_today: number;
  failed_count: number;
  pending_count: number;
  inspections_by_type: Record<string, number>;
  recent_inspections: Array<{
    id: string;
    shipment_id: string;
    shipment_identifier: string;
    overall_result: 'PASS' | 'FAIL' | 'PENDING';
    completed_at: string;
    inspector_name: string;
  }>;
}

export interface RecentActivity {
  total_events: number;
  unread_count: number;
  events: Array<{
    id: string;
    event_type: string;
    title: string;
    details: string;
    timestamp: string;
    shipment_id: string;
    shipment_identifier: string;
    user_name: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    is_automated: boolean;
  }>;
}

export interface PODStats {
  total_deliveries: number;
  pod_captured_count: number;
  capture_rate: number;
  digital_signatures: number;
  photos_captured: number;
  avg_response_time_hours: number;
  recent_pods: Array<{
    shipment_id: string;
    shipment_identifier: string;
    captured_at: string;
    signature_type: string;
  }>;
}

export interface RecentShipments {
  shipments: Array<{
    id: string;
    identifier: string;
    origin: string;
    destination: string;
    status: string;
    progress: number;
    dangerous_goods: string[];
    hazchem_code: string;
    created_at: string;
  }>;
  total: number;
  limit: number;
  last_updated: string;
}

const API_BASE_URL = "/api/v1";

// API Functions
async function fetchDashboardStats(token: string): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
  }

  return response.json();
}

async function fetchInspectionStats(token: string): Promise<InspectionStats> {
  const response = await fetch(`${API_BASE_URL}/inspections/?limit=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inspection stats: ${response.status}`);
  }

  const data = await response.json();
  const inspections = data.results || [];

  // Calculate stats from inspection data
  const total_inspections = inspections.length;
  const completed_inspections = inspections.filter((i: any) => i.status === 'COMPLETED');
  const passed_inspections = completed_inspections.filter((i: any) => i.overall_result === 'PASS');
  const failed_inspections = completed_inspections.filter((i: any) => i.overall_result === 'FAIL');
  
  // Get today's completed inspections
  const today = new Date().toISOString().split('T')[0];
  const completed_today = completed_inspections.filter((i: any) => 
    i.completed_at && i.completed_at.startsWith(today)
  ).length;

  const pass_rate = completed_inspections.length > 0 
    ? Math.round((passed_inspections.length / completed_inspections.length) * 100 * 10) / 10
    : 100;

  // Group by inspection type
  const inspections_by_type: Record<string, number> = {};
  inspections.forEach((inspection: any) => {
    const type = inspection.inspection_type || 'GENERAL';
    inspections_by_type[type] = (inspections_by_type[type] || 0) + 1;
  });

  return {
    total_inspections,
    pass_rate,
    completed_today,
    failed_count: failed_inspections.length,
    pending_count: inspections.filter((i: any) => i.status === 'IN_PROGRESS').length,
    inspections_by_type,
    recent_inspections: completed_inspections.slice(0, 5).map((inspection: any) => ({
      id: inspection.id,
      shipment_id: inspection.shipment?.id || '',
      shipment_identifier: inspection.shipment?.tracking_number || `SHIP-${inspection.shipment?.id}`,
      overall_result: inspection.overall_result || 'PENDING',
      completed_at: inspection.completed_at,
      inspector_name: inspection.inspector?.username || 'Unknown'
    }))
  };
}

async function fetchRecentActivity(token: string, limit: number = 10): Promise<RecentActivity> {
  const response = await fetch(`${API_BASE_URL}/communications/shipment-events/?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recent activity: ${response.status}`);
  }

  const data = await response.json();
  const events = data.results || [];

  // Get unread count
  const unreadResponse = await fetch(`${API_BASE_URL}/communications/shipment-events/unread_count/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  let unread_count = 0;
  if (unreadResponse.ok) {
    const unreadData = await unreadResponse.json();
    unread_count = unreadData.unread_count || 0;
  }

  return {
    total_events: data.count || events.length,
    unread_count,
    events: events.map((event: any) => ({
      id: event.id,
      event_type: event.event_type || 'GENERAL',
      title: event.title || 'Event',
      details: event.details || '',
      timestamp: event.timestamp,
      shipment_id: event.shipment?.id || '',
      shipment_identifier: event.shipment?.tracking_number || `SHIP-${event.shipment?.id}`,
      user_name: event.user?.username || 'System',
      priority: event.priority || 'MEDIUM',
      is_automated: event.is_automated || false
    }))
  };
}

async function fetchPODStats(token: string): Promise<PODStats> {
  // For now, we'll calculate POD stats from shipments data
  // In a real implementation, this would come from a dedicated POD API
  const response = await fetch(`${API_BASE_URL}/dashboard/recent-shipments/?limit=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch POD stats: ${response.status}`);
  }

  const data = await response.json();
  const shipments = data.shipments || [];

  // Calculate POD stats (mock calculation for demo)
  const delivered_shipments = shipments.filter((s: any) => s.status === 'DELIVERED');
  const total_deliveries = delivered_shipments.length;
  const pod_captured_count = Math.floor(total_deliveries * 0.98); // 98% capture rate
  const capture_rate = total_deliveries > 0 ? Math.round((pod_captured_count / total_deliveries) * 100) : 100;

  return {
    total_deliveries,
    pod_captured_count,
    capture_rate,
    digital_signatures: Math.floor(pod_captured_count * 0.85), // 85% digital
    photos_captured: Math.floor(pod_captured_count * 1.2), // Some shipments have multiple photos
    avg_response_time_hours: 1.2,
    recent_pods: delivered_shipments.slice(0, 5).map((shipment: any) => ({
      shipment_id: shipment.id,
      shipment_identifier: shipment.identifier,
      captured_at: shipment.created_at, // Would be actual POD timestamp
      signature_type: 'DIGITAL'
    }))
  };
}

async function fetchRecentShipments(token: string, limit: number = 10): Promise<RecentShipments> {
  const response = await fetch(`${API_BASE_URL}/dashboard/recent-shipments/?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recent shipments: ${response.status}`);
  }

  return response.json();
}

// Custom Hooks
export function useDashboardStats(refetchInterval: number = 30000) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return fetchDashboardStats(token);
    },
    enabled: !!getToken(),
    refetchInterval,
    refetchIntervalInBackground: true,
  });
}

export function useInspectionStats(refetchInterval: number = 60000) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["inspection-stats"],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return fetchInspectionStats(token);
    },
    enabled: !!getToken(),
    refetchInterval,
  });
}

export function useRecentActivity(limit: number = 10, refetchInterval: number = 30000) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["recent-activity", limit],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return fetchRecentActivity(token, limit);
    },
    enabled: !!getToken(),
    refetchInterval,
    refetchIntervalInBackground: true,
  });
}

export function usePODStats(refetchInterval: number = 60000) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["pod-stats"],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return fetchPODStats(token);
    },
    enabled: !!getToken(),
    refetchInterval,
  });
}

export function useRecentShipments(limit: number = 10, refetchInterval: number = 60000) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["recent-shipments", limit],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return fetchRecentShipments(token, limit);
    },
    enabled: !!getToken(),
    refetchInterval,
  });
}
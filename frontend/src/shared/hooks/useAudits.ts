import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMockAuth } from "./useMockAuth";

// Types for audit data
export interface AuditLog {
  id: string;
  action_type: string;
  action_type_display: string;
  action_description: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
  user_role: string;
  content_type: {
    id: number;
    app_label: string;
    model: string;
  } | null;
  object_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string;
  session_key: string;
  metadata: Record<string, any> | null;
  timestamp: string;
}

export interface ShipmentAuditLog {
  id: string;
  shipment: string;
  audit_log: AuditLog;
  previous_status: string;
  new_status: string;
  location_at_time: string;
  assigned_vehicle: string;
  assigned_driver: string;
  impact_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  impact_level_display: string;
}

export interface AuditSummary {
  total_actions: number;
  actions_by_type: Record<string, number>;
  actions_by_user: Record<string, number>;
  recent_actions: AuditLog[];
  compliance_issues: number;
  high_impact_actions: number;
}

export interface AuditFilters {
  action_type?: string;
  user?: string;
  user_role?: string;
  date_from?: string;
  date_to?: string;
  content_type?: string;
  object_id?: string;
  search?: string;
}

// API functions
const fetchAuditLogs = async (
  filters: AuditFilters = {},
  token: string,
): Promise<{ results: AuditLog[]; count: number }> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  const response = await fetch(`/api/v1/audits/logs/?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch audit logs");
  }

  return response.json();
};

const fetchShipmentAuditLogs = async (
  shipmentId: string,
  token: string,
): Promise<{ results: ShipmentAuditLog[]; count: number }> => {
  const response = await fetch(`/api/v1/audits/shipments/${shipmentId}/logs/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch shipment audit logs");
  }

  return response.json();
};

const fetchAuditSummary = async (
  filters: { date_from?: string; date_to?: string } = {},
  token: string,
): Promise<AuditSummary> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  const response = await fetch(`/api/v1/audits/summary/?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch audit summary");
  }

  return response.json();
};

const exportAuditLogs = async (
  filters: AuditFilters,
  token: string,
): Promise<{ export_id: string; status: string; count: number }> => {
  const response = await fetch("/api/v1/audits/export/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters }),
  });

  if (!response.ok) {
    throw new Error("Failed to export audit logs");
  }

  return response.json();
};

// Custom hooks
export const useAuditLogs = (filters: AuditFilters = {}) => {
  const { getToken } = useMockAuth();
  const token = getToken();

  return useQuery({
    queryKey: ["auditLogs", filters],
    queryFn: () => fetchAuditLogs(filters, token!),
    enabled: !!token,
    staleTime: 30000, // 30 seconds
  });
};

export const useShipmentAuditLogs = (shipmentId: string) => {
  const { getToken } = useMockAuth();
  const token = getToken();

  return useQuery({
    queryKey: ["shipmentAuditLogs", shipmentId],
    queryFn: () => fetchShipmentAuditLogs(shipmentId, token!),
    enabled: !!token && !!shipmentId,
    staleTime: 60000, // 1 minute
  });
};

export const useAuditSummary = (
  filters: { date_from?: string; date_to?: string } = {},
) => {
  const { getToken } = useMockAuth();
  const token = getToken();

  return useQuery({
    queryKey: ["auditSummary", filters],
    queryFn: () => fetchAuditSummary(filters, token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useExportAuditLogs = () => {
  const { getToken } = useMockAuth();
  const token = getToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filters: AuditFilters) => exportAuditLogs(filters, token!),
    onSuccess: () => {
      // Optionally invalidate queries if needed
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    },
  });
};

// Utility functions
export const formatAuditTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const getImpactLevelColor = (level: string): string => {
  switch (level) {
    case "CRITICAL":
      return "text-red-600 bg-red-50 border-red-200";
    case "HIGH":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "MEDIUM":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "LOW":
    default:
      return "text-green-600 bg-green-50 border-green-200";
  }
};

export const getActionTypeIcon = (actionType: string): string => {
  switch (actionType) {
    case "CREATE":
      return "➕";
    case "UPDATE":
      return "✏️";
    case "DELETE":
      return "🗑️";
    case "STATUS_CHANGE":
      return "🔄";
    case "DOCUMENT_UPLOAD":
      return "📄";
    case "DOCUMENT_DELETE":
      return "🗂️";
    case "ASSIGNMENT_CHANGE":
      return "👤";
    case "LOCATION_UPDATE":
      return "📍";
    case "ACCESS_GRANTED":
      return "🔓";
    case "ACCESS_DENIED":
      return "🔒";
    case "LOGIN":
      return "🔑";
    case "LOGOUT":
      return "🚪";
    case "EXPORT":
      return "📤";
    case "IMPORT":
      return "📥";
    case "VALIDATION":
      return "✅";
    case "COMMUNICATION":
      return "💬";
    default:
      return "📋";
  }
};

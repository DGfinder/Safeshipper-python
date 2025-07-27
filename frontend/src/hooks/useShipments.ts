// hooks/useShipments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/stores/auth-store";

// Types
export interface Shipment {
  id: string;
  tracking_number: string;
  reference_number: string;
  status:
    | "PENDING"
    | "AWAITING_VALIDATION"
    | "PLANNING"
    | "READY_FOR_DISPATCH"
    | "IN_TRANSIT"
    | "AT_HUB"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "EXCEPTION"
    | "CANCELLED"
    | "COMPLETED";
  customer: string;
  carrier: string;
  origin_location: string;
  destination_location: string;
  estimated_pickup_date?: string;
  actual_pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  instructions?: string;
  created_at: string;
  updated_at: string;
  items?: ConsignmentItem[];
}

export interface ConsignmentItem {
  id: string;
  description: string;
  quantity: number;
  weight_kg?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  is_dangerous_good: boolean;
  dangerous_good_entry?: {
    id: string;
    un_number: string;
    proper_shipping_name: string;
    hazard_class: string;
    packing_group?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateShipmentRequest {
  reference_number?: string;
  customer: string;
  carrier: string;
  origin_location: string;
  destination_location: string;
  freight_type: string;
  estimated_pickup_date?: string;
  estimated_delivery_date?: string;
  instructions?: string;
  items?: {
    description: string;
    quantity: number;
    weight_kg?: number;
    is_dangerous_good?: boolean;
  }[];
}

export interface UpdateShipmentRequest {
  reference_number?: string;
  status?: string;
  origin_location?: string;
  destination_location?: string;
  estimated_pickup_date?: string;
  estimated_delivery_date?: string;
  instructions?: string;
}

const API_BASE_URL = "/api/v1";

// API Functions
async function fetchShipments(token: string): Promise<Shipment[]> {
  const response = await fetch(`${API_BASE_URL}/shipments/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch shipments");
  }

  return response.json();
}

async function fetchShipment(
  shipmentId: string,
  token: string,
): Promise<Shipment> {
  const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Shipment not found");
    }
    throw new Error("Failed to fetch shipment");
  }

  return response.json();
}

async function createShipment(
  data: CreateShipmentRequest,
  token: string,
): Promise<Shipment> {
  const response = await fetch(`${API_BASE_URL}/shipments/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to create shipment");
  }

  return response.json();
}

async function updateShipment(
  shipmentId: string,
  data: UpdateShipmentRequest,
  token: string,
): Promise<Shipment> {
  const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to update shipment");
  }

  return response.json();
}

async function updateShipmentStatus(
  shipmentId: string,
  status: string,
  token: string,
): Promise<Shipment> {
  const response = await fetch(
    `${API_BASE_URL}/shipments/${shipmentId}/update-status/`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to update shipment status");
  }

  return response.json();
}

async function deleteShipment(
  shipmentId: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to delete shipment");
  }
}

// Hooks
export function useShipments() {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["shipments"],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return fetchShipments(token);
    },
    enabled: !!getToken(),
  });
}

export function useShipment(shipmentId: string) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return fetchShipment(shipmentId, token);
    },
    enabled: !!shipmentId && !!getToken(),
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: (data: CreateShipmentRequest) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return createShipment(data, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({
      shipmentId,
      data,
    }: {
      shipmentId: string;
      data: UpdateShipmentRequest;
    }) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return updateShipment(shipmentId, data, token);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipment", data.id] });
    },
  });
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({
      shipmentId,
      status,
    }: {
      shipmentId: string;
      status: string;
    }) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return updateShipmentStatus(shipmentId, status, token);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipment", data.id] });
    },
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: (shipmentId: string) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return deleteShipment(shipmentId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
  });
}

// Document generation functions
async function generateShipmentReport(
  shipmentId: string,
  token: string,
  includeAudit: boolean = true,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/shipments/${shipmentId}/generate-report/?include_audit=${includeAudit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate shipment report");
  }

  return response.blob();
}

async function generateComplianceCertificate(
  shipmentId: string,
  token: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/shipments/${shipmentId}/generate-compliance-certificate/`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || "Failed to generate compliance certificate",
    );
  }

  return response.blob();
}

async function generateDGManifest(
  shipmentId: string,
  token: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/shipments/${shipmentId}/generate-dg-manifest/`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate DG manifest");
  }

  return response.blob();
}

async function generateBatchDocuments(
  shipmentId: string,
  token: string,
  documentTypes: string[],
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/shipments/${shipmentId}/generate-batch-documents/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document_types: documentTypes }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate batch documents");
  }

  return response.blob();
}

// Utility function to download blob as file
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Document generation hooks
export function useGenerateShipmentReport() {
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({
      shipmentId,
      includeAudit = true,
    }: {
      shipmentId: string;
      includeAudit?: boolean;
    }) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return generateShipmentReport(shipmentId, token, includeAudit);
    },
    onSuccess: (blob, { shipmentId }) => {
      downloadBlob(blob, `shipment_report_${shipmentId}.pdf`);
    },
  });
}

export function useGenerateComplianceCertificate() {
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: (shipmentId: string) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return generateComplianceCertificate(shipmentId, token);
    },
    onSuccess: (blob, shipmentId) => {
      downloadBlob(blob, `compliance_cert_${shipmentId}.pdf`);
    },
  });
}

export function useGenerateDGManifest() {
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: (shipmentId: string) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return generateDGManifest(shipmentId, token);
    },
    onSuccess: (blob, shipmentId) => {
      downloadBlob(blob, `dg_manifest_${shipmentId}.pdf`);
    },
  });
}

export function useGenerateBatchDocuments() {
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({
      shipmentId,
      documentTypes,
    }: {
      shipmentId: string;
      documentTypes: string[];
    }) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return generateBatchDocuments(shipmentId, token, documentTypes);
    },
    onSuccess: (blob, { shipmentId }) => {
      downloadBlob(blob, `shipment_documents_${shipmentId}.zip`);
    },
  });
}

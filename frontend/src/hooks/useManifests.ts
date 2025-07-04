// hooks/useManifests.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';

// Types
export interface Document {
  id: string;
  document_type: string;
  status: 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'VALIDATED_OK' | 'VALIDATED_WITH_ERRORS' | 'PROCESSING_FAILED';
  file_url: string;
  original_filename: string;
  file_extension: string;
  mime_type: string;
  file_size: number;
  shipment: string;
  shipment_tracking_number: string;
  uploaded_by: string;
  uploaded_by_username: string;
  validation_results?: any;
  created_at: string;
  updated_at: string;
}

export interface DocumentStatus {
  id: string;
  status: string;
  is_processing: boolean;
  is_validated: boolean;
  validation_errors_count: number;
  validation_warnings_count: number;
  potential_dg_count: number;
  updated_at: string;
}

export interface ManifestValidationResult {
  document_id: string;
  status: string;
  potential_dangerous_goods: DangerousGoodMatch[];
  unmatched_text: string[];
  processing_metadata: {
    total_pages: number;
    total_text_blocks: number;
    processing_time_seconds: number;
    [key: string]: any;
  };
  validation_errors?: string[];
  validation_warnings?: string[];
}

export interface DangerousGoodMatch {
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  packing_group?: string;
  found_text: string;
  matched_term: string;  // The specific synonym or term that triggered the match
  page_number: number;
  confidence_score: number;
  match_type: 'un_number' | 'proper_name' | 'simplified_name' | 'synonym';
  quantity?: number;
  weight_kg?: number;
}

export interface DangerousGoodConfirmation {
  un_number: string;
  description: string;
  quantity: number;
  weight_kg: number;
  found_text?: string;
  matched_term?: string;
  confidence_score?: number;
  page_number?: number;
}

const API_BASE_URL = '/api/v1';

// API Functions
async function uploadManifest(shipmentId: string, file: File, token: string): Promise<{
  message: string;
  document: Document;
  processing_status: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('shipment_id', shipmentId);
  formData.append('document_type', 'DG_MANIFEST');

  const response = await fetch(`${API_BASE_URL}/documents/upload-manifest/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload manifest');
  }

  return response.json();
}

async function getDocumentStatus(documentId: string, token: string): Promise<DocumentStatus> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/status/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get document status');
  }

  return response.json();
}

async function getValidationResults(documentId: string, token: string): Promise<ManifestValidationResult> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/validation-results/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get validation results');
  }

  return response.json();
}

async function confirmDangerousGoods(
  documentId: string, 
  confirmedDGs: DangerousGoodConfirmation[], 
  token: string
): Promise<{
  message: string;
  confirmed_count: number;
  document_status: string;
}> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/confirm-dangerous-goods/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      confirmed_dangerous_goods: confirmedDGs,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to confirm dangerous goods');
  }

  return response.json();
}

async function finalizeShipmentFromManifest(
  shipmentId: string,
  documentId: string,
  confirmedDGs: DangerousGoodConfirmation[],
  token: string
): Promise<{
  message: string;
  shipment: any;
  created_items_count: number;
  compatibility_status: string;
  generated_documents: any[];
  document_status: string;
}> {
  const response = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/finalize-from-manifest/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: documentId,
      confirmed_dangerous_goods: confirmedDGs,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to finalize shipment');
  }

  return response.json();
}

// Hooks
export function useUploadManifest() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({ shipmentId, file }: { shipmentId: string; file: File }) => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return uploadManifest(shipmentId, file, token);
    },
    onSuccess: (data) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['shipment', data.document.shipment] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDocumentStatus(documentId: string | null, pollingInterval = 3000) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ['document-status', documentId],
    queryFn: () => {
      const token = getToken();
      if (!token || !documentId) throw new Error('No token or document ID');
      return getDocumentStatus(documentId, token);
    },
    enabled: !!documentId && !!getToken(),
    refetchInterval: (data) => {
      // Stop polling if document is no longer processing
      if (data?.is_processing) {
        return pollingInterval;
      }
      return false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useValidationResults(documentId: string | null) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ['validation-results', documentId],
    queryFn: () => {
      const token = getToken();
      if (!token || !documentId) throw new Error('No token or document ID');
      return getValidationResults(documentId, token);
    },
    enabled: !!documentId && !!getToken(),
  });
}

export function useConfirmDangerousGoods() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({ 
      documentId, 
      confirmedDGs 
    }: { 
      documentId: string; 
      confirmedDGs: DangerousGoodConfirmation[] 
    }) => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return confirmDangerousGoods(documentId, confirmedDGs, token);
    },
    onSuccess: (data, variables) => {
      // Invalidate document status and validation results
      queryClient.invalidateQueries({ queryKey: ['document-status', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['validation-results', variables.documentId] });
    },
  });
}

export function useFinalizeShipmentFromManifest() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({ 
      shipmentId, 
      documentId, 
      confirmedDGs 
    }: { 
      shipmentId: string; 
      documentId: string; 
      confirmedDGs: DangerousGoodConfirmation[] 
    }) => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return finalizeShipmentFromManifest(shipmentId, documentId, confirmedDGs, token);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['document-status', variables.documentId] });
    },
  });
}
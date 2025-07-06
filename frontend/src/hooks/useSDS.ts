// hooks/useSDS.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';

// Types
export interface SafetyDataSheet {
  id: string;
  dangerous_good: {
    id: string;
    un_number: string;
    proper_shipping_name: string;
    hazard_class: string;
    packing_group?: string;
  };
  product_name: string;
  manufacturer: string;
  manufacturer_code?: string;
  document: {
    id: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    file_url: string;
    created_at: string;
  };
  version: string;
  revision_date: string;
  supersedes_version?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED' | 'UNDER_REVIEW' | 'DRAFT';
  status_display: string;
  expiration_date?: string;
  language: string;
  language_display: string;
  country_code: string;
  regulatory_standard: string;
  emergency_contacts: Record<string, any>;
  flash_point_celsius?: number;
  auto_ignition_temp_celsius?: number;
  physical_state?: 'SOLID' | 'LIQUID' | 'GAS' | 'AEROSOL';
  color?: string;
  odor?: string;
  hazard_statements: string[];
  precautionary_statements: string[];
  first_aid_measures: Record<string, any>;
  fire_fighting_measures: Record<string, any>;
  spill_cleanup_procedures?: string;
  storage_requirements?: string;
  handling_precautions?: string;
  disposal_methods?: string;
  created_by?: {
    id: string;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  is_expired: boolean;
  is_current: boolean;
  days_until_expiration: number;
}

export interface SDSSearchParams {
  query?: string;
  un_number?: string;
  manufacturer?: string;
  product_name?: string;
  hazard_class?: string;
  language?: string;
  country_code?: string;
  status?: string;
  include_expired?: boolean;
  dangerous_good_id?: string;
  flash_point_min?: number;
  flash_point_max?: number;
  physical_state?: string;
  hazard_code?: string;
}

export interface SDSLookupRequest {
  dangerous_good_id: string;
  language?: string;
  country_code?: string;
}

export interface SDSUploadRequest {
  file: File;
  dangerous_good_id: string;
  product_name: string;
  manufacturer: string;
  version: string;
  revision_date: string;
  language?: string;
  country_code?: string;
}

export interface SDSStatistics {
  total_sds: number;
  active_sds: number;
  expired_sds: number;
  expiring_soon: number;
  by_language: Record<string, number>;
  by_status: Record<string, number>;
  top_manufacturers: Array<[string, number]>;
}

const API_BASE_URL = '/api/v1';

// API Functions
async function fetchSafetyDataSheets(params: SDSSearchParams = {}, token: string): Promise<{
  results: SafetyDataSheet[];
  count: number;
  next?: string;
  previous?: string;
}> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  const url = `${API_BASE_URL}/sds/safety-data-sheets/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch safety data sheets');
  }

  return response.json();
}

async function fetchSafetyDataSheet(sdsId: string, token: string): Promise<SafetyDataSheet> {
  const response = await fetch(`${API_BASE_URL}/sds/safety-data-sheets/${sdsId}/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch safety data sheet');
  }

  return response.json();
}

async function lookupSDS(lookupData: SDSLookupRequest, token: string): Promise<SafetyDataSheet> {
  const response = await fetch(`${API_BASE_URL}/sds/safety-data-sheets/lookup/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lookupData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to lookup SDS');
  }

  return response.json();
}

async function downloadSDS(sdsId: string, context: string, token: string): Promise<{
  download_url: string;
  filename: string;
  file_size: number;
  mime_type: string;
}> {
  const response = await fetch(`${API_BASE_URL}/sds/safety-data-sheets/${sdsId}/download/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get download URL');
  }

  return response.json();
}

async function fetchSDSStatistics(token: string): Promise<SDSStatistics> {
  const response = await fetch(`${API_BASE_URL}/sds/safety-data-sheets/statistics/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch SDS statistics');
  }

  return response.json();
}

async function fetchExpiringSDS(days: number, token: string): Promise<SafetyDataSheet[]> {
  const response = await fetch(`${API_BASE_URL}/sds/safety-data-sheets/expiring_soon/?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch expiring SDS');
  }

  const data = await response.json();
  return data.results || data;
}

async function uploadSDS(uploadData: SDSUploadRequest, token: string): Promise<{
  message: string;
  sds_id: string;
  document_id: string;
  sds: SafetyDataSheet;
}> {
  const formData = new FormData();
  formData.append('file', uploadData.file);
  formData.append('dangerous_good_id', uploadData.dangerous_good_id);
  formData.append('product_name', uploadData.product_name);
  formData.append('manufacturer', uploadData.manufacturer);
  formData.append('version', uploadData.version);
  formData.append('revision_date', uploadData.revision_date);
  if (uploadData.language) formData.append('language', uploadData.language);
  if (uploadData.country_code) formData.append('country_code', uploadData.country_code);

  const response = await fetch(`${API_BASE_URL}/sds/upload/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload SDS');
  }

  return response.json();
}

// Hooks
export function useSafetyDataSheets(params: SDSSearchParams = {}) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ['safety-data-sheets', params],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return fetchSafetyDataSheets(params, token);
    },
    enabled: !!getToken(),
  });
}

export function useSafetyDataSheet(sdsId: string | null) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ['safety-data-sheet', sdsId],
    queryFn: () => {
      const token = getToken();
      if (!token || !sdsId) throw new Error('No token or SDS ID');
      return fetchSafetyDataSheet(sdsId, token);
    },
    enabled: !!sdsId && !!getToken(),
  });
}

export function useSDSLookup() {
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: (lookupData: SDSLookupRequest) => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return lookupSDS(lookupData, token);
    },
  });
}

export function useSDSDownload() {
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: ({ sdsId, context }: { sdsId: string; context: string }) => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return downloadSDS(sdsId, context, token);
    },
    onSuccess: (data) => {
      // Open download URL
      window.open(data.download_url, '_blank');
    },
  });
}

export function useSDSStatistics() {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ['sds-statistics'],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return fetchSDSStatistics(token);
    },
    enabled: !!getToken(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useExpiringSDS(days: number = 30) {
  const { getToken } = useAuthStore();

  return useQuery({
    queryKey: ['expiring-sds', days],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return fetchExpiringSDS(days, token);
    },
    enabled: !!getToken(),
  });
}

export function useSDSUpload() {
  const queryClient = useQueryClient();
  const { getToken } = useAuthStore();

  return useMutation({
    mutationFn: (uploadData: SDSUploadRequest) => {
      const token = getToken();
      if (!token) throw new Error('No authentication token');
      return uploadSDS(uploadData, token);
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['safety-data-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['sds-statistics'] });
    },
  });
}
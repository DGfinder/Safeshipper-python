interface SDSDocument {
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
  version: string;
  revision_date: string;
  supersedes_version?: string;
  status: string;
  status_display: string;
  expiration_date?: string;
  language: string;
  language_display: string;
  country_code: string;
  regulatory_standard: string;
  emergency_contacts: Record<string, any>;
  flash_point_celsius?: number;
  auto_ignition_temp_celsius?: number;
  physical_state?: string;
  color?: string;
  odor?: string;
  ph_value_min?: number;
  ph_value_max?: number;
  ph_measurement_conditions?: string;
  ph_extraction_confidence?: number;
  ph_source?: string;
  ph_source_display?: string;
  ph_updated_at?: string;
  has_ph_data: boolean;
  ph_value?: number;
  is_corrosive_class_8: boolean;
  ph_classification: string;
  hazard_statements: string[];
  precautionary_statements: string[];
  first_aid_measures: Record<string, any>;
  fire_fighting_measures: Record<string, any>;
  spill_cleanup_procedures: string;
  storage_requirements: string;
  handling_precautions: string;
  disposal_methods: string;
  created_at: string;
  updated_at: string;
  is_expired: boolean;
  is_current: boolean;
  days_until_expiration: number;
}

interface SDSSearchFilters {
  search?: string;
  status?: string;
  language?: string;
  country_code?: string;
  manufacturer?: string;
  hazard_class?: string;
  include_expired?: boolean;
}

interface SDSUploadRequest {
  file: File;
  dangerous_good_id: string;
  product_name: string;
  manufacturer: string;
  version: string;
  revision_date: string;
  language?: string;
  country_code?: string;
}

interface SDSStats {
  total_sds: number;
  active_sds: number;
  expired_sds: number;
  expiring_soon: number;
  by_language: Record<string, number>;
  by_status: Record<string, number>;
  top_manufacturers: Array<[string, number]>;
}

class SDSService {
  private baseUrl = "/api/v1";
  
  private getAuthToken(): string | null {
    try {
      const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
      return authStore.state?.token || null;
    } catch {
      return null;
    }
  }

  async searchSDS(filters: SDSSearchFilters = {}): Promise<{ sds: SDSDocument[]; total: number }> {
    const token = this.getAuthToken();
    
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.language) params.append('language', filters.language);
      if (filters.country_code) params.append('country_code', filters.country_code);
      if (filters.manufacturer) params.append('manufacturer', filters.manufacturer);
      if (filters.hazard_class) params.append('hazard_class', filters.hazard_class);
      if (filters.include_expired) params.append('include_expired', 'true');
      
      const response = await fetch(`${this.baseUrl}/sds/safety-data-sheets/?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`SDS search API failed (${response.status}), falling back to mock data`);
        return this.getMockSDSList(filters);
      }

      const data = await response.json();
      return {
        sds: data.results || [],
        total: data.count || 0
      };
      
    } catch (error) {
      console.warn("SDS search API error, falling back to mock data:", error);
      return this.getMockSDSList(filters);
    }
  }

  async getSDSById(id: string): Promise<SDSDocument | null> {
    const token = this.getAuthToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/sds/safety-data-sheets/${id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`SDS get API failed (${response.status})`);
        return null;
      }

      return response.json();
      
    } catch (error) {
      console.warn("SDS get API error:", error);
      return null;
    }
  }

  async uploadSDS(request: SDSUploadRequest): Promise<{ success: boolean; sds?: SDSDocument; error?: string }> {
    const token = this.getAuthToken();
    
    try {
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('dangerous_good_id', request.dangerous_good_id);
      formData.append('product_name', request.product_name);
      formData.append('manufacturer', request.manufacturer);
      formData.append('version', request.version);
      formData.append('revision_date', request.revision_date);
      
      if (request.language) formData.append('language', request.language);
      if (request.country_code) formData.append('country_code', request.country_code);
      
      const response = await fetch(`${this.baseUrl}/sds/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Upload failed' };
      }

      const data = await response.json();
      return { success: true, sds: data.sds };
      
    } catch (error) {
      console.warn("SDS upload API error:", error);
      return { success: false, error: 'Network error during upload' };
    }
  }

  async downloadSDS(id: string): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
    const token = this.getAuthToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/sds/safety-data-sheets/${id}/download/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: 'GENERAL' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Download failed' };
      }

      const data = await response.json();
      return { 
        success: true, 
        url: data.download_url, 
        filename: data.filename 
      };
      
    } catch (error) {
      console.warn("SDS download API error:", error);
      return { success: false, error: 'Network error during download' };
    }
  }

  async getSDSStats(): Promise<SDSStats> {
    const token = this.getAuthToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/sds/safety-data-sheets/statistics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`SDS stats API failed (${response.status}), falling back to mock data`);
        return this.getMockSDSStats();
      }

      return response.json();
      
    } catch (error) {
      console.warn("SDS stats API error, falling back to mock data:", error);
      return this.getMockSDSStats();
    }
  }

  async searchByChemical(filters: {
    flash_point_min?: number;
    flash_point_max?: number;
    physical_state?: string;
    hazard_code?: string;
  }): Promise<{ sds: SDSDocument[]; total: number }> {
    const token = this.getAuthToken();
    
    try {
      const params = new URLSearchParams();
      
      if (filters.flash_point_min) params.append('flash_point_min', filters.flash_point_min.toString());
      if (filters.flash_point_max) params.append('flash_point_max', filters.flash_point_max.toString());
      if (filters.physical_state) params.append('physical_state', filters.physical_state);
      if (filters.hazard_code) params.append('hazard_code', filters.hazard_code);
      
      const response = await fetch(`${this.baseUrl}/sds/safety-data-sheets/search_by_chemical/?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`SDS chemical search API failed (${response.status})`);
        return { sds: [], total: 0 };
      }

      const data = await response.json();
      return {
        sds: data.results || [],
        total: data.count || 0
      };
      
    } catch (error) {
      console.warn("SDS chemical search API error:", error);
      return { sds: [], total: 0 };
    }
  }

  private getMockSDSList(filters: SDSSearchFilters): { sds: SDSDocument[]; total: number } {
    const mockSDS: SDSDocument[] = [
      {
        id: '1',
        dangerous_good: {
          id: 'dg1',
          un_number: '6484',
          proper_shipping_name: 'Ammonium nitrate',
          hazard_class: '5.1',
          packing_group: 'III'
        },
        product_name: 'Ammonium Nitrate Technical Grade',
        manufacturer: 'Orica Australia Pty Ltd',
        manufacturer_code: 'AN-TG-001',
        version: '2.1',
        revision_date: '2024-01-15',
        status: 'ACTIVE',
        status_display: 'Active',
        language: 'EN',
        language_display: 'English',
        country_code: 'AU',
        regulatory_standard: 'GHS',
        emergency_contacts: {},
        flash_point_celsius: undefined,
        physical_state: 'SOLID',
        color: 'White',
        hazard_statements: ['H272', 'H315'],
        precautionary_statements: ['P220', 'P280'],
        first_aid_measures: {},
        fire_fighting_measures: {},
        spill_cleanup_procedures: '',
        storage_requirements: '',
        handling_precautions: '',
        disposal_methods: '',
        has_ph_data: false,
        is_corrosive_class_8: false,
        ph_classification: 'neutral',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        is_expired: false,
        is_current: true,
        days_until_expiration: 365
      },
      {
        id: '2',
        dangerous_good: {
          id: 'dg2',
          un_number: '1789',
          proper_shipping_name: 'Hydrochloric acid solution',
          hazard_class: '8',
          packing_group: 'III'
        },
        product_name: 'Hydrochloric Acid 32%',
        manufacturer: 'Chemical Solutions Ltd',
        manufacturer_code: 'HCL-32-002',
        version: '1.5',
        revision_date: '2024-01-14',
        status: 'ACTIVE',
        status_display: 'Active',
        language: 'EN',
        language_display: 'English',
        country_code: 'US',
        regulatory_standard: 'GHS',
        emergency_contacts: {},
        flash_point_celsius: undefined,
        physical_state: 'LIQUID',
        color: 'Clear',
        ph_value_min: 0.1,
        ph_value_max: 1.0,
        ph_value: 0.5,
        hazard_statements: ['H314', 'H335'],
        precautionary_statements: ['P260', 'P280', 'P305'],
        first_aid_measures: {},
        fire_fighting_measures: {},
        spill_cleanup_procedures: '',
        storage_requirements: '',
        handling_precautions: '',
        disposal_methods: '',
        has_ph_data: true,
        is_corrosive_class_8: true,
        ph_classification: 'strongly_acidic',
        created_at: '2024-01-14T00:00:00Z',
        updated_at: '2024-01-14T00:00:00Z',
        is_expired: false,
        is_current: true,
        days_until_expiration: 180
      }
    ];

    // Apply filters to mock data
    let filtered = mockSDS;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(sds => 
        sds.product_name.toLowerCase().includes(search) ||
        sds.manufacturer.toLowerCase().includes(search) ||
        sds.dangerous_good.un_number.includes(search)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(sds => sds.status === filters.status);
    }

    if (filters.language) {
      filtered = filtered.filter(sds => sds.language === filters.language);
    }

    return { sds: filtered, total: filtered.length };
  }

  private getMockSDSStats(): SDSStats {
    return {
      total_sds: 47,
      active_sds: 43,
      expired_sds: 2,
      expiring_soon: 5,
      by_language: {
        'EN': 35,
        'FR': 8,
        'ES': 4
      },
      by_status: {
        'ACTIVE': 43,
        'EXPIRED': 2,
        'SUPERSEDED': 2
      },
      top_manufacturers: [
        ['Orica Australia Pty Ltd', 12],
        ['Chemical Solutions Ltd', 8],
        ['Industrial Chemicals Inc', 6],
        ['Safety First Manufacturing', 5],
        ['Global Chemical Corp', 4]
      ]
    };
  }
}

export const sdsService = new SDSService();
export type { SDSDocument, SDSSearchFilters, SDSUploadRequest, SDSStats };
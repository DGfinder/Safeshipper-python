/**
 * POD (Proof of Delivery) Service - Enhanced API interface for POD management
 * Handles POD viewing, analytics, and mobile integration
 */
import { apiHelpers } from './api';

export interface PODPhoto {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size?: number;
  file_size_mb?: number;
  caption?: string;
  taken_at: string;
  metadata?: {
    has_thumbnail: boolean;
    is_large_file: boolean;
    age_hours: number;
  };
}

export interface PODDetails {
  id: string;
  shipment: {
    id: string;
    tracking_number: string;
    customer_name?: string;
    status: string;
    origin_location?: string;
    destination_location?: string;
  };
  delivered_by: {
    id: string;
    name: string;
    email: string;
  };
  delivered_by_name: string;
  delivered_by_email: string;
  delivered_at: string;
  recipient_name: string;
  recipient_signature_url: string;
  delivery_notes?: string;
  delivery_location?: string;
  photos: PODPhoto[];
  photo_count: number;
  created_at: string;
  updated_at: string;
}

export interface PODSummaryData {
  summary: {
    total_pods: number;
    total_photos: number;
    avg_photos_per_pod: number;
    weekly_growth: number;
    signature_capture_rate: number;
    period_days: number;
  };
  top_locations: Array<{
    location: string;
    count: number;
  }>;
  driver_performance: Array<{
    driver_id: string;
    driver_name: string;
    deliveries: number;
    avg_photos: number;
  }>;
  daily_trend: Array<{
    date: string;
    deliveries: number;
  }>;
  period_info: {
    start_date: string;
    end_date: string;
    days_included: number;
  };
}

export interface PODAnalytics {
  summary: {
    total_pods: number;
    total_photos: number;
    avg_photos_per_pod: number;
    photo_compliance_rate: number;
    signature_capture_rate: number;
    period_days: number;
  };
  trends: {
    current_week_deliveries: number;
    previous_week_deliveries: number;
    week_over_week_change: number;
    hourly_distribution: Record<string, number>;
  };
  performance: {
    top_drivers: Array<{
      driver_id: string;
      name: string;
      deliveries: number;
      photos_captured: number;
      avg_delivery_hour: number;
    }>;
  };
  locations: Array<{
    location: string;
    delivery_count: number;
    avg_photos: number;
  }>;
}

export interface PODListFilters {
  delivered_at__gte?: string;
  delivered_at__lte?: string;
  delivered_by?: string;
  shipment__customer?: string;
  shipment__status?: string;
  delivery_location__icontains?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedPODResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PODDetails[];
}

export class PODService {
  private static baseUrl = '/shipments/api/pods';
  private static shipmentBaseUrl = '/shipments/api';

  // ============================================================================
  // POD LISTING & DETAILS
  // ============================================================================

  /**
   * Get paginated list of PODs with filtering
   */
  static async getPODs(filters?: PODListFilters): Promise<PaginatedPODResponse> {
    const params = {
      page_size: 20,
      ...filters
    };
    return apiHelpers.get(`${this.baseUrl}/`, params);
  }

  /**
   * Get specific POD details
   */
  static async getPODDetails(podId: string): Promise<PODDetails> {
    return apiHelpers.get(`${this.baseUrl}/${podId}/`);
  }

  /**
   * Get POD details for a specific shipment
   */
  static async getPODByShipment(shipmentId: string): Promise<{
    has_pod: boolean;
    pod_details?: PODDetails;
    message?: string;
    error?: string;
  }> {
    return apiHelpers.get(`${this.shipmentBaseUrl}/${shipmentId}/pod-details/`);
  }

  /**
   * Get photos for a specific POD
   */
  static async getPODPhotos(podId: string): Promise<{
    pod_id: string;
    shipment_tracking: string;
    total_photos: number;
    total_size_mb: number;
    photos: PODPhoto[];
  }> {
    return apiHelpers.get(`${this.baseUrl}/${podId}/photos/`);
  }

  // ============================================================================
  // ANALYTICS & REPORTING
  // ============================================================================

  /**
   * Get POD analytics for dashboard
   */
  static async getPODAnalytics(days: number = 30): Promise<PODAnalytics> {
    return apiHelpers.get(`${this.baseUrl}/analytics/`, { days });
  }

  /**
   * Get POD summary for shipment dashboard
   */
  static async getPODSummary(days: number = 30): Promise<PODSummaryData> {
    return apiHelpers.get(`${this.shipmentBaseUrl}/pods-summary/`, { days });
  }

  /**
   * Export POD data as CSV
   */
  static async exportPODs(filters?: PODListFilters): Promise<Blob> {
    const params = filters || {};
    
    const response = await fetch(`${this.baseUrl}/export/?${new URLSearchParams(params as any)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export POD data');
    }

    return response.blob();
  }

  // ============================================================================
  // MOBILE POD SUBMISSION
  // ============================================================================

  /**
   * Submit proof of delivery from mobile app
   */
  static async submitPOD(
    shipmentId: string,
    podData: {
      recipient_name: string;
      delivery_notes?: string;
      delivery_location?: string;
      signature_file: string;
      photos_data?: Array<{
        image_url: string;
        file_name: string;
        file_size?: number;
        caption?: string;
      }>;
    }
  ): Promise<{
    success: boolean;
    id?: string;
    pod_summary?: any;
    error?: string;
  }> {
    return apiHelpers.post(`${this.shipmentBaseUrl}/${shipmentId}/submit-pod/`, podData);
  }

  /**
   * Validate POD data before submission
   */
  static async validatePODData(
    shipmentId: string,
    podData: {
      recipient_name: string;
      signature_file: string;
      delivery_notes?: string;
      delivery_location?: string;
      photos_data?: any[];
    }
  ): Promise<{
    can_submit_pod: boolean;
    shipment_validation: any;
    data_validation: any;
    overall_status: 'valid' | 'invalid';
  }> {
    return apiHelpers.post(`${this.shipmentBaseUrl}/${shipmentId}/validate-pod-data/`, podData);
  }

  // ============================================================================
  // SEARCH & FILTERING
  // ============================================================================

  /**
   * Search PODs by various criteria
   */
  static async searchPODs(query: string, filters?: Partial<PODListFilters>): Promise<PaginatedPODResponse> {
    const searchParams = {
      search: query,
      page_size: 50,
      ...filters
    };
    return this.getPODs(searchParams);
  }

  /**
   * Get PODs by date range
   */
  static async getPODsByDateRange(
    startDate: string,
    endDate: string,
    additionalFilters?: Partial<PODListFilters>
  ): Promise<PaginatedPODResponse> {
    const filters = {
      delivered_at__gte: startDate,
      delivered_at__lte: endDate,
      ...additionalFilters
    };
    return this.getPODs(filters);
  }

  /**
   * Get PODs by driver
   */
  static async getPODsByDriver(driverId: string, days?: number): Promise<PaginatedPODResponse> {
    const filters: PODListFilters = {
      delivered_by: driverId
    };

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      filters.delivered_at__gte = startDate.toISOString().split('T')[0];
    }

    return this.getPODs(filters);
  }

  /**
   * Get PODs by customer
   */
  static async getPODsByCustomer(customerId: string, days?: number): Promise<PaginatedPODResponse> {
    const filters: PODListFilters = {
      shipment__customer: customerId
    };

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      filters.delivered_at__gte = startDate.toISOString().split('T')[0];
    }

    return this.getPODs(filters);
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get POD status summary for a list of shipments
   */
  static async getPODStatusBatch(shipmentIds: string[]): Promise<Record<string, boolean>> {
    // This would need a batch endpoint on the backend
    // For now, we'll implement it client-side (not efficient for large lists)
    const statuses: Record<string, boolean> = {};
    
    for (const shipmentId of shipmentIds.slice(0, 10)) { // Limit to prevent too many requests
      try {
        const result = await this.getPODByShipment(shipmentId);
        statuses[shipmentId] = result.has_pod;
      } catch (error) {
        statuses[shipmentId] = false;
      }
    }
    
    return statuses;
  }

  /**
   * Download POD photo
   */
  static async downloadPhoto(photoUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download photo:', error);
      throw new Error('Failed to download photo');
    }
  }

  /**
   * Format POD for display
   */
  static formatPODForDisplay(pod: PODDetails): {
    id: string;
    shipment_tracking: string;
    customer_name: string;
    recipient: string;
    delivered_by: string;
    delivered_at: string;
    delivery_location: string;
    photo_count: number;
    has_signature: boolean;
    days_ago: number;
  } {
    const deliveredDate = new Date(pod.delivered_at);
    const daysAgo = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: pod.id,
      shipment_tracking: pod.shipment.tracking_number,
      customer_name: pod.shipment.customer_name || 'Unknown Customer',
      recipient: pod.recipient_name,
      delivered_by: pod.delivered_by_name,
      delivered_at: deliveredDate.toLocaleDateString(),
      delivery_location: pod.delivery_location || 'Not specified',
      photo_count: pod.photo_count,
      has_signature: !!pod.recipient_signature_url,
      days_ago: daysAgo
    };
  }

  /**
   * Get POD quality score based on completeness
   */
  static calculatePODQualityScore(pod: PODDetails): {
    score: number;
    factors: string[];
    grade: 'A' | 'B' | 'C' | 'D';
  } {
    let score = 0;
    const factors: string[] = [];

    // Base requirements (40 points)
    if (pod.recipient_name) {
      score += 20;
      factors.push('Recipient name captured');
    }
    if (pod.recipient_signature_url) {
      score += 20;
      factors.push('Signature captured');
    }

    // Photos (30 points)
    if (pod.photo_count > 0) {
      score += 15;
      factors.push(`${pod.photo_count} photo(s) captured`);
      
      if (pod.photo_count >= 2) {
        score += 15;
        factors.push('Multiple photos for verification');
      }
    }

    // Additional details (30 points)
    if (pod.delivery_location) {
      score += 10;
      factors.push('Delivery location specified');
    }
    if (pod.delivery_notes) {
      score += 10;
      factors.push('Delivery notes provided');
    }
    if (pod.photos.some(p => p.caption)) {
      score += 10;
      factors.push('Photo descriptions provided');
    }

    let grade: 'A' | 'B' | 'C' | 'D';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else grade = 'D';

    return { score, factors, grade };
  }
}

export default PODService;
import { simulatedDataService } from './simulatedDataService';

interface DashboardStats {
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
  note?: string;
}

interface RecentShipment {
  id: string;
  identifier: string;
  origin: string;
  destination: string;
  status: string;
  progress: number;
  dangerous_goods: string[];
  hazchem_code: string;
  created_at: string;
}

interface RecentShipmentsResponse {
  shipments: RecentShipment[];
  total: number;
  limit: number;
  last_updated: string;
  note?: string;
}

class DashboardService {
  private baseUrl = "/api/v1";
  
  private getAuthToken(): string | null {
    try {
      const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
      return authStore.state?.token || null;
    } catch {
      return null;
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const token = this.getAuthToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Dashboard stats API failed (${response.status}), falling back to mock data`);
        return this.getMockDashboardStats();
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.warn("Dashboard stats API error, falling back to mock data:", error);
      return this.getMockDashboardStats();
    }
  }

  async getRecentShipments(limit: number = 10): Promise<RecentShipmentsResponse> {
    const token = this.getAuthToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/recent-shipments/?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Recent shipments API failed (${response.status}), falling back to mock data`);
        return this.getMockRecentShipments();
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.warn("Recent shipments API error, falling back to mock data:", error);
      return this.getMockRecentShipments();
    }
  }

  private getMockDashboardStats(): DashboardStats {
    return simulatedDataService.getDashboardStats();
  }

  private getMockRecentShipments(): RecentShipmentsResponse {
    return simulatedDataService.getRecentShipments();
  }
}

export const dashboardService = new DashboardService();
export type { DashboardStats, RecentShipment, RecentShipmentsResponse };
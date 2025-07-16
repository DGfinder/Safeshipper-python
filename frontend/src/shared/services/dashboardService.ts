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
    return {
      totalShipments: 2847,
      pendingReviews: 43,
      complianceRate: 98.7,
      activeRoutes: 156,
      trends: {
        shipments_change: '+12.5%',
        weekly_shipments: 324,
        compliance_trend: '+2.1%',
        routes_change: '+5.3%'
      },
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        days: 30
      },
      last_updated: new Date().toISOString(),
      note: 'Using mock data - backend integration in progress'
    };
  }

  private getMockRecentShipments(): RecentShipmentsResponse {
    return {
      shipments: [
        {
          id: '1',
          identifier: 'VOL-873454',
          origin: 'Sicily, Italy',
          destination: 'Tallin, EST',
          status: 'IN_TRANSIT',
          progress: 88,
          dangerous_goods: ['Class 3', 'Class 8'],
          hazchem_code: '3YE',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          identifier: 'VOL-349576',
          origin: 'Rotterdam',
          destination: 'Brussels, Belgium',
          status: 'IN_TRANSIT',
          progress: 32,
          dangerous_goods: ['Class 2', 'Class 9'],
          hazchem_code: '3YE',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          identifier: 'VOL-892113',
          origin: 'Hamburg, Germany',
          destination: 'Stockholm, Sweden',
          status: 'PENDING_REVIEW',
          progress: 15,
          dangerous_goods: ['Class 6', 'Class 3'],
          hazchem_code: '2XE',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          identifier: 'VOL-445672',
          origin: 'Barcelona, Spain',
          destination: 'Marseille, France',
          status: 'DELIVERED',
          progress: 100,
          dangerous_goods: ['Class 1'],
          hazchem_code: '1X',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '5',
          identifier: 'VOL-778432',
          origin: 'Amsterdam, Netherlands',
          destination: 'Copenhagen, Denmark',
          status: 'IN_TRANSIT',
          progress: 65,
          dangerous_goods: ['Class 4', 'Class 9'],
          hazchem_code: '4WE',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        }
      ],
      total: 5,
      limit: 10,
      last_updated: new Date().toISOString(),
      note: 'Using mock data - backend integration in progress'
    };
  }
}

export const dashboardService = new DashboardService();
export type { DashboardStats, RecentShipment, RecentShipmentsResponse };
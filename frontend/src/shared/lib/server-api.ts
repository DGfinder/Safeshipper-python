import { cache } from "react";

const API_BASE_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Server-side API client with caching
export const serverApi = {
  // Cache dashboard stats for 1 minute
  getDashboardStats: cache(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats/`, {
        next: { revalidate: 60 }, // Revalidate every 60 seconds
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Server API Error - Dashboard Stats:", error);
      // Return fallback data
      return {
        totalShipments: 156,
        pendingReviews: 23,
        complianceRate: 94.2,
        activeRoutes: 12,
        trends: {
          shipments_change: "+12.3%",
          compliance_trend: "+2.1%", 
          routes_change: "+8.7%"
        }
      };
    }
  }),

  // Cache fleet status for 2 minutes  
  getFleetStatus: cache(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vehicles/fleet-status/`, {
        next: { revalidate: 120 },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch fleet status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Server API Error - Fleet Status:", error);
      return {
        active: 28,
        maintenance: 7,
        offline: 5,
        total: 40
      };
    }
  }),

  // Cache recent shipments for 30 seconds
  getRecentShipments: cache(async (limit: number = 5) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shipments/?limit=${limit}`, {
        next: { revalidate: 30 },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recent shipments: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Server API Error - Recent Shipments:", error);
      return {
        shipments: [
          {
            id: "1",
            identifier: "SS-2024-001234",
            origin: "Perth, WA",
            destination: "Adelaide, SA", 
            dangerous_goods: ["UN1203", "UN1863"],
            hazchem_code: "3YE",
            progress: 65
          },
          {
            id: "2", 
            identifier: "SS-2024-001235",
            origin: "Brisbane, QLD",
            destination: "Darwin, NT",
            dangerous_goods: ["UN1428"],
            hazchem_code: "4W",
            progress: 23
          }
        ],
        total: 156
      };
    }
  }),

  // Cache inspection stats for 5 minutes
  getInspectionStats: cache(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inspections/stats/`, {
        next: { revalidate: 300 },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inspection stats: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Server API Error - Inspection Stats:", error);
      return {
        pass_rate: 94.2,
        completed_today: 12,
        failed_count: 3,
        pending_count: 8
      };
    }
  }),

  // Cache POD stats for 5 minutes
  getPODStats: cache(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shipments/pod-stats/`, {
        next: { revalidate: 300 },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch POD stats: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Server API Error - POD Stats:", error);
      return {
        capture_rate: 87.3,
        digital_signatures: 234,
        photos_captured: 156,
        avg_response_time_hours: 2.4
      };
    }
  }),

  // Cache company metadata for 1 hour
  getCompanyMetadata: cache(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/company/metadata/`, {
        next: { revalidate: 3600 },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch company metadata: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Server API Error - Company Metadata:", error);
      return {
        name: "OutbackHaul Transport Operations",
        description: "Road Train & Dangerous Goods Specialist",
        location: "Perth, WA",
        fleet_size: 40,
        established: 1987
      };
    }
  })
};

// Type definitions for server API responses
export interface DashboardStats {
  totalShipments: number;
  pendingReviews: number;
  complianceRate: number;
  activeRoutes: number;
  trends: {
    shipments_change: string;
    compliance_trend: string;
    routes_change: string;
  };
}

export interface FleetStatus {
  active: number;
  maintenance: number;
  offline: number;
  total: number;
}

export interface RecentShipment {
  id: string;
  identifier: string;
  origin: string;
  destination: string;
  dangerous_goods: string[];
  hazchem_code: string;
  progress: number;
}

export interface RecentShipmentsResponse {
  shipments: RecentShipment[];
  total: number;
}

export interface InspectionStats {
  pass_rate: number;
  completed_today: number;
  failed_count: number;
  pending_count: number;
}

export interface PODStats {
  capture_rate: number;
  digital_signatures: number;
  photos_captured: number;
  avg_response_time_hours: number;
}

export interface CompanyMetadata {
  name: string;
  description: string;
  location: string;
  fleet_size: number;
  established: number;
}
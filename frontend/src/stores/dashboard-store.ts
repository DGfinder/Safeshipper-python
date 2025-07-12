import { create } from "zustand";

interface DashboardState {
  stats: {
    totalShipments: number;
    pendingReviews: number;
    complianceRate: number;
    activeRoutes: number;
  };
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: {
    totalShipments: 0,
    pendingReviews: 0,
    complianceRate: 0,
    activeRoutes: 0,
  },
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/v1/dashboard/stats/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();

      const stats = {
        totalShipments: data.totalShipments,
        pendingReviews: data.pendingReviews,
        complianceRate: data.complianceRate,
        activeRoutes: data.activeRoutes,
      };

      set({ stats, isLoading: false });
    } catch (error) {
      console.error("Dashboard stats error:", error);

      // Fallback to mock data if API fails
      const fallbackStats = {
        totalShipments: 2847,
        pendingReviews: 43,
        complianceRate: 98.7,
        activeRoutes: 156,
      };

      set({
        stats: fallbackStats,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
        isLoading: false,
      });
    }
  },
}));

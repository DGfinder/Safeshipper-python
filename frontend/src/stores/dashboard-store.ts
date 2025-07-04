import { create } from 'zustand';

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data - in real app, this would come from API
      const mockStats = {
        totalShipments: 2847,
        pendingReviews: 43,
        complianceRate: 98.7,
        activeRoutes: 156,
      };
      
      set({ stats: mockStats, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        isLoading: false 
      });
    }
  },
}));
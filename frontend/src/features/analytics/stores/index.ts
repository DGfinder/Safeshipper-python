// Analytics Feature Stores

import { create } from 'zustand';
import { AnalyticsInsight, AnalyticsTrend, AnalyticsRecommendation } from '../types';

interface AnalyticsState {
  insights: AnalyticsInsight[];
  trends: AnalyticsTrend[];
  recommendations: AnalyticsRecommendation[];
  selectedInsight: AnalyticsInsight | null;
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsActions {
  setInsights: (insights: AnalyticsInsight[]) => void;
  setTrends: (trends: AnalyticsTrend[]) => void;
  setRecommendations: (recommendations: AnalyticsRecommendation[]) => void;
  setSelectedInsight: (insight: AnalyticsInsight | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
}

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>((set) => ({
  // State
  insights: [],
  trends: [],
  recommendations: [],
  selectedInsight: null,
  isLoading: false,
  error: null,

  // Actions
  setInsights: (insights) => set({ insights }),
  setTrends: (trends) => set({ trends }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setSelectedInsight: (insight) => set({ selectedInsight: insight }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearData: () => set({
    insights: [],
    trends: [],
    recommendations: [],
    selectedInsight: null,
    error: null,
  }),
}));
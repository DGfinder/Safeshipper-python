// Analytics Feature Types

export interface AnalyticsInsight {
  id: string;
  type: 'predictive' | 'anomaly' | 'optimization' | 'compliance' | 'trend';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  timeframe: string;
  actionItems: string[];
  metrics: Record<string, any>;
  lastUpdated: string;
}

export interface AnalyticsTrend {
  id: string;
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
  period: string;
  category: string;
}

export interface AnalyticsRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings: number;
  timeToImplement: string;
  category: string;
}

export interface AnalyticsFilters {
  searchTerm: string;
  filterType: string;
  filterImpact: string;
  filterCategory: string;
  selectedTimeframe: string;
}
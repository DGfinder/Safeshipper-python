// Analytics Feature Hooks

import { useState, useEffect } from 'react';
import { AnalyticsFilters, AnalyticsInsight } from '../types';

export const useAnalyticsFilters = () => {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    searchTerm: '',
    filterType: 'all',
    filterImpact: 'all',
    filterCategory: 'all',
    selectedTimeframe: '30d',
  });

  const updateFilter = (key: keyof AnalyticsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return { filters, updateFilter, setFilters };
};

export const useAnalyticsData = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return { isLoading, handleRefreshData };
};

export const useAnalyticsInsights = (insights: AnalyticsInsight[], filters: AnalyticsFilters) => {
  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         insight.description.toLowerCase().includes(filters.searchTerm.toLowerCase());
    const matchesType = filters.filterType === 'all' || insight.type === filters.filterType;
    const matchesImpact = filters.filterImpact === 'all' || insight.impact === filters.filterImpact;
    const matchesCategory = filters.filterCategory === 'all' || insight.category === filters.filterCategory;
    return matchesSearch && matchesType && matchesImpact && matchesCategory;
  });

  return { filteredInsights };
};
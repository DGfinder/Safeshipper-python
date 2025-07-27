// Analytics Feature Utils

import { AnalyticsInsight, AnalyticsTrend } from '../types';

export const getTypeIcon = (type: string) => {
  const iconMap = {
    predictive: 'Brain',
    anomaly: 'AlertTriangle',
    optimization: 'Target',
    compliance: 'Shield',
    trend: 'TrendingUp',
  };
  return iconMap[type as keyof typeof iconMap] || 'Lightbulb';
};

export const getImpactColor = (impact: string) => {
  const colorMap = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-green-50 text-green-700 border-green-200',
  };
  return colorMap[impact as keyof typeof colorMap] || 'bg-gray-50 text-gray-700 border-gray-200';
};

export const getPriorityColor = (priority: string) => {
  const colorMap = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-green-50 text-green-700 border-green-200',
  };
  return colorMap[priority as keyof typeof colorMap] || 'bg-gray-50 text-gray-700 border-gray-200';
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

export const calculateTrendDirection = (trend: AnalyticsTrend) => {
  return trend.change > 0 ? 'up' : 'down';
};

export const formatTrendValue = (trend: AnalyticsTrend) => {
  switch (trend.category) {
    case 'volume':
      return trend.value.toLocaleString();
    case 'performance':
      return `${trend.value} days`;
    default:
      return `${trend.value}%`;
  }
};

export const getInsightMetrics = (insight: AnalyticsInsight) => {
  const { metrics } = insight;
  
  switch (insight.type) {
    case 'predictive':
      return {
        current: metrics.current,
        predicted: metrics.predicted,
        variance: metrics.variance,
      };
    case 'optimization':
      return {
        current: metrics.current,
        optimized: metrics.optimized,
        savings: metrics.savings,
      };
    case 'compliance':
      return {
        total: metrics.total,
        expiring: metrics.expiring,
        percentage: metrics.percentage,
      };
    default:
      return metrics;
  }
};
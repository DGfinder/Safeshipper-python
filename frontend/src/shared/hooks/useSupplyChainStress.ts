// useSupplyChainStress.ts
// React hooks for supply chain stress monitoring and early warning system

import { useQuery } from '@tanstack/react-query';
import { 
  supplyChainStressService,
  StressIndicator,
  SupplyChainAlert,
  NetworkResilienceMetrics,
  EconomicStressFactors,
  EnvironmentalStressFactors,
} from '@/shared/services/supplyChainStressService';

// Hook for current stress indicators across all categories
export function useStressIndicators() {
  return useQuery({
    queryKey: ['stressIndicators'],
    queryFn: () => supplyChainStressService.generateStressIndicators(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}

// Hook for specific category stress indicator
export function useStressIndicatorByCategory(category: string) {
  return useQuery({
    queryKey: ['stressIndicator', category],
    queryFn: async () => {
      const indicators = supplyChainStressService.generateStressIndicators();
      return indicators.find(indicator => indicator.category === category);
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for current supply chain alerts
export function useSupplyChainAlerts() {
  return useQuery({
    queryKey: ['supplyChainAlerts'],
    queryFn: () => supplyChainStressService.generateSupplyChainAlerts(),
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes for alerts
    staleTime: 1 * 60 * 1000, // Consider alerts stale after 1 minute
  });
}

// Hook for critical alerts only
export function useCriticalAlerts() {
  return useQuery({
    queryKey: ['criticalAlerts'],
    queryFn: async () => {
      const alerts = supplyChainStressService.generateSupplyChainAlerts();
      return alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'emergency');
    },
    refetchInterval: 1 * 60 * 1000, // Refetch every minute for critical alerts
    staleTime: 30 * 1000, // Consider critical alerts stale after 30 seconds
  });
}

// Hook for network resilience metrics
export function useNetworkResilienceMetrics() {
  return useQuery({
    queryKey: ['networkResilience'],
    queryFn: () => supplyChainStressService.generateNetworkResilienceMetrics(),
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    staleTime: 10 * 60 * 1000, // Consider data stale after 10 minutes
  });
}

// Hook for economic stress factors
export function useEconomicStressFactors() {
  return useQuery({
    queryKey: ['economicStressFactors'],
    queryFn: () => supplyChainStressService.generateEconomicStressFactors(),
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
    staleTime: 20 * 60 * 1000, // Consider data stale after 20 minutes
  });
}

// Hook for environmental stress factors
export function useEnvironmentalStressFactors() {
  return useQuery({
    queryKey: ['environmentalStressFactors'],
    queryFn: () => supplyChainStressService.generateEnvironmentalStressFactors(),
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
    staleTime: 20 * 60 * 1000, // Consider data stale after 20 minutes
  });
}

// Hook for overall system health score
export function useSystemHealthScore() {
  return useQuery({
    queryKey: ['systemHealthScore'],
    queryFn: async () => {
      const indicators = supplyChainStressService.generateStressIndicators();
      return supplyChainStressService.calculateSystemHealthScore(indicators);
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}

// Hook for stress indicators summary (aggregated view)
export function useStressIndicatorsSummary() {
  return useQuery({
    queryKey: ['stressIndicatorsSummary'],
    queryFn: async () => {
      const indicators = supplyChainStressService.generateStressIndicators();
      
      const summary = {
        totalIndicators: indicators.length,
        criticalCount: indicators.filter(i => i.status === 'critical').length,
        highCount: indicators.filter(i => i.status === 'high').length,
        elevatedCount: indicators.filter(i => i.status === 'elevated').length,
        normalCount: indicators.filter(i => i.status === 'normal').length,
        averageStressLevel: Math.round(
          indicators.reduce((sum, i) => sum + i.currentLevel, 0) / indicators.length
        ),
        deterioratingCount: indicators.filter(i => i.trend === 'deteriorating').length,
        improvingCount: indicators.filter(i => i.trend === 'improving').length,
        volatileCount: indicators.filter(i => i.trend === 'volatile').length,
        mostCriticalCategory: indicators
          .sort((a, b) => b.currentLevel - a.currentLevel)[0]?.category,
        totalEstimatedImpact: indicators.reduce(
          (sum, i) => sum + i.estimatedImpact.estimatedFinancialImpact, 0
        ),
        totalAffectedShipments: indicators.reduce(
          (sum, i) => sum + i.estimatedImpact.affectedShipments, 0
        ),
        averageRecoveryTime: Math.round(
          indicators.reduce((sum, i) => sum + i.estimatedImpact.recoveryTimeEstimate, 0) / indicators.length
        ),
        systemHealthScore: supplyChainStressService.calculateSystemHealthScore(indicators),
      };

      return summary;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for stress trends analysis
export function useStressTrendsAnalysis() {
  return useQuery({
    queryKey: ['stressTrends'],
    queryFn: async () => {
      const indicators = supplyChainStressService.generateStressIndicators();
      
      // Analyze trends across categories
      const trendAnalysis = indicators.map(indicator => {
        const recentData = indicator.historicalData.slice(-24); // Last 24 hours
        const trend = recentData.length > 1 
          ? recentData[recentData.length - 1].value - recentData[0].value
          : 0;
        
        return {
          category: indicator.category,
          name: indicator.name,
          currentLevel: indicator.currentLevel,
          trend24h: trend,
          trendDirection: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
          volatility: Math.random() * 50 + 10, // Simulated volatility
          predictedLevel: indicator.currentLevel + (trend * 0.5), // Simple prediction
        };
      });

      return {
        indicators: trendAnalysis,
        overallTrend: trendAnalysis.reduce((sum, t) => sum + t.trend24h, 0) / trendAnalysis.length,
        mostVolatile: trendAnalysis.sort((a, b) => b.volatility - a.volatility)[0],
        fastestDeterioration: trendAnalysis
          .filter(t => t.trend24h > 0)
          .sort((a, b) => b.trend24h - a.trend24h)[0],
        fastestImprovement: trendAnalysis
          .filter(t => t.trend24h < 0)
          .sort((a, b) => a.trend24h - b.trend24h)[0],
      };
    },
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    staleTime: 5 * 60 * 1000,
  });
}

// Helper function to calculate volatility
function calculateVolatility(data: { value: number }[]): number {
  if (data.length < 2) return 0;
  
  const values = data.map(d => d.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

// Hook for early warning alerts
export function useEarlyWarningAlerts() {
  return useQuery({
    queryKey: ['earlyWarningAlerts'],
    queryFn: async () => {
      const alerts = supplyChainStressService.generateSupplyChainAlerts();
      const indicators = supplyChainStressService.generateStressIndicators();
      
      // Generate early warnings based on indicators approaching thresholds
      const earlyWarnings = indicators
        .filter(indicator => {
          const thresholdProximity = indicator.currentLevel / indicator.threshold;
          return thresholdProximity > 0.8 && indicator.status !== 'critical';
        })
        .map(indicator => ({
          id: `EARLY-${indicator.id}`,
          type: 'early_warning' as const,
          message: `${indicator.name} approaching critical threshold (${indicator.currentLevel}/${indicator.threshold})`,
          indicator: indicator.category,
          currentLevel: indicator.currentLevel,
          threshold: indicator.threshold,
          timeToThreshold: Math.floor(Math.random() * 24) + 1, // Simulated hours
          recommendedActions: indicator.mitigationStrategies.slice(0, 2).map(s => s.strategy),
        }));

      return {
        currentAlerts: alerts,
        earlyWarnings,
        totalWarnings: alerts.length + earlyWarnings.length,
        highPriorityCount: alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length,
      };
    },
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    staleTime: 1 * 60 * 1000,
  });
}

// Helper function to estimate time to threshold
function estimateTimeToThreshold(indicator: StressIndicator): number {
  if (indicator.trend === 'improving' || indicator.trend === 'stable') {
    return -1; // Not approaching threshold
  }
  
  const recentData = indicator.historicalData.slice(-12); // Last 12 hours
  if (recentData.length < 2) return -1;
  
  const avgIncrease = recentData.slice(1).reduce((sum, point, index) => {
    return sum + (point.value - recentData[index].value);
  }, 0) / (recentData.length - 1);
  
  if (avgIncrease <= 0) return -1;
  
  const remainingToThreshold = indicator.threshold - indicator.currentLevel;
  return Math.round(remainingToThreshold / avgIncrease); // Hours to threshold
}
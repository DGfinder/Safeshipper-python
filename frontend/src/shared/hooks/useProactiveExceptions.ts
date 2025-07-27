// useProactiveExceptions.ts
// React hooks for proactive exception management and AI-powered issue resolution

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  proactiveExceptionService, 
  Exception, 
  ExceptionPattern,
  AIInsight,
  ProactiveAlert,
  SuggestedAction,
  AutoResolutionAttempt 
} from "@/shared/services/proactiveExceptionService";

// Hook for active exceptions
export function useActiveExceptions() {
  return useQuery({
    queryKey: ["active-exceptions"],
    queryFn: async (): Promise<Exception[]> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      return proactiveExceptionService.generateActiveExceptions();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes for real-time monitoring
  });
}

// Hook for exception patterns and analytics
export function useExceptionPatterns() {
  return useQuery({
    queryKey: ["exception-patterns"],
    queryFn: async (): Promise<ExceptionPattern[]> => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return proactiveExceptionService.generateExceptionPatterns();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for AI insights and recommendations
export function useAIInsights() {
  return useQuery({
    queryKey: ["ai-insights"],
    queryFn: async (): Promise<AIInsight[]> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return proactiveExceptionService.generateAIInsights();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for proactive alerts
export function useProactiveAlerts() {
  return useQuery({
    queryKey: ["proactive-alerts"],
    queryFn: async (): Promise<ProactiveAlert[]> => {
      await new Promise(resolve => setTimeout(resolve, 400));
      return proactiveExceptionService.generateProactiveAlerts();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes for timely alerts
  });
}

// Hook for system performance metrics
export function useSystemPerformance() {
  return useQuery({
    queryKey: ["system-performance"],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return proactiveExceptionService.getSystemPerformance();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for exception dashboard summary
export function useExceptionDashboard() {
  const { data: exceptions, isLoading: exceptionsLoading } = useActiveExceptions();
  const { data: alerts, isLoading: alertsLoading } = useProactiveAlerts();
  const { data: performance, isLoading: performanceLoading } = useSystemPerformance();

  const summary = exceptions && alerts && performance ? {
    totalActiveExceptions: exceptions.length,
    criticalExceptions: exceptions.filter(e => e.severity === 'critical').length,
    highPriorityExceptions: exceptions.filter(e => e.severity === 'high').length,
    autoResolvingExceptions: exceptions.filter(e => e.status === 'resolving' && 
      e.autoResolutionAttempts.length > 0).length,
    totalAlerts: alerts.length,
    urgentAlerts: alerts.filter(a => a.urgency === 'urgent' || a.urgency === 'critical').length,
    potentialSavings: alerts.reduce((sum, a) => sum + a.potentialSavings, 0),
    averageConfidence: Math.round(
      exceptions.reduce((sum, e) => sum + e.confidence, 0) / exceptions.length
    ),
    resolutionRate: performance.autoResolutionRate,
    customerImpactPrevented: performance.customerImpactPrevented,
    monthlySavings: performance.costSavings,
  } : null;

  return {
    summary,
    exceptions,
    alerts,
    performance,
    isLoading: exceptionsLoading || alertsLoading || performanceLoading,
  };
}

// Hook for exception analytics
export function useExceptionAnalytics() {
  const { data: exceptions } = useActiveExceptions();
  const { data: patterns } = useExceptionPatterns();

  const analytics = exceptions && patterns ? {
    exceptionsByType: exceptions.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    exceptionsBySeverity: exceptions.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    exceptionsByStatus: exceptions.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    averageResolutionTime: Math.round(
      exceptions.reduce((sum, e) => sum + e.estimatedResolutionTime, 0) / exceptions.length
    ),
    totalFinancialImpact: exceptions.reduce((sum, e) => sum + e.predictedImpact.financialImpact, 0),
    autoResolutionSuccess: exceptions.filter(e => 
      e.autoResolutionAttempts.some(a => a.result === 'success')
    ).length,
    mostCommonType: Object.entries(
      exceptions.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a)[0]?.[0],
    patternInsights: patterns.map(p => ({
      type: p.type,
      frequency: p.frequency,
      costAvoidance: p.costAvoidance,
      preventionSuccess: p.preventionSuccess,
    })),
  } : null;

  return {
    analytics,
    isLoading: !exceptions || !patterns,
  };
}

// Hook for exception timeline
export function useExceptionTimeline() {
  const { data: exceptions } = useActiveExceptions();

  const timeline = exceptions ? exceptions.map(exception => ({
    id: exception.id,
    timestamp: exception.detectedAt,
    title: exception.title,
    type: exception.type,
    severity: exception.severity,
    status: exception.status,
    autoResolutionAttempts: exception.autoResolutionAttempts.length,
    estimatedResolution: new Date(
      new Date(exception.detectedAt).getTime() + 
      exception.estimatedResolutionTime * 60 * 1000
    ).toISOString(),
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];

  return {
    timeline,
    isLoading: !exceptions,
  };
}

// Mutation for manually resolving exceptions
export function useResolveException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      exceptionId: string;
      resolutionMethod: string;
      notes?: string;
    }) => {
      // Simulate API call to resolve exception
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        exceptionId: data.exceptionId,
        resolvedAt: new Date().toISOString(),
        resolutionMethod: data.resolutionMethod,
      };
    },
    onSuccess: () => {
      // Invalidate exceptions query to refresh data
      queryClient.invalidateQueries({ queryKey: ["active-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["system-performance"] });
    },
  });
}

// Mutation for implementing suggested actions
export function useImplementAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      exceptionId: string;
      actionId: string;
      autoImplement: boolean;
    }) => {
      // Simulate API call to implement action
      const delay = data.autoImplement ? 500 : 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return {
        success: true,
        actionId: data.actionId,
        implementedAt: new Date().toISOString(),
        estimatedEffectiveness: Math.floor(Math.random() * 20) + 70, // 70-90%
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-exceptions"] });
    },
  });
}

// Mutation for dismissing alerts
export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, alertId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proactive-alerts"] });
    },
  });
}

// Hook for real-time exception monitoring
export function useRealTimeMonitoring() {
  const { data: exceptions } = useActiveExceptions();
  const { data: alerts } = useProactiveAlerts();

  const monitoring = exceptions && alerts ? {
    systemStatus: alerts.some(a => a.urgency === 'critical') ? 'critical' :
                 alerts.some(a => a.urgency === 'urgent') ? 'warning' :
                 exceptions.some(e => e.severity === 'high') ? 'caution' : 'normal',
    activeIncidents: exceptions.filter(e => e.status === 'detected' || e.status === 'resolving').length,
    preventedIncidents: exceptions.filter(e => e.autoResolutionAttempts.some(a => a.result === 'success')).length,
    nextCriticalAction: alerts.find(a => a.urgency === 'urgent' || a.urgency === 'critical'),
    healthScore: Math.round(100 - (
      (exceptions.filter(e => e.severity === 'critical').length * 20) +
      (exceptions.filter(e => e.severity === 'high').length * 10) +
      (exceptions.filter(e => e.severity === 'medium').length * 5) +
      (exceptions.filter(e => e.severity === 'low').length * 2)
    )),
  } : null;

  return {
    monitoring,
    isLoading: !exceptions || !alerts,
  };
}

// Hook for exception impact assessment
export function useImpactAssessment() {
  const { data: exceptions } = useActiveExceptions();

  const impact = exceptions ? {
    totalFinancialImpact: exceptions.reduce((sum, e) => sum + e.predictedImpact.financialImpact, 0),
    totalDelayHours: exceptions.reduce((sum, e) => sum + e.predictedImpact.deliveryDelayHours, 0),
    affectedCustomers: new Set(exceptions.map(e => e.customerId)).size,
    affectedShipments: exceptions.reduce((sum, e) => sum + e.predictedImpact.affectedShipments, 0),
    highestRiskException: exceptions.reduce((highest, current) => 
      current.predictedImpact.financialImpact > highest.predictedImpact.financialImpact ? current : highest,
      exceptions[0]
    ),
    complianceRisk: Math.max(...exceptions.map(e => e.predictedImpact.complianceRisk)),
    reputationRisk: Math.max(...exceptions.map(e => e.predictedImpact.reputationRisk)),
  } : null;

  return {
    impact,
    isLoading: !exceptions,
  };
}
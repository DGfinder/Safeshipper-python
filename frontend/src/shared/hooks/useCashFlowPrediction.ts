// useCashFlowPrediction.ts
// React hooks for AI-powered cash flow prediction and working capital management

import { useQuery } from "@tanstack/react-query";
import { 
  cashFlowPredictionService, 
  CashFlowPrediction, 
  WorkingCapitalInsight, 
  CustomerPaymentProfile,
  EconomicIndicator 
} from "@/shared/services/cashFlowPredictionService";

// Hook for cash flow predictions
export function useCashFlowPredictions(timeFrame: number = 90) {
  return useQuery({
    queryKey: ["cash-flow-predictions", timeFrame],
    queryFn: async (): Promise<CashFlowPrediction[]> => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const predictions = cashFlowPredictionService.generateCashFlowPredictions();
      return predictions.slice(0, timeFrame);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for working capital insights
export function useWorkingCapitalInsights() {
  return useQuery({
    queryKey: ["working-capital-insights"],
    queryFn: async (): Promise<WorkingCapitalInsight> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      return cashFlowPredictionService.generateWorkingCapitalInsights();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for customer payment profiles
export function useCustomerPaymentProfiles() {
  return useQuery({
    queryKey: ["customer-payment-profiles"],
    queryFn: async (): Promise<CustomerPaymentProfile[]> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return cashFlowPredictionService.generateCustomerPaymentProfiles();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 2 * 60 * 60 * 1000, // 2 hours
  });
}

// Hook for economic indicators
export function useEconomicIndicators() {
  return useQuery({
    queryKey: ["economic-indicators"],
    queryFn: async (): Promise<EconomicIndicator[]> => {
      await new Promise(resolve => setTimeout(resolve, 400));
      return cashFlowPredictionService.getEconomicIndicators();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for cash flow summary statistics
export function useCashFlowSummary(timeFrame: number = 30) {
  const { data: predictions, isLoading, error } = useCashFlowPredictions(timeFrame);

  const summary = predictions ? {
    totalExpectedInflow: predictions.reduce((sum, p) => sum + p.expectedInflow, 0),
    totalConfirmedInflow: predictions.reduce((sum, p) => sum + p.confirmedInflow, 0),
    totalPredictedOutflow: predictions.reduce((sum, p) => sum + p.predictedOutflow, 0),
    netCashFlow: predictions.reduce((sum, p) => sum + p.netCashFlow, 0),
    averageConfidence: Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length),
    riskDays: predictions.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
    worstDay: predictions.reduce((worst, current) => 
      current.netCashFlow < worst.netCashFlow ? current : worst, predictions[0]
    ),
    bestDay: predictions.reduce((best, current) => 
      current.netCashFlow > best.netCashFlow ? current : best, predictions[0]
    ),
  } : null;

  return {
    summary,
    isLoading,
    error,
    predictions,
  };
}

// Hook for payment risk analysis
export function usePaymentRiskAnalysis() {
  const { data: customerProfiles } = useCustomerPaymentProfiles();
  const { data: predictions } = useCashFlowPredictions(30);

  const riskAnalysis = customerProfiles && predictions ? {
    highRiskCustomers: customerProfiles.filter(c => c.paymentReliability < 75),
    averagePaymentDays: Math.round(
      customerProfiles.reduce((sum, c) => sum + c.averagePaymentDays, 0) / customerProfiles.length
    ),
    totalOverdueAmount: customerProfiles.reduce((sum, customer) => 
      sum + customer.paymentHistory
        .filter(p => p.status === 'overdue')
        .reduce((customerSum, p) => customerSum + p.amount, 0), 0
    ),
    upcomingRiskDays: predictions.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
    projectedShortfall: Math.min(0, Math.min(...predictions.map(p => p.netCashFlow))),
  } : null;

  return {
    riskAnalysis,
    customerProfiles,
    isLoading: !customerProfiles || !predictions,
  };
}

// Hook for actionable recommendations
export function useCashFlowRecommendations() {
  const { data: predictions } = useCashFlowPredictions(30);
  const { data: workingCapital } = useWorkingCapitalInsights();
  const { riskAnalysis } = usePaymentRiskAnalysis();

  const recommendations = predictions && workingCapital && riskAnalysis ? {
    immediate: [] as string[],
    shortTerm: [] as string[],
    longTerm: [] as string[],
    priority: 'low' as 'low' | 'medium' | 'high' | 'critical',
  } : null;

  if (recommendations && predictions && workingCapital && riskAnalysis) {
    // Collect immediate actions
    const criticalDays = predictions.filter(p => p.riskLevel === 'critical');
    if (criticalDays.length > 0) {
      recommendations.immediate.push(...criticalDays[0].recommendations);
      recommendations.priority = 'critical';
    }

    // Working capital recommendations
    const urgentCapitalRecs = workingCapital.recommendations.filter(r => r.urgency === 'immediate');
    recommendations.immediate.push(...urgentCapitalRecs.map(r => r.description));

    // Short-term actions
    const highRiskDays = predictions.filter(p => p.riskLevel === 'high');
    if (highRiskDays.length > 0) {
      recommendations.shortTerm.push(...highRiskDays[0].recommendations);
      if (recommendations.priority === 'low') recommendations.priority = 'high';
    }

    // Long-term strategic actions
    if (riskAnalysis.highRiskCustomers.length > 0) {
      recommendations.longTerm.push(
        `Review credit terms for ${riskAnalysis.highRiskCustomers.length} high-risk customers`,
        'Implement automated payment reminder system',
        'Consider factoring receivables for improved cash flow'
      );
    }

    if (workingCapital.surplusOrDeficit > 1000000) {
      recommendations.longTerm.push(
        'Evaluate investment opportunities for surplus cash',
        'Consider expanding operations with available capital'
      );
    }
  }

  return {
    recommendations,
    isLoading: !predictions || !workingCapital || !riskAnalysis,
  };
}
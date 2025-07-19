// useCarbonCredits.ts
// React hooks for carbon credit automation and sustainability tracking

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  carbonCreditService, 
  CarbonFootprint, 
  CarbonCredit,
  CarbonCreditPurchaseRecommendation,
  SustainabilityReport,
  CarbonCreditProvider 
} from "@/shared/services/carbonCreditService";
import { simulatedDataService } from "@/shared/services/simulatedDataService";

// Hook for calculating carbon footprints
export function useCarbonFootprints() {
  return useQuery({
    queryKey: ["carbon-footprints"],
    queryFn: async (): Promise<CarbonFootprint[]> => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Get recent shipments and calculate their carbon footprints
      const allShipments = simulatedDataService.getShipments();
      const recentShipments = allShipments.slice(0, 50); // Last 50 shipments
      
      return recentShipments.map(shipment => 
        carbonCreditService.calculateCarbonFootprint(shipment)
      );
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for carbon credit purchase recommendations
export function useCarbonCreditRecommendations() {
  const { data: footprints } = useCarbonFootprints();

  return useQuery({
    queryKey: ["carbon-credit-recommendations", footprints?.length],
    queryFn: async (): Promise<CarbonCreditPurchaseRecommendation | null> => {
      if (!footprints) return null;
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const totalEmissions = footprints.reduce((sum, f) => sum + f.co2Emissions, 0);
      return carbonCreditService.generateCarbonCreditRecommendation(totalEmissions);
    },
    enabled: !!footprints,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for automated carbon credit purchases
export function useAutomatedCarbonPurchases() {
  const { data: footprints } = useCarbonFootprints();

  return useQuery({
    queryKey: ["automated-carbon-purchases"],
    queryFn: async (): Promise<CarbonCredit[]> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Calculate monthly emissions (simulate)
      const monthlyEmissions = 150; // tonnes per month
      return carbonCreditService.generateAutomatedPurchases(monthlyEmissions);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for sustainability reports
export function useSustainabilityReport(timeframe: 'monthly' | 'quarterly' | 'annual' = 'monthly') {
  return useQuery({
    queryKey: ["sustainability-report", timeframe],
    queryFn: async (): Promise<SustainabilityReport> => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return carbonCreditService.generateSustainabilityReport(timeframe);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for carbon emissions summary
export function useCarbonEmissionsSummary() {
  const { data: footprints, isLoading } = useCarbonFootprints();
  const { data: report } = useSustainabilityReport('monthly');

  const summary = footprints ? {
    totalEmissions: footprints.reduce((sum, f) => sum + f.co2Emissions, 0),
    averageEmissionPerShipment: footprints.length > 0 ? 
      footprints.reduce((sum, f) => sum + f.co2Emissions, 0) / footprints.length : 0,
    scope1Emissions: footprints.reduce((sum, f) => sum + f.scope1Emissions, 0),
    scope2Emissions: footprints.reduce((sum, f) => sum + f.scope2Emissions, 0),
    scope3Emissions: footprints.reduce((sum, f) => sum + f.scope3Emissions, 0),
    highestEmissionRoute: footprints.reduce((highest, current) => 
      current.co2Emissions > highest.co2Emissions ? current : highest, footprints[0]
    ),
    lowestEmissionRoute: footprints.reduce((lowest, current) => 
      current.co2Emissions < lowest.co2Emissions ? current : lowest, footprints[0]
    ),
    emissionsByFuelType: footprints.reduce((acc, f) => {
      acc[f.fuelType] = (acc[f.fuelType] || 0) + f.co2Emissions;
      return acc;
    }, {} as Record<string, number>),
    carbonIntensity: footprints.length > 0 ? 
      footprints.reduce((sum, f) => sum + (f.co2Emissions / f.cargoWeight), 0) / footprints.length : 0,
  } : null;

  return {
    summary,
    isLoading,
    footprints,
    monthlyReport: report,
  };
}

// Hook for ESG compliance tracking
export function useESGCompliance() {
  const { data: report } = useSustainabilityReport('quarterly');
  const { data: recommendations } = useCarbonCreditRecommendations();

  const compliance = report ? {
    carbonNeutralStatus: report.carbonNeutralAchieved,
    offsetPercentage: report.offsetPercentage,
    complianceScore: Math.min(100, report.offsetPercentage + 
      (report.benchmarkComparison.percentileRanking * 0.3)),
    esgRating: report.offsetPercentage >= 100 ? 'A' : 
               report.offsetPercentage >= 80 ? 'B' : 
               report.offsetPercentage >= 60 ? 'C' : 'D',
    nextAuditDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    certifications: ['ISO 14001', 'NGER Compliance', 'Carbon Disclosure Project'],
    improvementAreas: report.recommendations,
    benchmarkRanking: report.benchmarkComparison.percentileRanking,
  } : null;

  return {
    compliance,
    isLoading: !report,
    recommendations,
  };
}

// Hook for carbon credit marketplace data
export function useCarbonCreditMarketplace() {
  return useQuery({
    queryKey: ["carbon-credit-marketplace"],
    queryFn: async (): Promise<{
      providers: CarbonCreditProvider[];
      marketTrends: any;
      averagePrice: number;
    }> => {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Simulate getting market data
      const totalEmissions = 100; // dummy value for demo
      const recommendation = carbonCreditService.generateCarbonCreditRecommendation(totalEmissions);
      
      const marketTrends = {
        priceDirection: 'rising',
        averagePriceChange: '+8.5%',
        demandLevel: 'high',
        supplyLevel: 'moderate',
        volatility: 'low',
      };

      const averagePrice = recommendation.providers.reduce((sum, p) => sum + p.pricePerTonne, 0) / 
                          recommendation.providers.length;

      return {
        providers: recommendation.providers,
        marketTrends,
        averagePrice,
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Mutation for purchasing carbon credits
export function usePurchaseCarbonCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseData: {
      providerId: string;
      quantity: number;
      totalCost: number;
    }) => {
      // Simulate API call to purchase credits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const purchase: CarbonCredit = {
        creditId: `CC-${Date.now()}`,
        provider: purchaseData.providerId,
        projectType: 'forestry', // would be determined by provider
        projectLocation: 'Australia',
        vintage: new Date().getFullYear(),
        quantity: purchaseData.quantity,
        pricePerTonne: purchaseData.totalCost / purchaseData.quantity,
        totalCost: purchaseData.totalCost,
        certificationStandard: 'VCS',
        purchaseDate: new Date().toISOString(),
        retirementReason: 'Transport emissions offset',
        serialNumber: `VCS-${Date.now()}`,
        additionality: true,
        cobenefits: ['Biodiversity protection', 'Community development'],
      };

      return { success: true, purchase };
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["automated-carbon-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["sustainability-report"] });
    },
  });
}

// Mutation for retiring carbon credits
export function useRetireCarbonCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (retirementData: {
      creditIds: string[];
      retirementReason: string;
    }) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        retiredCredits: retirementData.creditIds.length,
        retirementDate: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automated-carbon-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["sustainability-report"] });
    },
  });
}

// Hook for real-time emissions tracking
export function useRealTimeEmissions() {
  const { data: footprints } = useCarbonFootprints();

  return useQuery({
    queryKey: ["real-time-emissions"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const todayEmissions = footprints?.filter(f => 
        f.shipmentId.includes(today.slice(-2)) // simulate today's shipments
      ) || [];

      const dailyTotal = todayEmissions.reduce((sum, f) => sum + f.co2Emissions, 0);
      const projectedMonthly = dailyTotal * 30; // rough projection

      return {
        todayEmissions: dailyTotal,
        projectedMonthly,
        activeShipments: todayEmissions.length,
        averagePerShipment: todayEmissions.length > 0 ? dailyTotal / todayEmissions.length : 0,
        trend: projectedMonthly > 150 ? 'above_target' : 'on_target',
      };
    },
    enabled: !!footprints,
    refetchInterval: 5 * 60 * 1000, // 5 minutes for real-time feel
  });
}
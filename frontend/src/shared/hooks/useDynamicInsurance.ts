// useDynamicInsurance.ts
// React hooks for dynamic insurance pricing and risk assessment

import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  dynamicInsuranceService,
  InsurancePremium,
  InsuranceQuoteRequest,
  MarketConditions,
  DynamicPricingRule,
} from '@/shared/services/dynamicInsuranceService';

// Hook for generating insurance premium quotes
export function useInsuranceQuote() {
  return useMutation({
    mutationFn: (request: InsuranceQuoteRequest) => 
      dynamicInsuranceService.generatePremiumQuote(request),
    onError: (error) => {
      console.error('Insurance quote generation failed:', error);
    },
  });
}

// Hook for current market conditions
export function useMarketConditions() {
  return useQuery({
    queryKey: ['marketConditions'],
    queryFn: () => (dynamicInsuranceService as any).getCurrentMarketConditions(),
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
    staleTime: 15 * 60 * 1000, // Consider data stale after 15 minutes
  });
}

// Hook for real-time pricing adjustments
export function useRealTimePricingRules() {
  return useQuery({
    queryKey: ['pricingRules'],
    queryFn: () => dynamicInsuranceService.getRealTimePricingAdjustments(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}

// Hook for historical premium data
export function useHistoricalPremiumData(customerId: string, days: number = 30) {
  return useQuery({
    queryKey: ['historicalPremiums', customerId, days],
    queryFn: () => dynamicInsuranceService.getHistoricalPremiumData(customerId, days),
    enabled: !!customerId,
    staleTime: 60 * 60 * 1000, // Consider data stale after 1 hour
  });
}

// Hook for claims trends analysis
export function useClaimsTrends() {
  return useQuery({
    queryKey: ['claimsTrends'],
    queryFn: () => dynamicInsuranceService.analyzeClaimsTrends(),
    refetchInterval: 24 * 60 * 60 * 1000, // Refetch daily
    staleTime: 12 * 60 * 60 * 1000, // Consider data stale after 12 hours
  });
}

// Hook for premium calculation simulation (for quote comparison)
export function usePremiumSimulation() {
  return useQuery({
    queryKey: ['premiumSimulation'],
    queryFn: async () => {
      // Generate multiple sample quotes for different scenarios
      const scenarios = [
        {
          name: 'Low Risk Standard Cargo',
          request: {
            shipmentDetails: {
              shipmentId: 'DEMO-001',
              customerId: 'cust-1',
              cargoType: 'General Freight',
              cargoValue: 50000,
              route: {
                origin: 'Perth',
                destination: 'Melbourne',
                distance: 2130,
                estimatedDuration: 26,
              },
              scheduledDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              scheduledArrival: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
            },
            customerProfile: {
              customerId: 'cust-1',
              claimsHistory: [],
              safetyRating: 95,
              yearsWithCompany: 8,
              volumeDiscount: 10,
              paymentHistory: 'excellent' as const,
            },
            vehicleDetails: {
              vehicleId: 'TRK-001',
              vehicleType: 'Standard Truck',
              age: 3,
              maintenanceScore: 92,
              safetyFeatures: ['ABS', 'EBS', 'GPS', 'Camera', 'Sensors'],
              driverExperience: 12,
              driverSafetyRecord: 98,
            },
            coverageRequirements: {
              coverageTypes: ['cargo_damage', 'theft', 'delay'],
              minimumLiability: 1000000,
              deductiblePreference: 1000,
              additionalFeatures: [],
            },
          },
        },
        {
          name: 'High Risk Dangerous Goods',
          request: {
            shipmentDetails: {
              shipmentId: 'DEMO-002',
              customerId: 'cust-2',
              cargoType: 'Dangerous Goods',
              cargoValue: 150000,
              dangerousGoods: [
                {
                  unNumber: 'UN1203',
                  hazardClass: '3',
                  quantity: 1000,
                },
              ],
              route: {
                origin: 'Fremantle Port',
                destination: 'Kalgoorlie Mine',
                distance: 595,
                estimatedDuration: 8,
              },
              scheduledDeparture: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
              scheduledArrival: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
            },
            customerProfile: {
              customerId: 'cust-2',
              claimsHistory: [
                {
                  claimId: 'CLM-001',
                  date: '2024-03-15',
                  type: 'cargo_damage',
                  amount: 8500,
                  status: 'settled',
                  cause: 'Vehicle breakdown',
                  faultAssignment: 'carrier',
                },
              ],
              safetyRating: 78,
              yearsWithCompany: 2,
              volumeDiscount: 0,
              paymentHistory: 'good' as const,
            },
            vehicleDetails: {
              vehicleId: 'TRK-DG-005',
              vehicleType: 'Dangerous Goods Truck',
              age: 5,
              maintenanceScore: 85,
              safetyFeatures: ['ABS', 'EBS', 'GPS', 'Emergency Stop', 'Fire Suppression'],
              driverExperience: 8,
              driverSafetyRecord: 88,
            },
            coverageRequirements: {
              coverageTypes: ['cargo_damage', 'theft', 'environmental_contamination', 'third_party_liability', 'emergency_response'],
              minimumLiability: 5000000,
              deductiblePreference: 2500,
              additionalFeatures: ['emergency_response', 'environmental_cleanup'],
            },
          },
        },
        {
          name: 'Premium High-Value Cargo',
          request: {
            shipmentDetails: {
              shipmentId: 'DEMO-003',
              customerId: 'cust-3',
              cargoType: 'High-Value Electronics',
              cargoValue: 500000,
              route: {
                origin: 'Sydney',
                destination: 'Brisbane',
                distance: 920,
                estimatedDuration: 12,
              },
              scheduledDeparture: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
              scheduledArrival: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
            },
            customerProfile: {
              customerId: 'cust-3',
              claimsHistory: [],
              safetyRating: 99,
              yearsWithCompany: 15,
              volumeDiscount: 15,
              paymentHistory: 'excellent' as const,
            },
            vehicleDetails: {
              vehicleId: 'TRK-SEC-003',
              vehicleType: 'Secure Transport Vehicle',
              age: 1,
              maintenanceScore: 99,
              safetyFeatures: ['ABS', 'EBS', 'GPS', 'Security System', 'Climate Control', 'Shock Sensors'],
              driverExperience: 15,
              driverSafetyRecord: 99,
            },
            coverageRequirements: {
              coverageTypes: ['cargo_damage', 'theft', 'delay', 'business_interruption'],
              minimumLiability: 2000000,
              deductiblePreference: 5000,
              additionalFeatures: ['express_claims', 'risk_management'],
            },
          },
        },
      ];

      const quotes = await Promise.all(
        scenarios.map(async scenario => {
          const quote = await dynamicInsuranceService.generatePremiumQuote(scenario.request as any);
          return {
            scenario: scenario.name,
            quote,
          };
        })
      );

      return quotes;
    },
    staleTime: 30 * 60 * 1000, // Consider data stale after 30 minutes
  });
}

// Hook for insurance analytics dashboard data
export function useInsuranceAnalytics() {
  return useQuery({
    queryKey: ['insuranceAnalytics'],
    queryFn: async () => {
      const marketConditions = (dynamicInsuranceService as any).getCurrentMarketConditions();
      const claimsTrends = (dynamicInsuranceService as any).analyzeClaimsTrends();
      const pricingRules = (dynamicInsuranceService as any).getRealTimePricingAdjustments();
      
      // Calculate summary metrics
      const summary = {
        activeQuotes: 156,
        activePolicies: 89,
        totalPremiumVolume: 2450000,
        averagePremium: 1850,
        claimsRatio: 0.15, // 15% of premiums paid as claims
        profitMargin: 0.25, // 25% profit margin
        customerSatisfaction: 4.2, // Out of 5
        averageQuoteTime: 45, // Seconds
        automationRate: 0.87, // 87% of quotes fully automated
        riskAccuracy: 0.92, // 92% risk prediction accuracy
      };

      // Calculate risk distribution
      const riskDistribution = {
        low: 45,    // 45% of policies are low risk
        medium: 35, // 35% medium risk
        high: 18,   // 18% high risk
        extreme: 2, // 2% extreme risk
      };

      // Premium trends over time
      const premiumTrends = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
        const baseValue = 1800 + Math.sin(i / 5) * 200;
        const randomVariation = (Math.random() - 0.5) * 300;
        
        return {
          date: date.toISOString().split('T')[0],
          averagePremium: Math.round(baseValue + randomVariation),
          quotesGenerated: Math.floor(Math.random() * 20) + 10,
          conversionRate: 0.6 + Math.random() * 0.3, // 60-90% conversion
        };
      });

      return {
        summary,
        riskDistribution,
        premiumTrends,
        marketConditions,
        claimsTrends,
        activePricingRules: pricingRules.filter((rule: any) => rule.isActive),
      };
    },
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });
}

// Hook for risk factor analysis
export function useRiskFactorAnalysis() {
  return useQuery({
    queryKey: ['riskFactorAnalysis'],
    queryFn: async () => {
      // Simulate risk factor impact analysis
      const riskFactors = [
        {
          factor: 'Route Risk',
          averageImpact: 15.2, // % premium adjustment
          frequency: 85, // % of quotes affected
          trend: 'stable',
          topTriggers: ['High traffic density', 'Construction zones', 'Weather conditions'],
        },
        {
          factor: 'Cargo Hazard Level',
          averageImpact: 45.8,
          frequency: 30,
          trend: 'increasing',
          topTriggers: ['Class 1 explosives', 'Class 2.3 toxic gases', 'Class 8 corrosives'],
        },
        {
          factor: 'Driver Experience',
          averageImpact: -8.5, // Negative = discount
          frequency: 100,
          trend: 'improving',
          topTriggers: ['10+ years experience', 'Perfect safety record', 'DG certification'],
        },
        {
          factor: 'Customer Claims History',
          averageImpact: 22.3,
          frequency: 25,
          trend: 'stable',
          topTriggers: ['Multiple claims', 'High-value claims', 'Fault-based incidents'],
        },
        {
          factor: 'Vehicle Condition',
          averageImpact: 12.1,
          frequency: 60,
          trend: 'improving',
          topTriggers: ['Maintenance overdue', 'Age over 10 years', 'Safety system failures'],
        },
        {
          factor: 'Market Conditions',
          averageImpact: 8.7,
          frequency: 100,
          trend: 'volatile',
          topTriggers: ['High demand periods', 'Capacity shortages', 'Regulatory changes'],
        },
      ];

      return {
        riskFactors,
        totalFactorsAnalyzed: riskFactors.length,
        averageAdjustment: 12.8, // % average premium adjustment
        highestImpactFactor: 'Cargo Hazard Level',
        mostFrequentFactor: 'Driver Experience',
        modelAccuracy: 92.3,
        lastModelUpdate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
    },
    refetchInterval: 60 * 60 * 1000, // Refetch hourly
    staleTime: 30 * 60 * 1000, // Consider data stale after 30 minutes
  });
}

// Hook for competitive analysis
export function useCompetitiveAnalysis() {
  return useQuery({
    queryKey: ['competitiveAnalysis'],
    queryFn: async () => {
      const competitors = [
        {
          name: 'Premium Logistics Insurance',
          marketShare: 28.5,
          averagePremium: 1950,
          strengthsWeaknesses: {
            strengths: ['Market leader', 'Comprehensive coverage', 'Strong brand'],
            weaknesses: ['Higher premiums', 'Slow claims processing', 'Limited technology'],
          },
          pricingStrategy: 'Premium positioning',
        },
        {
          name: 'Smart Transport Cover',
          marketShare: 18.2,
          averagePremium: 1650,
          strengthsWeaknesses: {
            strengths: ['Technology-driven', 'Fast quotes', 'Good customer service'],
            weaknesses: ['Limited DG coverage', 'Smaller network', 'Higher deductibles'],
          },
          pricingStrategy: 'Technology-enabled efficiency',
        },
        {
          name: 'Value Freight Insurance',
          marketShare: 15.8,
          averagePremium: 1450,
          strengthsWeaknesses: {
            strengths: ['Low premiums', 'Simple products', 'Quick decisions'],
            weaknesses: ['Limited coverage', 'Basic service', 'Higher claims ratios'],
          },
          pricingStrategy: 'Cost leadership',
        },
        {
          name: 'SafeShipper Insurance',
          marketShare: 12.5,
          averagePremium: 1750,
          strengthsWeaknesses: {
            strengths: ['AI-powered pricing', 'Real-time adjustments', 'DG expertise'],
            weaknesses: ['Newer brand', 'Growing network', 'Limited history'],
          },
          pricingStrategy: 'AI-driven dynamic pricing',
        },
      ];

      const ourPosition = competitors.find(c => c.name === 'SafeShipper Insurance');
      const marketAnalysis = {
        totalMarketSize: 890000000, // AUD
        growthRate: 6.2, // % annual growth
        averageMarketPremium: 1700,
        ourPremiumPosition: 'competitive', // vs market average
        priceElasticity: -1.2, // Price sensitivity
        customerSwitchingRate: 0.08, // 8% annual churn
        innovationIndex: 7.5, // Out of 10
      };

      return {
        competitors,
        ourPosition,
        marketAnalysis,
        competitiveAdvantages: [
          'Real-time AI pricing adjustments',
          'Comprehensive dangerous goods coverage',
          'Advanced risk assessment models',
          'Automated quote generation',
        ],
        improvementOpportunities: [
          'Increase brand awareness',
          'Expand sales network',
          'Enhance customer education',
          'Develop loyalty programs',
        ],
      };
    },
    refetchInterval: 24 * 60 * 60 * 1000, // Refetch daily
    staleTime: 12 * 60 * 60 * 1000, // Consider data stale after 12 hours
  });
}

// Hook for premium optimization recommendations
export function usePremiumOptimization() {
  return useQuery({
    queryKey: ['premiumOptimization'],
    queryFn: async () => {
      // Simulate AI-driven premium optimization recommendations
      const recommendations = [
        {
          id: 'OPT-001',
          type: 'pricing_model',
          title: 'Adjust Weather Risk Multiplier',
          description: 'Reduce weather risk multiplier from 1.25 to 1.18 for summer months to remain competitive',
          expectedImpact: {
            premiumChange: -3.2, // % reduction
            volumeIncrease: 8.5, // % more quotes
            revenueImpact: 4.2, // % revenue increase
          },
          confidence: 87,
          implementationEffort: 'low',
          recommendation: 'implement',
        },
        {
          id: 'OPT-002',
          type: 'discount_structure',
          title: 'Introduce Technology Adoption Incentive',
          description: 'Offer 5% discount for vehicles with advanced telematics and safety systems',
          expectedImpact: {
            premiumChange: -2.8,
            volumeIncrease: 12.3,
            revenueImpact: 8.1,
          },
          confidence: 92,
          implementationEffort: 'medium',
          recommendation: 'implement',
        },
        {
          id: 'OPT-003',
          type: 'risk_assessment',
          title: 'Refine Customer Segmentation',
          description: 'Create premium customer tier with enhanced benefits and slightly higher premiums',
          expectedImpact: {
            premiumChange: 6.5,
            volumeIncrease: -2.1,
            revenueImpact: 11.8,
          },
          confidence: 78,
          implementationEffort: 'high',
          recommendation: 'evaluate',
        },
        {
          id: 'OPT-004',
          type: 'market_positioning',
          title: 'Peak Season Dynamic Pricing',
          description: 'Implement surge pricing during high-demand periods (mining season)',
          expectedImpact: {
            premiumChange: 8.2,
            volumeIncrease: -5.4,
            revenueImpact: 2.1,
          },
          confidence: 65,
          implementationEffort: 'low',
          recommendation: 'test',
        },
      ];

      return {
        recommendations,
        totalRecommendations: recommendations.length,
        implementRecommendations: recommendations.filter(r => r.recommendation === 'implement').length,
        potentialRevenueIncrease: 15.6, // % from implementing all recommendations
        riskAdjustedReturn: 11.2, // % after considering implementation risks
        timeToImplement: '4-8 weeks',
        lastOptimizationRun: new Date().toISOString(),
      };
    },
    refetchInterval: 7 * 24 * 60 * 60 * 1000, // Refetch weekly
    staleTime: 24 * 60 * 60 * 1000, // Consider data stale after 24 hours
  });
}
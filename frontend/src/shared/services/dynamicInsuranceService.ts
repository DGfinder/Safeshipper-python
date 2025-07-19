// dynamicInsuranceService.ts
// AI-powered dynamic insurance pricing system with real-time risk assessment
// Provides automated insurance adjustments based on real-time risk factors

export interface InsurancePremium {
  id: string;
  shipmentId: string;
  customerId: string;
  basePremium: number; // Base premium in AUD
  adjustedPremium: number; // Final premium after risk adjustments
  adjustmentFactors: AdjustmentFactor[];
  coverageDetails: CoverageDetails;
  validFrom: string;
  validUntil: string;
  riskAssessment: RiskAssessment;
  paymentTerms: PaymentTerms;
  discounts: Discount[];
  status: 'quoted' | 'active' | 'expired' | 'claimed' | 'cancelled';
  lastUpdated: string;
}

export interface AdjustmentFactor {
  factor: RiskFactorType;
  description: string;
  multiplier: number; // 0.5 (50% reduction) to 3.0 (300% increase)
  impact: number; // Dollar amount impact
  source: string;
  confidence: number; // 0-100%
  validityPeriod: number; // Hours this factor remains valid
}

export type RiskFactorType = 
  | 'route_risk'
  | 'cargo_hazard'
  | 'weather_conditions'
  | 'driver_experience'
  | 'vehicle_condition'
  | 'customer_history'
  | 'market_volatility'
  | 'seasonal_patterns'
  | 'geopolitical_risk'
  | 'infrastructure_status'
  | 'traffic_density'
  | 'time_of_travel'
  | 'cargo_value'
  | 'security_level';

export interface CoverageDetails {
  cargoValue: number;
  liabilityLimit: number;
  deductible: number;
  coverageTypes: CoverageType[];
  exclusions: string[];
  additionalBenefits: string[];
  claimsHandling: {
    maxProcessingTime: number; // Hours
    emergencyContact: string;
    documentationRequired: string[];
  };
}

export type CoverageType = 
  | 'cargo_damage'
  | 'theft'
  | 'delay'
  | 'environmental_contamination'
  | 'third_party_liability'
  | 'emergency_response'
  | 'business_interruption'
  | 'regulatory_fines';

export interface RiskAssessment {
  overallRiskScore: number; // 0-100
  riskCategory: 'low' | 'medium' | 'high' | 'extreme';
  primaryRisks: string[];
  mitigationMeasures: string[];
  recommendedActions: string[];
  assessmentDate: string;
  assessmentSource: 'ai_model' | 'underwriter' | 'hybrid';
  confidence: number;
}

export interface PaymentTerms {
  paymentMethod: 'immediate' | 'monthly' | 'quarterly' | 'annual';
  installments: number;
  lateFeeRate: number;
  earlyPaymentDiscount: number;
  currency: string;
  taxRate: number;
  totalAmount: number;
  dueDate: string;
}

export interface Discount {
  type: DiscountType;
  description: string;
  amount: number;
  percentage: number;
  conditions: string[];
  validUntil: string;
  autoApplied: boolean;
}

export type DiscountType = 
  | 'volume_discount'
  | 'safety_record'
  | 'loyalty_bonus'
  | 'multi_policy'
  | 'early_payment'
  | 'technology_adoption'
  | 'sustainability_bonus'
  | 'claims_free';

export interface InsuranceQuoteRequest {
  shipmentDetails: {
    shipmentId: string;
    customerId: string;
    cargoType: string;
    cargoValue: number;
    dangerousGoods?: {
      unNumber: string;
      hazardClass: string;
      quantity: number;
    }[];
    route: {
      origin: string;
      destination: string;
      distance: number;
      estimatedDuration: number;
    };
    scheduledDeparture: string;
    scheduledArrival: string;
  };
  customerProfile: {
    customerId: string;
    claimsHistory: ClaimRecord[];
    safetyRating: number;
    yearsWithCompany: number;
    volumeDiscount: number;
    paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
  };
  vehicleDetails: {
    vehicleId: string;
    vehicleType: string;
    age: number;
    maintenanceScore: number;
    safetyFeatures: string[];
    driverExperience: number; // Years
    driverSafetyRecord: number; // 0-100
  };
  coverageRequirements: {
    coverageTypes: CoverageType[];
    minimumLiability: number;
    deductiblePreference: number;
    additionalFeatures: string[];
  };
}

export interface ClaimRecord {
  claimId: string;
  date: string;
  type: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied' | 'settled';
  cause: string;
  faultAssignment: 'customer' | 'carrier' | 'third_party' | 'act_of_god';
}

export interface MarketConditions {
  insuranceMarketIndex: number; // Base market pricing index
  capacityUtilization: number; // Industry capacity usage 0-100%
  reinsuranceRates: number; // Current reinsurance costs
  regulatoryChanges: {
    factor: string;
    impact: number;
    effectiveDate: string;
  }[];
  competitiveAnalysis: {
    averageMarketPremium: number;
    ourPosition: 'below' | 'at' | 'above';
    marketShare: number;
  };
  economicIndicators: {
    inflationRate: number;
    currencyStability: number;
    commodityPrices: number;
  };
}

export interface PricingModel {
  modelId: string;
  modelName: string;
  version: string;
  accuracy: number; // Model accuracy percentage
  lastTrained: string;
  features: string[];
  calibrationDate: string;
  performanceMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
  };
}

export interface DynamicPricingRule {
  ruleId: string;
  name: string;
  condition: string;
  action: {
    type: 'multiply' | 'add' | 'set_minimum' | 'set_maximum';
    value: number;
  };
  priority: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  applicableRegions: string[];
  applicableCargoTypes: string[];
}

class DynamicInsuranceService {
  private seededRandom: any;
  private pricingModels: PricingModel[];
  private dynamicRules: DynamicPricingRule[];

  constructor() {
    this.seededRandom = this.createSeededRandom(54321);
    this.pricingModels = this.initializePricingModels();
    this.dynamicRules = this.initializeDynamicRules();
  }

  private createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }

  // Generate insurance premium quote with real-time risk assessment
  async generatePremiumQuote(request: InsuranceQuoteRequest): Promise<InsurancePremium> {
    const basePremium = this.calculateBasePremium(request);
    const adjustmentFactors = await this.calculateAdjustmentFactors(request);
    const adjustedPremium = this.applyAdjustments(basePremium, adjustmentFactors);
    const discounts = this.calculateDiscounts(request, adjustedPremium);
    const finalPremium = this.applyDiscounts(adjustedPremium, discounts);

    return {
      id: `INS-${Date.now()}-${Math.floor(this.seededRandom() * 1000)}`,
      shipmentId: request.shipmentDetails.shipmentId,
      customerId: request.shipmentDetails.customerId,
      basePremium,
      adjustedPremium: finalPremium,
      adjustmentFactors,
      coverageDetails: this.generateCoverageDetails(request),
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      riskAssessment: this.generateRiskAssessment(request, adjustmentFactors),
      paymentTerms: this.generatePaymentTerms(finalPremium),
      discounts,
      status: 'quoted',
      lastUpdated: new Date().toISOString(),
    };
  }

  private calculateBasePremium(request: InsuranceQuoteRequest): number {
    let basePremium = 500; // Base premium in AUD

    // Cargo value factor (0.5% of cargo value)
    basePremium += request.shipmentDetails.cargoValue * 0.005;

    // Distance factor
    basePremium += request.shipmentDetails.route.distance * 0.10;

    // Dangerous goods multiplier
    if (request.shipmentDetails.dangerousGoods && request.shipmentDetails.dangerousGoods.length > 0) {
      request.shipmentDetails.dangerousGoods.forEach(dg => {
        const hazardMultiplier = this.getHazardClassMultiplier(dg.hazardClass);
        basePremium *= hazardMultiplier;
      });
    }

    // Coverage types multiplier
    const coverageMultiplier = 1 + (request.coverageRequirements.coverageTypes.length * 0.15);
    basePremium *= coverageMultiplier;

    return Math.round(basePremium);
  }

  private getHazardClassMultiplier(hazardClass: string): number {
    const multipliers = {
      '1': 2.5,    // Explosives
      '2.3': 2.2,  // Toxic gases
      '6.1': 2.0,  // Toxic substances
      '7': 1.9,    // Radioactive
      '8': 1.7,    // Corrosives
      '5.1': 1.5,  // Oxidizers
      '3': 1.4,    // Flammable liquids
      '4': 1.3,    // Flammable solids
      '2.1': 1.2,  // Flammable gases
      '2.2': 1.1,  // Non-flammable gases
      '9': 1.1,    // Miscellaneous
    };
    return multipliers[hazardClass] || 1.0;
  }

  private async calculateAdjustmentFactors(request: InsuranceQuoteRequest): Promise<AdjustmentFactor[]> {
    const factors: AdjustmentFactor[] = [];

    // Route risk factor
    const routeRisk = this.assessRouteRisk(request.shipmentDetails.route);
    factors.push({
      factor: 'route_risk',
      description: `Route risk assessment: ${routeRisk.description}`,
      multiplier: routeRisk.multiplier,
      impact: Math.round(request.shipmentDetails.cargoValue * 0.001 * routeRisk.multiplier),
      source: 'AI Route Analysis',
      confidence: 85,
      validityPeriod: 24,
    });

    // Weather conditions factor
    const weatherRisk = this.assessWeatherRisk(request.shipmentDetails.scheduledDeparture);
    factors.push({
      factor: 'weather_conditions',
      description: `Weather impact: ${weatherRisk.description}`,
      multiplier: weatherRisk.multiplier,
      impact: Math.round(request.shipmentDetails.cargoValue * 0.0008 * weatherRisk.multiplier),
      source: 'Weather Service API',
      confidence: 92,
      validityPeriod: 12,
    });

    // Driver experience factor
    const driverExperience = request.vehicleDetails.driverExperience;
    const experienceMultiplier = driverExperience >= 10 ? 0.9 : 
                                driverExperience >= 5 ? 1.0 : 
                                driverExperience >= 2 ? 1.1 : 1.3;
    factors.push({
      factor: 'driver_experience',
      description: `Driver with ${driverExperience} years experience`,
      multiplier: experienceMultiplier,
      impact: Math.round(500 * experienceMultiplier - 500),
      source: 'Driver Database',
      confidence: 100,
      validityPeriod: 168, // Week
    });

    // Vehicle condition factor
    const vehicleScore = request.vehicleDetails.maintenanceScore;
    const vehicleMultiplier = vehicleScore >= 90 ? 0.95 : 
                             vehicleScore >= 80 ? 1.0 : 
                             vehicleScore >= 70 ? 1.1 : 1.2;
    factors.push({
      factor: 'vehicle_condition',
      description: `Vehicle maintenance score: ${vehicleScore}/100`,
      multiplier: vehicleMultiplier,
      impact: Math.round(300 * vehicleMultiplier - 300),
      source: 'Vehicle Telematics',
      confidence: 88,
      validityPeriod: 72,
    });

    // Customer history factor
    const customerRisk = this.assessCustomerRisk(request.customerProfile);
    factors.push({
      factor: 'customer_history',
      description: `Customer risk profile: ${customerRisk.description}`,
      multiplier: customerRisk.multiplier,
      impact: Math.round(400 * customerRisk.multiplier - 400),
      source: 'Customer Database',
      confidence: 95,
      validityPeriod: 720, // Month
    });

    // Time of travel factor
    const timeRisk = this.assessTimeOfTravelRisk(request.shipmentDetails.scheduledDeparture);
    factors.push({
      factor: 'time_of_travel',
      description: `Travel time risk: ${timeRisk.description}`,
      multiplier: timeRisk.multiplier,
      impact: Math.round(200 * timeRisk.multiplier - 200),
      source: 'Traffic Analytics',
      confidence: 78,
      validityPeriod: 6,
    });

    // Market volatility factor
    const marketConditions = this.getCurrentMarketConditions();
    factors.push({
      factor: 'market_volatility',
      description: `Market conditions: ${marketConditions.description}`,
      multiplier: marketConditions.multiplier,
      impact: Math.round(600 * marketConditions.multiplier - 600),
      source: 'Market Analytics',
      confidence: 82,
      validityPeriod: 48,
    });

    return factors;
  }

  private assessRouteRisk(route: any): { description: string; multiplier: number } {
    const riskFactors = [
      { condition: route.distance > 1000, factor: 'long distance', multiplier: 1.15 },
      { condition: route.distance < 50, factor: 'short urban route', multiplier: 0.95 },
      { condition: route.origin.includes('Port'), factor: 'port operations', multiplier: 1.1 },
      { condition: route.destination.includes('Mine'), factor: 'mining site delivery', multiplier: 1.2 },
    ];

    let multiplier = 1.0;
    const descriptions: string[] = [];

    riskFactors.forEach(rf => {
      if (rf.condition) {
        multiplier *= rf.multiplier;
        descriptions.push(rf.factor);
      }
    });

    // Add random variation based on seeded random
    const variation = 0.95 + (this.seededRandom() * 0.1); // 0.95 to 1.05
    multiplier *= variation;

    return {
      description: descriptions.length > 0 ? descriptions.join(', ') : 'standard route',
      multiplier: Math.round(multiplier * 100) / 100,
    };
  }

  private assessWeatherRisk(departureDate: string): { description: string; multiplier: number } {
    const departure = new Date(departureDate);
    const month = departure.getMonth();
    const hour = departure.getHours();

    // Seasonal risk (Australian seasons)
    const seasonalRisk = month >= 11 || month <= 2 ? 1.2 : // Summer (cyclone season)
                        month >= 5 && month <= 7 ? 1.1 : // Winter (rain/flooding)
                        1.0; // Autumn/Spring

    // Time of day risk
    const timeRisk = hour >= 2 && hour <= 6 ? 0.95 : // Early morning (safer)
                    hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19 ? 1.1 : // Rush hours
                    1.0; // Normal hours

    const multiplier = seasonalRisk * timeRisk;
    const descriptions: string[] = [];

    if (seasonalRisk > 1.1) descriptions.push('high seasonal risk');
    if (timeRisk > 1.0) descriptions.push('peak traffic hours');
    if (multiplier < 1.0) descriptions.push('favorable conditions');

    return {
      description: descriptions.length > 0 ? descriptions.join(', ') : 'normal conditions',
      multiplier: Math.round(multiplier * 100) / 100,
    };
  }

  private assessCustomerRisk(profile: any): { description: string; multiplier: number } {
    let multiplier = 1.0;
    const descriptions: string[] = [];

    // Claims history impact
    const claimsCount = profile.claimsHistory.length;
    if (claimsCount === 0) {
      multiplier *= 0.9;
      descriptions.push('no claims history');
    } else if (claimsCount <= 2) {
      multiplier *= 1.0;
      descriptions.push('minimal claims');
    } else if (claimsCount <= 5) {
      multiplier *= 1.2;
      descriptions.push('moderate claims history');
    } else {
      multiplier *= 1.4;
      descriptions.push('high claims frequency');
    }

    // Years with company
    if (profile.yearsWithCompany >= 10) {
      multiplier *= 0.95;
      descriptions.push('long-term customer');
    } else if (profile.yearsWithCompany <= 1) {
      multiplier *= 1.1;
      descriptions.push('new customer');
    }

    // Payment history
    const paymentMultipliers = {
      'excellent': 0.98,
      'good': 1.0,
      'fair': 1.05,
      'poor': 1.15,
    };
    multiplier *= paymentMultipliers[profile.paymentHistory] || 1.0;
    descriptions.push(`${profile.paymentHistory} payment history`);

    return {
      description: descriptions.join(', '),
      multiplier: Math.round(multiplier * 100) / 100,
    };
  }

  private assessTimeOfTravelRisk(departureDate: string): { description: string; multiplier: number } {
    const departure = new Date(departureDate);
    const dayOfWeek = departure.getDay(); // 0 = Sunday
    const hour = departure.getHours();

    let multiplier = 1.0;
    const descriptions: string[] = [];

    // Weekend vs weekday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier *= 0.95;
      descriptions.push('weekend travel');
    }

    // Hour of day risk
    if (hour >= 2 && hour <= 5) {
      multiplier *= 0.9;
      descriptions.push('early morning departure');
    } else if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
      multiplier *= 1.15;
      descriptions.push('peak traffic hours');
    } else if (hour >= 22 || hour <= 1) {
      multiplier *= 1.05;
      descriptions.push('late night travel');
    }

    return {
      description: descriptions.length > 0 ? descriptions.join(', ') : 'standard timing',
      multiplier: Math.round(multiplier * 100) / 100,
    };
  }

  private getCurrentMarketConditions(): { description: string; multiplier: number } {
    // Simulate market conditions
    const conditions = [
      { condition: true, factor: 'stable market', multiplier: 1.0 },
      { condition: this.seededRandom() > 0.8, factor: 'high demand period', multiplier: 1.1 },
      { condition: this.seededRandom() > 0.9, factor: 'capacity shortage', multiplier: 1.15 },
      { condition: this.seededRandom() > 0.95, factor: 'market volatility', multiplier: 1.2 },
    ];

    const activeCondition = conditions.find(c => c.condition) || conditions[0];
    
    return {
      description: activeCondition.factor,
      multiplier: activeCondition.multiplier,
    };
  }

  private applyAdjustments(basePremium: number, factors: AdjustmentFactor[]): number {
    let adjustedPremium = basePremium;
    
    factors.forEach(factor => {
      adjustedPremium *= factor.multiplier;
    });

    return Math.round(adjustedPremium);
  }

  private calculateDiscounts(request: InsuranceQuoteRequest, premium: number): Discount[] {
    const discounts: Discount[] = [];

    // Volume discount
    if (request.customerProfile.volumeDiscount > 0) {
      discounts.push({
        type: 'volume_discount',
        description: `${request.customerProfile.volumeDiscount}% volume discount`,
        amount: Math.round(premium * request.customerProfile.volumeDiscount / 100),
        percentage: request.customerProfile.volumeDiscount,
        conditions: ['Minimum annual volume maintained'],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoApplied: true,
      });
    }

    // Safety record discount
    if (request.customerProfile.safetyRating >= 90) {
      const discount = request.customerProfile.safetyRating >= 95 ? 8 : 5;
      discounts.push({
        type: 'safety_record',
        description: `${discount}% safety excellence discount`,
        amount: Math.round(premium * discount / 100),
        percentage: discount,
        conditions: ['Maintain safety rating above 90%'],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoApplied: true,
      });
    }

    // Technology adoption discount
    const techFeatures = request.vehicleDetails.safetyFeatures.length;
    if (techFeatures >= 5) {
      discounts.push({
        type: 'technology_adoption',
        description: '3% advanced safety technology discount',
        amount: Math.round(premium * 0.03),
        percentage: 3,
        conditions: ['Advanced safety systems installed'],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoApplied: true,
      });
    }

    // Claims-free discount
    if (request.customerProfile.claimsHistory.length === 0) {
      discounts.push({
        type: 'claims_free',
        description: '5% claims-free discount',
        amount: Math.round(premium * 0.05),
        percentage: 5,
        conditions: ['No claims in past 24 months'],
        validUntil: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoApplied: true,
      });
    }

    return discounts;
  }

  private applyDiscounts(premium: number, discounts: Discount[]): number {
    const totalDiscount = discounts.reduce((sum, discount) => sum + discount.amount, 0);
    return Math.max(premium - totalDiscount, premium * 0.5); // Minimum 50% of original premium
  }

  private generateCoverageDetails(request: InsuranceQuoteRequest): CoverageDetails {
    return {
      cargoValue: request.shipmentDetails.cargoValue,
      liabilityLimit: Math.max(request.coverageRequirements.minimumLiability, 1000000),
      deductible: request.coverageRequirements.deductiblePreference,
      coverageTypes: request.coverageRequirements.coverageTypes,
      exclusions: [
        'War and terrorism',
        'Nuclear contamination',
        'Inherent vice of goods',
        'Insufficient packaging',
        'Acts of government',
      ],
      additionalBenefits: [
        '24/7 emergency response',
        'Real-time claim tracking',
        'Express claim processing',
        'Risk management consultation',
      ],
      claimsHandling: {
        maxProcessingTime: 48,
        emergencyContact: '+61-1800-CLAIMS',
        documentationRequired: [
          'Shipping documents',
          'Damage assessment report',
          'Police report (if applicable)',
          'Photos of damage',
        ],
      },
    };
  }

  private generateRiskAssessment(request: InsuranceQuoteRequest, factors: AdjustmentFactor[]): RiskAssessment {
    const riskScore = this.calculateOverallRiskScore(factors);
    const category = riskScore <= 25 ? 'low' : 
                    riskScore <= 50 ? 'medium' : 
                    riskScore <= 75 ? 'high' : 'extreme';

    return {
      overallRiskScore: riskScore,
      riskCategory: category,
      primaryRisks: factors
        .filter(f => f.multiplier > 1.1)
        .map(f => f.description)
        .slice(0, 3),
      mitigationMeasures: this.generateMitigationMeasures(factors),
      recommendedActions: this.generateRecommendedActions(category),
      assessmentDate: new Date().toISOString(),
      assessmentSource: 'ai_model',
      confidence: Math.round(factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length),
    };
  }

  private calculateOverallRiskScore(factors: AdjustmentFactor[]): number {
    const weightedScore = factors.reduce((sum, factor) => {
      const deviation = Math.abs(factor.multiplier - 1.0);
      return sum + (deviation * 100 * factor.confidence / 100);
    }, 0);

    return Math.min(Math.round(weightedScore * 10), 100);
  }

  private generateMitigationMeasures(factors: AdjustmentFactor[]): string[] {
    const measures: string[] = [];

    factors.forEach(factor => {
      if (factor.multiplier > 1.1) {
        switch (factor.factor) {
          case 'route_risk':
            measures.push('Use alternative routes during high-risk periods');
            break;
          case 'weather_conditions':
            measures.push('Monitor weather forecasts and delay if necessary');
            break;
          case 'driver_experience':
            measures.push('Assign experienced drivers for high-risk loads');
            break;
          case 'vehicle_condition':
            measures.push('Complete maintenance checks before departure');
            break;
          case 'time_of_travel':
            measures.push('Avoid peak traffic and dangerous driving hours');
            break;
        }
      }
    });

    if (measures.length === 0) {
      measures.push('Standard safety protocols apply');
    }

    return measures;
  }

  private generateRecommendedActions(category: string): string[] {
    const actions = {
      low: [
        'Proceed with standard safety protocols',
        'Monitor route conditions',
        'Maintain communication schedule',
      ],
      medium: [
        'Enhanced monitoring recommended',
        'Consider route optimization',
        'Verify vehicle condition',
        'Brief driver on specific risks',
      ],
      high: [
        'Mandatory risk briefing required',
        'Consider delaying shipment',
        'Use backup routes',
        'Increase monitoring frequency',
        'Verify insurance coverage adequacy',
      ],
      extreme: [
        'Recommend postponing shipment',
        'Management approval required',
        'Additional safety measures mandatory',
        'Consider partial load reduction',
        'Emergency response plan required',
      ],
    };

    return actions[category] || actions.medium;
  }

  private generatePaymentTerms(premium: number): PaymentTerms {
    return {
      paymentMethod: 'immediate',
      installments: 1,
      lateFeeRate: 0.02, // 2% per month
      earlyPaymentDiscount: 0.02, // 2% discount
      currency: 'AUD',
      taxRate: 0.10, // 10% GST
      totalAmount: Math.round(premium * 1.10), // Including GST
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Get current market conditions for pricing decisions
  getCurrentMarketConditions(): MarketConditions {
    return {
      insuranceMarketIndex: 95 + Math.floor(this.seededRandom() * 10), // 95-105
      capacityUtilization: 70 + Math.floor(this.seededRandom() * 30), // 70-100%
      reinsuranceRates: 2.5 + this.seededRandom() * 1.5, // 2.5-4.0%
      regulatoryChanges: [
        {
          factor: 'Dangerous goods regulations update',
          impact: 5, // 5% increase
          effectiveDate: '2024-07-01',
        },
      ],
      competitiveAnalysis: {
        averageMarketPremium: 850 + Math.floor(this.seededRandom() * 300),
        ourPosition: 'at',
        marketShare: 12.5,
      },
      economicIndicators: {
        inflationRate: 3.2,
        currencyStability: 92,
        commodityPrices: 105, // Index
      },
    };
  }

  // Get real-time pricing adjustments based on current conditions
  getRealTimePricingAdjustments(): DynamicPricingRule[] {
    return [
      {
        ruleId: 'HIGH_DEMAND_SURGE',
        name: 'High Demand Period Surcharge',
        condition: 'capacity_utilization > 90',
        action: { type: 'multiply', value: 1.15 },
        priority: 1,
        isActive: true,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        applicableRegions: ['All'],
        applicableCargoTypes: ['All'],
      },
      {
        ruleId: 'WEATHER_EMERGENCY',
        name: 'Severe Weather Emergency Surcharge',
        condition: 'weather_risk > critical',
        action: { type: 'multiply', value: 1.25 },
        priority: 2,
        isActive: this.seededRandom() > 0.8,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        applicableRegions: ['Perth', 'Fremantle'],
        applicableCargoTypes: ['Dangerous Goods'],
      },
      {
        ruleId: 'EARLY_BIRD_DISCOUNT',
        name: 'Early Booking Discount',
        condition: 'booking_advance_days > 7',
        action: { type: 'multiply', value: 0.95 },
        priority: 3,
        isActive: true,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applicableRegions: ['All'],
        applicableCargoTypes: ['All'],
      },
    ];
  }

  // Historical premium data for analytics
  getHistoricalPremiumData(customerId: string, days: number = 30): any[] {
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const basePremium = 800 + this.seededRandom() * 400;
      const adjustments = 0.9 + this.seededRandom() * 0.2;
      
      data.push({
        date: date.toISOString().split('T')[0],
        basePremium: Math.round(basePremium),
        adjustedPremium: Math.round(basePremium * adjustments),
        riskScore: Math.floor(this.seededRandom() * 100),
        claimsCount: Math.floor(this.seededRandom() * 3),
      });
    }
    return data;
  }

  private initializePricingModels(): PricingModel[] {
    return [
      {
        modelId: 'CARGO_RISK_V2',
        modelName: 'Cargo Risk Assessment Model',
        version: '2.1.4',
        accuracy: 92.3,
        lastTrained: '2024-06-15',
        features: ['cargo_value', 'hazard_class', 'route_risk', 'weather_conditions'],
        calibrationDate: '2024-06-20',
        performanceMetrics: {
          precision: 0.91,
          recall: 0.89,
          f1Score: 0.90,
          rocAuc: 0.94,
        },
      },
      {
        modelId: 'ROUTE_PREDICTION_V3',
        modelName: 'Route Risk Prediction Model',
        version: '3.0.2',
        accuracy: 88.7,
        lastTrained: '2024-06-10',
        features: ['distance', 'traffic_density', 'infrastructure_quality', 'historical_incidents'],
        calibrationDate: '2024-06-15',
        performanceMetrics: {
          precision: 0.87,
          recall: 0.90,
          f1Score: 0.88,
          rocAuc: 0.92,
        },
      },
    ];
  }

  private initializeDynamicRules(): DynamicPricingRule[] {
    return this.getRealTimePricingAdjustments();
  }

  // Insurance claim analysis for continuous model improvement
  analyzeClaimsTrends(): any {
    return {
      totalClaims: 45,
      averageClaimAmount: 15750,
      claimsByType: {
        'cargo_damage': 18,
        'theft': 8,
        'delay': 12,
        'third_party_liability': 5,
        'environmental_contamination': 2,
      },
      trendAnalysis: {
        monthOverMonth: 5.2, // % change
        seasonalPattern: 'Higher claims in summer months',
        predictedNextMonth: 48,
      },
      riskFactorImpact: {
        'route_risk': 0.35,
        'weather_conditions': 0.28,
        'cargo_hazard': 0.22,
        'driver_experience': 0.15,
      },
    };
  }
}

export const dynamicInsuranceService = new DynamicInsuranceService();
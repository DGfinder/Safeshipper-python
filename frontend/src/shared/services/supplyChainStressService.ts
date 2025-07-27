// supplyChainStressService.ts
// AI-powered supply chain stress monitoring and early warning system
// Identifies systemic risks and disruptions across the entire supply chain network

export interface StressIndicator {
  id: string;
  category: StressCategory;
  name: string;
  currentLevel: number; // 0-100 stress level
  threshold: number; // threshold for alert
  status: 'normal' | 'elevated' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'deteriorating' | 'volatile';
  lastUpdated: string;
  historicalData: HistoricalDataPoint[];
  affectedRegions: string[];
  estimatedImpact: StressImpact;
  mitigationStrategies: MitigationStrategy[];
  confidenceLevel: number; // 0-100
}

export type StressCategory = 
  | 'infrastructure'
  | 'capacity'
  | 'economic'
  | 'environmental'
  | 'regulatory'
  | 'technology'
  | 'labor'
  | 'fuel_energy'
  | 'geopolitical'
  | 'demand_volatility';

export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
  events: string[];
}

export interface StressImpact {
  delayProbability: number; // 0-100%
  costIncrease: number; // percentage
  capacityReduction: number; // percentage
  affectedShipments: number;
  estimatedFinancialImpact: number; // AUD
  recoveryTimeEstimate: number; // hours
  cascadeRisk: number; // 0-100 probability of spreading
}

export interface MitigationStrategy {
  id: string;
  strategy: string;
  effectiveness: number; // 0-100%
  implementationTime: number; // hours
  cost: number; // AUD
  prerequisites: string[];
  riskLevel: 'low' | 'medium' | 'high';
  automationPossible: boolean;
}

export interface SupplyChainAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  affectedIndicators: string[];
  affectedRoutes: string[];
  estimatedDuration: number; // hours
  recommendedActions: string[];
  timeToAct: number; // minutes until escalation
  potentialLoss: number; // AUD
  isSystemic: boolean;
}

export interface NetworkResilienceMetrics {
  overallHealthScore: number; // 0-100
  redundancyLevel: number; // 0-100
  adaptabilityScore: number; // 0-100
  recoveryCapability: number; // 0-100
  stressTestingResults: StressTestResult[];
  vulnerabilityAssessment: VulnerabilityArea[];
  contingencyPlansActive: number;
  emergencyResourcesAvailable: number;
}

export interface StressTestResult {
  scenario: string;
  testedDate: string;
  systemResponse: 'excellent' | 'good' | 'adequate' | 'poor' | 'failed';
  recoveryTime: number; // hours
  lessonsLearned: string[];
  improvementsImplemented: string[];
}

export interface VulnerabilityArea {
  area: string;
  riskLevel: number; // 0-100
  dependencies: string[];
  mitigation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface EconomicStressFactors {
  fuelPriceVolatility: number;
  exchangeRateImpact: number;
  inflationPressure: number;
  interestRateEffect: number;
  commodityPricing: number;
  laborCostTrends: number;
  insurancePremiumChanges: number;
  regulatoryComplianceCosts: number;
}

export interface EnvironmentalStressFactors {
  weatherPatterns: number;
  naturalDisasterRisk: number;
  seasonalVariations: number;
  climateChangeImpacts: number;
  airQualityRestrictions: number;
  emissionRegulations: number;
  sustainabilityPressures: number;
  carbonTaxImpacts: number;
}

class SupplyChainStressService {
  private seededRandom: any;

  constructor() {
    this.seededRandom = this.createSeededRandom(98765);
  }

  private createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }

  // Generate current stress indicators across all categories
  generateStressIndicators(): StressIndicator[] {
    const categories: StressCategory[] = [
      'infrastructure',
      'capacity',
      'economic',
      'environmental',
      'regulatory',
      'technology',
      'labor',
      'fuel_energy',
      'geopolitical',
      'demand_volatility',
    ];

    return categories.map(category => this.createStressIndicator(category));
  }

  private createStressIndicator(category: StressCategory): StressIndicator {
    const baseLevel = this.getBaseLevelForCategory(category);
    const currentLevel = Math.max(0, Math.min(100, baseLevel + (this.seededRandom() - 0.5) * 40));
    const threshold = this.getThresholdForCategory(category);
    
    return {
      id: `STRESS-${category.toUpperCase()}-${Date.now()}`,
      category,
      name: this.getIndicatorName(category),
      currentLevel: Math.round(currentLevel),
      threshold,
      status: this.determineStatus(currentLevel, threshold),
      trend: this.determineTrend(),
      lastUpdated: new Date().toISOString(),
      historicalData: this.generateHistoricalData(category, currentLevel),
      affectedRegions: this.getAffectedRegions(category, currentLevel),
      estimatedImpact: this.calculateStressImpact(category, currentLevel),
      mitigationStrategies: this.generateMitigationStrategies(category),
      confidenceLevel: Math.floor(this.seededRandom() * 20) + 75, // 75-95%
    };
  }

  private getBaseLevelForCategory(category: StressCategory): number {
    const baseLevels = {
      infrastructure: 25,
      capacity: 35,
      economic: 45,
      environmental: 30,
      regulatory: 20,
      technology: 15,
      labor: 40,
      fuel_energy: 50,
      geopolitical: 20,
      demand_volatility: 55,
    };
    return baseLevels[category] || 30;
  }

  private getThresholdForCategory(category: StressCategory): number {
    const thresholds = {
      infrastructure: 60,
      capacity: 70,
      economic: 65,
      environmental: 55,
      regulatory: 50,
      technology: 40,
      labor: 75,
      fuel_energy: 80,
      geopolitical: 45,
      demand_volatility: 85,
    };
    return thresholds[category] || 60;
  }

  private getIndicatorName(category: StressCategory): string {
    const names = {
      infrastructure: 'Infrastructure Capacity Stress',
      capacity: 'Transport Capacity Utilization',
      economic: 'Economic Pressure Index',
      environmental: 'Environmental Disruption Risk',
      regulatory: 'Regulatory Compliance Burden',
      technology: 'Technology System Reliability',
      labor: 'Workforce Availability Stress',
      fuel_energy: 'Fuel & Energy Price Volatility',
      geopolitical: 'Geopolitical Stability Index',
      demand_volatility: 'Demand Pattern Volatility',
    };
    return names[category] || 'Unknown Stress Indicator';
  }

  private determineStatus(level: number, threshold: number): 'normal' | 'elevated' | 'high' | 'critical' {
    if (level >= threshold * 1.5) return 'critical';
    if (level >= threshold) return 'high';
    if (level >= threshold * 0.7) return 'elevated';
    return 'normal';
  }

  private determineTrend(): 'improving' | 'stable' | 'deteriorating' | 'volatile' {
    const rand = this.seededRandom();
    if (rand < 0.2) return 'improving';
    if (rand < 0.6) return 'stable';
    if (rand < 0.9) return 'deteriorating';
    return 'volatile';
  }

  private generateHistoricalData(category: StressCategory, currentLevel: number): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = [];
    const hours = 168; // 7 days of hourly data
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000).toISOString();
      const variation = (this.seededRandom() - 0.5) * 20;
      const value = Math.max(0, Math.min(100, currentLevel + variation));
      
      data.push({
        timestamp,
        value: Math.round(value),
        events: this.generateEventsForTimepoint(category, value, i),
      });
    }
    
    return data;
  }

  private generateEventsForTimepoint(category: StressCategory, value: number, hoursAgo: number): string[] {
    if (value < 40 || this.seededRandom() > 0.3) return [];
    
    const events = {
      infrastructure: [
        'Bridge maintenance on Highway 1',
        'Port equipment malfunction',
        'Railway signal system upgrade',
        'Road construction delays',
      ],
      capacity: [
        'High demand surge detected',
        'Vehicle breakdown reduced fleet',
        'Seasonal capacity constraints',
        'Driver shortage reported',
      ],
      economic: [
        'Fuel price spike +8%',
        'Exchange rate fluctuation',
        'Interest rate adjustment',
        'Inflation data released',
      ],
      environmental: [
        'Severe weather warning issued',
        'Bushfire smoke affecting visibility',
        'Cyclone tracking toward coast',
        'Extreme heat advisory',
      ],
    };

    const categoryEvents = events[category as keyof typeof events] || ['Operational stress factor'];
    return [categoryEvents[Math.floor(this.seededRandom() * categoryEvents.length)]];
  }

  private getAffectedRegions(category: StressCategory, level: number): string[] {
    const allRegions = ['Perth', 'Melbourne', 'Sydney', 'Brisbane', 'Adelaide', 'Darwin', 'Hobart'];
    const affectedCount = Math.min(allRegions.length, Math.floor(level / 20) + 1);
    
    return allRegions
      .sort(() => this.seededRandom() - 0.5)
      .slice(0, affectedCount);
  }

  private calculateStressImpact(category: StressCategory, level: number): StressImpact {
    const severityMultiplier = level / 100;
    
    const baseImpacts = {
      infrastructure: {
        delayProbability: 60,
        costIncrease: 15,
        capacityReduction: 25,
        baseFinancialImpact: 50000,
      },
      capacity: {
        delayProbability: 70,
        costIncrease: 20,
        capacityReduction: 35,
        baseFinancialImpact: 75000,
      },
      economic: {
        delayProbability: 40,
        costIncrease: 25,
        capacityReduction: 10,
        baseFinancialImpact: 100000,
      },
      environmental: {
        delayProbability: 80,
        costIncrease: 30,
        capacityReduction: 40,
        baseFinancialImpact: 120000,
      },
      fuel_energy: {
        delayProbability: 30,
        costIncrease: 35,
        capacityReduction: 15,
        baseFinancialImpact: 85000,
      },
    };

    const impact = baseImpacts[category as keyof typeof baseImpacts] || {
      delayProbability: 50,
      costIncrease: 20,
      capacityReduction: 20,
      baseFinancialImpact: 60000,
    };

    return {
      delayProbability: Math.round(impact.delayProbability * severityMultiplier),
      costIncrease: Math.round(impact.costIncrease * severityMultiplier),
      capacityReduction: Math.round(impact.capacityReduction * severityMultiplier),
      affectedShipments: Math.floor(20 * severityMultiplier) + 5,
      estimatedFinancialImpact: Math.round(impact.baseFinancialImpact * severityMultiplier),
      recoveryTimeEstimate: Math.round(24 * severityMultiplier) + 6,
      cascadeRisk: Math.round(60 * severityMultiplier),
    };
  }

  private generateMitigationStrategies(category: StressCategory): MitigationStrategy[] {
    const strategies = {
      infrastructure: [
        {
          strategy: 'Activate alternative route protocols',
          effectiveness: 75,
          implementationTime: 2,
          cost: 5000,
          automationPossible: true,
        },
        {
          strategy: 'Deploy mobile infrastructure units',
          effectiveness: 60,
          implementationTime: 8,
          cost: 25000,
          automationPossible: false,
        },
      ],
      capacity: [
        {
          strategy: 'Implement dynamic capacity allocation',
          effectiveness: 80,
          implementationTime: 1,
          cost: 2000,
          automationPossible: true,
        },
        {
          strategy: 'Activate partnership network for additional capacity',
          effectiveness: 70,
          implementationTime: 4,
          cost: 15000,
          automationPossible: false,
        },
      ],
      economic: [
        {
          strategy: 'Adjust pricing models for economic conditions',
          effectiveness: 65,
          implementationTime: 6,
          cost: 1000,
          automationPossible: true,
        },
        {
          strategy: 'Negotiate fixed-rate contracts with suppliers',
          effectiveness: 85,
          implementationTime: 24,
          cost: 10000,
          automationPossible: false,
        },
      ],
    };

    const categoryStrategies = strategies[category as keyof typeof strategies] || [
      {
        strategy: 'Implement standard mitigation protocol',
        effectiveness: 70,
        implementationTime: 4,
        cost: 8000,
        automationPossible: false,
      },
    ];

    return categoryStrategies.map((strategy, index) => ({
      id: `MIT-${category.toUpperCase()}-${index + 1}`,
      strategy: strategy.strategy,
      effectiveness: strategy.effectiveness + Math.floor(this.seededRandom() * 10) - 5,
      implementationTime: strategy.implementationTime + Math.floor(this.seededRandom() * 2),
      cost: strategy.cost + Math.floor(this.seededRandom() * strategy.cost * 0.2),
      prerequisites: this.generatePrerequisites(strategy.strategy),
      riskLevel: strategy.cost > 20000 ? 'high' : strategy.cost > 8000 ? 'medium' : 'low',
      automationPossible: strategy.automationPossible,
    }));
  }

  private generatePrerequisites(strategy: string): string[] {
    if (strategy.includes('alternative route')) return ['Route mapping system', 'Traffic data access'];
    if (strategy.includes('partnership')) return ['Partner agreements', 'Capacity verification'];
    if (strategy.includes('pricing')) return ['Market analysis', 'Customer approval'];
    if (strategy.includes('mobile infrastructure')) return ['Equipment availability', 'Deployment team'];
    return ['Management approval', 'Resource allocation'];
  }

  // Generate current supply chain alerts
  generateSupplyChainAlerts(): SupplyChainAlert[] {
    const alerts: SupplyChainAlert[] = [];
    const alertCount = Math.floor(this.seededRandom() * 4) + 2; // 2-5 alerts

    for (let i = 0; i < alertCount; i++) {
      alerts.push(this.createSupplyChainAlert(i));
    }

    return alerts.sort((a, b) => {
      const severityOrder = { emergency: 4, critical: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private createSupplyChainAlert(index: number): SupplyChainAlert {
    const alertTypes = [
      {
        severity: 'critical' as const,
        title: 'Regional Transport Network Disruption',
        description: 'Major infrastructure failure affecting multiple transport corridors. Widespread delays expected across Perth-Kalgoorlie-Port Hedland network.',
        affectedRoutes: ['Perth-Kalgoorlie', 'Kalgoorlie-Port Hedland', 'Perth-Geraldton'],
        estimatedDuration: 18,
        isSystemic: true,
        potentialLoss: 250000,
      },
      {
        severity: 'warning' as const,
        title: 'Fuel Supply Chain Stress',
        description: 'Fuel price volatility and supply constraints detected. 15% cost increase likely over next 48 hours.',
        affectedRoutes: ['All long-haul routes'],
        estimatedDuration: 48,
        isSystemic: false,
        potentialLoss: 85000,
      },
      {
        severity: 'warning' as const,
        title: 'Labor Shortage Impact',
        description: 'Driver availability down 20% due to industrial action. Capacity constraints expected for next 72 hours.',
        affectedRoutes: ['Metro Perth', 'Perth-Fremantle'],
        estimatedDuration: 72,
        isSystemic: false,
        potentialLoss: 45000,
      },
      {
        severity: 'info' as const,
        title: 'Seasonal Demand Surge',
        description: 'Mining season demand spike detected. Current capacity utilization at 92%. Consider activating overflow protocols.',
        affectedRoutes: ['Mining routes', 'Port operations'],
        estimatedDuration: 168, // 1 week
        isSystemic: false,
        potentialLoss: 25000,
      },
    ];

    const alert = alertTypes[index % alertTypes.length];
    
    return {
      id: `ALERT-SC-${Date.now()}-${index}`,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      affectedIndicators: this.getAffectedIndicators(alert.title),
      affectedRoutes: alert.affectedRoutes,
      estimatedDuration: alert.estimatedDuration,
      recommendedActions: this.generateRecommendedActions(alert.severity, alert.title),
      timeToAct: this.calculateTimeToAct(alert.severity),
      potentialLoss: alert.potentialLoss,
      isSystemic: alert.isSystemic,
    };
  }

  private getAffectedIndicators(title: string): string[] {
    if (title.includes('Infrastructure')) return ['infrastructure', 'capacity'];
    if (title.includes('Fuel')) return ['fuel_energy', 'economic'];
    if (title.includes('Labor')) return ['labor', 'capacity'];
    if (title.includes('Demand')) return ['demand_volatility', 'capacity'];
    return ['infrastructure'];
  }

  private generateRecommendedActions(severity: string, title: string): string[] {
    const actionSets = {
      infrastructure: [
        'Activate alternative route protocols immediately',
        'Deploy emergency bridge/bypass solutions',
        'Coordinate with infrastructure authorities',
        'Implement customer communication protocols',
      ],
      fuel: [
        'Lock in fuel contracts at current rates',
        'Implement fuel efficiency measures',
        'Consider route optimization to reduce consumption',
        'Review pricing strategies for cost pass-through',
      ],
      labor: [
        'Activate contingency workforce plans',
        'Negotiate resolution with union representatives',
        'Implement overtime protocols for available staff',
        'Consider partnership arrangements for capacity',
      ],
      demand: [
        'Activate overflow capacity protocols',
        'Implement dynamic pricing for demand management',
        'Prioritize high-value shipments',
        'Coordinate with customers on timing flexibility',
      ],
    };

    if (title.includes('Infrastructure')) return actionSets.infrastructure;
    if (title.includes('Fuel')) return actionSets.fuel;
    if (title.includes('Labor')) return actionSets.labor;
    if (title.includes('Demand')) return actionSets.demand;
    
    return [
      'Assess situation and gather additional data',
      'Implement standard contingency protocols',
      'Monitor situation for escalation triggers',
    ];
  }

  private calculateTimeToAct(severity: string): number {
    const timeFrames = {
      emergency: 30,  // 30 minutes
      critical: 120,  // 2 hours
      warning: 360,   // 6 hours
      info: 1440,     // 24 hours
    };
    return timeFrames[severity as keyof typeof timeFrames] || 360;
  }

  // Generate network resilience metrics
  generateNetworkResilienceMetrics(): NetworkResilienceMetrics {
    return {
      overallHealthScore: Math.floor(this.seededRandom() * 20) + 75, // 75-95
      redundancyLevel: Math.floor(this.seededRandom() * 25) + 70, // 70-95
      adaptabilityScore: Math.floor(this.seededRandom() * 30) + 65, // 65-95
      recoveryCapability: Math.floor(this.seededRandom() * 20) + 80, // 80-100
      stressTestingResults: this.generateStressTestResults(),
      vulnerabilityAssessment: this.generateVulnerabilityAssessment(),
      contingencyPlansActive: Math.floor(this.seededRandom() * 8) + 12, // 12-20
      emergencyResourcesAvailable: Math.floor(this.seededRandom() * 15) + 85, // 85-100%
    };
  }

  private generateStressTestResults(): StressTestResult[] {
    return [
      {
        scenario: 'Major Highway Closure (Great Eastern Highway)',
        testedDate: '2024-06-15',
        systemResponse: 'good',
        recoveryTime: 4,
        lessonsLearned: ['Alternative routes needed better optimization', 'Customer communication protocols worked well'],
        improvementsImplemented: ['Enhanced route algorithm', 'Added SMS notification system'],
      },
      {
        scenario: 'Port of Fremantle 48-hour Closure',
        testedDate: '2024-05-20',
        systemResponse: 'adequate',
        recoveryTime: 12,
        lessonsLearned: ['Container storage capacity insufficient', 'Partnership agreements need strengthening'],
        improvementsImplemented: ['Increased offsite storage contracts', 'Negotiated backup port access'],
      },
      {
        scenario: 'Fuel Supply Disruption (72 hours)',
        testedDate: '2024-04-10',
        systemResponse: 'excellent',
        recoveryTime: 8,
        lessonsLearned: ['Fuel reserves lasted 96 hours', 'Route optimization reduced consumption by 18%'],
        improvementsImplemented: ['Increased reserve capacity', 'AI-powered fuel optimization'],
      },
    ];
  }

  private generateVulnerabilityAssessment(): VulnerabilityArea[] {
    return [
      {
        area: 'Single Point of Failure - Port Access',
        riskLevel: 75,
        dependencies: ['Fremantle Port', 'Container terminals', 'Rail connections'],
        mitigation: 'Develop alternative port partnerships and inland container depots',
        priority: 'high',
      },
      {
        area: 'Limited Route Redundancy - Remote Areas',
        riskLevel: 85,
        dependencies: ['Great Northern Highway', 'Road maintenance', 'Weather conditions'],
        mitigation: 'Invest in alternative transport modes and emergency bypass routes',
        priority: 'critical',
      },
      {
        area: 'Technology System Dependencies',
        riskLevel: 45,
        dependencies: ['GPS systems', 'Communication networks', 'Fleet management software'],
        mitigation: 'Implement redundant systems and offline backup procedures',
        priority: 'medium',
      },
      {
        area: 'Skilled Driver Shortage',
        riskLevel: 65,
        dependencies: ['Driver training programs', 'Competitive compensation', 'Working conditions'],
        mitigation: 'Expand training programs and improve driver retention strategies',
        priority: 'high',
      },
    ];
  }

  // Generate economic and environmental stress factors
  generateEconomicStressFactors(): EconomicStressFactors {
    return {
      fuelPriceVolatility: Math.floor(this.seededRandom() * 40) + 30, // 30-70
      exchangeRateImpact: Math.floor(this.seededRandom() * 30) + 20, // 20-50
      inflationPressure: Math.floor(this.seededRandom() * 35) + 25, // 25-60
      interestRateEffect: Math.floor(this.seededRandom() * 25) + 15, // 15-40
      commodityPricing: Math.floor(this.seededRandom() * 45) + 35, // 35-80
      laborCostTrends: Math.floor(this.seededRandom() * 30) + 40, // 40-70
      insurancePremiumChanges: Math.floor(this.seededRandom() * 20) + 25, // 25-45
      regulatoryComplianceCosts: Math.floor(this.seededRandom() * 25) + 30, // 30-55
    };
  }

  generateEnvironmentalStressFactors(): EnvironmentalStressFactors {
    return {
      weatherPatterns: Math.floor(this.seededRandom() * 50) + 40, // 40-90
      naturalDisasterRisk: Math.floor(this.seededRandom() * 30) + 20, // 20-50
      seasonalVariations: Math.floor(this.seededRandom() * 40) + 30, // 30-70
      climateChangeImpacts: Math.floor(this.seededRandom() * 35) + 45, // 45-80
      airQualityRestrictions: Math.floor(this.seededRandom() * 25) + 15, // 15-40
      emissionRegulations: Math.floor(this.seededRandom() * 30) + 50, // 50-80
      sustainabilityPressures: Math.floor(this.seededRandom() * 40) + 60, // 60-100
      carbonTaxImpacts: Math.floor(this.seededRandom() * 35) + 25, // 25-60
    };
  }

  // Calculate overall system health score
  calculateSystemHealthScore(indicators: StressIndicator[]): number {
    const weights = {
      infrastructure: 0.15,
      capacity: 0.15,
      economic: 0.12,
      environmental: 0.10,
      regulatory: 0.08,
      technology: 0.10,
      labor: 0.12,
      fuel_energy: 0.10,
      geopolitical: 0.05,
      demand_volatility: 0.03,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    indicators.forEach(indicator => {
      const weight = weights[indicator.category] || 0.1;
      const invertedLevel = 100 - indicator.currentLevel; // Invert so higher is better
      weightedSum += invertedLevel * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }
}

export const supplyChainStressService = new SupplyChainStressService();
// carbonCreditService.ts
// Automated carbon credit calculation, purchasing, and retirement tracking
// Supports Australia's Carbon Offset Protocol and international standards

export interface CarbonFootprint {
  shipmentId: string;
  route: string;
  distance: number; // kilometers
  fuelType: 'diesel' | 'electric' | 'hydrogen' | 'biodiesel';
  fuelConsumption: number; // liters or kWh
  cargoWeight: number; // tonnes
  co2Emissions: number; // tonnes CO2e
  scope1Emissions: number; // direct emissions
  scope2Emissions: number; // indirect emissions from electricity
  scope3Emissions: number; // other indirect emissions
  emissionFactors: EmissionFactors;
  calculationMethod: 'actual' | 'estimated' | 'industry_average';
  certificationStandard: 'NGER' | 'GHG_Protocol' | 'ISO14064' | 'CDP';
}

export interface EmissionFactors {
  diesel: number; // kg CO2e per liter
  electricity: number; // kg CO2e per kWh (state-specific)
  methane: number; // global warming potential multiplier
  refrigeration?: number; // for temperature-controlled transport
  containerType?: number; // adjustment factor for container efficiency
}

export interface CarbonCredit {
  creditId: string;
  provider: string;
  projectType: 'forestry' | 'renewable_energy' | 'methane_capture' | 'industrial_efficiency' | 'direct_air_capture';
  projectLocation: string;
  vintage: number; // year the reduction occurred
  quantity: number; // tonnes CO2e
  pricePerTonne: number; // AUD
  totalCost: number; // AUD
  certificationStandard: 'VCS' | 'Gold_Standard' | 'CAR' | 'CDM' | 'ACCUs';
  purchaseDate: string;
  retirementDate?: string;
  retirementReason: string;
  serialNumber: string;
  additionality: boolean; // whether the project is additional
  cobenefits: string[]; // biodiversity, community development, etc.
}

export interface CarbonCreditPurchaseRecommendation {
  recommendedQuantity: number; // tonnes CO2e
  estimatedCost: number; // AUD
  providers: CarbonCreditProvider[];
  reasoning: string;
  urgency: 'immediate' | 'this_month' | 'this_quarter';
  qualityScore: number; // 0-100 based on additionality, co-benefits, etc.
}

export interface CarbonCreditProvider {
  name: string;
  projectType: string;
  location: string;
  pricePerTonne: number;
  availableQuantity: number;
  qualityRating: number; // 0-100
  certificationStandard: string;
  cobenefits: string[];
  deliveryTime: string; // how quickly credits can be delivered
}

export interface SustainabilityReport {
  reportId: string;
  period: string;
  totalEmissions: number;
  offsetEmissions: number;
  netEmissions: number;
  offsetPercentage: number;
  carbonNeutralAchieved: boolean;
  totalCreditsCost: number;
  emissionsByScope: {
    scope1: number;
    scope2: number;
    scope3: number;
  };
  emissionsByRoute: RouteEmissions[];
  emissionsByCustomer: CustomerEmissions[];
  emissionsByFuelType: FuelTypeEmissions[];
  costPerTonneOffset: number;
  recommendations: string[];
  benchmarkComparison: BenchmarkData;
}

export interface RouteEmissions {
  route: string;
  totalEmissions: number;
  shipmentsCount: number;
  averageEmissionPerShipment: number;
  offsetCost: number;
}

export interface CustomerEmissions {
  customerId: string;
  customerName: string;
  totalEmissions: number;
  offsetEmissions: number;
  netEmissions: number;
  sustainabilityTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  offsetContribution: number; // how much customer contributed to offset costs
}

export interface FuelTypeEmissions {
  fuelType: string;
  totalEmissions: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface BenchmarkData {
  industryAverage: number; // kg CO2e per tonne-km
  companyPerformance: number;
  percentileRanking: number; // 0-100, where 100 is cleanest
  targetReduction: number; // percentage reduction target
}

class CarbonCreditService {
  private seededRandom: any;

  // Australian emission factors (NGER 2023)
  private readonly emissionFactors: EmissionFactors = {
    diesel: 2.68, // kg CO2e per liter
    electricity: 0.81, // kg CO2e per kWh (national average)
    methane: 25, // global warming potential
    refrigeration: 1.15, // multiplier for refrigerated transport
    containerType: 1.0, // standard container baseline
  };

  constructor() {
    this.seededRandom = this.createSeededRandom(54321);
  }

  private createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }

  // Calculate carbon footprint for a shipment
  calculateCarbonFootprint(shipment: any): CarbonFootprint {
    const route = `${shipment.origin || 'Perth'} → ${shipment.destination || 'Port Hedland'}`;
    const distance = this.calculateRouteDistance(shipment.origin, shipment.destination);
    const cargoWeight = shipment.weight || 25; // tonnes
    const fuelType = shipment.fuelType || 'diesel';
    
    // Calculate fuel consumption based on route, weight, and vehicle efficiency
    const baseConsumptionPer100km = 35; // liters per 100km for road train
    const weightMultiplier = 1 + (cargoWeight - 20) * 0.02; // 2% increase per extra tonne
    const terrainMultiplier = this.getTerrainMultiplier(shipment.origin, shipment.destination);
    
    const fuelConsumption = (distance / 100) * baseConsumptionPer100km * weightMultiplier * terrainMultiplier;
    
    // Calculate emissions
    const directEmissions = fuelConsumption * this.emissionFactors.diesel;
    const scope1Emissions = directEmissions;
    const scope2Emissions = 0; // no electricity for diesel trucks
    const scope3Emissions = directEmissions * 0.15; // upstream fuel production
    
    // Apply refrigeration multiplier if applicable
    const isRefrigerated = shipment.dangerousGoods?.some((dg: any) => 
      dg.temperatureControlled || dg.class === '2.2' // compressed gases often need cooling
    );
    
    const totalEmissions = (scope1Emissions + scope2Emissions + scope3Emissions) * 
      (isRefrigerated ? (this.emissionFactors.refrigeration || 1.2) : 1) / 1000; // convert to tonnes

    return {
      shipmentId: shipment.id,
      route,
      distance,
      fuelType,
      fuelConsumption: Math.round(fuelConsumption),
      cargoWeight,
      co2Emissions: Math.round(totalEmissions * 100) / 100,
      scope1Emissions: Math.round(scope1Emissions / 1000 * 100) / 100,
      scope2Emissions: Math.round(scope2Emissions / 1000 * 100) / 100,
      scope3Emissions: Math.round(scope3Emissions / 1000 * 100) / 100,
      emissionFactors: this.emissionFactors,
      calculationMethod: 'estimated',
      certificationStandard: 'NGER',
    };
  }

  private calculateRouteDistance(origin: string, destination: string): number {
    // Distance matrix for major WA routes (simplified)
    const distances: { [key: string]: number } = {
      'Perth-Port Hedland': 1638,
      'Perth-Karratha': 1532,
      'Perth-Newman': 1186,
      'Perth-Kalgoorlie': 595,
      'Perth-Geraldton': 424,
      'Perth-Albany': 417,
      'Perth-Broome': 2242,
      'Kalgoorlie-Port Hedland': 1203,
      'Newman-Port Hedland': 453,
      'Karratha-Port Hedland': 183,
    };

    const routeKey = `${origin}-${destination}`;
    const reverseKey = `${destination}-${origin}`;
    
    return distances[routeKey] || distances[reverseKey] || 800; // default distance
  }

  private getTerrainMultiplier(origin: string, destination: string): number {
    // Terrain affects fuel consumption
    const flatRoutes = ['Perth-Geraldton', 'Perth-Albany'];
    const hillyRoutes = ['Perth-Kalgoorlie', 'Perth-Newman'];
    const mountainousRoutes = ['Perth-Port Hedland', 'Perth-Karratha'];

    const route = `${origin}-${destination}`;
    
    if (flatRoutes.some(r => route.includes(r.split('-')[0]) && route.includes(r.split('-')[1]))) {
      return 0.95; // 5% less fuel on flat terrain
    }
    if (hillyRoutes.some(r => route.includes(r.split('-')[0]) && route.includes(r.split('-')[1]))) {
      return 1.10; // 10% more fuel on hilly terrain
    }
    if (mountainousRoutes.some(r => route.includes(r.split('-')[0]) && route.includes(r.split('-')[1]))) {
      return 1.20; // 20% more fuel on mountainous terrain
    }
    
    return 1.0; // neutral terrain
  }

  // Generate carbon credit providers and recommendations
  generateCarbonCreditRecommendation(totalEmissions: number): CarbonCreditPurchaseRecommendation {
    const providers = this.generateCarbonCreditProviders();
    
    // Recommend slightly more credits than emissions for buffer
    const recommendedQuantity = Math.ceil(totalEmissions * 1.1);
    
    // Calculate weighted average price based on quality scores
    const qualityWeightedPrice = providers.reduce((sum, provider) => 
      sum + (provider.pricePerTonne * provider.qualityRating / 100), 0
    ) / providers.length;
    
    const estimatedCost = recommendedQuantity * qualityWeightedPrice;
    
    return {
      recommendedQuantity,
      estimatedCost: Math.round(estimatedCost),
      providers: providers.slice(0, 5), // top 5 providers
      reasoning: this.generatePurchaseReasoning(totalEmissions, recommendedQuantity),
      urgency: totalEmissions > 100 ? 'immediate' : totalEmissions > 50 ? 'this_month' : 'this_quarter',
      qualityScore: Math.round(providers.reduce((sum, p) => sum + p.qualityRating, 0) / providers.length),
    };
  }

  private generateCarbonCreditProviders(): CarbonCreditProvider[] {
    const providers = [
      {
        name: 'Tasmanian Forest Conservation',
        projectType: 'forestry',
        location: 'Tasmania, Australia',
        pricePerTonne: 15.50,
        availableQuantity: 50000,
        qualityRating: 95,
        certificationStandard: 'VCS',
        cobenefits: ['Biodiversity protection', 'Soil conservation', 'Water quality'],
        deliveryTime: '2-3 weeks',
      },
      {
        name: 'Nullarbor Solar Farm',
        projectType: 'renewable_energy',
        location: 'South Australia',
        pricePerTonne: 22.75,
        availableQuantity: 25000,
        qualityRating: 88,
        certificationStandard: 'Gold_Standard',
        cobenefits: ['Clean energy generation', 'Job creation'],
        deliveryTime: '1-2 weeks',
      },
      {
        name: 'Pilbara Methane Capture',
        projectType: 'methane_capture',
        location: 'Western Australia',
        pricePerTonne: 18.25,
        availableQuantity: 35000,
        qualityRating: 92,
        certificationStandard: 'ACCUs',
        cobenefits: ['Air quality improvement', 'Local employment'],
        deliveryTime: '1 week',
      },
      {
        name: 'Queensland Biomass Energy',
        projectType: 'industrial_efficiency',
        location: 'Queensland, Australia',
        pricePerTonne: 20.00,
        availableQuantity: 15000,
        qualityRating: 85,
        certificationStandard: 'VCS',
        cobenefits: ['Waste reduction', 'Energy security'],
        deliveryTime: '2-4 weeks',
      },
      {
        name: 'Murray River Restoration',
        projectType: 'forestry',
        location: 'New South Wales, Australia',
        pricePerTonne: 16.80,
        availableQuantity: 40000,
        qualityRating: 90,
        certificationStandard: 'VCS',
        cobenefits: ['Wetland restoration', 'Wildlife habitat', 'Carbon sequestration'],
        deliveryTime: '3-4 weeks',
      },
      {
        name: 'Direct Air Capture Australia',
        projectType: 'direct_air_capture',
        location: 'Victoria, Australia',
        pricePerTonne: 45.00,
        availableQuantity: 5000,
        qualityRating: 98,
        certificationStandard: 'Gold_Standard',
        cobenefits: ['Permanent removal', 'Technology advancement'],
        deliveryTime: '4-6 weeks',
      },
    ];

    // Sort by quality rating and price
    return providers.sort((a, b) => {
      const aScore = a.qualityRating * 0.7 + (50 - a.pricePerTonne) * 0.3;
      const bScore = b.qualityRating * 0.7 + (50 - b.pricePerTonne) * 0.3;
      return bScore - aScore;
    });
  }

  private generatePurchaseReasoning(totalEmissions: number, recommendedQuantity: number): string {
    const buffer = ((recommendedQuantity - totalEmissions) / totalEmissions * 100).toFixed(0);
    
    let reasoning = `Recommending ${recommendedQuantity} tonnes to offset ${totalEmissions} tonnes of emissions `;
    reasoning += `with a ${buffer}% buffer for measurement uncertainty. `;
    
    if (totalEmissions > 100) {
      reasoning += 'Immediate purchase recommended due to high emission volume. ';
    }
    
    reasoning += 'Prioritizing Australian projects for local co-benefits and faster delivery.';
    
    return reasoning;
  }

  // Generate automated carbon credit purchases
  generateAutomatedPurchases(monthlyEmissions: number): CarbonCredit[] {
    const purchases: CarbonCredit[] = [];
    const providers = this.generateCarbonCreditProviders();
    let remainingEmissions = monthlyEmissions;

    // Diversify purchases across providers
    while (remainingEmissions > 0 && purchases.length < 3) {
      const provider = providers[purchases.length % providers.length];
      const purchaseQuantity = Math.min(
        Math.ceil(remainingEmissions * (0.3 + this.seededRandom() * 0.4)), // 30-70% of remaining
        provider.availableQuantity,
        remainingEmissions
      );

      const purchase: CarbonCredit = {
        creditId: `CC-${Date.now()}-${purchases.length + 1}`,
        provider: provider.name,
        projectType: provider.projectType as any,
        projectLocation: provider.location,
        vintage: 2023,
        quantity: purchaseQuantity,
        pricePerTonne: provider.pricePerTonne,
        totalCost: Math.round(purchaseQuantity * provider.pricePerTonne),
        certificationStandard: provider.certificationStandard as any,
        purchaseDate: new Date().toISOString(),
        retirementReason: `Offsetting transport emissions for OutbackHaul Transport`,
        serialNumber: `${provider.certificationStandard}-${Date.now()}-${purchaseQuantity}`,
        additionality: provider.qualityRating > 85,
        cobenefits: provider.cobenefits,
      };

      purchases.push(purchase);
      remainingEmissions -= purchaseQuantity;
    }

    return purchases;
  }

  // Generate comprehensive sustainability report
  generateSustainabilityReport(timeframe: 'monthly' | 'quarterly' | 'annual'): SustainabilityReport {
    const totalEmissions = this.calculateTotalEmissions(timeframe);
    const offsetEmissions = this.calculateTotalOffsets(timeframe);
    const netEmissions = Math.max(0, totalEmissions - offsetEmissions);
    const offsetPercentage = Math.round((offsetEmissions / totalEmissions) * 100);
    
    return {
      reportId: `SR-${Date.now()}`,
      period: this.getPeriodString(timeframe),
      totalEmissions: Math.round(totalEmissions * 100) / 100,
      offsetEmissions: Math.round(offsetEmissions * 100) / 100,
      netEmissions: Math.round(netEmissions * 100) / 100,
      offsetPercentage,
      carbonNeutralAchieved: offsetPercentage >= 100,
      totalCreditsCost: Math.round(offsetEmissions * 18.50), // average price
      emissionsByScope: {
        scope1: Math.round(totalEmissions * 0.75 * 100) / 100,
        scope2: Math.round(totalEmissions * 0.10 * 100) / 100,
        scope3: Math.round(totalEmissions * 0.15 * 100) / 100,
      },
      emissionsByRoute: this.generateRouteEmissions(),
      emissionsByCustomer: this.generateCustomerEmissions(),
      emissionsByFuelType: this.generateFuelTypeEmissions(),
      costPerTonneOffset: Math.round((offsetEmissions * 18.50) / offsetEmissions * 100) / 100,
      recommendations: this.generateSustainabilityRecommendations(offsetPercentage, totalEmissions),
      benchmarkComparison: this.generateBenchmarkData(totalEmissions),
    };
  }

  private calculateTotalEmissions(timeframe: string): number {
    // Simulate emissions based on timeframe
    const monthlyBase = 150; // tonnes per month
    const multiplier = timeframe === 'annual' ? 12 : timeframe === 'quarterly' ? 3 : 1;
    return monthlyBase * multiplier * (0.9 + this.seededRandom() * 0.2); // ±10% variation
  }

  private calculateTotalOffsets(timeframe: string): number {
    const totalEmissions = this.calculateTotalEmissions(timeframe);
    // Assume 85-95% offset rate
    return totalEmissions * (0.85 + this.seededRandom() * 0.1);
  }

  private getPeriodString(timeframe: string): string {
    const now = new Date();
    switch (timeframe) {
      case 'annual': return `${now.getFullYear()}`;
      case 'quarterly': return `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
      case 'monthly': return now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      default: return 'Current Period';
    }
  }

  private generateRouteEmissions(): RouteEmissions[] {
    const routes = [
      'Perth → Port Hedland',
      'Perth → Karratha', 
      'Perth → Newman',
      'Perth → Kalgoorlie',
      'Perth → Geraldton',
    ];

    return routes.map(route => {
      const shipmentsCount = Math.floor(this.seededRandom() * 20) + 5;
      const totalEmissions = shipmentsCount * (15 + this.seededRandom() * 10);
      
      return {
        route,
        totalEmissions: Math.round(totalEmissions * 100) / 100,
        shipmentsCount,
        averageEmissionPerShipment: Math.round((totalEmissions / shipmentsCount) * 100) / 100,
        offsetCost: Math.round(totalEmissions * 18.50),
      };
    });
  }

  private generateCustomerEmissions(): CustomerEmissions[] {
    const customers = [
      { name: 'Fortescue Metals Group', tier: 'platinum' as const },
      { name: 'Rio Tinto Iron Ore', tier: 'platinum' as const },
      { name: 'BHP Billiton Mining', tier: 'gold' as const },
      { name: 'Chevron Australia', tier: 'gold' as const },
      { name: 'Woodside Petroleum', tier: 'silver' as const },
    ];

    return customers.map((customer, index) => {
      const totalEmissions = 20 + this.seededRandom() * 40;
      const offsetPercentage = customer.tier === 'platinum' ? 1.0 : 
                             customer.tier === 'gold' ? 0.9 : 0.8;
      const offsetEmissions = totalEmissions * offsetPercentage;
      
      return {
        customerId: `cust-${index + 1}`,
        customerName: customer.name,
        totalEmissions: Math.round(totalEmissions * 100) / 100,
        offsetEmissions: Math.round(offsetEmissions * 100) / 100,
        netEmissions: Math.round((totalEmissions - offsetEmissions) * 100) / 100,
        sustainabilityTier: customer.tier,
        offsetContribution: Math.round(offsetEmissions * 18.50),
      };
    });
  }

  private generateFuelTypeEmissions(): FuelTypeEmissions[] {
    return [
      {
        fuelType: 'Diesel',
        totalEmissions: 125.8,
        percentage: 85.2,
        trend: 'decreasing',
      },
      {
        fuelType: 'Biodiesel Blend',
        totalEmissions: 18.4,
        percentage: 12.5,
        trend: 'increasing',
      },
      {
        fuelType: 'Electric',
        totalEmissions: 3.4,
        percentage: 2.3,
        trend: 'increasing',
      },
    ];
  }

  private generateSustainabilityRecommendations(offsetPercentage: number, totalEmissions: number): string[] {
    const recommendations: string[] = [];

    if (offsetPercentage < 80) {
      recommendations.push('Increase carbon offset purchases to achieve 100% carbon neutrality');
      recommendations.push('Consider investing in higher-quality offset projects with permanent removal');
    }

    if (totalEmissions > 100) {
      recommendations.push('Implement fuel efficiency training for drivers to reduce emissions by 5-10%');
      recommendations.push('Evaluate route optimization to minimize empty miles and fuel consumption');
    }

    recommendations.push('Consider transitioning to electric vehicles for shorter urban routes');
    recommendations.push('Invest in aerodynamic improvements and low-rolling resistance tires');
    recommendations.push('Explore partnerships with renewable energy providers for depot operations');

    return recommendations;
  }

  private generateBenchmarkData(totalEmissions: number): BenchmarkData {
    // Assume company performance based on emissions per unit
    const companyPerformance = 0.045; // kg CO2e per tonne-km
    const industryAverage = 0.052; // industry baseline
    const percentileRanking = Math.round((1 - companyPerformance / industryAverage) * 100);

    return {
      industryAverage,
      companyPerformance: companyPerformance,
      percentileRanking,
      targetReduction: 15, // 15% reduction target
    };
  }
}

export const carbonCreditService = new CarbonCreditService();
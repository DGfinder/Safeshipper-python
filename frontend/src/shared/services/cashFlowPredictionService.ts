// cashFlowPredictionService.ts
// AI-powered predictive cash flow management for transport logistics
// Analyzes payment patterns, seasonal trends, and economic indicators

export interface CustomerPaymentProfile {
  customerId: string;
  customerName: string;
  averagePaymentDays: number;
  paymentReliability: number; // 0-100 score
  seasonalVariation: number; // multiplier for seasonal effects
  creditRating: 'A' | 'B' | 'C' | 'D';
  paymentHistory: PaymentRecord[];
  riskFactors: string[];
}

export interface PaymentRecord {
  invoiceId: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  daysOverdue: number;
  status: 'paid' | 'overdue' | 'pending';
}

export interface CashFlowPrediction {
  date: string;
  expectedInflow: number;
  confirmedInflow: number;
  predictedOutflow: number;
  netCashFlow: number;
  confidence: number; // 0-100 percentage
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface WorkingCapitalInsight {
  currentWorkingCapital: number;
  projectedNeed: number;
  surplusOrDeficit: number;
  daysOfOperationsCovered: number;
  recommendations: WorkingCapitalRecommendation[];
}

export interface WorkingCapitalRecommendation {
  type: 'credit_line' | 'payment_terms' | 'collection_acceleration' | 'expense_deferral';
  description: string;
  impact: number; // expected cash flow impact
  urgency: 'immediate' | 'week' | 'month';
  feasibility: number; // 0-100 score
}

export interface EconomicIndicator {
  indicator: string;
  currentValue: number;
  trend: 'rising' | 'falling' | 'stable';
  impactOnPayments: number; // correlation coefficient
}

class CashFlowPredictionService {
  private seededRandom: any;

  constructor() {
    // Deterministic random for consistent demo data
    this.seededRandom = this.createSeededRandom(12345);
  }

  private createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }

  // Generate customer payment profiles based on historical data
  generateCustomerPaymentProfiles(): CustomerPaymentProfile[] {
    const customers = [
      { name: 'Fortescue Metals Group', tier: 'PLATINUM', reliability: 95 },
      { name: 'Rio Tinto Iron Ore', tier: 'PLATINUM', reliability: 92 },
      { name: 'BHP Billiton Mining', tier: 'GOLD', reliability: 88 },
      { name: 'Chevron Australia', tier: 'GOLD', reliability: 85 },
      { name: 'Woodside Petroleum', tier: 'GOLD', reliability: 87 },
      { name: 'Alcoa Australia', tier: 'SILVER', reliability: 78 },
      { name: 'Newmont Mining', tier: 'SILVER', reliability: 75 },
      { name: 'Santos Energy', tier: 'BRONZE', reliability: 68 },
    ];

    return customers.map((customer, index) => {
      const paymentDays = this.calculateAveragePaymentDays(customer.tier, customer.reliability);
      const seasonalVar = 0.8 + this.seededRandom() * 0.4; // 0.8 to 1.2 multiplier

      return {
        customerId: `cust-${index + 1}`,
        customerName: customer.name,
        averagePaymentDays: paymentDays,
        paymentReliability: customer.reliability,
        seasonalVariation: seasonalVar,
        creditRating: this.getCreditRating(customer.reliability),
        paymentHistory: this.generatePaymentHistory(customer.name, paymentDays),
        riskFactors: this.generateRiskFactors(customer.tier, customer.reliability),
      };
    });
  }

  private calculateAveragePaymentDays(tier: string, reliability: number): number {
    const baseDays = {
      'PLATINUM': 28,
      'GOLD': 32,
      'SILVER': 38,
      'BRONZE': 45,
    }[tier] || 45;

    // Adjust based on reliability
    const reliabilityAdjustment = (100 - reliability) * 0.3;
    return Math.round(baseDays + reliabilityAdjustment);
  }

  private getCreditRating(reliability: number): 'A' | 'B' | 'C' | 'D' {
    if (reliability >= 90) return 'A';
    if (reliability >= 80) return 'B';
    if (reliability >= 70) return 'C';
    return 'D';
  }

  private generatePaymentHistory(customerName: string, avgDays: number): PaymentRecord[] {
    const records: PaymentRecord[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const invoiceDate = new Date(now.getTime() - (30 * i * 24 * 60 * 60 * 1000));
      const dueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const variation = (this.seededRandom() - 0.5) * 10; // ±5 days variation
      const actualPaymentDays = Math.max(1, avgDays + variation);
      const paidDate = new Date(dueDate.getTime() + (actualPaymentDays * 24 * 60 * 60 * 1000));
      
      const amount = 50000 + this.seededRandom() * 200000; // $50k to $250k
      const daysOverdue = Math.max(0, actualPaymentDays - 30);

      records.push({
        invoiceId: `INV-${customerName.substring(0, 3).toUpperCase()}-${i + 1}`,
        amount: Math.round(amount),
        dueDate: dueDate.toISOString(),
        paidDate: i < 2 ? null : paidDate.toISOString(), // Most recent 2 are pending
        daysOverdue,
        status: i < 2 ? 'pending' : (daysOverdue > 0 ? 'overdue' : 'paid'),
      });
    }

    return records.reverse(); // Oldest first
  }

  private generateRiskFactors(tier: string, reliability: number): string[] {
    const allRiskFactors = [
      'Seasonal payment delays in Q4',
      'Large project payment dependencies',
      'Government approval delays',
      'Commodity price volatility impact',
      'New finance team - process changes',
      'Recent merger affecting payment systems',
      'Export market payment delays',
      'Currency hedging impacts',
      'Supply chain disruption costs',
      'Environmental compliance costs',
    ];

    const riskCount = tier === 'BRONZE' ? 3 : tier === 'SILVER' ? 2 : 1;
    const selectedRisks: string[] = [];

    for (let i = 0; i < riskCount; i++) {
      const index = Math.floor(this.seededRandom() * allRiskFactors.length);
      selectedRisks.push(allRiskFactors[index]);
    }

    return selectedRisks;
  }

  // Generate cash flow predictions for the next 90 days
  generateCashFlowPredictions(): CashFlowPrediction[] {
    const predictions: CashFlowPrediction[] = [];
    const startDate = new Date();
    const customers = this.generateCustomerPaymentProfiles();

    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const prediction = this.calculateDailyCashFlow(date, customers);
      predictions.push(prediction);
    }

    return predictions;
  }

  private calculateDailyCashFlow(date: Date, customers: CustomerPaymentProfile[]): CashFlowPrediction {
    // Simulate expected payments based on customer patterns
    let expectedInflow = 0;
    let confirmedInflow = 0;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Reduce payments on weekends
    const weekendMultiplier = isWeekend ? 0.1 : 1.0;

    customers.forEach(customer => {
      // Calculate probability of payment on this day
      const paymentProbability = this.calculatePaymentProbability(date, customer);
      const averageInvoiceAmount = 125000; // Average invoice amount
      
      expectedInflow += paymentProbability * averageInvoiceAmount * weekendMultiplier;
      
      // Confirmed payments (high confidence)
      if (paymentProbability > 0.8) {
        confirmedInflow += averageInvoiceAmount * weekendMultiplier;
      }
    });

    // Simulate operational expenses
    const dailyOperatingCost = 85000; // Daily operating expenses
    const predictedOutflow = dailyOperatingCost + (this.seededRandom() * 20000); // Add variation

    const netCashFlow = expectedInflow - predictedOutflow;
    const confidence = this.calculateConfidence(date, expectedInflow);
    const riskLevel = this.assessRiskLevel(netCashFlow, confidence);

    return {
      date: date.toISOString().split('T')[0],
      expectedInflow: Math.round(expectedInflow),
      confirmedInflow: Math.round(confirmedInflow),
      predictedOutflow: Math.round(predictedOutflow),
      netCashFlow: Math.round(netCashFlow),
      confidence,
      riskLevel,
      recommendations: this.generateRecommendations(riskLevel, netCashFlow),
    };
  }

  private calculatePaymentProbability(date: Date, customer: CustomerPaymentProfile): number {
    // Base probability based on payment patterns
    const baseProbability = customer.paymentReliability / 100 * 0.1; // 10% of reliability as daily probability
    
    // Adjust for seasonal variations
    const month = date.getMonth();
    const seasonalAdjustment = this.getSeasonalAdjustment(month);
    
    // Adjust for day of month (more payments at month-end)
    const dayOfMonth = date.getDate();
    const monthEndBoost = dayOfMonth > 25 ? 1.5 : dayOfMonth < 5 ? 1.2 : 1.0;

    return Math.min(1.0, baseProbability * seasonalAdjustment * monthEndBoost * customer.seasonalVariation);
  }

  private getSeasonalAdjustment(month: number): number {
    // Australian business patterns
    const seasonalFactors = {
      0: 0.7,  // January - holiday slowdown
      1: 1.1,  // February - back to business
      2: 1.0,  // March
      3: 0.9,  // April - Easter
      4: 1.0,  // May
      5: 1.1,  // June - end of financial year
      6: 0.8,  // July - new financial year setup
      7: 1.0,  // August
      8: 1.0,  // September
      9: 1.1,  // October
      10: 1.0, // November
      11: 0.6, // December - holiday slowdown
    };
    return seasonalFactors[month as keyof typeof seasonalFactors] || 1.0;
  }

  private calculateConfidence(date: Date, expectedInflow: number): number {
    const daysOut = Math.floor((date.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
    
    // Confidence decreases over time
    let baseConfidence = Math.max(20, 95 - (daysOut * 0.8));
    
    // Higher confidence for larger expected inflows (more data points)
    if (expectedInflow > 200000) baseConfidence += 5;
    if (expectedInflow < 50000) baseConfidence -= 10;

    return Math.round(Math.max(20, Math.min(95, baseConfidence)));
  }

  private assessRiskLevel(netCashFlow: number, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (netCashFlow < -100000 && confidence > 70) return 'critical';
    if (netCashFlow < -50000) return 'high';
    if (netCashFlow < 0 || confidence < 60) return 'medium';
    return 'low';
  }

  private generateRecommendations(riskLevel: string, netCashFlow: number): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('Immediate action required: Activate emergency credit line');
        recommendations.push('Accelerate collection of overdue accounts');
        recommendations.push('Defer non-essential payments');
        break;
      case 'high':
        recommendations.push('Consider drawing on credit facilities');
        recommendations.push('Contact customers with pending large payments');
        recommendations.push('Review and prioritize upcoming expenses');
        break;
      case 'medium':
        recommendations.push('Monitor cash position closely');
        recommendations.push('Prepare contingency funding if needed');
        break;
      case 'low':
        if (netCashFlow > 100000) {
          recommendations.push('Consider investing surplus cash');
          recommendations.push('Evaluate early payment opportunities for discounts');
        }
        break;
    }

    return recommendations;
  }

  // Generate working capital insights and recommendations
  generateWorkingCapitalInsights(): WorkingCapitalInsight {
    const currentWorkingCapital = 2500000; // $2.5M current
    const dailyOperatingCost = 85000;
    const predictions = this.generateCashFlowPredictions();

    // Calculate minimum cash needed in next 30 days
    const next30Days = predictions.slice(0, 30);
    const minCashFlow = Math.min(...next30Days.map(p => p.netCashFlow));
    const projectedNeed = Math.abs(Math.min(0, minCashFlow)) + (dailyOperatingCost * 7); // 1 week buffer

    const surplusOrDeficit = currentWorkingCapital - projectedNeed;
    const daysOfOperations = currentWorkingCapital / dailyOperatingCost;

    return {
      currentWorkingCapital,
      projectedNeed,
      surplusOrDeficit,
      daysOfOperationsCovered: Math.round(daysOfOperations),
      recommendations: this.generateWorkingCapitalRecommendations(surplusOrDeficit, daysOfOperations),
    };
  }

  private generateWorkingCapitalRecommendations(surplus: number, daysOfOps: number): WorkingCapitalRecommendation[] {
    const recommendations: WorkingCapitalRecommendation[] = [];

    if (surplus < 0) {
      // Deficit situation
      recommendations.push({
        type: 'credit_line',
        description: `Establish ${Math.abs(surplus).toLocaleString()} AUD credit line`,
        impact: Math.abs(surplus),
        urgency: 'immediate',
        feasibility: 85,
      });

      recommendations.push({
        type: 'collection_acceleration',
        description: 'Implement early payment discounts (2% for 10 days)',
        impact: surplus * 0.3,
        urgency: 'week',
        feasibility: 90,
      });
    } else if (surplus > 1000000) {
      // Surplus situation
      recommendations.push({
        type: 'credit_line',
        description: 'Consider investing surplus in short-term securities',
        impact: surplus * 0.03, // 3% annual return
        urgency: 'month',
        feasibility: 75,
      });
    }

    if (daysOfOps < 30) {
      recommendations.push({
        type: 'payment_terms',
        description: 'Negotiate extended payment terms with key suppliers',
        impact: 500000,
        urgency: 'week',
        feasibility: 70,
      });
    }

    return recommendations;
  }

  // Get economic indicators that affect payment patterns
  getEconomicIndicators(): EconomicIndicator[] {
    return [
      {
        indicator: 'Iron Ore Price (USD/tonne)',
        currentValue: 125.50,
        trend: 'rising',
        impactOnPayments: 0.75, // Strong positive correlation
      },
      {
        indicator: 'AUD/USD Exchange Rate',
        currentValue: 0.67,
        trend: 'stable',
        impactOnPayments: 0.45,
      },
      {
        indicator: 'RBA Cash Rate (%)',
        currentValue: 4.35,
        trend: 'stable',
        impactOnPayments: -0.3, // Higher rates = slower payments
      },
      {
        indicator: 'Mining Sector Index',
        currentValue: 2840,
        trend: 'rising',
        impactOnPayments: 0.65,
      },
      {
        indicator: 'Diesel Price (AUD/L)',
        currentValue: 1.85,
        trend: 'rising',
        impactOnPayments: -0.25, // Higher costs = slower payments
      },
    ];
  }
}

export const cashFlowPredictionService = new CashFlowPredictionService();
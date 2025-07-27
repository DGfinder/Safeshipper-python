// app/insurance-pricing/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Shield,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Target,
  Settings,
  Download,
  RefreshCw,
  Brain,
  Lightbulb,
  Award,
  Truck,
  MapPin,
  Calendar,
  Filter,
  Search,
  Plus,
  Edit,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import {
  useMarketConditions,
  useRealTimePricingRules,
  useInsuranceAnalytics,
  usePremiumSimulation,
  useRiskFactorAnalysis,
  useCompetitiveAnalysis,
  usePremiumOptimization,
  useInsuranceQuote,
} from "@/shared/hooks/useDynamicInsurance";

export default function DynamicInsurancePricingDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const { data: marketConditions, isLoading: marketLoading } = useMarketConditions();
  const { data: pricingRules, isLoading: rulesLoading } = useRealTimePricingRules();
  const { data: analytics, isLoading: analyticsLoading } = useInsuranceAnalytics();
  const { data: simulations, isLoading: simulationsLoading } = usePremiumSimulation();
  const { data: riskAnalysis, isLoading: riskLoading } = useRiskFactorAnalysis();
  const { data: competitiveData, isLoading: competitiveLoading } = useCompetitiveAnalysis();
  const { data: optimization, isLoading: optimizationLoading } = usePremiumOptimization();
  const quoteGeneration = useInsuranceQuote();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'extreme': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'extreme': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRuleStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  // Prepare chart data
  const riskDistributionData = analytics?.riskDistribution ? 
    Object.entries(analytics.riskDistribution).map(([risk, value]) => ({
      risk: risk.charAt(0).toUpperCase() + risk.slice(1),
      value,
      percentage: Math.round((value / Object.values(analytics.riskDistribution).reduce((a, b) => a + b, 0)) * 100),
    })) : [];

  const RISK_COLORS = {
    Low: '#10b981',
    Medium: '#f59e0b', 
    High: '#f97316',
    Extreme: '#ef4444',
  };

  const competitorData = competitiveData?.competitors.map(comp => ({
    name: comp.name.split(' ')[0], // Shortened names for chart
    marketShare: comp.marketShare,
    averagePremium: comp.averagePremium,
  })) || [];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              Dynamic Insurance Pricing
            </h1>
            <p className="text-gray-600 mt-1">
              AI-powered real-time insurance pricing with automated risk assessment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="1y">1 year</option>
              </select>
            </div>
            <Button
              onClick={() => setShowQuoteModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate Quote
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Premium Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics ? formatCurrency(analytics.summary.totalPremiumVolume) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics ? `${analytics.summary.activePolicies} active policies` : 'Loading...'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Premium</CardTitle>
              <Calculator className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {analytics ? formatCurrency(analytics.summary.averagePremium) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Market average: {formatCurrency(1700)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claims Ratio</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {analytics ? `${(analytics.summary.claimsRatio * 100).toFixed(1)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Industry average: 18%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
              <Zap className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analytics ? `${(analytics.summary.automationRate * 100).toFixed(0)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics ? `${analytics.summary.averageQuoteTime}s avg quote time` : 'Loading...'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Pricing Rules Alert */}
        {pricingRules && pricingRules.filter(rule => rule.isActive).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Active Dynamic Pricing Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pricingRules.filter(rule => rule.isActive).map((rule) => (
                  <div key={rule.ruleId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getRuleStatusColor(rule.isActive)}>
                        {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-gray-600">
                          {rule.action.type === 'multiply' ? 
                            `${((rule.action.value - 1) * 100).toFixed(0)}% adjustment` :
                            `${rule.action.type} ${rule.action.value}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Priority {rule.priority}</div>
                      <div className="text-xs text-gray-600">
                        Valid until {new Date(rule.validUntil).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="simulations">Quote Simulations</TabsTrigger>
            <TabsTrigger value="risk-factors">Risk Factors</TabsTrigger>
            <TabsTrigger value="market">Market Analysis</TabsTrigger>
            <TabsTrigger value="optimization">AI Optimization</TabsTrigger>
            <TabsTrigger value="competitive">Competitive</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Premium Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Premium Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics?.premiumTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'averagePremium' ? formatCurrency(Number(value)) : value,
                            name === 'averagePremium' ? 'Average Premium' : 
                            name === 'quotesGenerated' ? 'Quotes Generated' : 'Conversion Rate'
                          ]}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="averagePremium" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Average Premium"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="quotesGenerated" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Daily Quotes"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ risk, percentage }) => `${risk}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {riskDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.risk as keyof typeof RISK_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quote Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Quotes</span>
                        <span className="font-bold">{analytics.summary.activeQuotes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Conversion Rate</span>
                        <span className="font-bold text-green-600">68%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Quote Time</span>
                        <span className="font-bold">{analytics.summary.averageQuoteTime}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Risk Accuracy</span>
                        <span className="font-bold text-blue-600">
                          {(analytics.summary.riskAccuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Profit Margin</span>
                        <span className="font-bold text-green-600">
                          {(analytics.summary.profitMargin * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Claims Ratio</span>
                        <span className="font-bold text-orange-600">
                          {(analytics.summary.claimsRatio * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer Satisfaction</span>
                        <span className="font-bold">{analytics.summary.customerSatisfaction}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Market Position</span>
                        <span className="font-bold text-purple-600">Competitive</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Market Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {marketConditions && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Market Index</span>
                        <span className="font-bold">{(marketConditions as any)?.marketIndex || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Capacity Utilization</span>
                        <span className="font-bold text-orange-600">
                          {(marketConditions as any)?.capacityUtilization || 'N/A'}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reinsurance Rate</span>
                        <span className="font-bold">{(marketConditions as any)?.reinsuranceRates?.toFixed(1) || 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Market Share</span>
                        <span className="font-bold text-blue-600">
                          {(marketConditions as any)?.competitiveAnalysis?.marketShare || 'N/A'}%
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="simulations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Premium Quote Simulations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {simulations?.map((simulation, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-lg">{simulation.scenario}</div>
                          <div className="text-sm text-gray-600">
                            {simulation.quote.shipmentId} • {simulation.quote.customerId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(simulation.quote.adjustedPremium)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Risk: <span className={getRiskColor(simulation.quote.riskAssessment.riskCategory)}>
                              {simulation.quote.riskAssessment.riskCategory}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Base Premium</div>
                          <div className="font-bold">{formatCurrency(simulation.quote.basePremium)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Total Adjustments</div>
                          <div className="font-bold text-orange-600">
                            {formatCurrency(simulation.quote.adjustedPremium - simulation.quote.basePremium)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Discounts Applied</div>
                          <div className="font-bold text-green-600">
                            {formatCurrency(simulation.quote.discounts.reduce((sum, d) => sum + d.amount, 0))}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Coverage Value</div>
                          <div className="font-bold">{formatCurrency(simulation.quote.coverageDetails.cargoValue)}</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm">
                          <span className="text-gray-600">Key Risk Factors:</span>
                          <span className="ml-2">
                            {simulation.quote.riskAssessment.primaryRisks.slice(0, 2).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk-factors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Risk Factor Impact Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskAnalysis?.riskFactors.map((factor, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-lg">{factor.factor}</div>
                          <div className="text-sm text-gray-600">
                            Affects {factor.frequency}% of quotes
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            factor.averageImpact > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {factor.averageImpact > 0 ? '+' : ''}{factor.averageImpact.toFixed(1)}%
                          </div>
                          <Badge className={
                            factor.trend === 'improving' ? 'bg-green-100 text-green-800' :
                            factor.trend === 'deteriorating' ? 'bg-red-100 text-red-800' :
                            factor.trend === 'volatile' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {factor.trend}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Top Triggers:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {factor.topTriggers.map((trigger, triggerIndex) => (
                            <Badge key={triggerIndex} variant="outline" className="text-xs">
                              {trigger}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Market Share Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={competitorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="marketShare" fill="#3b82f6" name="Market Share %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Premium Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={competitorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="marketShare" name="Market Share" unit="%" />
                        <YAxis dataKey="averagePremium" name="Avg Premium" />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'averagePremium' ? formatCurrency(Number(value)) : `${value}%`,
                            name === 'averagePremium' ? 'Average Premium' : 'Market Share'
                          ]}
                        />
                        <Scatter name="Competitors" dataKey="averagePremium" fill="#8884d8" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Competitive Positioning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {competitiveData?.competitors.map((competitor, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-lg">{competitor.name}</div>
                          <div className="text-sm text-gray-600">{competitor.pricingStrategy}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{competitor.marketShare}%</div>
                          <div className="text-sm text-gray-600">Market Share</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-green-600 mb-1">Strengths</div>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {competitor.strengthsWeaknesses.strengths.map((strength, sIndex) => (
                              <li key={sIndex}>• {strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-red-600 mb-1">Weaknesses</div>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {competitor.strengthsWeaknesses.weaknesses.map((weakness, wIndex) => (
                              <li key={wIndex}>• {weakness}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Optimization Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {optimization && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Recommendations</span>
                        <span className="font-bold">{optimization.totalRecommendations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ready to Implement</span>
                        <span className="font-bold text-green-600">{optimization.implementRecommendations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Revenue Potential</span>
                        <span className="font-bold text-blue-600">+{optimization.potentialRevenueIncrease}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Risk-Adjusted Return</span>
                        <span className="font-bold text-purple-600">+{optimization.riskAdjustedReturn}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Implementation Time</span>
                        <span className="font-bold">{optimization.timeToImplement}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    AI Optimization Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimization?.recommendations.map((rec) => (
                      <div key={rec.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{rec.title}</div>
                            <div className="text-sm text-gray-600">{rec.type.replace('_', ' ')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              rec.recommendation === 'implement' ? 'bg-green-100 text-green-800' :
                              rec.recommendation === 'evaluate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {rec.recommendation}
                            </Badge>
                            <Badge variant="outline">
                              {rec.confidence}% confidence
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Premium Impact</div>
                            <div className={`font-bold ${rec.expectedImpact.premiumChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {rec.expectedImpact.premiumChange > 0 ? '+' : ''}{rec.expectedImpact.premiumChange}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Volume Impact</div>
                            <div className={`font-bold ${rec.expectedImpact.volumeIncrease > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {rec.expectedImpact.volumeIncrease > 0 ? '+' : ''}{rec.expectedImpact.volumeIncrease}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Revenue Impact</div>
                            <div className="font-bold text-blue-600">
                              +{rec.expectedImpact.revenueImpact}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="competitive" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Our Competitive Advantages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {competitiveData?.competitiveAdvantages.map((advantage, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{advantage}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Improvement Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {competitiveData?.improvementOpportunities.map((opportunity, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <span className="text-sm">{opportunity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Market Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {competitiveData && (
                    <>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(competitiveData.marketAnalysis.totalMarketSize)}
                        </div>
                        <div className="text-sm text-gray-600">Total Market Size</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {competitiveData.marketAnalysis.growthRate}%
                        </div>
                        <div className="text-sm text-gray-600">Annual Growth</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {competitiveData.marketAnalysis.customerSwitchingRate * 100}%
                        </div>
                        <div className="text-sm text-gray-600">Annual Churn</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {competitiveData.marketAnalysis.innovationIndex}/10
                        </div>
                        <div className="text-sm text-gray-600">Innovation Index</div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
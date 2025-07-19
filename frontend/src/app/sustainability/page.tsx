// app/sustainability/page.tsx
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
  ComposedChart,
} from "recharts";
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Award,
  Target,
  Zap,
  RefreshCw,
  Download,
  Calendar,
  BarChart3,
  Activity,
  Truck,
  Factory,
  Wind,
  Shield,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Globe,
  TreePine,
  Recycle,
  Battery,
  Sun,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { ErrorBoundary } from "@/shared/components/common/error-boundary";
import {
  useCarbonFootprints,
  useCarbonCreditRecommendations,
  useAutomatedCarbonPurchases,
  useSustainabilityReport,
  useCarbonEmissionsSummary,
  useESGCompliance,
  useCarbonCreditMarketplace,
  usePurchaseCarbonCredits,
  useRetireCarbonCredits,
  useRealTimeEmissions,
} from "@/shared/hooks/useCarbonCredits";

export default function SustainabilityDashboard() {
  const [timeframe, setTimeframe] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [refreshing, setRefreshing] = useState(false);

  const { summary, isLoading: summaryLoading } = useCarbonEmissionsSummary();
  const { data: recommendations, isLoading: recsLoading } = useCarbonCreditRecommendations();
  const { data: purchases, isLoading: purchasesLoading } = useAutomatedCarbonPurchases();
  const { data: report, isLoading: reportLoading } = useSustainabilityReport(timeframe);
  const { compliance, isLoading: complianceLoading } = useESGCompliance();
  const { data: marketplace, isLoading: marketLoading } = useCarbonCreditMarketplace();
  const { data: realTime, isLoading: realTimeLoading } = useRealTimeEmissions();

  const purchaseCredits = usePurchaseCarbonCredits();
  const retireCredits = useRetireCarbonCredits();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const handlePurchaseCredits = async () => {
    if (recommendations) {
      await purchaseCredits.mutateAsync({
        providerId: recommendations.providers[0].name,
        quantity: recommendations.recommendedQuantity,
        totalCost: recommendations.estimatedCost,
      });
    }
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat('en-AU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getESGRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'forestry': return <TreePine className="h-4 w-4" />;
      case 'renewable_energy': return <Sun className="h-4 w-4" />;
      case 'methane_capture': return <Factory className="h-4 w-4" />;
      case 'industrial_efficiency': return <Zap className="h-4 w-4" />;
      case 'direct_air_capture': return <Wind className="h-4 w-4" />;
      default: return <Leaf className="h-4 w-4" />;
    }
  };

  // Chart data preparation
  const emissionsChartData = report?.emissionsByRoute.map(route => ({
    route: route.route.split(' → ')[1] || route.route,
    emissions: route.totalEmissions,
    shipments: route.shipmentsCount,
    avgEmission: route.averageEmissionPerShipment,
  })) || [];

  const scopeEmissionsData = report ? [
    { scope: 'Scope 1 (Direct)', value: report.emissionsByScope.scope1, color: '#ef4444' },
    { scope: 'Scope 2 (Electricity)', value: report.emissionsByScope.scope2, color: '#f97316' },
    { scope: 'Scope 3 (Indirect)', value: report.emissionsByScope.scope3, color: '#eab308' },
  ] : [];

  const fuelTypeData = report?.emissionsByFuelType.map(fuel => ({
    name: fuel.fuelType,
    emissions: fuel.totalEmissions,
    percentage: fuel.percentage,
    trend: fuel.trend,
  })) || [];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <AuthGuard>
      <ErrorBoundary>
        <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Leaf className="h-8 w-8 text-green-600" />
              Sustainability & Carbon Management
            </h1>
            <p className="text-gray-600 mt-1">
              Automated carbon credit management and ESG compliance tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emissions</CardTitle>
              <Factory className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary ? `${formatNumber(summary.totalEmissions)} t` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                CO₂ equivalent this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offset Credits</CardTitle>
              <TreePine className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {report ? `${formatNumber(report.offsetEmissions)} t` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {report ? `${report.offsetPercentage}% offset achieved` : 'Loading...'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carbon Neutral</CardTitle>
              {report?.carbonNeutralAchieved ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${report?.carbonNeutralAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                {report?.carbonNeutralAchieved ? 'YES' : 'NO'}
              </div>
              <p className="text-xs text-muted-foreground">
                Current status
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ESG Rating</CardTitle>
              <Award className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {compliance?.esgRating || 'B'}
              </div>
              <p className="text-xs text-muted-foreground">
                {compliance ? `${compliance.benchmarkRanking}th percentile` : 'Loading...'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {report ? formatCurrency(report.totalCreditsCost) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {report ? `${formatCurrency(report.costPerTonneOffset)}/tonne` : 'Loading...'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Monitoring */}
        {realTime && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-600" />
                Real-time Emissions Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Today's Emissions</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatNumber(realTime.todayEmissions)} t CO₂e
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Active Shipments</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {realTime.activeShipments}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Avg per Shipment</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {formatNumber(realTime.averagePerShipment)} t
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Monthly Projection</div>
                  <div className={`text-2xl font-bold ${realTime.trend === 'above_target' ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNumber(realTime.projectedMonthly)} t
                  </div>
                  <div className={`text-xs ${realTime.trend === 'above_target' ? 'text-red-600' : 'text-green-600'}`}>
                    {realTime.trend === 'above_target' ? 'Above target' : 'On target'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for detailed analysis */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="emissions">Emissions</TabsTrigger>
            <TabsTrigger value="credits">Carbon Credits</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="compliance">ESG Compliance</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Emissions by Route */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Emissions by Route
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={emissionsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="route" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="emissions" fill="#ef4444" name="Emissions (t CO₂e)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Emission Scopes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Emissions by Scope
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={scopeEmissionsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ scope, value }: any) => `${scope}: ${formatNumber(value || 0)}t`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {scopeEmissionsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fuel Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Emissions by Fuel Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fuelTypeData.map((fuel, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Battery className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{fuel.name}</div>
                          <div className="text-sm text-gray-600">{fuel.percentage.toFixed(1)}% of total</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatNumber(fuel.emissions)} t</div>
                        <div className={`text-sm flex items-center gap-1 ${
                          fuel.trend === 'increasing' ? 'text-red-600' : 
                          fuel.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {fuel.trend === 'increasing' ? <TrendingUp className="h-3 w-3" /> : 
                           fuel.trend === 'decreasing' ? <TrendingDown className="h-3 w-3" /> : 
                           <div className="h-3 w-3" />}
                          {fuel.trend}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emissions" className="space-y-6">
            {/* Customer Emissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Customer Emissions Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report?.emissionsByCustomer.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{customer.customerName}</div>
                        <div className="text-sm text-gray-600">
                          {customer.sustainabilityTier} tier • {formatNumber(customer.totalEmissions)} t emissions
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatNumber(customer.offsetEmissions)} t
                        </div>
                        <div className="text-sm text-gray-600">offset</div>
                        <Badge className={`mt-1 ${
                          customer.netEmissions === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {customer.netEmissions === 0 ? 'Carbon Neutral' : `${formatNumber(customer.netEmissions)}t remaining`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emissions Intensity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Carbon Intensity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {summary ? formatNumber(summary.carbonIntensity, 3) : '--'}
                    </div>
                    <div className="text-sm text-gray-600">kg CO₂e per tonne cargo</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Industry Average</span>
                      <span>0.052 kg CO₂e/t-km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Our Performance</span>
                      <span className="text-green-600">0.045 kg CO₂e/t-km</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Improvement</span>
                      <span className="text-green-600">13.5% better</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emission Reduction Targets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>2024 Target (15% reduction)</span>
                        <span>78% achieved</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>2025 Target (25% reduction)</span>
                        <span>32% achieved</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>2030 Target (50% reduction)</span>
                        <span>12% achieved</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-600 h-2 rounded-full" style={{ width: '12%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            {/* Credit Recommendations */}
            {recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    AI-Powered Purchase Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{recommendations.recommendedQuantity} t</div>
                      <div className="text-sm text-blue-700">Recommended Quantity</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(recommendations.estimatedCost)}</div>
                      <div className="text-sm text-green-700">Estimated Cost</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{recommendations.qualityScore}%</div>
                      <div className="text-sm text-purple-700">Quality Score</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{recommendations.urgency}</div>
                      <div className="text-sm text-orange-700">Urgency Level</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">{recommendations.reasoning}</p>
                  </div>

                  <Button 
                    onClick={handlePurchaseCredits}
                    disabled={purchaseCredits.isPending}
                    className="w-full"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {purchaseCredits.isPending ? 'Processing Purchase...' : 'Purchase Recommended Credits'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Purchased Credits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5 text-green-600" />
                  Recent Carbon Credit Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchases?.map((credit, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getProjectTypeIcon(credit.projectType)}
                        <div>
                          <div className="font-medium">{credit.provider}</div>
                          <div className="text-sm text-gray-600">
                            {credit.projectLocation} • {credit.certificationStandard}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{credit.quantity} t</div>
                        <div className="text-sm text-gray-600">{formatCurrency(credit.totalCost)}</div>
                        <Badge className={credit.retirementDate ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}>
                          {credit.retirementDate ? 'Retired' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-6">
            {marketplace && (
              <>
                {/* Market Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Market Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Price Direction</span>
                        <span className="font-medium text-green-600">{marketplace.marketTrends.priceDirection}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Price Change</span>
                        <span className="font-medium text-green-600">{marketplace.marketTrends.averagePriceChange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Demand Level</span>
                        <span className="font-medium">{marketplace.marketTrends.demandLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Supply Level</span>
                        <span className="font-medium">{marketplace.marketTrends.supplyLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Volatility</span>
                        <span className="font-medium text-green-600">{marketplace.marketTrends.volatility}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Average Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency(marketplace.averagePrice)}
                        </div>
                        <div className="text-sm text-gray-600">per tonne CO₂e</div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Forestry Projects</span>
                          <span>$15-17 AUD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Renewable Energy</span>
                          <span>$20-25 AUD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Direct Air Capture</span>
                          <span>$40-50 AUD</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm font-medium text-green-800">Best Value</div>
                        <div className="text-sm text-green-700">Australian forestry projects offer best value with strong co-benefits</div>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-medium text-blue-800">Market Timing</div>
                        <div className="text-sm text-blue-700">Prices trending up - consider purchasing now</div>
                      </div>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-sm font-medium text-purple-800">Quality Focus</div>
                        <div className="text-sm text-purple-700">Prioritize additionality and permanence</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Available Providers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Available Carbon Credit Providers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {marketplace.providers.map((provider, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-4">
                            {getProjectTypeIcon(provider.projectType)}
                            <div>
                              <div className="font-medium">{provider.name}</div>
                              <div className="text-sm text-gray-600">{provider.location}</div>
                              <div className="flex gap-2 mt-1">
                                {provider.cobenefits.slice(0, 2).map((benefit, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {benefit}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{formatCurrency(provider.pricePerTonne)}/t</div>
                            <div className="text-sm text-gray-600">{provider.availableQuantity.toLocaleString()} t available</div>
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                provider.qualityRating > 90 ? 'bg-green-500' : 
                                provider.qualityRating > 80 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-xs text-gray-600">{provider.qualityRating}% quality</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            {compliance && (
              <>
                {/* ESG Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        ESG Rating
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <div>
                        <div className="text-4xl font-bold text-blue-600">{compliance.esgRating}</div>
                        <div className="text-sm text-gray-600">Current Rating</div>
                      </div>
                      <Badge className={getESGRatingColor(compliance.esgRating)}>
                        {compliance.esgRating === 'A' ? 'Excellent' : 
                         compliance.esgRating === 'B' ? 'Good' : 
                         compliance.esgRating === 'C' ? 'Fair' : 'Needs Improvement'}
                      </Badge>
                      <div className="text-sm">
                        <div className="text-gray-600">Industry Ranking</div>
                        <div className="font-medium">{compliance.benchmarkRanking}th percentile</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Compliance Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Carbon Neutral</span>
                        <Badge className={compliance.carbonNeutralStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {compliance.carbonNeutralStatus ? 'Achieved' : 'In Progress'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Offset Percentage</span>
                        <span className="font-medium">{compliance.offsetPercentage}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Compliance Score</span>
                        <span className="font-medium">{Math.round(compliance.complianceScore)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Next Audit</span>
                        <span className="font-medium">
                          {new Date(compliance.nextAuditDate).toLocaleDateString('en-AU')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {compliance.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{cert}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <div className="text-xs text-gray-600">
                          Next renewal: ISO 14001 (March 2025)
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Improvement Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Improvement Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {compliance.improvementAreas.map((area, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="text-sm font-medium">{area}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Automated Carbon Management System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-2">100%</div>
                    <div className="text-sm text-purple-700">Automated Calculation</div>
                    <div className="text-xs text-purple-600 mt-1">Real-time emission tracking</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-2">95%</div>
                    <div className="text-sm text-blue-700">Purchase Automation</div>
                    <div className="text-xs text-blue-600 mt-1">AI-optimized buying</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-2">24/7</div>
                    <div className="text-sm text-green-700">Monitoring</div>
                    <div className="text-xs text-green-600 mt-1">Continuous compliance</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Automation Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Real-time Emission Calculation</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Automatically calculates emissions for every shipment using GPS data, fuel consumption, and cargo weight.
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Smart Credit Purchasing</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        AI optimizes credit purchases based on price, quality, delivery time, and co-benefits.
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Automated Retirement</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Credits are automatically retired against emissions with full audit trail and documentation.
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Compliance Reporting</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Generates NGER, CDP, and other compliance reports automatically with certified accuracy.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Carbon Neutral Status Achieved</span>
                  </div>
                  <div className="text-sm text-green-700">
                    Your automated carbon management system has successfully achieved and maintained carbon neutral status 
                    for OutbackHaul Transport operations.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  );
}
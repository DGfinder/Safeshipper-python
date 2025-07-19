// app/route-optimization/page.tsx
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
  Route,
  TrendingUp,
  TrendingDown,
  Calculator,
  Zap,
  Leaf,
  Clock,
  DollarSign,
  Truck,
  Train,
  Ship,
  Plane,
  BarChart3,
  Target,
  Settings,
  Download,
  RefreshCw,
  Lightbulb,
  Award,
  MapPin,
  Calendar,
  Filter,
  Search,
  Plus,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Shuffle,
  Activity,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import {
  useTransportModes,
  useOptimizationAnalytics,
  useNetworkAnalysis,
  useOptimizationScenarios,
  useModalComparison,
  useOptimizationInsights,
  useOptimizationHistory,
  useCostSavingsCalculator,
  useRouteOptimization,
} from "@/shared/hooks/useMultiModalOptimization";

export default function RouteOptimizationDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const { data: transportModes, isLoading: modesLoading } = useTransportModes();
  const { data: analytics, isLoading: analyticsLoading } = useOptimizationAnalytics(selectedTimeframe);
  const { data: networkData, isLoading: networkLoading } = useNetworkAnalysis();
  const { data: scenarios, isLoading: scenariosLoading } = useOptimizationScenarios();
  const { data: modalComparison, isLoading: comparisonLoading } = useModalComparison();
  const { data: insights, isLoading: insightsLoading } = useOptimizationInsights();
  const { data: history, isLoading: historyLoading } = useOptimizationHistory(20);
  const { data: savingsCalculator, isLoading: calculatorLoading } = useCostSavingsCalculator();
  const routeOptimization = useRouteOptimization();

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

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'road': return <Truck className="h-4 w-4" />;
      case 'rail': return <Train className="h-4 w-4" />;
      case 'sea': return <Ship className="h-4 w-4" />;
      case 'air': return <Plane className="h-4 w-4" />;
      default: return <Route className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'road': return '#f97316';
      case 'rail': return '#10b981';
      case 'sea': return '#3b82f6';
      case 'air': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getPerformanceColor = (value: number, type: 'savings' | 'efficiency') => {
    if (type === 'savings') {
      return value >= 20 ? 'text-green-600' : value >= 10 ? 'text-blue-600' : 'text-orange-600';
    }
    return value >= 80 ? 'text-green-600' : value >= 60 ? 'text-blue-600' : 'text-orange-600';
  };

  // Prepare chart data
  const modalSplitData = analytics?.modalSplitAnalysis.map(mode => ({
    mode: mode.mode.charAt(0).toUpperCase() + mode.mode.slice(1),
    usage: mode.usage,
    cost: mode.costContribution,
    carbon: mode.carbonContribution,
    trend: mode.trends.change,
  })) || [];

  const MODAL_COLORS = {
    Road: '#f97316',
    Rail: '#10b981',
    Sea: '#3b82f6',
    Air: '#8b5cf6',
  };

  const utilizationData = analytics?.networkEfficiency.utilizationRates.map(rate => ({
    mode: rate.mode,
    utilization: rate.utilization,
    color: getModeColor(rate.mode.toLowerCase()),
  })) || [];

  const performanceData = analytics?.networkEfficiency.seasonalPatterns || [];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Route className="h-8 w-8 text-blue-600" />
              Multi-Modal Route Optimization
            </h1>
            <p className="text-gray-600 mt-1">
              Advanced analytics for cross-modal transport efficiency and cost optimization
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
              Export Analysis
            </Button>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Cost Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics ? `${analytics.performanceMetrics.averageCostSavings.toFixed(1)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                vs single-mode transport
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carbon Reduction</CardTitle>
              <Leaf className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics ? `${analytics.performanceMetrics.averageCarbonReduction.toFixed(1)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                emissions reduction achieved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Routes Optimized</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {analytics ? analytics.performanceMetrics.routesOptimized.toLocaleString() : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                in selected timeframe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analytics ? `${analytics.performanceMetrics.customerSatisfaction.toFixed(1)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                optimization satisfaction
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Insights */}
        {insights && insights.topInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Key Optimization Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.topInsights.slice(0, 4).map((insight, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{insight.title}</div>
                      <div className={`text-lg font-bold ${
                        insight.impact === 'cost_reduction' ? 'text-green-600' :
                        insight.impact === 'sustainability' ? 'text-green-600' :
                        insight.impact === 'modal_shift' ? 'text-blue-600' : 'text-purple-600'
                      }`}>
                        {insight.value}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {insight.timeframe.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="modal-analysis">Modal Analysis</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="calculator">Savings Calculator</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Modal Split Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Modal Split Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={modalSplitData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ mode, usage }) => `${mode}: ${usage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="usage"
                        >
                          {modalSplitData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={MODAL_COLORS[entry.mode as keyof typeof MODAL_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Network Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Network Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={utilizationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mode" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                        <Bar dataKey="utilization" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cost Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Savings</span>
                        <span className="font-bold text-green-600">
                          {analytics.performanceMetrics.averageCostSavings.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Routes Optimized</span>
                        <span className="font-bold">{analytics.performanceMetrics.routesOptimized}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Savings</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(analytics.performanceMetrics.routesOptimized * 1200)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Time Efficiency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Time Savings</span>
                        <span className="font-bold text-blue-600">
                          {analytics.performanceMetrics.averageTimeSavings.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reliability Improvement</span>
                        <span className="font-bold">+12.3%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">On-Time Performance</span>
                        <span className="font-bold text-blue-600">94.2%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sustainability Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Carbon Reduction</span>
                        <span className="font-bold text-green-600">
                          {analytics.performanceMetrics.averageCarbonReduction.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total CO₂ Saved</span>
                        <span className="font-bold text-green-600">
                          {analytics.sustainabilityImpact.totalCarbonReduced.toFixed(0)} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tree Equivalent</span>
                        <span className="font-bold text-green-600">
                          {analytics.sustainabilityImpact.equivalentTrees} trees
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="h-5 w-5" />
                  Optimization Scenarios
                  <Badge variant="outline" className="ml-2">Demo Analysis</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scenarios?.map((scenario, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-lg">{scenario.name}</div>
                          <div className="text-sm text-gray-600">{scenario.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(scenario.optimizedRoute.summary.totalCost)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {scenario.optimizedRoute.summary.totalTime.toFixed(1)}h delivery
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Distance</div>
                          <div className="font-bold">{scenario.optimizedRoute.summary.totalDistance} km</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Modes</div>
                          <div className="flex gap-1">
                            {scenario.optimizedRoute.summary.modesUsed.map((mode, mIndex) => (
                              <span key={mIndex} className="flex items-center gap-1">
                                {getModeIcon(mode)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Carbon Footprint</div>
                          <div className="font-bold text-green-600">
                            {scenario.optimizedRoute.summary.totalCarbonEmissions.toFixed(0)} kg CO₂
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Efficiency Score</div>
                          <div className="font-bold text-purple-600">
                            {scenario.optimizedRoute.performance.overallScore}/100
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm">
                          <span className="text-gray-600">Primary Goal:</span>
                          <span className="ml-2 font-medium">
                            {scenario.request.optimization.primaryGoal.replace('_', ' ')}
                          </span>
                          {scenario.optimizedRoute.alternatives.length > 0 && (
                            <span className="ml-4 text-gray-600">
                              ({scenario.optimizedRoute.alternatives.length} alternatives available)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modal-analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Modal Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Transport Mode Comparison</CardTitle>
                  <p className="text-sm text-gray-600">Standard 1000km route with 20-tonne cargo</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modalComparison?.comparison.map((mode, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getModeIcon(mode.mode)}
                          <div>
                            <div className="font-medium">{mode.name}</div>
                            <div className="text-sm text-gray-600">{mode.description}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-right">
                          <div>
                            <div className="text-gray-600">Cost</div>
                            <div className="font-bold">{formatCurrency(mode.cost)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Time</div>
                            <div className="font-bold">{mode.time}h</div>
                          </div>
                          <div>
                            <div className="text-gray-600">CO₂</div>
                            <div className="font-bold text-green-600">{mode.carbon} kg</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Modal Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Modal Usage Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights?.utilizationTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getModeIcon(trend.mode)}
                          <div>
                            <div className="font-medium capitalize">{trend.mode} Transport</div>
                            <div className="text-sm text-gray-600">
                              Current usage: {trend.currentUsage}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold flex items-center gap-1 ${
                            trend.trendDirection === 'increasing' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trend.trendDirection === 'increasing' ? 
                              <TrendingUp className="h-4 w-4" /> : 
                              <TrendingDown className="h-4 w-4" />
                            }
                            {Math.abs(trend.trend).toFixed(1)}%
                          </div>
                          <Badge className={
                            trend.efficiency === 'high' ? 'bg-green-100 text-green-800' :
                            trend.efficiency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {trend.efficiency} efficiency
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Network Hotspots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {networkData?.hotspots.map((hotspot: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{hotspot.location}</div>
                          <Badge className={
                            hotspot.congestionRisk === 'High' ? 'bg-red-100 text-red-800' :
                            hotspot.congestionRisk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {hotspot.congestionRisk} Risk
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{hotspot.description}</div>
                        <div className="text-sm">
                          <span className="text-gray-600">Utilization:</span>
                          <span className="ml-2 font-bold">{hotspot.utilization}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {networkData?.optimization_opportunities.map((opportunity: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{opportunity.opportunity}</div>
                          <Badge className={
                            opportunity.implementationEffort === 'Low' ? 'bg-green-100 text-green-800' :
                            opportunity.implementationEffort === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {opportunity.implementationEffort} Effort
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{opportunity.description}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Savings:</span>
                            <span className="ml-1 font-bold text-green-600">{opportunity.potentialSavings}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Carbon:</span>
                            <span className="ml-1 font-bold text-green-600">{opportunity.carbonReduction}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Trends</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Cost Savings Trend</span>
                        <span className={`font-bold ${getPerformanceColor(insights.performanceTrends.costSavings, 'savings')}`}>
                          {insights.performanceTrends.costSavings.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Time Savings Trend</span>
                        <span className={`font-bold ${getPerformanceColor(insights.performanceTrends.timeSavings, 'savings')}`}>
                          {insights.performanceTrends.timeSavings.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Carbon Reduction</span>
                        <span className="font-bold text-green-600">
                          {insights.performanceTrends.carbonReduction.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer Satisfaction</span>
                        <span className={`font-bold ${getPerformanceColor(insights.performanceTrends.customerSatisfaction, 'efficiency')}`}>
                          {insights.performanceTrends.customerSatisfaction.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights?.recommendations.map((rec, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{rec.title}</div>
                          <Badge className={
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {rec.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                        <div className="text-sm font-medium text-blue-600">
                          Expected Impact: {rec.expectedImpact}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Optimization Savings Calculator
                  <Badge variant="outline" className="ml-2">Planning Tool</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {savingsCalculator?.scenarios.map((scenario, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="font-medium text-lg mb-2">{scenario.strategy}</div>
                      <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Cost Savings:</span>
                          <span className="font-bold text-green-600">
                            {scenario.typicalSavings.min}% - {scenario.typicalSavings.max}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Carbon Reduction:</span>
                          <span className="font-bold text-green-600">
                            {scenario.carbonReduction.min}% - {scenario.carbonReduction.max}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Time Impact:</span>
                          <span className={`font-bold ${
                            scenario.timeImpact.max > 0 ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {scenario.timeImpact.min}% to {scenario.timeImpact.max}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Best For:</span>
                          <ul className="mt-1 space-y-1">
                            {scenario.bestFor.map((item, itemIndex) => (
                              <li key={itemIndex} className="text-sm text-gray-700">• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Limitations:</span>
                          <ul className="mt-1 space-y-1">
                            {scenario.limitations.map((item, itemIndex) => (
                              <li key={itemIndex} className="text-sm text-gray-700">• {item}</li>
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
        </Tabs>
      </div>
    </AuthGuard>
  );
}
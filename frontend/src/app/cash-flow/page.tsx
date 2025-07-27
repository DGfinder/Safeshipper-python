// app/cash-flow/page.tsx
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Target,
  Zap,
  RefreshCw,
  Download,
  Calendar,
  Users,
  CreditCard,
  PiggyBank,
  Activity,
  BarChart3,
  Info,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { ErrorBoundary } from "@/shared/components/common/error-boundary";
import {
  useCashFlowPredictions,
  useWorkingCapitalInsights,
  useCustomerPaymentProfiles,
  useEconomicIndicators,
  useCashFlowSummary,
  usePaymentRiskAnalysis,
  useCashFlowRecommendations,
} from "@/shared/hooks/useCashFlowPrediction";

export default function CashFlowDashboard() {
  const [timeFrame, setTimeFrame] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const { summary, isLoading: summaryLoading } = useCashFlowSummary(timeFrame);
  const { data: predictions, isLoading: predictionsLoading } = useCashFlowPredictions(timeFrame);
  const { data: workingCapital, isLoading: capitalLoading } = useWorkingCapitalInsights();
  const { data: customerProfiles, isLoading: customersLoading } = useCustomerPaymentProfiles();
  const { data: economicIndicators, isLoading: economicsLoading } = useEconomicIndicators();
  const { riskAnalysis, isLoading: riskLoading } = usePaymentRiskAnalysis();
  const { recommendations, isLoading: recsLoading } = useCashFlowRecommendations();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'credit_line': return <CreditCard className="h-4 w-4" />;
      case 'collection_acceleration': return <Zap className="h-4 w-4" />;
      case 'payment_terms': return <Clock className="h-4 w-4" />;
      case 'expense_deferral': return <PiggyBank className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  // Prepare chart data
  const cashFlowChartData = predictions?.slice(0, 30).map(p => ({
    date: new Date(p.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
    expectedInflow: p.expectedInflow / 1000, // Convert to thousands
    confirmedInflow: p.confirmedInflow / 1000,
    predictedOutflow: p.predictedOutflow / 1000,
    netCashFlow: p.netCashFlow / 1000,
    confidence: p.confidence,
  })) || [];

  const riskDistributionData = predictions?.reduce((acc, p) => {
    const existing = acc.find(item => item.risk === p.riskLevel);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ risk: p.riskLevel, count: 1 });
    }
    return acc;
  }, [] as { risk: string; count: number }[]) || [];

  const RISK_COLORS = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };

  return (
    <AuthGuard>
      <ErrorBoundary>
        <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-600" />
              AI Cash Flow Intelligence
            </h1>
            <p className="text-gray-600 mt-1">
              Predictive analytics for working capital optimization and payment forecasting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(parseInt(e.target.value))}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
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
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expected Inflow</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary ? formatCurrency(summary.totalExpectedInflow) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary ? `${summary.averageConfidence}% confidence` : 'Loading...'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed Inflow</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary ? formatCurrency(summary.totalConfirmedInflow) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                High confidence payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
              {(summary?.netCashFlow || 0) > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary?.netCashFlow || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary ? formatCurrency(summary.netCashFlow) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {timeFrame} day projection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Days</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary?.riskDays || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                High/critical risk days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Working Capital Overview */}
        {workingCapital && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-blue-600" />
                Working Capital Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Current Working Capital</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(workingCapital.currentWorkingCapital)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Projected Need</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(workingCapital.projectedNeed)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Surplus/Deficit</div>
                  <div className={`text-2xl font-bold ${workingCapital.surplusOrDeficit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(workingCapital.surplusOrDeficit)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Days of Operations</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {workingCapital.daysOfOperationsCovered}
                  </div>
                  <div className="text-xs text-gray-500">days covered</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for detailed analysis */}
        <Tabs defaultValue="predictions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="customers">Customer Risk</TabsTrigger>
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="economics">Economic Factors</TabsTrigger>
            <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cash Flow Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Cash Flow Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`$${value}k`, '']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="expectedInflow"
                          stackId="1"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                          name="Expected Inflow"
                        />
                        <Area
                          type="monotone"
                          dataKey="predictedOutflow"
                          stackId="2"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.3}
                          name="Predicted Outflow"
                        />
                        <Line
                          type="monotone"
                          dataKey="netCashFlow"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Net Cash Flow"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
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
                          label={({ risk, count }) => `${risk}: ${count} days`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {riskDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.risk as keyof typeof RISK_COLORS] || '#8884d8'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Predictions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {predictions?.slice(0, 10).map((prediction, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                          {new Date(prediction.date).toLocaleDateString('en-AU')}
                        </div>
                        <Badge className={getRiskColor(prediction.riskLevel)}>
                          {prediction.riskLevel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-green-600">
                          In: {formatCurrency(prediction.expectedInflow)}
                        </div>
                        <div className="text-red-600">
                          Out: {formatCurrency(prediction.predictedOutflow)}
                        </div>
                        <div className={`font-medium ${prediction.netCashFlow > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Net: {formatCurrency(prediction.netCashFlow)}
                        </div>
                        <div className="text-gray-600">
                          {prediction.confidence}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            {riskAnalysis && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Risk Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">High Risk Customers</span>
                      <span className="font-bold text-red-600">{riskAnalysis.highRiskCustomers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Payment Days</span>
                      <span className="font-bold">{riskAnalysis.averagePaymentDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Overdue</span>
                      <span className="font-bold text-red-600">{formatCurrency(riskAnalysis.totalOverdueAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Upcoming Risk Days</span>
                      <span className="font-bold text-orange-600">{riskAnalysis.upcomingRiskDays}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Customer Payment Profiles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {customerProfiles?.map((customer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{customer.customerName}</div>
                            <div className="text-sm text-gray-600">
                              {customer.averagePaymentDays} days avg • {customer.creditRating} rating
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-sm font-bold">{customer.paymentReliability}%</div>
                              <div className="text-xs text-gray-600">reliability</div>
                            </div>
                            <Badge 
                              className={customer.paymentReliability > 85 ? 'bg-green-100 text-green-800' : 
                                        customer.paymentReliability > 75 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'}
                            >
                              {customer.paymentReliability > 85 ? 'Low Risk' : 
                               customer.paymentReliability > 75 ? 'Medium Risk' : 'High Risk'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            {recommendations && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Immediate Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Immediate Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.immediate.length > 0 ? (
                        recommendations.immediate.map((rec, index) => (
                          <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-sm font-medium text-red-800">{rec}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-600 italic">No immediate actions required</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Short-term Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Clock className="h-5 w-5" />
                      Short-term (1-2 weeks)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.shortTerm.length > 0 ? (
                        recommendations.shortTerm.map((rec, index) => (
                          <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-sm font-medium text-orange-800">{rec}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-600 italic">No short-term actions needed</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Long-term Strategy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                      <Target className="h-5 w-5" />
                      Long-term Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.longTerm.length > 0 ? (
                        recommendations.longTerm.map((rec, index) => (
                          <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm font-medium text-blue-800">{rec}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-600 italic">Strategic planning in progress</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Working Capital Recommendations */}
            {workingCapital && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    AI-Powered Working Capital Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workingCapital.recommendations.map((rec, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          {getRecommendationIcon(rec.type)}
                          <div className="font-medium">{rec.description}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>Impact: {formatCurrency(rec.impact)}</div>
                          <div>Urgency: {rec.urgency}</div>
                          <div>Feasibility: {rec.feasibility}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="economics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Economic Indicators Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {economicIndicators?.map((indicator, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{indicator.indicator}</div>
                        <div className="text-sm text-gray-600">
                          Impact correlation: {(indicator.impactOnPayments * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{indicator.currentValue.toFixed(2)}</div>
                        <div className={`text-sm flex items-center gap-1 ${
                          indicator.trend === 'rising' ? 'text-green-600' : 
                          indicator.trend === 'falling' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {indicator.trend === 'rising' ? <TrendingUp className="h-3 w-3" /> : 
                           indicator.trend === 'falling' ? <TrendingDown className="h-3 w-3" /> : 
                           <div className="h-3 w-3" />}
                          {indicator.trend}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Confidence Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Prediction Confidence Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashFlowChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="confidence"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          name="Confidence %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Best vs Worst Days */}
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Extremes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summary && (
                    <>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">Best Day</span>
                        </div>
                        <div className="text-sm text-green-700">
                          <div>{new Date(summary.bestDay.date).toLocaleDateString('en-AU')}</div>
                          <div className="font-bold">{formatCurrency(summary.bestDay.netCashFlow)}</div>
                        </div>
                      </div>

                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-red-800">Worst Day</span>
                        </div>
                        <div className="text-sm text-red-700">
                          <div>{new Date(summary.worstDay.date).toLocaleDateString('en-AU')}</div>
                          <div className="font-bold">{formatCurrency(summary.worstDay.netCashFlow)}</div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-800">Volatility Analysis</span>
                        </div>
                        <div className="text-sm text-blue-700">
                          <div>Cash flow range: {formatCurrency(summary.bestDay.netCashFlow - summary.worstDay.netCashFlow)}</div>
                          <div>Average confidence: {summary.averageConfidence}%</div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  );
}
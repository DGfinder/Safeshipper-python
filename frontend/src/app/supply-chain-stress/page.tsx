// app/supply-chain-stress/page.tsx
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Zap,
  RefreshCw,
  Download,
  Settings,
  Eye,
  Clock,
  DollarSign,
  Truck,
  MapPin,
  Thermometer,
  Fuel,
  Users,
  Building,
  Globe,
  BarChart3,
  PieChart,
  Target,
  Layers,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus,
  Calendar,
  Filter,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import {
  useStressIndicators,
  useSupplyChainAlerts,
  useNetworkResilienceMetrics,
  useEconomicStressFactors,
  useEnvironmentalStressFactors,
  useStressIndicatorsSummary,
  useSystemHealthScore,
  useEarlyWarningAlerts,
} from "@/shared/hooks/useSupplyChainStress";

export default function SupplyChainStressDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: stressIndicators, isLoading: indicatorsLoading } = useStressIndicators();
  const { data: alerts, isLoading: alertsLoading } = useSupplyChainAlerts();
  const { data: resilienceMetrics, isLoading: resilienceLoading } = useNetworkResilienceMetrics();
  const { data: economicFactors, isLoading: economicLoading } = useEconomicStressFactors();
  const { data: environmentalFactors, isLoading: environmentalLoading } = useEnvironmentalStressFactors();
  const { data: summary, isLoading: summaryLoading } = useStressIndicatorsSummary();
  const { data: systemHealth, isLoading: healthLoading } = useSystemHealthScore();
  const { data: earlyWarnings, isLoading: warningsLoading } = useEarlyWarningAlerts();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'elevated': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'normal': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'elevated': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'normal': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'deteriorating': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'volatile': return <Activity className="h-4 w-4 text-orange-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      infrastructure: <Building className="h-5 w-5" />,
      capacity: <Truck className="h-5 w-5" />,
      economic: <DollarSign className="h-5 w-5" />,
      environmental: <Thermometer className="h-5 w-5" />,
      regulatory: <Shield className="h-5 w-5" />,
      technology: <Zap className="h-5 w-5" />,
      labor: <Users className="h-5 w-5" />,
      fuel_energy: <Fuel className="h-5 w-5" />,
      geopolitical: <Globe className="h-5 w-5" />,
      demand_volatility: <BarChart3 className="h-5 w-5" />,
    };
    return icons[category as keyof typeof icons] || <Activity className="h-5 w-5" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-600 text-white';
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-orange-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Prepare chart data
  const stressLevelData = stressIndicators?.map(indicator => ({
    category: indicator.category.replace('_', ' '),
    level: indicator.currentLevel,
    threshold: indicator.threshold,
    status: indicator.status,
  })) || [];

  const historicalData = stressIndicators?.[0]?.historicalData.slice(-24).map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    ...stressIndicators.reduce((acc: any, indicator) => {
      acc[indicator.category] = point.value;
      return acc;
    }, {}),
  })) || [];

  const radarData = stressIndicators?.map(indicator => ({
    category: indicator.category.replace('_', ' '),
    value: indicator.currentLevel,
  })) || [];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              Supply Chain Stress Indicators
            </h1>
            <p className="text-gray-600 mt-1">
              Early warning system for supply chain disruptions and systemic risks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="1h">1 hour</option>
                <option value="24h">24 hours</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
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

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health Score</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (systemHealth || 0) >= 85 ? 'text-green-600' : 
                (systemHealth || 0) >= 70 ? 'text-yellow-600' : 
                (systemHealth || 0) >= 50 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {systemHealth || 0}/100
              </div>
              <p className="text-xs text-muted-foreground">
                Overall network resilience
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {alerts?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {alerts?.filter(a => a.severity === 'critical').length || 0} critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Indicators</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.criticalCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requiring immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Impact</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ${Math.round((summary?.totalEstimatedImpact || 0) / 1000)}K
              </div>
              <p className="text-xs text-muted-foreground">
                Potential financial impact
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Alerts */}
        {alerts && alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Active Supply Chain Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-gray-600">{alert.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${alert.potentialLoss.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">
                        {alert.timeToAct} min to act
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="indicators" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="indicators">Stress Indicators</TabsTrigger>
            <TabsTrigger value="resilience">Network Resilience</TabsTrigger>
            <TabsTrigger value="economic">Economic Factors</TabsTrigger>
            <TabsTrigger value="environmental">Environmental</TabsTrigger>
            <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="indicators" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stress Levels Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Current Stress Levels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stressLevelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="category" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="level" fill="#3b82f6" name="Current Level" />
                        <Bar dataKey="threshold" fill="#ef4444" fillOpacity={0.3} name="Threshold" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Stress Radar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Stress Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Stress Level"
                          dataKey="value"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Stress Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stressIndicators?.map((indicator) => (
                    <div key={indicator.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(indicator.category)}
                          <div>
                            <div className="font-medium">{indicator.name}</div>
                            <div className="text-sm text-gray-600">
                              {indicator.affectedRegions.join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(indicator.status)}>
                            {indicator.status}
                          </Badge>
                          {getTrendIcon(indicator.trend)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Current Level</div>
                          <div className="font-bold text-lg">{indicator.currentLevel}/100</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Threshold</div>
                          <div className="font-bold">{indicator.threshold}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Impact</div>
                          <div className="font-bold">${indicator.estimatedImpact.estimatedFinancialImpact.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Recovery Time</div>
                          <div className="font-bold">{indicator.estimatedImpact.recoveryTimeEstimate}h</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resilience" className="space-y-6">
            {resilienceMetrics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Health Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {resilienceMetrics.overallHealthScore}/100
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Redundancy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {resilienceMetrics.redundancyLevel}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Adaptability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {resilienceMetrics.adaptabilityScore}/100
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recovery Capability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {resilienceMetrics.recoveryCapability}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Vulnerability Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {resilienceMetrics.vulnerabilityAssessment.map((vuln, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium">{vuln.area}</div>
                              <Badge className={
                                vuln.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                vuln.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                vuln.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {vuln.priority}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{vuln.mitigation}</div>
                            <div className="text-xs text-gray-500">Risk Level: {vuln.riskLevel}/100</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Stress Testing Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {resilienceMetrics.stressTestingResults.map((test, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium">{test.scenario}</div>
                              <Badge className={
                                test.systemResponse === 'excellent' ? 'bg-green-100 text-green-800' :
                                test.systemResponse === 'good' ? 'bg-blue-100 text-blue-800' :
                                test.systemResponse === 'adequate' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {test.systemResponse}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              Recovery Time: {test.recoveryTime} hours
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Tested: {new Date(test.testedDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="economic" className="space-y-6">
            {economicFactors && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Economic Stress Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(economicFactors).map(([factor, value]) => (
                      <div key={factor} className="p-3 border rounded-lg text-center">
                        <div className="text-sm text-gray-600 mb-1">
                          {factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </div>
                        <div className={`text-lg font-bold ${
                          value > 70 ? 'text-red-600' :
                          value > 50 ? 'text-orange-600' :
                          value > 30 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {value}/100
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="environmental" className="space-y-6">
            {environmentalFactors && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5" />
                    Environmental Stress Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(environmentalFactors).map(([factor, value]) => (
                      <div key={factor} className="p-3 border rounded-lg text-center">
                        <div className="text-sm text-gray-600 mb-1">
                          {factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </div>
                        <div className={`text-lg font-bold ${
                          value > 70 ? 'text-red-600' :
                          value > 50 ? 'text-orange-600' :
                          value > 30 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {value}/100
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Historical Stress Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="infrastructure" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="capacity" stroke="#82ca9d" strokeWidth={2} />
                        <Line type="monotone" dataKey="economic" stroke="#ffc658" strokeWidth={2} />
                        <Line type="monotone" dataKey="environmental" stroke="#ff7300" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>System Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summary && (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-gray-600">Total Indicators</div>
                          <div className="text-xl font-bold">{summary.totalIndicators}</div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-gray-600">Critical Count</div>
                          <div className="text-xl font-bold text-red-600">{summary.criticalCount}</div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="text-gray-600">High Count</div>
                          <div className="text-xl font-bold text-orange-600">{summary.highCount}</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-gray-600">Normal Count</div>
                          <div className="text-xl font-bold text-green-600">{summary.normalCount}</div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Most Critical Category</div>
                        <div className="font-bold text-lg">{summary.mostCriticalCategory?.replace('_', ' ')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg">
                          <div className="text-sm text-gray-600">Avg Recovery Time</div>
                          <div className="font-bold">{summary.averageRecoveryTime}h</div>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <div className="text-sm text-gray-600">Affected Shipments</div>
                          <div className="font-bold">{summary.totalAffectedShipments}</div>
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
    </AuthGuard>
  );
}
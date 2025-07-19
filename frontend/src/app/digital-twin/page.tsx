// app/digital-twin/page.tsx
"use client";

import React, { Suspense, useState, useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamic import for React Three Fiber components to disable SSR
const Canvas = dynamic(() => import("@react-three/fiber").then(mod => ({ default: mod.Canvas })), { ssr: false });
const OrbitControls = dynamic(() => import("@react-three/drei").then(mod => ({ default: mod.OrbitControls })), { ssr: false });
const Text = dynamic(() => import("@react-three/drei").then(mod => ({ default: mod.Text })), { ssr: false });
const Box = dynamic(() => import("@react-three/drei").then(mod => ({ default: mod.Box })), { ssr: false });
const Environment = dynamic(() => import("@react-three/drei").then(mod => ({ default: mod.Environment })), { ssr: false });
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  Eye,
  EyeOff,
  Maximize,
  Monitor,
  Truck,
  Package,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Fuel,
  Settings,
  Download,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  Layers,
  Radio,
  Shield,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Target,
  Zap,
  Navigation,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import {
  useRealtimeDigitalTwins,
  useDigitalTwinDashboard,
  useShipmentDigitalTwin,
  useDigitalTwinAnalytics,
  useShipmentPerformanceMetrics,
  useCargoMonitoringInsights,
  usePredictiveAnalytics,
  useVisualizationSettings,
} from "@/shared/hooks/useDigitalTwin";

// 3D Vehicle Component
function Vehicle3D({ position, rotation, selected, onClick }: any) {
  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      {/* Truck body */}
      <Box args={[2, 1, 0.8]} position={[0, 0.5, 0]}>
        <meshStandardMaterial 
          color={selected ? "#3b82f6" : "#64748b"} 
          transparent 
          opacity={0.8} 
        />
      </Box>
      
      {/* Truck cab */}
      <Box args={[0.8, 1, 0.8]} position={[-1.1, 0.5, 0]}>
        <meshStandardMaterial 
          color={selected ? "#1d4ed8" : "#475569"} 
          transparent 
          opacity={0.8} 
        />
      </Box>
      
      {/* Status indicator */}
      <Box args={[0.2, 0.2, 0.2]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.3} />
      </Box>
      
      {selected && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          SELECTED
        </Text>
      )}
    </group>
  );
}

// 3D Cargo Component
function Cargo3D({ position, cargoItem, selected }: any) {
  const color = cargoItem.dangerousGoods ? "#ef4444" : "#10b981";
  
  return (
    <group position={position}>
      <Box args={[0.5, 0.3, 0.5]}>
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={selected ? 0.9 : 0.6} 
        />
      </Box>
      
      {cargoItem.dangerousGoods && (
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.15}
          color="#ef4444"
          anchorX="center"
          anchorY="middle"
        >
          DG
        </Text>
      )}
    </group>
  );
}

// Main 3D Scene Component
function DigitalTwin3DScene({ selectedShipment, onShipmentSelect }: any) {
  const { data: shipments = [] } = useRealtimeDigitalTwins();
  
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Environment preset="sunset" />
      
      {/* Grid floor */}
      <gridHelper args={[20, 20]} />
      
      {/* Render vehicles */}
      {shipments.map((shipment, index) => (
        <Vehicle3D
          key={shipment.id}
          position={[index * 4 - 6, 0, 0]}
          rotation={[0, 0, 0]}
          selected={selectedShipment?.id === shipment.id}
          onClick={() => onShipmentSelect(shipment)}
        />
      ))}
      
      {/* Render cargo for selected shipment */}
      {selectedShipment?.cargo.map((cargo: any, index: number) => (
        <Cargo3D
          key={cargo.id}
          position={[
            selectedShipment.cargo.length * 0.3 + index * 0.6,
            0.15,
            0
          ]}
          cargoItem={cargo}
          selected={true}
        />
      ))}
      
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}

// Dynamic wrapper for the 3D scene to prevent SSR
const Dynamic3DScene = dynamic(() => Promise.resolve(DigitalTwin3DScene), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading 3D scene...</div>
});

export default function DigitalTwinDashboard() {
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | 'dashboard' | 'split'>('split');

  const { data: dashboard, isLoading: dashboardLoading } = useDigitalTwinDashboard();
  const { data: analytics, isLoading: analyticsLoading } = useDigitalTwinAnalytics();
  const { data: performance, isLoading: performanceLoading } = useShipmentPerformanceMetrics();
  const { data: cargoInsights, isLoading: cargoLoading } = useCargoMonitoringInsights();
  const { data: predictive, isLoading: predictiveLoading } = usePredictiveAnalytics();
  const { settings, updateSettings } = useVisualizationSettings();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'at_checkpoint': return 'bg-yellow-100 text-yellow-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'exception': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-600 text-white';
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-orange-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Prepare chart data
  const statusChartData = dashboard?.statusDistribution ? 
    Object.entries(dashboard.statusDistribution).map(([status, count]) => ({
      status: status.replace('_', ' '),
      count,
      percentage: Math.round((count / dashboard.summary.totalShipments) * 100),
    })) : [];

  const alertChartData = dashboard?.alertSummary.bySeverity ? 
    Object.entries(dashboard.alertSummary.bySeverity).map(([severity, count]) => ({
      severity,
      count,
    })) : [];

  const STATUS_COLORS = {
    'preparing': '#94a3b8',
    'in transit': '#3b82f6',
    'at checkpoint': '#f59e0b',
    'delayed': '#ef4444',
    'delivered': '#10b981',
    'exception': '#ef4444',
  };

  const ALERT_COLORS = {
    'info': '#3b82f6',
    'warning': '#f59e0b',
    'critical': '#ef4444',
    'emergency': '#dc2626',
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Monitor className="h-8 w-8 text-blue-600" />
              Digital Twin Visualization
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time 3D monitoring and visualization for enhanced operational awareness
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-2"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="3d">3D View</option>
                <option value="dashboard">Dashboard</option>
                <option value="split">Split View</option>
              </select>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
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
              <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboard?.summary.totalShipments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard?.summary.inTransit || 0} in transit
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
                {dashboard?.alertSummary.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard?.summary.criticalAlerts || 0} critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboard ? `${(dashboard.summary.averageProgress * 100).toFixed(0)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Route completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {performance ? `${performance.metrics.reliability.systemAvailability.toFixed(1)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {viewMode === '3d' && (
          <Card className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                3D Fleet Visualization
                <Badge variant="outline" className="ml-2">Real-time</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <Dynamic3DScene 
                selectedShipment={selectedShipment}
                onShipmentSelect={setSelectedShipment}
              />
            </CardContent>
          </Card>
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  3D Visualization
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <Dynamic3DScene 
                  selectedShipment={selectedShipment}
                  onShipmentSelect={setSelectedShipment}
                />
              </CardContent>
            </Card>

            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Live Telemetry
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedShipment ? (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">{selectedShipment.shipmentReference}</div>
                      <div className="text-sm text-gray-600">
                        {selectedShipment.currentLocation.address}
                      </div>
                      <Badge className={getStatusColor(selectedShipment.status)}>
                        {selectedShipment.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-600">Speed</div>
                        <div className="font-bold">{selectedShipment.telemetry.gps.speed.toFixed(0)} km/h</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Fuel</div>
                        <div className="font-bold">{selectedShipment.vehicle.performance.fuelLevel.toFixed(0)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Temperature</div>
                        <div className="font-bold">{selectedShipment.environmental.weather.temperature.toFixed(0)}°C</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Alerts</div>
                        <div className="font-bold">{selectedShipment.alerts.length}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a shipment to view telemetry
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="cargo">Cargo Monitoring</TabsTrigger>
            <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
            <TabsTrigger value="shipments">Live Shipments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Shipment Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ status, percentage }) => `${status}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Alert Severity Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={alertChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ severity, count }) => `${severity}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {alertChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ALERT_COLORS[entry.severity as keyof typeof ALERT_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Environmental Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Environmental Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {dashboard?.environmentalSummary.averageTemperature.toFixed(0) || 0}°C
                    </div>
                    <div className="text-sm text-gray-600">Avg Temperature</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(dashboard?.environmentalSummary.weatherConditions || {}).reduce((a, b) => Math.max(a, b), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Clear Weather</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {Object.values(dashboard?.environmentalSummary.trafficLevels || {}).reduce((a, b) => Math.max(a, b), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Traffic Level</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics ? analytics.performance.onTimePerformance.toFixed(0) : 0}%
                    </div>
                    <div className="text-sm text-gray-600">On-Time Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Efficiency Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {performance && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Speed</span>
                        <span className="font-bold">{performance.metrics.efficiency.averageSpeed.toFixed(0)} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Fuel Efficiency</span>
                        <span className="font-bold">{performance.metrics.efficiency.fuelEfficiency.toFixed(1)} L/100km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Route Optimization</span>
                        <span className="font-bold text-green-600">{performance.metrics.efficiency.routeOptimization.toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reliability Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {performance && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">On-Time Performance</span>
                        <span className="font-bold text-green-600">{performance.metrics.reliability.onTimePerformance.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Communication Uptime</span>
                        <span className="font-bold">{performance.metrics.reliability.communicationUptime.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">System Availability</span>
                        <span className="font-bold text-blue-600">{performance.metrics.reliability.systemAvailability.toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Safety Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {performance && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Alert Rate</span>
                        <span className="font-bold">{performance.metrics.safety.alertRate.toFixed(1)} per trip</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Compliance Score</span>
                        <span className="font-bold text-green-600">{performance.metrics.safety.complianceScore.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Incident-Free Distance</span>
                        <span className="font-bold text-purple-600">{(performance.metrics.safety.incidentFreeDistance / 1000).toFixed(0)}k km</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cargo" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cargo Compliance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cargoInsights && (
                      <>
                        <div className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Temperature Monitoring</span>
                            <span className="text-lg font-bold text-green-600">
                              {cargoInsights.complianceScore}%
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-green-600">{cargoInsights.insights.temperatureCompliance.withinLimits}</div>
                              <div className="text-gray-600">Within Limits</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-yellow-600">{cargoInsights.insights.temperatureCompliance.warnings}</div>
                              <div className="text-gray-600">Warnings</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-red-600">{cargoInsights.insights.temperatureCompliance.critical}</div>
                              <div className="text-gray-600">Critical</div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Dangerous Goods</span>
                            <span className="text-lg font-bold text-blue-600">
                              {cargoInsights.insights.dangerousGoodsMonitoring.totalDGShipments}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {cargoInsights.insights.dangerousGoodsMonitoring.compliantShipments} compliant shipments
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cargoInsights?.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{rec.type.toUpperCase()}</span>
                          <Badge className={
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {rec.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-700 mb-2">{rec.message}</div>
                        <div className="text-sm font-medium text-blue-600">{rec.action}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delay Risk Prediction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {predictive && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">High Risk</span>
                        <span className="font-bold text-red-600">{predictive.predictions.delayRisk.high}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Medium Risk</span>
                        <span className="font-bold text-yellow-600">{predictive.predictions.delayRisk.medium}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Low Risk</span>
                        <span className="font-bold text-green-600">{predictive.predictions.delayRisk.low}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance Predictions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {predictive && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Immediate</span>
                        <span className="font-bold text-red-600">{predictive.predictions.maintenanceAlerts.immediate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Upcoming</span>
                        <span className="font-bold text-yellow-600">{predictive.predictions.maintenanceAlerts.upcoming}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Next 30 Days</span>
                        <span className="font-bold text-blue-600">{predictive.predictions.maintenanceAlerts.predicted30Days}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {predictive && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Overall Risk Score</span>
                        <span className={`font-bold ${
                          predictive.predictions.riskAssessment.overallRiskScore < 30 ? 'text-green-600' :
                          predictive.predictions.riskAssessment.overallRiskScore < 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {predictive.predictions.riskAssessment.overallRiskScore.toFixed(0)}/100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">High Risk Shipments</span>
                        <span className="font-bold text-red-600">{predictive.predictions.riskAssessment.highRiskShipments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Prediction Confidence</span>
                        <span className="font-bold text-blue-600">{predictive.confidence.toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shipments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Live Shipment Tracking
                  <Badge variant="outline" className="ml-2">Real-time</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard?.shipments.map((shipment) => (
                    <div 
                      key={shipment.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedShipment?.id === shipment.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedShipment(shipment)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{shipment.shipmentReference}</div>
                        <Badge className={getStatusColor(shipment.status)}>
                          {shipment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">Current Location</div>
                          <div className="font-medium">{shipment.currentLocation.address}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Destination</div>
                          <div className="font-medium">{shipment.destination.address}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Speed</div>
                          <div className="font-medium">{shipment.telemetry.gps.speed.toFixed(0)} km/h</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Alerts</div>
                          <div className="font-medium">{shipment.alerts.length}</div>
                        </div>
                      </div>
                      {shipment.alerts.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-sm text-gray-600 mb-1">Recent Alerts:</div>
                          <div className="flex gap-1 flex-wrap">
                            {shipment.alerts.slice(0, 3).map((alert) => (
                              <Badge key={alert.id} className={getAlertSeverityColor(alert.severity)}>
                                {alert.type.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
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
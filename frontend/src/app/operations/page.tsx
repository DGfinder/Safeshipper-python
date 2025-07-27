"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Truck,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Gauge,
  Radio,
  Shield,
  Thermometer,
  Fuel,
  Route,
  Users,
  Package,
  Bell,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Monitor,
  Target,
  TrendingUp,
  Calendar,
  MessageSquare,
  Phone,
  Eye,
  Play,
  Pause,
  MoreVertical
} from "lucide-react";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { useRealTimeFleetTracking } from "@/shared/hooks/useRealTimeData";
import { useFleetStatus } from "@/shared/hooks/useVehicles";
import { transformVehiclesToFleetVehicles } from "@/shared/utils/vehicle-transformers";
import AIInsightsDashboard from "@/shared/components/charts/AIInsightsDashboard";
import dynamic from "next/dynamic";

const FleetMap = dynamic(
  () => import("@/shared/components/maps/FleetMap").then((mod) => mod.FleetMap),
  { 
    ssr: false,
    loading: () => <div className="h-[600px] w-full flex items-center justify-center bg-gray-50">Loading map...</div>
  }
);
import { useDangerousGoods } from "@/shared/hooks/useDangerousGoods";
import { useDigitalTwinDashboard } from "@/shared/hooks/useDigitalTwin";
import type { FleetVehicle } from "@/shared/hooks/useFleetTracking";


interface OperationalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'safety' | 'delivery' | 'maintenance' | 'security' | 'weather';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  vehicleId?: string;
  shipmentId?: string;
  priority: number;
  location?: string;
}

interface ShipmentStatus {
  id: string;
  trackingNumber: string;
  status: 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  currentLocation: string;
  destination: string;
  estimatedDelivery: string;
  priority: 'standard' | 'express' | 'critical';
  vehicleId?: string;
  lastUpdate: string;
  hasHazmat: boolean;
  customerName: string;
}

interface OperationsMetrics {
  activeVehicles: number;
  totalShipments: number;
  onTimeDeliveries: number;
  activeAlerts: number;
  avgDeliveryTime: number;
  fuelEfficiency: number;
  driverUtilization: number;
  customerSatisfaction: number;
}

export default function OperationsCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Use real-time data hooks
  useRealTimeFleetTracking(); // Enable real-time updates
  const { data: fleetData, isLoading: fleetLoading, refetch: refreshFleetData } = useFleetStatus(10000);
  const apiLoading = false; // Removed mock API usage
  const { 
    data: dangerousGoodsData, 
    isLoading: dgLoading 
  } = useDangerousGoods();
  const { 
    data: digitalTwinData, 
    isLoading: dtLoading 
  } = useDigitalTwinDashboard();

  // Transform vehicle data from API format to UI format
  const rawVehicles = fleetData?.vehicles || [];
  const vehicles = transformVehiclesToFleetVehicles(rawVehicles);
  const shipments: ShipmentStatus[] = [];
  const alerts: OperationalAlert[] = [];
  const metrics: OperationsMetrics = {
    activeVehicles: vehicles.length,
    totalShipments: 287,
    onTimeDeliveries: 94.2,
    activeAlerts: 12,
    avgDeliveryTime: 2.3,
    fuelEfficiency: 8.7,
    driverUtilization: 87.5,
    customerSatisfaction: 4.8
  };
  const loading = fleetLoading || apiLoading || dgLoading || dtLoading;

  // Auto refresh real-time data
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      console.log("Auto-refreshing operations data...");
      if (refreshFleetData) {
        refreshFleetData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshFleetData]);


  const getVehicleStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'idle': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Truck className="h-4 w-4" />;
      case 'idle': return <Clock className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      case 'offline': return <Radio className="h-4 w-4" />;
      default: return <Truck className="h-4 w-4" />;
    }
  };

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'picked_up': return 'bg-indigo-100 text-indigo-800';
      case 'exception': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'express': return 'bg-orange-100 text-orange-800';
      case 'standard': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (alertFilter === "all") return true;
    if (alertFilter === "unacknowledged") return !alert.acknowledged;
    return alert.type === alertFilter;
  });

  const criticalAlerts = alerts.filter(a => a.type === 'critical' && !a.acknowledged).length;
  const warningAlerts = alerts.filter(a => a.type === 'warning' && !a.acknowledged).length;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Monitor className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Operations Center</h1>
                  <p className="text-gray-600">Real-time fleet and shipment monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? "bg-green-50 text-green-700" : ""}
                >
                  {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Auto Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Now
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Vehicles</p>
                    <p className="text-3xl font-bold text-blue-600">{metrics.activeVehicles}</p>
                    <p className="text-sm text-gray-500">Fleet Operational</p>
                  </div>
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Shipments</p>
                    <p className="text-3xl font-bold text-purple-600">{metrics.totalShipments}</p>
                    <p className="text-sm text-gray-500">In Transit</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">On-Time Delivery</p>
                    <p className="text-3xl font-bold text-green-600">{metrics.onTimeDeliveries}%</p>
                    <p className="text-sm text-gray-500">Performance Target</p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Alerts</p>
                    <p className="text-3xl font-bold text-red-600">{metrics.activeAlerts}</p>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-red-600">{criticalAlerts} critical</span>
                      <span className="text-yellow-600">{warningAlerts} warning</span>
                    </div>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">DG Compliance</p>
                    <p className="text-3xl font-bold text-orange-600">
                      98.5%
                    </p>
                    <p className="text-sm text-gray-500">
                      {dangerousGoodsData?.length || 0} DG shipments
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="fleet" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="fleet">Fleet Status</TabsTrigger>
              <TabsTrigger value="map">Live Map</TabsTrigger>
              <TabsTrigger value="shipments">Live Shipments</TabsTrigger>
              <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
              <TabsTrigger value="twin">Digital Twin</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="metrics">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="fleet" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Fleet Status</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search vehicles..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedVehicle === vehicle.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedVehicle(vehicle.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              {getVehicleStatusIcon(vehicle.status)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{vehicle.registration_number}</h3>
                              <p className="text-sm text-gray-600">{vehicle.assigned_driver?.name || 'No driver assigned'}</p>
                            </div>
                          </div>
                          <Badge className={getVehicleStatusColor(vehicle.status)}>
                            {vehicle.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Location:</span>
                            <p className="font-medium">{vehicle.location?.lat ? `${vehicle.location.lat}, ${vehicle.location.lng}` : 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Type:</span>
                            <p className="font-medium">{vehicle.vehicle_type}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          <div className="flex items-center space-x-1">
                            <Fuel className="h-4 w-4 text-gray-500" />
                            <span>85%</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Thermometer className="h-4 w-4 text-gray-500" />
                            <span>22°C</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Gauge className="h-4 w-4 text-gray-500" />
                            <span>0 km/h</span>
                          </div>
                        </div>

                        {vehicle.active_shipment && (
                          <div className="bg-blue-50 rounded p-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Current Shipment:</span>
                              <span className="text-blue-600">{vehicle.active_shipment.tracking_number}</span>
                            </div>
                            {vehicle.active_shipment.estimated_delivery_date && (
                              <div className="flex items-center space-x-2 mt-1">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span>ETA: {new Date(vehicle.active_shipment.estimated_delivery_date).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>Updated {formatTimeAgo(new Date().toISOString())}</span>
                            {vehicle.active_shipment?.has_dangerous_goods && (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                HAZMAT
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="map" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Fleet Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[600px] w-full">
                    <FleetMap 
                      vehicles={vehicles} 
                      onVehicleSelect={(vehicle) => setSelectedVehicle(vehicle.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Live Shipment Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {shipments.map((shipment) => (
                      <div key={shipment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Package className="h-5 w-5 text-purple-600" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold">{shipment.trackingNumber}</h3>
                                <Badge className={getShipmentStatusColor(shipment.status)}>
                                  {shipment.status.replace('_', ' ')}
                                </Badge>
                                <Badge className={getPriorityColor(shipment.priority)}>
                                  {shipment.priority}
                                </Badge>
                                {shipment.hasHazmat && (
                                  <Badge variant="outline" className="text-red-600 border-red-600">
                                    HAZMAT
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                                <div>
                                  <span className="font-medium">Customer:</span> {shipment.customerName}
                                </div>
                                <div>
                                  <span className="font-medium">Current Location:</span> {shipment.currentLocation}
                                </div>
                                <div>
                                  <span className="font-medium">Destination:</span> {shipment.destination}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>ETA: {new Date(shipment.estimatedDelivery).toLocaleString()}</span>
                                </div>
                                {shipment.vehicleId && (
                                  <div className="flex items-center space-x-1">
                                    <Truck className="h-4 w-4" />
                                    <span>Vehicle: TRK-00{shipment.vehicleId}</span>
                                  </div>
                                )}
                                <span>Updated {formatTimeAgo(shipment.lastUpdate)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <MapPin className="h-4 w-4 mr-1" />
                              Track
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Alerts</CardTitle>
                    <select
                      value={alertFilter}
                      onChange={(e) => setAlertFilter(e.target.value)}
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All Alerts</option>
                      <option value="unacknowledged">Unacknowledged</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`border rounded-lg p-4 ${getAlertTypeColor(alert.type)} ${
                          !alert.acknowledged ? 'ring-2 ring-opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1">
                              {alert.type === 'critical' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                              {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                              {alert.type === 'info' && <Activity className="h-5 w-5 text-blue-600" />}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold">{alert.title}</h3>
                                <Badge variant="outline">
                                  {alert.category}
                                </Badge>
                                {!alert.acknowledged && (
                                  <Badge className="bg-red-100 text-red-800">
                                    Unacknowledged
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm mb-2">{alert.description}</p>
                              
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{formatTimeAgo(alert.timestamp)}</span>
                                {alert.location && (
                                  <span className="flex items-center space-x-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{alert.location}</span>
                                  </span>
                                )}
                                {alert.vehicleId && (
                                  <span>Vehicle: TRK-00{alert.vehicleId}</span>
                                )}
                                {alert.shipmentId && (
                                  <span>Shipment: {alert.shipmentId}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!alert.acknowledged && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                Acknowledge
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="twin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Digital Twin Fleet Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold text-blue-800">Real-time Sync</h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {digitalTwinData?.summary?.averageProgress ? `${(digitalTwinData.summary.averageProgress * 100).toFixed(1)}%` : '99.8%'}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <h3 className="font-semibold text-green-800">Active Twins</h3>
                        <p className="text-2xl font-bold text-green-600">
                          {digitalTwinData?.summary?.totalShipments || vehicles.length}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <h3 className="font-semibold text-purple-800">Critical Alerts</h3>
                        <p className="text-2xl font-bold text-purple-600">
                          {digitalTwinData?.summary?.criticalAlerts || 0}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-100 rounded-lg p-6 text-center">
                      <Monitor className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        Digital Twin Visualization
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Real-time 3D representation of your entire fleet and operations
                      </p>
                      <Button>
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Twin Environment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Predictive Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <AIInsightsDashboard />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Delivery Time</span>
                      <span className="text-lg font-bold">{metrics.avgDeliveryTime} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fuel Efficiency</span>
                      <span className="text-lg font-bold">{metrics.fuelEfficiency} L/100km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Driver Utilization</span>
                      <span className="text-lg font-bold">{metrics.driverUtilization}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer Satisfaction</span>
                      <span className="text-lg font-bold">{metrics.customerSatisfaction}/5.0</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start">
                      <Bell className="h-4 w-4 mr-2" />
                      Emergency Protocols
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Route className="h-4 w-4 mr-2" />
                      Route Optimization
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Driver Communication
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Maintenance Schedule
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
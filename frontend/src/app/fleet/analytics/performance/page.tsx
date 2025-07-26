"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  Activity,
  Fuel,
  Clock,
  MapPin,
  TrendingUp,
  TrendingDown,
  Target,
  Gauge,
  Route,
  Timer,
  Download,
  Calendar
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";

export default function PerformanceAnalyticsPage() {
  const { can } = usePermissions();
  const { data: fleetData } = useMockFleetStatus();
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedVehicle, setSelectedVehicle] = useState("all");

  const vehicles = fleetData?.vehicles || [];

  // Mock performance data
  const getPerformanceMetrics = () => {
    return {
      utilization: {
        current: 78.5,
        target: 85.0,
        change: 5.2,
        trend: "up",
        breakdown: {
          active: vehicles.filter(v => v.status === "ACTIVE").length,
          inTransit: vehicles.filter(v => v.status === "IN_TRANSIT").length,
          maintenance: vehicles.filter(v => v.status === "MAINTENANCE").length,
          offline: vehicles.filter(v => v.status === "OFFLINE").length
        }
      },
      efficiency: {
        fuelConsumption: 8.4,
        fuelTarget: 9.0,
        avgSpeed: 65.2,
        idleTime: 12.5,
        routeOptimization: 89.3
      },
      delivery: {
        onTime: 94.2,
        early: 3.1,
        late: 2.7,
        avgDeliveryTime: 2.4,
        customerSatisfaction: 4.6
      },
      driver: {
        avgHours: 8.2,
        overtimeHours: 1.3,
        safetyScore: 92.1,
        trainingCompliance: 96.8
      }
    };
  };

  const performanceData = getPerformanceMetrics();

  const getVehiclePerformance = () => {
    return vehicles.map(vehicle => ({
      id: vehicle.id,
      registration: vehicle.registration_number,
      type: vehicle.vehicle_type,
      utilization: Math.random() * 40 + 60, // 60-100
      fuelEfficiency: Math.random() * 3 + 7, // 7-10 km/L
      onTimeDelivery: Math.random() * 20 + 80, // 80-100%
      safetyScore: Math.random() * 20 + 80, // 80-100
      totalDistance: Math.floor(Math.random() * 5000 + 10000), // 10k-15k km
      activeShipment: vehicle.active_shipment?.tracking_number || null
    }));
  };

  const vehiclePerformance = getVehiclePerformance();

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getPerformanceColor = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return "bg-green-500";
    if (utilization >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Performance Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Detailed performance metrics and vehicle utilization analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Can permission="fleet.analytics.export">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Fleet Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {performanceData.utilization.current}%
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(performanceData.utilization.trend)}
                <span className="text-sm font-medium text-green-600">
                  +{performanceData.utilization.change}%
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Target: {performanceData.utilization.target}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${(performanceData.utilization.current / performanceData.utilization.target) * 100}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Fuel Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.efficiency.fuelConsumption} km/L
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Target: {performanceData.efficiency.fuelTarget} km/L
            </div>
            <div className="text-xs text-green-600 mt-1">
              6.7% above target
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              On-Time Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {performanceData.delivery.onTime}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Avg. delivery: {performanceData.delivery.avgDeliveryTime}h
            </div>
            <div className="text-xs text-green-600 mt-1">
              +2.1% vs last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Driver Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.driver.safetyScore}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Safety Score (out of 100)
            </div>
            <div className="text-xs text-green-600 mt-1">
              Training: {performanceData.driver.trainingCompliance}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Comparison</TabsTrigger>
        </TabsList>

        {/* Utilization Analysis */}
        <TabsContent value="utilization">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Fleet Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Active</span>
                    </div>
                    <span className="font-medium">
                      {performanceData.utilization.breakdown.active} vehicles
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">In Transit</span>
                    </div>
                    <span className="font-medium">
                      {performanceData.utilization.breakdown.inTransit} vehicles
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Maintenance</span>
                    </div>
                    <span className="font-medium">
                      {performanceData.utilization.breakdown.maintenance} vehicles
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-sm">Offline</span>
                    </div>
                    <span className="font-medium">
                      {performanceData.utilization.breakdown.offline} vehicles
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Operational Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{performanceData.driver.avgHours}</div>
                    <div className="text-sm text-gray-600">Average Daily Hours</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="font-medium text-blue-800">Regular Hours</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {performanceData.driver.avgHours - performanceData.driver.overtimeHours}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <div className="font-medium text-orange-800">Overtime</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {performanceData.driver.overtimeHours}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Efficiency Analysis */}
        <TabsContent value="efficiency">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Fuel Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {performanceData.efficiency.fuelConsumption} km/L
                    </div>
                    <div className="text-sm text-gray-600">Fleet Average</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Target Efficiency</span>
                      <span className="font-medium">{performanceData.efficiency.fuelTarget} km/L</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Best Performer</span>
                      <span className="font-medium text-green-600">9.8 km/L</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Needs Improvement</span>
                      <span className="font-medium text-red-600">6.2 km/L</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600">
                      Monthly Savings: <span className="font-medium text-green-600">$1,250</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Route Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {performanceData.efficiency.routeOptimization}%
                    </div>
                    <div className="text-sm text-gray-600">Route Efficiency</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Speed</span>
                      <span className="font-medium">{performanceData.efficiency.avgSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Idle Time</span>
                      <span className="font-medium text-yellow-600">{performanceData.efficiency.idleTime}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Route Deviation</span>
                      <span className="font-medium text-green-600">2.1%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Delivery Performance */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Delivery Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {performanceData.delivery.onTime}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">On-Time Deliveries</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${performanceData.delivery.onTime}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceData.delivery.early}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Early Deliveries</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${performanceData.delivery.early * 3}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {performanceData.delivery.late}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Late Deliveries</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${performanceData.delivery.late * 4}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-xl font-bold">{performanceData.delivery.avgDeliveryTime}h</div>
                    <div className="text-sm text-gray-600">Average Delivery Time</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-xl font-bold">{performanceData.delivery.customerSatisfaction}/5</div>
                    <div className="text-sm text-gray-600">Customer Satisfaction</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle Comparison */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Individual Vehicle Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehiclePerformance.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-medium">{vehicle.registration}</div>
                        <div className="text-sm text-gray-600">{vehicle.type}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Utilization</div>
                        <div className="font-medium">{vehicle.utilization.toFixed(1)}%</div>
                        <div className={`w-12 h-2 rounded-full ${getUtilizationColor(vehicle.utilization)}`}></div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Fuel Eff.</div>
                        <div className="font-medium">{vehicle.fuelEfficiency.toFixed(1)} km/L</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">On-Time</div>
                        <div className="font-medium">{vehicle.onTimeDelivery.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Safety</div>
                        <div className="font-medium">{vehicle.safetyScore.toFixed(0)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Distance</div>
                        <div className="font-medium">{vehicle.totalDistance.toLocaleString()} km</div>
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
  );
}
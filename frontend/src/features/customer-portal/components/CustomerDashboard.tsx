"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  Globe
} from "lucide-react";

interface DashboardStats {
  totalShipments: number;
  shipmentsChange: number;
  activeShipments: number;
  activeChange: number;
  onTimeDelivery: number;
  onTimeChange: number;
  totalSpent: number;
  spentChange: number;
  avgDeliveryTime: number;
  deliveryTimeChange: number;
  carbonFootprint: number;
  carbonChange: number;
}

interface RecentActivity {
  id: string;
  type: 'shipment' | 'delivery' | 'pickup' | 'quote';
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  location?: string;
  trackingNumber?: string;
}

interface ShipmentsByStatus {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface DeliveryPerformance {
  month: string;
  onTime: number;
  delayed: number;
  total: number;
}

interface CostAnalysis {
  category: string;
  amount: number;
  percentage: number;
  change: number;
}

export default function CustomerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [shipmentsByStatus, setShipmentsByStatus] = useState<ShipmentsByStatus[]>([]);
  const [deliveryPerformance, setDeliveryPerformance] = useState<DeliveryPerformance[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with real API calls
    const mockStats: DashboardStats = {
      totalShipments: 487,
      shipmentsChange: 12.5,
      activeShipments: 23,
      activeChange: -3.2,
      onTimeDelivery: 94.8,
      onTimeChange: 2.1,
      totalSpent: 45670,
      spentChange: 8.7,
      avgDeliveryTime: 2.3,
      deliveryTimeChange: -0.4,
      carbonFootprint: 1.2,
      carbonChange: -5.8
    };

    const mockActivities: RecentActivity[] = [
      {
        id: "1",
        type: "delivery",
        description: "Package delivered successfully to Vancouver warehouse",
        timestamp: "2024-07-14T15:30:00Z",
        status: "success",
        location: "Vancouver, BC",
        trackingNumber: "SS-2024-001235"
      },
      {
        id: "2",
        type: "shipment",
        description: "New shipment created for Calgary delivery",
        timestamp: "2024-07-14T14:15:00Z",
        status: "info",
        location: "Toronto, ON",
        trackingNumber: "SS-2024-001237"
      },
      {
        id: "3",
        type: "shipment",
        description: "Shipment delayed due to weather conditions",
        timestamp: "2024-07-14T12:30:00Z",
        status: "warning",
        location: "Winnipeg, MB",
        trackingNumber: "SS-2024-001236"
      },
      {
        id: "4",
        type: "pickup",
        description: "Emergency pickup completed ahead of schedule",
        timestamp: "2024-07-14T10:45:00Z",
        status: "success",
        location: "Montreal, QC"
      },
      {
        id: "5",
        type: "quote",
        description: "Quote request approved for bulk shipment",
        timestamp: "2024-07-14T09:20:00Z",
        status: "info"
      }
    ];

    const mockShipmentsByStatus: ShipmentsByStatus[] = [
      { status: "In Transit", count: 23, percentage: 47.2, color: "bg-blue-500" },
      { status: "Delivered", count: 18, percentage: 36.7, color: "bg-green-500" },
      { status: "Pending", count: 5, percentage: 10.2, color: "bg-yellow-500" },
      { status: "Delayed", count: 3, percentage: 6.1, color: "bg-red-500" }
    ];

    const mockDeliveryPerformance: DeliveryPerformance[] = [
      { month: "Jan", onTime: 92, delayed: 8, total: 45 },
      { month: "Feb", onTime: 89, delayed: 11, total: 52 },
      { month: "Mar", onTime: 94, delayed: 6, total: 48 },
      { month: "Apr", onTime: 91, delayed: 9, total: 51 },
      { month: "May", onTime: 96, delayed: 4, total: 55 },
      { month: "Jun", onTime: 93, delayed: 7, total: 49 }
    ];

    const mockCostAnalysis: CostAnalysis[] = [
      { category: "Standard Shipping", amount: 18500, percentage: 40.5, change: 5.2 },
      { category: "Express Shipping", amount: 15200, percentage: 33.3, change: 12.1 },
      { category: "Hazmat Handling", amount: 8900, percentage: 19.5, change: -2.3 },
      { category: "Insurance", amount: 2070, percentage: 4.5, change: 1.8 },
      { category: "Other Services", amount: 1000, percentage: 2.2, change: -0.5 }
    ];

    setTimeout(() => {
      setStats(mockStats);
      setActivities(mockActivities);
      setShipmentsByStatus(mockShipmentsByStatus);
      setDeliveryPerformance(mockDeliveryPerformance);
      setCostAnalysis(mockCostAnalysis);
      setLoading(false);
    }, 1000);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <CheckCircle className="h-4 w-4" />;
      case 'shipment': return <Package className="h-4 w-4" />;
      case 'pickup': return <Truck className="h-4 w-4" />;
      case 'quote': return <DollarSign className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Shipments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalShipments}</p>
                <div className="flex items-center mt-2">
                  {stats.shipmentsChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${stats.shipmentsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(stats.shipmentsChange)}% vs last month
                  </span>
                </div>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Shipments</p>
                <p className="text-3xl font-bold text-orange-600">{stats.activeShipments}</p>
                <div className="flex items-center mt-2">
                  {stats.activeChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${stats.activeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(stats.activeChange)}% vs last week
                  </span>
                </div>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On-Time Delivery</p>
                <p className="text-3xl font-bold text-green-600">{stats.onTimeDelivery}%</p>
                <div className="flex items-center mt-2">
                  {stats.onTimeChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${stats.onTimeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(stats.onTimeChange)}% vs last month
                  </span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats.totalSpent)}</p>
                <div className="flex items-center mt-2">
                  {stats.spentChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${stats.spentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(stats.spentChange)}% vs last month
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Delivery Time</p>
                <p className="text-3xl font-bold text-indigo-600">{stats.avgDeliveryTime} days</p>
                <div className="flex items-center mt-2">
                  {stats.deliveryTimeChange <= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${stats.deliveryTimeChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(stats.deliveryTimeChange)} days faster
                  </span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Carbon Footprint</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.carbonFootprint} tons CO₂</p>
                <div className="flex items-center mt-2">
                  {stats.carbonChange <= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm ${stats.carbonChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(stats.carbonChange)}% reduction
                  </span>
                </div>
              </div>
              <Globe className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipments by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Shipments by Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shipmentsByStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm font-medium">{item.status}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{item.count}</span>
                    <span className="text-sm font-medium">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Cost Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {costAnalysis.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{formatCurrency(item.amount)}</span>
                      <span className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>{formatTimeAgo(activity.timestamp)}</span>
                    {activity.location && (
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{activity.location}</span>
                      </span>
                    )}
                    {activity.trackingNumber && (
                      <span className="font-mono">{activity.trackingNumber}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button className="h-20 flex-col space-y-2">
          <Package className="h-6 w-6" />
          <span>New Shipment</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <MapPin className="h-6 w-6" />
          <span>Track Package</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <DollarSign className="h-6 w-6" />
          <span>Get Quote</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <Calendar className="h-6 w-6" />
          <span>Schedule Pickup</span>
        </Button>
      </div>
    </div>
  );
}
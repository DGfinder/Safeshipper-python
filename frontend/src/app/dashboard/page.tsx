"use client";

import React from "react";
import {
  Truck,
  FileSearch,
  BarChart3,
  MapPin,
  Eye,
  Star,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileCheck,
  Clock,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { 
  useDashboardStats, 
  useInspectionStats, 
  useRecentActivity, 
  usePODStats, 
  useRecentShipments 
} from "@/shared/hooks/useDashboard";

// Types for our data (keeping for future use)
// interface StatCard {
//   id: string;
//   title: string;
//   value: string;
//   description: string;
//   change: string;
//   trend: string;
//   icon: React.ComponentType<{ className?: string; color?: string }>;
//   color: string;
//   borderColor: string;
// }

interface ShipmentRow {
  id: string;
  identifier: string;
  origin: string;
  destination: string;
  dangerousGoods: string[];
  hazchemCode: string;
  progress: number;
}

export default function Dashboard() {
  // Fetch live data using our new hooks
  const { data: stats, error: statsError, isLoading: statsLoading } = useDashboardStats();
  const { data: inspectionStats, isLoading: inspectionLoading } = useInspectionStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity(5);
  const { data: podStats, isLoading: podLoading } = usePODStats();
  const { data: recentShipments, isLoading: shipmentsLoading } = useRecentShipments(5);

  // Update stat cards with real data
  const statCardsData = [
    {
      id: "1",
      title: "Total Shipments",
      value: stats?.totalShipments?.toLocaleString() || "0",
      description: "Active shipments in transit",
      change: stats?.trends?.shipments_change || "+0%",
      trend: (stats?.trends?.shipments_change?.startsWith('+') ? "up" : "down") as "up" | "down",
      icon: Truck,
      color: "rgba(21, 63, 159, 0.08)",
      borderColor: "#153F9F",
    },
    {
      id: "2",
      title: "Pending Reviews",
      value: stats?.pendingReviews?.toString() || "0",
      description: "Documents requiring approval",
      change: "-8.2%", // TODO: Add to backend API
      trend: "down" as const,
      icon: FileSearch,
      color: "rgba(255, 159, 67, 0.08)",
      borderColor: "#FF9F43",
    },
    {
      id: "3",
      title: "Compliance Rate",
      value: `${stats?.complianceRate || 0}%`,
      description: "Safety compliance score",
      change: stats?.trends?.compliance_trend || "+0%",
      trend: (stats?.trends?.compliance_trend?.startsWith('+') ? "up" : "down") as "up" | "down",
      icon: BarChart3,
      color: "rgba(234, 84, 85, 0.08)",
      borderColor: "#EA5455",
    },
    {
      id: "4",
      title: "Active Routes",
      value: stats?.activeRoutes?.toString() || "0",
      description: "Currently operating routes",
      change: stats?.trends?.routes_change || "+0%",
      trend: (stats?.trends?.routes_change?.startsWith('+') ? "up" : "down") as "up" | "down",
      icon: MapPin,
      color: "rgba(0, 207, 232, 0.08)",
      borderColor: "#00CFE8",
    },
  ];

  if (statsError) {
    console.warn("Dashboard error:", statsError);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Company Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">OutbackHaul Transport Operations</h1>
              <p className="text-blue-100 mt-1">
                Road Train & Dangerous Goods Specialist • Perth, WA • 40 Trucks • Established 1987
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Fleet Status</div>
              <div className="text-xl font-bold">
                {Math.round((stats?.activeRoutes || 23) / 40 * 100)}% Active
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCardsData.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.id}
                className={index === 0 ? "border-b-4" : ""}
                style={
                  index === 0 ? { borderBottomColor: card.borderColor } : {}
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: card.color }}
                    >
                      <Icon className="w-6 h-6" color={card.borderColor} />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {card.value}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 text-sm">{card.description}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          card.trend === "up"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {card.change}
                      </span>
                      <span className="text-gray-500 text-xs">this month</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Inspection & Communication Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inspection Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle>Inspection Performance</CardTitle>
                </div>
                <Badge variant="success">{inspectionStats?.pass_rate || 0}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {inspectionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pass Rate</span>
                    <span className="font-bold text-green-600">{inspectionStats?.pass_rate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed Today</span>
                    <span className="font-medium">{inspectionStats?.completed_today || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Failed Inspections
                    </span>
                    <span className="font-medium text-red-600">{inspectionStats?.failed_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending Reviews</span>
                    <span className="font-medium text-yellow-600">{inspectionStats?.pending_count || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${inspectionStats?.pass_rate || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <CardTitle>Communication Activity</CardTitle>
                </div>
                <Badge variant="info">{recentActivity?.unread_count ? `${recentActivity.unread_count} New` : 'Live'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity?.events?.slice(0, 3).map((event, index) => (
                    <div key={event.id} className={`flex items-center gap-3 ${index < 2 ? 'pb-2 border-b' : ''}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        event.priority === 'HIGH' ? 'bg-red-500' : 
                        event.priority === 'MEDIUM' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {event.shipment_identifier} • {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )) || []}
                  {!recentActivity?.events?.length && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 text-center">
                      <Activity className="h-3 w-3 inline mr-1" />
                      {recentActivity?.total_events || 0} events total
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proof of Delivery Stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-purple-600" />
                  <CardTitle>Proof of Delivery</CardTitle>
                </div>
                <Badge variant="success">{podStats?.capture_rate || 0}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {podLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Capture Rate</span>
                    <span className="font-bold text-purple-600">{podStats?.capture_rate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Digital Signatures
                    </span>
                    <span className="font-medium">{podStats?.digital_signatures || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Photos Captured</span>
                    <span className="font-medium">{podStats?.photos_captured || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Avg Response Time
                    </span>
                    <span className="font-medium text-green-600">{podStats?.avg_response_time_hours || 0}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${podStats?.capture_rate || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Review Analytics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Reviews</CardTitle>
                  <CardDescription>Weekly review analytics</CardDescription>
                </div>
                <Badge variant="success">+12.5%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-[#153F9F]">
                      4.89
                    </span>
                    <Star className="w-6 h-6 text-[#153F9F] fill-current" />
                  </div>
                  <p className="text-gray-600 font-semibold">
                    Total 187 reviews
                  </p>
                  <p className="text-gray-500">
                    All reviews are from genuine customers
                  </p>
                  <Badge variant="info">+5 This week</Badge>
                </div>
                <div className="w-px h-32 bg-gray-200"></div>
                <div className="space-y-3 flex-1 ml-6">
                  {[
                    { stars: 5, count: 124, width: 80 },
                    { stars: 4, count: 40, width: 30 },
                    { stars: 3, count: 12, width: 19 },
                    { stars: 2, count: 7, width: 9 },
                    { stars: 1, count: 2, width: 5 },
                  ].map((item) => (
                    <div key={item.stars} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-12">
                        {item.stars} Star
                      </span>
                      <div className="flex-1">
                        <Progress value={item.width} className="h-2" />
                      </div>
                      <span className="text-sm text-gray-600 w-8">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earning Reports */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Earning Reports</CardTitle>
                  <CardDescription>Monthly revenue breakdown</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  2023
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#153F9F"
                      strokeWidth="8"
                      strokeDasharray="502"
                      strokeDashoffset="125"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      78%
                    </span>
                    <span className="text-gray-600">Total Growth</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4">
                {[
                  { label: "Earnings", color: "#2884C7" },
                  { label: "Profit", color: "#538DD2" },
                  { label: "Expense", color: "#7EA4DD" },
                  { label: "Growth", color: "#A9BFE9" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipments Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Shipments in Transit</CardTitle>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Identifier",
                      "Origin",
                      "Destination",
                      "Dangerous Goods",
                      "Hazchem Code",
                      "Progress",
                      "Actions",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-2">
                          {header}
                          <div className="flex flex-col">
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                            <ChevronDown className="w-3 h-3 text-gray-400 -mt-1" />
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shipmentsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : recentShipments?.shipments?.length ? (
                    recentShipments.shipments.map((shipment) => (
                      <tr key={shipment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Truck className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="font-semibold text-gray-900">
                              {shipment.identifier}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {shipment.origin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {shipment.destination}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex -space-x-2">
                            {shipment.dangerous_goods
                              ?.slice(0, 3)
                              .map((dg, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white"
                                  title={dg}
                                >
                                  DG
                                </Badge>
                              ))}
                            {(shipment.dangerous_goods?.length || 0) > 3 && (
                              <Badge
                                variant="outline"
                                className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white"
                              >
                                +{(shipment.dangerous_goods?.length || 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {shipment.hazchem_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Progress
                              value={shipment.progress}
                              className="flex-1"
                            />
                            <span className="text-sm text-gray-600 w-12">
                              {shipment.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <MapPin className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No recent shipments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-700">
                Showing 1 to {recentShipments?.shipments?.length || 0} of {recentShipments?.total || 0} entries
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Previous
                </Button>
                <Button size="sm">1</Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  4
                </Button>
                <Button variant="outline" size="sm">
                  5
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Truck, FileText, Shield, MapPin } from "lucide-react";
import type { DashboardStats, FleetStatus } from "@/utils/lib/server-api";

interface StatCardsProps {
  stats: DashboardStats;
  fleetStatus: FleetStatus;
}

export function StatCards({ stats, fleetStatus }: StatCardsProps) {
  const statCardsData = [
    {
      id: "1",
      title: "Total Shipments",
      value: stats.totalShipments.toLocaleString(),
      description: "Active shipments in transit",
      change: stats.trends.shipments_change,
      trend: stats.trends.shipments_change.startsWith('+') ? "up" : "down",
      icon: Truck,
      color: "rgba(21, 63, 159, 0.08)",
      borderColor: "#153F9F",
    },
    {
      id: "2",
      title: "Pending Reviews",
      value: stats.pendingReviews.toString(),
      description: "Documents requiring approval",
      change: "-8.2%",
      trend: "down" as const,
      icon: FileText,
      color: "rgba(255, 159, 67, 0.08)",
      borderColor: "#FF9F43",
    },
    {
      id: "3",
      title: "Compliance Rate",
      value: `${stats.complianceRate}%`,
      description: "Safety compliance score",
      change: stats.trends.compliance_trend,
      trend: stats.trends.compliance_trend.startsWith('+') ? "up" : "down",
      icon: Shield,
      color: "rgba(234, 84, 85, 0.08)",
      borderColor: "#EA5455",
    },
    {
      id: "4",
      title: "Active Routes",
      value: stats.activeRoutes.toString(),
      description: "Currently operating routes",
      change: stats.trends.routes_change,
      trend: stats.trends.routes_change.startsWith('+') ? "up" : "down",
      icon: MapPin,
      color: "rgba(0, 207, 232, 0.08)",
      borderColor: "#00CFE8",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCardsData.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className={index === 0 ? "border-b-4" : ""}
            style={index === 0 ? { borderBottomColor: card.borderColor } : {}}
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
                      card.trend === "up" ? "text-green-600" : "text-red-600"
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
  );
}
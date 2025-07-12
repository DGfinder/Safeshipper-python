// components/load-planner/LoadPlanStats.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Weight,
  Maximize,
  TrendingUp,
  Truck,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { type LoadPlan } from "@/hooks/useLoadPlan";

interface LoadPlanStatsProps {
  loadPlan: LoadPlan;
  className?: string;
}

export function LoadPlanStats({ loadPlan, className }: LoadPlanStatsProps) {
  const { efficiency_stats, vehicle, placed_items } = loadPlan;

  // Group items by dangerous goods class
  const dgClassCounts = placed_items.reduce(
    (acc, item) => {
      const dgClass = item.dangerous_goods_class || "GENERAL";
      acc[dgClass] = (acc[dgClass] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Get efficiency color based on percentage
  const getEfficiencyColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 bg-green-100";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Calculate total weight and volume
  const totalWeight = placed_items.reduce(
    (sum, item) => sum + item.weight_kg,
    0,
  );
  const totalVolume = placed_items.reduce(
    (sum, item) =>
      sum +
      item.dimensions.length * item.dimensions.width * item.dimensions.height,
    0,
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">
                  {efficiency_stats.total_items}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Weight
                </p>
                <p className="text-2xl font-bold">
                  {totalWeight.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">kg</p>
              </div>
              <Weight className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Volume Used</p>
                <p className="text-2xl font-bold">{totalVolume.toFixed(1)}</p>
                <p className="text-xs text-gray-500">m³</p>
              </div>
              <Maximize className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Remaining Capacity
                </p>
                <p className="text-2xl font-bold">
                  {efficiency_stats.remaining_capacity.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">kg</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Load Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Volume Utilization */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Volume Utilization
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${getEfficiencyColor(efficiency_stats.volume_utilization)}`}
              >
                {efficiency_stats.volume_utilization.toFixed(1)}%
              </Badge>
            </div>
            <Progress
              value={efficiency_stats.volume_utilization}
              className="h-2"
              style={
                {
                  backgroundColor: "#f1f5f9",
                } as React.CSSProperties
              }
            />
          </div>

          {/* Weight Utilization */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Weight Utilization
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${getEfficiencyColor(efficiency_stats.weight_utilization)}`}
              >
                {efficiency_stats.weight_utilization.toFixed(1)}%
              </Badge>
            </div>
            <Progress
              value={efficiency_stats.weight_utilization}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p>
                <span className="font-medium">Registration:</span>{" "}
                {vehicle.registration_number}
              </p>
              <p>
                <span className="font-medium">Max Weight:</span>{" "}
                {vehicle.dimensions.max_weight_kg.toLocaleString()} kg
              </p>
            </div>
            <div>
              <p>
                <span className="font-medium">Dimensions:</span>{" "}
                {vehicle.dimensions.length}×{vehicle.dimensions.width}×
                {vehicle.dimensions.height}m
              </p>
              <p>
                <span className="font-medium">Total Volume:</span>{" "}
                {(
                  vehicle.dimensions.length *
                  vehicle.dimensions.width *
                  vehicle.dimensions.height
                ).toFixed(1)}{" "}
                m³
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dangerous Goods Breakdown */}
      {Object.keys(dgClassCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Dangerous Goods Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(dgClassCounts).map(([dgClass, count]) => (
                <div
                  key={dgClass}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">
                    {dgClass === "GENERAL"
                      ? "General Cargo"
                      : `Class ${dgClass}`}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {count} item{count !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Optimization Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              • All {efficiency_stats.total_items} items successfully placed
              using 3D bin packing optimization
            </p>
            <p>
              • Load distribution optimized for vehicle stability and weight
              limits
            </p>
            <p>
              • Dangerous goods compatibility rules applied during placement
            </p>
            <p>
              •{" "}
              {efficiency_stats.remaining_capacity > 1000
                ? "Significant"
                : "Limited"}{" "}
              remaining capacity available for additional items
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle, MessageSquare, FileCheck, Activity } from "lucide-react";
import type { InspectionStats, PODStats } from "@/lib/server-api";

interface OperationalStatsProps {
  inspectionStats: InspectionStats;
  podStats: PODStats;
}

export function OperationalStats({ inspectionStats, podStats }: OperationalStatsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Inspection Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle>Inspection Performance</CardTitle>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {inspectionStats.pass_rate}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pass Rate</span>
              <span className="font-bold text-green-600">{inspectionStats.pass_rate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed Today</span>
              <span className="font-medium">{inspectionStats.completed_today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Failed Inspections</span>
              <span className="font-medium text-red-600">{inspectionStats.failed_count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Reviews</span>
              <span className="font-medium text-yellow-600">{inspectionStats.pending_count}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${inspectionStats.pass_rate}%` }}
              />
            </div>
          </div>
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
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Recent activity would be fetched separately for real-time updates */}
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Vehicle inspection passed</p>
                <p className="text-xs text-gray-500">
                  SS-001234 • {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Route deviation alert</p>
                <p className="text-xs text-gray-500">
                  SS-001235 • {new Date(Date.now() - 5 * 60000).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Shipment delivered</p>
                <p className="text-xs text-gray-500">
                  SS-001236 • {new Date(Date.now() - 15 * 60000).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500 text-center">
                <Activity className="h-3 w-3 inline mr-1" />
                127 events total
              </p>
            </div>
          </div>
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
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              {podStats.capture_rate}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Capture Rate</span>
              <span className="font-bold text-purple-600">{podStats.capture_rate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Digital Signatures</span>
              <span className="font-medium">{podStats.digital_signatures}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Photos Captured</span>
              <span className="font-medium">{podStats.photos_captured}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Response Time</span>
              <span className="font-medium text-green-600">{podStats.avg_response_time_hours}h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${podStats.capture_rate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
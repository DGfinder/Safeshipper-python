"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import {
  FileCheck,
  Camera,
  Monitor,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Activity,
  Zap,
  Shield,
  Star,
  BarChart3,
  Calendar,
  ArrowRight,
  ExternalLink
} from "lucide-react";

interface IntegrationStats {
  total_pods: number;
  total_mobile_inspections: number;
  photos_captured: number;
  signatures_captured: number;
  weekly_growth: {
    pods: number;
    inspections: number;
  };
  quality_metrics: {
    avg_photos_per_pod: number;
    avg_inspection_score: number;
    signature_capture_rate: number;
    mobile_adoption_rate: number;
  };
  recent_activity: Array<{
    id: string;
    type: 'pod' | 'inspection';
    title: string;
    timestamp: string;
    status: 'completed' | 'in_progress' | 'pending';
    driver_name: string;
    location: string;
  }>;
  dangerous_goods_stats: {
    dg_inspections: number;
    safety_alerts: number;
    compliance_rate: number;
  };
}

const mockStats: IntegrationStats = {
  total_pods: 127,
  total_mobile_inspections: 89,
  photos_captured: 456,
  signatures_captured: 124,
  weekly_growth: {
    pods: 12,
    inspections: 8
  },
  quality_metrics: {
    avg_photos_per_pod: 3.6,
    avg_inspection_score: 92.4,
    signature_capture_rate: 97.6,
    mobile_adoption_rate: 78.2
  },
  recent_activity: [
    {
      id: "act_001",
      type: "pod",
      title: "Chemical delivery completed",
      timestamp: "2024-01-16T14:30:00Z",
      status: "completed",
      driver_name: "John Smith",
      location: "Acme Chemicals Ltd"
    },
    {
      id: "act_002", 
      type: "inspection",
      title: "Pre-trip DG vehicle check",
      timestamp: "2024-01-16T13:45:00Z",
      status: "completed",
      driver_name: "Mike Johnson",
      location: "Fleet Depot A"
    },
    {
      id: "act_003",
      type: "inspection",
      title: "Loading area hazard inspection",
      timestamp: "2024-01-16T12:15:00Z", 
      status: "in_progress",
      driver_name: "Emma Davis",
      location: "Warehouse C"
    },
    {
      id: "act_004",
      type: "pod",
      title: "Industrial supplies delivery",
      timestamp: "2024-01-16T11:30:00Z",
      status: "completed",
      driver_name: "Sarah Wilson",
      location: "Industrial Solutions Pty"
    }
  ],
  dangerous_goods_stats: {
    dg_inspections: 23,
    safety_alerts: 4,
    compliance_rate: 94.8
  }
};

interface IntegrationDashboardProps {
  onViewPODs?: () => void;
  onViewInspections?: () => void;
}

export const IntegrationDashboard: React.FC<IntegrationDashboardProps> = ({
  onViewPODs,
  onViewInspections
}) => {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: 'pod' | 'inspection') => {
    return type === 'pod' ? (
      <FileCheck className="h-4 w-4 text-green-600" />
    ) : (
      <ClipboardCheck className="h-4 w-4 text-blue-600" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mobile Integration Dashboard</h2>
          <p className="text-gray-600">POD and inspection data captured via mobile apps</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onViewPODs}>
            <FileCheck className="h-4 w-4 mr-2" />
            View PODs
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button variant="outline" size="sm" onClick={onViewInspections}>
            <ClipboardCheck className="h-4 w-4 mr-2" />
            View Inspections
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">PODs Captured</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{mockStats.total_pods}</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{mockStats.weekly_growth.pods} this week
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Mobile Inspections</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{mockStats.total_mobile_inspections}</div>
            <div className="text-sm text-blue-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{mockStats.weekly_growth.inspections} this week
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-600">Photos Captured</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{mockStats.photos_captured}</div>
            <div className="text-sm text-purple-600">
              {mockStats.quality_metrics.avg_photos_per_pod} avg per POD
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-gray-600">DG Inspections</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{mockStats.dangerous_goods_stats.dg_inspections}</div>
            <div className="text-sm text-orange-600">
              {mockStats.dangerous_goods_stats.compliance_rate}% compliant
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Inspection Score</span>
                  <span className="text-sm font-semibold">{mockStats.quality_metrics.avg_inspection_score}%</span>
                </div>
                <Progress value={mockStats.quality_metrics.avg_inspection_score} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Signature Capture Rate</span>
                  <span className="text-sm font-semibold">{mockStats.quality_metrics.signature_capture_rate}%</span>
                </div>
                <Progress value={mockStats.quality_metrics.signature_capture_rate} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Mobile Adoption</span>
                  <span className="text-sm font-semibold">{mockStats.quality_metrics.mobile_adoption_rate}%</span>
                </div>
                <Progress value={mockStats.quality_metrics.mobile_adoption_rate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Safety Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Active Safety Alerts</span>
                </div>
                <Badge className="bg-red-100 text-red-800">
                  {mockStats.dangerous_goods_stats.safety_alerts}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">DG Compliance Rate</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {mockStats.dangerous_goods_stats.compliance_rate}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Real-time Monitoring</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Recent Mobile Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockStats.recent_activity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                {getActivityIcon(activity.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{activity.title}</span>
                    <Badge className={getStatusColor(activity.status)}>
                      {activity.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {activity.driver_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {activity.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Real-time Integration</span>
            </div>
            <div className="text-sm text-blue-800">
              Mobile data automatically syncs with web dashboards for instant visibility
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Enhanced Safety</span>
            </div>
            <div className="text-sm text-green-800">
              Mobile apps provide real-time dangerous goods analysis and safety alerts
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Improved Compliance</span>
            </div>
            <div className="text-sm text-purple-800">
              Digital evidence capture ensures comprehensive audit trails and regulatory compliance
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IntegrationDashboard;
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Bell,
  X,
  Eye,
  Calendar,
  Shield,
  FileText,
  Truck
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";

interface ComplianceAlert {
  id: string;
  type: "critical" | "warning" | "info";
  category: "certification" | "equipment" | "inspection" | "insurance" | "driver";
  title: string;
  description: string;
  vehicleId?: string;
  vehicleRegistration?: string;
  dueDate?: string;
  overdueDays?: number;
  actionRequired: boolean;
  dismissed?: boolean;
  createdAt: string;
}

interface ComplianceAlertsProps {
  vehicleId?: string; // If provided, show alerts for specific vehicle
  compact?: boolean;
  showDismissed?: boolean;
  maxAlerts?: number;
  onResolveAlert?: (alertId: string) => void;
  onDismissAlert?: (alertId: string) => void;
  onViewDetails?: (alertId: string) => void;
}

export function ComplianceAlerts({
  vehicleId,
  compact = false,
  showDismissed = false,
  maxAlerts,
  onResolveAlert,
  onDismissAlert,
  onViewDetails
}: ComplianceAlertsProps) {
  const { can } = usePermissions();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Mock alerts data
  const generateAlerts = (): ComplianceAlert[] => {
    const alerts: ComplianceAlert[] = [
      {
        id: "alert-001",
        type: "critical",
        category: "certification",
        title: "ADR Certificate Expired",
        description: "Vehicle ABC-123 ADR certification expired 3 days ago. Vehicle cannot transport dangerous goods.",
        vehicleId: "abc-123",
        vehicleRegistration: "ABC-123",
        overdueDays: 3,
        actionRequired: true,
        createdAt: "2024-12-23T10:00:00Z"
      },
      {
        id: "alert-002",
        type: "critical",
        category: "equipment",
        title: "Missing Safety Equipment",
        description: "Fire extinguisher inspection overdue by 15 days for vehicle DEF-456.",
        vehicleId: "def-456",
        vehicleRegistration: "DEF-456",
        overdueDays: 15,
        actionRequired: true,
        createdAt: "2024-12-22T14:30:00Z"
      },
      {
        id: "alert-003",
        type: "warning",
        category: "certification",
        title: "ADR Certificate Expiring Soon",
        description: "Vehicle GHI-789 ADR certificate expires in 15 days. Schedule renewal immediately.",
        vehicleId: "ghi-789",
        vehicleRegistration: "GHI-789",
        dueDate: "2025-01-10",
        actionRequired: true,
        createdAt: "2024-12-21T09:15:00Z"
      },
      {
        id: "alert-004",
        type: "warning",
        category: "inspection",
        title: "Safety Inspection Due",
        description: "Vehicle JKL-012 safety equipment inspection due in 7 days.",
        vehicleId: "jkl-012",
        vehicleRegistration: "JKL-012",
        dueDate: "2025-01-03",
        actionRequired: true,
        createdAt: "2024-12-20T16:45:00Z"
      },
      {
        id: "alert-005",
        type: "warning",
        category: "insurance",
        title: "Insurance Renewal Required",
        description: "DG transport insurance for vehicle ABC-123 expires in 30 days.",
        vehicleId: "abc-123",
        vehicleRegistration: "ABC-123",
        dueDate: "2025-01-26",
        actionRequired: false,
        createdAt: "2024-12-19T11:20:00Z"
      },
      {
        id: "alert-006",
        type: "info",
        category: "driver",
        title: "Driver Training Reminder",
        description: "Driver John Smith DG handling certification renewal due in 45 days.",
        vehicleId: "abc-123",
        vehicleRegistration: "ABC-123",
        dueDate: "2025-02-10",
        actionRequired: false,
        createdAt: "2024-12-18T13:10:00Z"
      }
    ];

    // Filter by vehicle if specified
    if (vehicleId) {
      return alerts.filter(alert => alert.vehicleId === vehicleId);
    }

    return alerts;
  };

  const alerts = generateAlerts();

  // Filter out dismissed alerts unless showDismissed is true
  const filteredAlerts = alerts.filter(alert => {
    if (!showDismissed && dismissedAlerts.has(alert.id)) return false;
    return true;
  });

  // Sort by priority and date
  const sortedAlerts = filteredAlerts.sort((a, b) => {
    const priorityOrder = { critical: 3, warning: 2, info: 1 };
    if (priorityOrder[a.type] !== priorityOrder[b.type]) {
      return priorityOrder[b.type] - priorityOrder[a.type];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Limit alerts if maxAlerts is specified
  const displayAlerts = maxAlerts ? sortedAlerts.slice(0, maxAlerts) : sortedAlerts;

  const getAlertIcon = (type: string, category: string) => {
    if (type === "critical") return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (type === "warning") return <Clock className="h-4 w-4 text-yellow-600" />;
    
    switch (category) {
      case "certification":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "equipment":
        return <Shield className="h-4 w-4 text-blue-600" />;
      case "inspection":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "driver":
        return <Truck className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    onDismissAlert?.(alertId);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} min ago`;
    return 'Just now';
  };

  if (compact) {
    const criticalCount = displayAlerts.filter(a => a.type === "critical").length;
    const warningCount = displayAlerts.filter(a => a.type === "warning").length;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Compliance Alerts
            {(criticalCount > 0 || warningCount > 0) && (
              <Badge variant="outline" className="ml-auto">
                {criticalCount + warningCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayAlerts.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">All systems compliant</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className={`p-3 rounded-md border ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start gap-2">
                    {getAlertIcon(alert.type, alert.category)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-gray-600">{alert.vehicleRegistration}</p>
                    </div>
                    <Badge className={getAlertBadgeColor(alert.type)} variant="outline">
                      {alert.type}
                    </Badge>
                  </div>
                </div>
              ))}
              {displayAlerts.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="link" size="sm">
                    View all {displayAlerts.length} alerts
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Compliance Alerts
          {vehicleId && <span className="text-base font-normal text-gray-600">- {vehicleId}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="text-gray-600">No active compliance alerts</p>
            <p className="text-sm text-gray-500">All systems are compliant</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-2 ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.type, alert.category)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{alert.title}</h3>
                        <Badge className={getAlertBadgeColor(alert.type)}>
                          {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {alert.vehicleRegistration && (
                          <span>Vehicle: {alert.vehicleRegistration}</span>
                        )}
                        <span>{formatTimeAgo(alert.createdAt)}</span>
                        {alert.overdueDays && (
                          <span className="text-red-600 font-medium">
                            {alert.overdueDays} days overdue
                          </span>
                        )}
                        {alert.dueDate && (
                          <span>Due: {new Date(alert.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewDetails?.(alert.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  
                  {alert.actionRequired && (
                    <Can permission="fleet.compliance.edit">
                      <Button 
                        size="sm"
                        variant={alert.type === "critical" ? "default" : "outline"}
                        onClick={() => onResolveAlert?.(alert.id)}
                      >
                        {alert.type === "critical" ? "Resolve Now" : "Schedule"}
                      </Button>
                    </Can>
                  )}

                  {alert.dueDate && (
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-1" />
                      Schedule
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {maxAlerts && sortedAlerts.length > maxAlerts && (
          <div className="text-center pt-4 border-t">
            <Button variant="link">
              View all {sortedAlerts.length} alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
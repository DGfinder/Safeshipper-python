"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye,
  FileText,
  AlertCircle
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { type FleetVehicle } from "@/shared/hooks/useFleetTracking";

interface DGComplianceCardProps {
  vehicle: FleetVehicle;
  onViewDetails?: (vehicleId: string) => void;
  onUpdateCompliance?: (vehicleId: string) => void;
}

interface ComplianceStatus {
  overall: "compliant" | "warning" | "critical";
  adr: "valid" | "expiring" | "expired";
  equipment: "compliant" | "attention" | "missing";
  insurance: "valid" | "expiring" | "expired";
}

export function DGComplianceCard({ 
  vehicle, 
  onViewDetails, 
  onUpdateCompliance 
}: DGComplianceCardProps) {
  const { can } = usePermissions();

  // Mock compliance data - in real app this would come from API
  const getComplianceStatus = (): ComplianceStatus => {
    const random = Math.random();
    const hasActiveDG = vehicle.active_shipment?.has_dangerous_goods;
    
    if (!hasActiveDG) {
      return {
        overall: "compliant",
        adr: "valid",
        equipment: "compliant",
        insurance: "valid"
      };
    }

    // Higher chance of issues for vehicles carrying DG
    return {
      overall: random > 0.8 ? "critical" : random > 0.6 ? "warning" : "compliant",
      adr: random > 0.9 ? "expired" : random > 0.7 ? "expiring" : "valid",
      equipment: random > 0.85 ? "missing" : random > 0.7 ? "attention" : "compliant",
      insurance: random > 0.95 ? "expired" : random > 0.8 ? "expiring" : "valid"
    };
  };

  const compliance = getComplianceStatus();

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getOverallStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    let color = "bg-gray-100 text-gray-800";
    let label = status;

    switch (status) {
      case "valid":
      case "compliant":
        color = "bg-green-100 text-green-800";
        label = "Valid";
        break;
      case "expiring":
      case "attention":
        color = "bg-yellow-100 text-yellow-800";
        label = type === "adr" || type === "insurance" ? "Expiring" : "Attention";
        break;
      case "expired":
      case "missing":
        color = "bg-red-100 text-red-800";
        label = type === "adr" || type === "insurance" ? "Expired" : "Missing";
        break;
    }

    return <Badge className={color}>{label}</Badge>;
  };

  const getComplianceItems = () => {
    const items = [
      { key: "adr", label: "ADR Certification", status: compliance.adr },
      { key: "equipment", label: "Safety Equipment", status: compliance.equipment },
      { key: "insurance", label: "Insurance", status: compliance.insurance }
    ];

    return items;
  };

  return (
    <Card className={`${getOverallStatusColor(compliance.overall)} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getOverallStatusIcon(compliance.overall)}
            {vehicle.registration_number}
          </CardTitle>
          <div className="flex items-center gap-2">
            {vehicle.active_shipment?.has_dangerous_goods && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                Carrying DG
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600">{vehicle.vehicle_type}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Active Shipment Info */}
        {vehicle.active_shipment?.has_dangerous_goods && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800">
                Active DG Shipment
              </span>
            </div>
            <div className="text-sm text-orange-700">
              <p>Tracking: {vehicle.active_shipment.tracking_number}</p>
              <p>Route: {vehicle.active_shipment.origin_location} → {vehicle.active_shipment.destination_location}</p>
              {vehicle.active_shipment.dangerous_goods && (
                <p>UN Number: {vehicle.active_shipment.dangerous_goods[0]?.un_number}</p>
              )}
            </div>
          </div>
        )}

        {/* Compliance Status Items */}
        <div className="space-y-3">
          {getComplianceItems().map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {item.label}
              </span>
              {getStatusBadge(item.status, item.key)}
            </div>
          ))}
        </div>

        {/* Driver Information */}
        {vehicle.assigned_driver && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Assigned Driver
              </span>
              <span className="text-sm text-gray-600">
                {vehicle.assigned_driver.name}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetails?.(vehicle.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
          
          <Can permission="fleet.compliance.edit">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onUpdateCompliance?.(vehicle.id)}
            >
              <FileText className="h-4 w-4 mr-1" />
              Update
            </Button>
          </Can>
        </div>

        {/* Critical Alerts */}
        {compliance.overall === "critical" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Immediate Action Required
              </span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              This vehicle has critical compliance issues that must be resolved before carrying dangerous goods.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
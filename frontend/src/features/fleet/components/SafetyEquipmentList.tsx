"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  Plus,
  Eye,
  Edit,
  Calendar,
  FileText
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";

interface SafetyEquipmentItem {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  type: string;
  serialNumber: string;
  lastInspection: string;
  nextInspection: string;
  status: "compliant" | "warning" | "expired";
  certificationNumber?: string;
  location?: string;
  notes?: string;
}

interface SafetyEquipmentListProps {
  vehicleId?: string; // If provided, show equipment for specific vehicle
  compact?: boolean; // Compact view for smaller spaces
  showActions?: boolean;
  onAddEquipment?: () => void;
  onEditEquipment?: (equipmentId: string) => void;
  onViewEquipment?: (equipmentId: string) => void;
}

export function SafetyEquipmentList({
  vehicleId,
  compact = false,
  showActions = true,
  onAddEquipment,
  onEditEquipment,
  onViewEquipment
}: SafetyEquipmentListProps) {
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");

  // Mock safety equipment data
  const generateEquipment = (): SafetyEquipmentItem[] => {
    const equipmentTypes = [
      "Fire Extinguisher",
      "First Aid Kit", 
      "Spill Kit",
      "Emergency Triangle",
      "Safety Vest",
      "Torch/Flashlight"
    ];

    const vehicles = ["ABC-123", "DEF-456", "GHI-789", "JKL-012"];
    const equipment: SafetyEquipmentItem[] = [];

    const vehiclesToProcess = vehicleId ? [vehicleId] : vehicles;

    vehiclesToProcess.forEach((vehicle, vIndex) => {
      equipmentTypes.forEach((type, eIndex) => {
        const random = Math.random();
        equipment.push({
          id: `${vehicle}-${type.replace(/\s+/g, '-').toLowerCase()}`,
          vehicleId: vehicle,
          vehicleRegistration: vehicles[vIndex] || vehicle,
          type,
          serialNumber: `${type.substring(0, 2).toUpperCase()}${Math.random().toString().substr(2, 6)}`,
          lastInspection: new Date(Date.now() - (Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          nextInspection: new Date(Date.now() + (Math.random() * 180 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          status: random > 0.8 ? "expired" : random > 0.7 ? "warning" : "compliant",
          certificationNumber: `CERT${Math.random().toString().substr(2, 8)}`,
          location: "Driver Cabin",
          notes: random > 0.5 ? "Regular maintenance schedule" : undefined
        });
      });
    });

    return equipment;
  };

  const equipment = generateEquipment();

  // Filter equipment
  const filteredEquipment = equipment.filter(item => {
    if (!searchTerm) return true;
    return (
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vehicleRegistration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "expired":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "compliant":
        return "Compliant";
      case "warning":
        return "Due Soon";
      case "expired":
        return "Overdue";
      default:
        return "Unknown";
    }
  };

  const getDaysUntilDue = (nextInspection: string) => {
    const now = new Date();
    const due = new Date(nextInspection);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDaysUntilDue = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    if (days <= 7) return `Due in ${days} days`;
    if (days <= 30) return `Due in ${Math.ceil(days / 7)} weeks`;
    return `Due in ${Math.ceil(days / 30)} months`;
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Safety Equipment</CardTitle>
            <Can permission="fleet.compliance.edit">
              {showActions && (
                <Button size="sm" variant="outline" onClick={onAddEquipment}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </Can>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredEquipment.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="text-sm font-medium">{item.type}</p>
                    <p className="text-xs text-gray-600">{item.serialNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(item.status)} variant="outline">
                    {getStatusLabel(item.status)}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatDaysUntilDue(getDaysUntilDue(item.nextInspection))}
                  </p>
                </div>
              </div>
            ))}
            {filteredEquipment.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="link" size="sm">
                  View all {filteredEquipment.length} items
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Safety Equipment
            {vehicleId && <span className="text-base font-normal text-gray-600">- {vehicleId}</span>}
          </CardTitle>
          <Can permission="fleet.compliance.edit">
            {showActions && (
              <Button onClick={onAddEquipment}>
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            )}
          </Can>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        {!vehicleId && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Equipment List */}
        <div className="space-y-4">
          {filteredEquipment.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getStatusIcon(item.status)}
                </div>
                <div>
                  <h3 className="font-medium">{item.type}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {!vehicleId && <span>Vehicle: {item.vehicleRegistration}</span>}
                    <span>Serial: {item.serialNumber}</span>
                    {item.location && <span>Location: {item.location}</span>}
                  </div>
                  {item.certificationNumber && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cert: {item.certificationNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Last: {new Date(item.lastInspection).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDaysUntilDue(getDaysUntilDue(item.nextInspection))}
                  </p>
                </div>

                {showActions && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewEquipment?.(item.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Can permission="fleet.compliance.edit">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onEditEquipment?.(item.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Update
                      </Button>
                    </Can>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredEquipment.length === 0 && (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No safety equipment found</p>
              <Can permission="fleet.compliance.edit">
                {showActions && (
                  <Button onClick={onAddEquipment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Equipment
                  </Button>
                )}
              </Can>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
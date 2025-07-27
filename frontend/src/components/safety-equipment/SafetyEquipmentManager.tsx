"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert } from "@/shared/components/ui/alert";
import {
  Truck,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Settings,
  FileText,
  Plus,
  Eye,
} from "lucide-react";

interface SafetyEquipment {
  id: string;
  equipment_type: {
    name: string;
    category: string;
    certification_standard: string;
  };
  serial_number: string;
  manufacturer: string;
  capacity: string;
  installation_date: string;
  expiry_date: string | null;
  next_inspection_date: string | null;
  status: "ACTIVE" | "EXPIRED" | "MAINTENANCE" | "DECOMMISSIONED";
  is_compliant: boolean;
  is_expired: boolean;
  inspection_overdue: boolean;
  location_on_vehicle: string;
}

interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  capacity_kg: number;
  safety_equipment_status: {
    status: string;
    compliant: boolean;
    message: string;
  };
  required_fire_extinguisher_capacity: string;
  safety_equipment: SafetyEquipment[];
}

interface SafetyEquipmentManagerProps {
  vehicleId?: string;
  onEquipmentUpdate?: () => void;
}

export default function SafetyEquipmentManager({
  vehicleId,
  onEquipmentUpdate,
}: SafetyEquipmentManagerProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleDetails();
    } else {
      setLoading(false);
    }
  }, [vehicleId]);

  const fetchVehicleDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/vehicles/${vehicleId}/`);
      if (!response.ok) {
        throw new Error("Failed to fetch vehicle details");
      }
      const data = await response.json();
      setVehicle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (equipment: SafetyEquipment) => {
    if (!equipment.is_compliant) {
      if (equipment.is_expired) {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Expired
          </Badge>
        );
      } else if (equipment.inspection_overdue) {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Inspection Due
          </Badge>
        );
      }
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Compliant
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "FIRE_EXTINGUISHER":
        return "🧯";
      case "FIRST_AID_KIT":
        return "🏥";
      case "SPILL_KIT":
        return "🛢️";
      case "PROTECTIVE_EQUIPMENT":
        return "🦺";
      case "TOOLS":
        return "🔧";
      default:
        return "⚠️";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading safety equipment data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <div>
          <h4>Error Loading Safety Equipment</h4>
          <p>{error}</p>
        </div>
      </Alert>
    );
  }

  if (!vehicle) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No vehicle selected</p>
          <p className="text-sm text-gray-500 mt-2">
            Select a vehicle to view its safety equipment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                {vehicle.registration_number}
              </CardTitle>
              <p className="text-gray-600 mt-1">
                {vehicle.vehicle_type} • {vehicle.capacity_kg}kg capacity
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4" />
                {vehicle.safety_equipment_status.compliant ? (
                  <Badge variant="default">Safety Compliant</Badge>
                ) : (
                  <Badge variant="destructive">Non-Compliant</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {vehicle.safety_equipment_status.message}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ADR Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            ADR Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Fire Extinguisher Requirements
            </h4>
            <p className="text-blue-800">
              {vehicle.required_fire_extinguisher_capacity}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Safety Equipment List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Safety Equipment ({vehicle.safety_equipment.length})
            </CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Equipment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vehicle.safety_equipment.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No safety equipment registered</p>
              <p className="text-sm text-gray-500 mt-2">
                Add safety equipment to ensure compliance
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicle.safety_equipment.map((equipment) => {
                const daysUntilExpiry = getDaysUntilExpiry(
                  equipment.expiry_date,
                );

                return (
                  <div
                    key={equipment.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">
                            {getCategoryIcon(equipment.equipment_type.category)}
                          </span>
                          <div>
                            <h4 className="font-medium">
                              {equipment.equipment_type.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {equipment.manufacturer}{" "}
                              {equipment.serial_number &&
                                `• ${equipment.serial_number}`}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <label className="text-gray-500">Capacity</label>
                            <p className="font-medium">
                              {equipment.capacity || "Not specified"}
                            </p>
                          </div>
                          <div>
                            <label className="text-gray-500">Location</label>
                            <p className="font-medium">
                              {equipment.location_on_vehicle || "Not specified"}
                            </p>
                          </div>
                          <div>
                            <label className="text-gray-500">Installed</label>
                            <p className="font-medium">
                              {formatDate(equipment.installation_date)}
                            </p>
                          </div>
                          <div>
                            <label className="text-gray-500">
                              Next Inspection
                            </label>
                            <p className="font-medium">
                              {formatDate(equipment.next_inspection_date)}
                            </p>
                          </div>
                        </div>

                        {equipment.expiry_date && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Expires: </span>
                            <span
                              className={`font-medium ${
                                daysUntilExpiry !== null &&
                                daysUntilExpiry <= 30
                                  ? "text-red-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {formatDate(equipment.expiry_date)}
                              {daysUntilExpiry !== null && (
                                <span className="ml-1">
                                  (
                                  {daysUntilExpiry > 0
                                    ? `${daysUntilExpiry} days`
                                    : "Expired"}
                                  )
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(equipment)}

                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calendar className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      {!vehicle.safety_equipment_status.compliant && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4>Safety Compliance Issues</h4>
            <p>{vehicle.safety_equipment_status.message}</p>
            <p className="text-sm mt-2">
              This vehicle may not be suitable for dangerous goods transport
              until these issues are resolved.
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}

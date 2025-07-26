"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Truck, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Filter,
  Search,
  Download,
  CheckSquare,
  Square,
  MoreVertical
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/shared/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/shared/components/ui/select";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { type FleetVehicle } from "@/shared/hooks/useFleetTracking";

interface VehicleListProps {
  vehicles: FleetVehicle[];
  onRefresh?: () => void;
}

export function VehicleList({ vehicles, onRefresh }: VehicleListProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter vehicles based on search and status
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch = 
      vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.assigned_driver?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedVehicles.length === filteredVehicles.length) {
      setSelectedVehicles([]);
      setShowBulkActions(false);
    } else {
      setSelectedVehicles(filteredVehicles.map(v => v.id));
      setShowBulkActions(true);
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    const newSelection = selectedVehicles.includes(vehicleId)
      ? selectedVehicles.filter(id => id !== vehicleId)
      : [...selectedVehicles, vehicleId];
    
    setSelectedVehicles(newSelection);
    setShowBulkActions(newSelection.length > 0);
  };

  const handleBulkStatusChange = (newStatus: string) => {
    // TODO: Implement bulk status change
    console.log(`Changing status of ${selectedVehicles.length} vehicles to ${newStatus}`);
    setSelectedVehicles([]);
    setShowBulkActions(false);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Exporting vehicle data");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      case "OFFLINE":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle Fleet
          </CardTitle>
          <div className="flex items-center gap-2">
            <Can permission="fleet.analytics.export">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </Can>
            <Can permission="vehicle.create">
              <Button size="sm" onClick={() => router.push("/fleet/vehicles/new")}>
                <Plus className="h-4 w-4 mr-1" />
                Add Vehicle
              </Button>
            </Can>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vehicles, drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="OFFLINE">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && can("vehicle.bulk_edit") && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedVehicles.length} vehicle(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkStatusChange("ACTIVE")}
              >
                Mark Active
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkStatusChange("MAINTENANCE")}
              >
                Schedule Maintenance
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setSelectedVehicles([]);
                  setShowBulkActions(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Vehicle List */}
        <div className="space-y-4">
          {/* Select All */}
          {can("vehicle.bulk_edit") && filteredVehicles.length > 0 && (
            <div className="flex items-center gap-3 p-3 border-b">
              <button onClick={handleSelectAll} className="p-1">
                {selectedVehicles.length === filteredVehicles.length ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
              <span className="text-sm text-gray-600">Select all</span>
            </div>
          )}

          {/* Vehicle Items */}
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Checkbox */}
              {can("vehicle.bulk_edit") && (
                <button 
                  onClick={() => handleSelectVehicle(vehicle.id)}
                  className="p-1"
                >
                  {selectedVehicles.includes(vehicle.id) ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              )}

              {/* Vehicle Icon */}
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>

              {/* Vehicle Info */}
              <div className="flex-1">
                <h3 className="font-medium">{vehicle.registration_number}</h3>
                <p className="text-sm text-gray-600">{vehicle.vehicle_type}</p>
                {vehicle.assigned_driver && (
                  <p className="text-xs text-gray-500 mt-1">
                    Driver: {vehicle.assigned_driver.name}
                  </p>
                )}
              </div>

              {/* Status */}
              <Badge className={getStatusColor(vehicle.status)}>
                {vehicle.status}
              </Badge>

              {/* Active Shipment */}
              {vehicle.active_shipment && (
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {vehicle.active_shipment.tracking_number}
                  </p>
                  <p className="text-xs text-gray-600">
                    {vehicle.active_shipment.status}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/fleet/vehicles/${vehicle.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => router.push(`/fleet/vehicles/${vehicle.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    
                    <Can permission="vehicle.edit">
                      <DropdownMenuItem 
                        onClick={() => router.push(`/fleet/vehicles/${vehicle.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Vehicle
                      </DropdownMenuItem>
                    </Can>
                    
                    <Can permission="vehicle.edit">
                      <DropdownMenuItem>
                        Schedule Maintenance
                      </DropdownMenuItem>
                    </Can>
                    
                    <Can permission="driver.assign">
                      <DropdownMenuItem>
                        Assign Driver
                      </DropdownMenuItem>
                    </Can>
                    
                    <Can permission="vehicle.delete">
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Vehicle
                      </DropdownMenuItem>
                    </Can>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {filteredVehicles.length === 0 && (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? "No vehicles found matching your filters"
                  : "No vehicles in your fleet yet"}
              </p>
              <Can permission="vehicle.create">
                <Button onClick={() => router.push("/fleet/vehicles/new")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Vehicle
                </Button>
              </Can>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
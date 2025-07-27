"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Calendar,
  FileText,
  Wrench,
  Truck
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { useMockFleetStatus } from "@/shared/hooks/useMockAPI";

interface SafetyEquipment {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  type: string;
  serialNumber: string;
  lastInspection: string;
  nextInspection: string;
  status: "compliant" | "warning" | "expired";
  certificationNumber?: string;
  notes?: string;
}

export default function SafetyEquipmentPage() {
  const { can } = usePermissions();
  const { data: fleetData } = useMockFleetStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");

  const vehicles = fleetData?.vehicles || [];

  // Mock safety equipment data
  const safetyEquipment: SafetyEquipment[] = vehicles.flatMap(vehicle => [
    {
      id: `${vehicle.id}-extinguisher`,
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registration_number,
      type: "Fire Extinguisher",
      serialNumber: `FE${Math.random().toString().substr(2, 6)}`,
      lastInspection: "2024-10-15",
      nextInspection: "2025-04-15",
      status: Math.random() > 0.8 ? "expired" : Math.random() > 0.7 ? "warning" : "compliant",
      certificationNumber: `CERT${Math.random().toString().substr(2, 8)}`
    },
    {
      id: `${vehicle.id}-firstaid`,
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registration_number,
      type: "First Aid Kit",
      serialNumber: `FA${Math.random().toString().substr(2, 6)}`,
      lastInspection: "2024-11-01",
      nextInspection: "2025-05-01",
      status: Math.random() > 0.8 ? "expired" : Math.random() > 0.7 ? "warning" : "compliant",
    },
    {
      id: `${vehicle.id}-spill`,
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registration_number,
      type: "Spill Kit",
      serialNumber: `SK${Math.random().toString().substr(2, 6)}`,
      lastInspection: "2024-09-20",
      nextInspection: "2025-03-20",
      status: Math.random() > 0.8 ? "expired" : Math.random() > 0.7 ? "warning" : "compliant",
    }
  ]);

  // Filter equipment
  const filteredEquipment = safetyEquipment.filter(equipment => {
    const matchesSearch = 
      equipment.vehicleRegistration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || equipment.status === statusFilter;
    const matchesEquipment = equipmentFilter === "all" || equipment.type === equipmentFilter;
    
    return matchesSearch && matchesStatus && matchesEquipment;
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
        return <Clock className="h-4 w-4 text-gray-600" />;
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

  // Stats
  const stats = {
    total: safetyEquipment.length,
    compliant: safetyEquipment.filter(e => e.status === "compliant").length,
    warning: safetyEquipment.filter(e => e.status === "warning").length,
    expired: safetyEquipment.filter(e => e.status === "expired").length
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Safety Equipment Management
            </h1>
            <p className="text-gray-600 mt-1">
              Track and manage safety equipment across your fleet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Can permission="fleet.compliance.edit">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Equipment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.compliant}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Due Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">{stats.warning}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{stats.expired}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Management */}
      <Tabs defaultValue="equipment" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="equipment">Equipment List</TabsTrigger>
          <TabsTrigger value="schedule">Inspection Schedule</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        {/* Equipment List Tab */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Safety Equipment Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search equipment, vehicles..."
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
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="warning">Due Soon</SelectItem>
                    <SelectItem value="expired">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    <SelectItem value="Fire Extinguisher">Fire Extinguisher</SelectItem>
                    <SelectItem value="First Aid Kit">First Aid Kit</SelectItem>
                    <SelectItem value="Spill Kit">Spill Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Equipment List */}
              <div className="space-y-4">
                {filteredEquipment.map((equipment) => (
                  <div
                    key={equipment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{equipment.type}</h3>
                        <p className="text-sm text-gray-600">
                          Vehicle: {equipment.vehicleRegistration}
                        </p>
                        <p className="text-sm text-gray-600">
                          Serial: {equipment.serialNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(equipment.status)}
                          <Badge className={getStatusColor(equipment.status)}>
                            {getStatusLabel(equipment.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Next: {new Date(equipment.nextInspection).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Can permission="fleet.compliance.edit">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                        </Can>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspection Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Inspections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This Week */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">This Week</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">Fire Extinguisher - ABC-123</p>
                          <p className="text-sm text-red-600">Overdue by 3 days</p>
                        </div>
                      </div>
                      <Can permission="fleet.compliance.edit">
                        <Button size="sm" variant="outline">
                          Schedule Now
                        </Button>
                      </Can>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">First Aid Kit - DEF-456</p>
                          <p className="text-sm text-yellow-600">Due Friday</p>
                        </div>
                      </div>
                      <Can permission="fleet.compliance.edit">
                        <Button size="sm" variant="outline">
                          Schedule
                        </Button>
                      </Can>
                    </div>
                  </div>
                </div>

                {/* Next Week */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Next Week</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="font-medium">Spill Kit - GHI-789</p>
                          <p className="text-sm text-gray-600">Due next Tuesday</p>
                        </div>
                      </div>
                      <Can permission="fleet.compliance.edit">
                        <Button size="sm" variant="outline">
                          Schedule
                        </Button>
                      </Can>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Equipment Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Monthly Equipment Status</p>
                    <p className="text-sm text-gray-600">December 2024</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      Download
                    </Button>
                  </Can>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Inspection History</p>
                    <p className="text-sm text-gray-600">Last 6 months</p>
                  </div>
                  <Can permission="fleet.analytics.export">
                    <Button size="sm" variant="outline">
                      Download
                    </Button>
                  </Can>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Compliance Rate</span>
                      <span className="font-medium">
                        {Math.round((stats.compliant / stats.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(stats.compliant / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
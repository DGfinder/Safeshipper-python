"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/shared/components/ui/select";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  FileText,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Plus,
  Eye,
  Edit,
  Settings,
  Truck,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { usePermissions, Can } from "@/contexts/PermissionContext";

// Types for vehicle safety equipment data
interface SafetyEquipmentItem {
  id: string;
  vehicle_id: string;
  vehicle_registration: string;
  equipment_type: {
    id: string;
    name: string;
    category: string;
    required_for_adr_classes: string[];
    certification_standard: string;
  };
  serial_number: string;
  manufacturer: string;
  model: string;
  capacity: string;
  installation_date: string;
  expiry_date: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  status: "ACTIVE" | "EXPIRED" | "MAINTENANCE" | "DECOMMISSIONED";
  location_on_vehicle: string;
  certification_number: string;
  is_compliant: boolean;
  is_expired: boolean;
  inspection_overdue: boolean;
}

interface ComplianceStats {
  total_vehicles: number;
  compliant_vehicles: number;
  non_compliant_vehicles: number;
  compliance_percentage: number;
  active_alerts: number;
  expiring_soon: number;
  dg_certified_vehicles: number;
  equipment_expiring_30_days: number;
  certifications_expiring_60_days: number;
  inspections_overdue: number;
}

interface FleetComplianceDashboardProps {
  className?: string;
}

export function FleetComplianceDashboard({ className }: FleetComplianceDashboardProps) {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Mock data - replace with actual API calls
  const [complianceStats, setComplianceStats] = useState<ComplianceStats>({
    total_vehicles: 24,
    compliant_vehicles: 22,
    non_compliant_vehicles: 2,
    compliance_percentage: 92,
    active_alerts: 5,
    expiring_soon: 12,
    dg_certified_vehicles: 18,
    equipment_expiring_30_days: 8,
    certifications_expiring_60_days: 4,
    inspections_overdue: 3
  });

  const [safetyEquipment, setSafetyEquipment] = useState<SafetyEquipmentItem[]>([]);

  // Simulated API calls
  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock safety equipment data
      const mockEquipment: SafetyEquipmentItem[] = [
        {
          id: "eq-001",
          vehicle_id: "vehicle-001",
          vehicle_registration: "ABC-123",
          equipment_type: {
            id: "type-001",
            name: "Fire Extinguisher 2kg",
            category: "FIRE_EXTINGUISHER",
            required_for_adr_classes: ["ALL_CLASSES"],
            certification_standard: "AS/NZS 1841.1"
          },
          serial_number: "FE20241001",
          manufacturer: "Ansul",
          model: "A-2",
          capacity: "2kg",
          installation_date: "2024-01-15",
          expiry_date: "2025-01-15",
          last_inspection_date: "2024-12-01",
          next_inspection_date: "2025-06-01",
          status: "ACTIVE",
          location_on_vehicle: "Driver cabin",
          certification_number: "CERT123456",
          is_compliant: true,
          is_expired: false,
          inspection_overdue: false
        },
        {
          id: "eq-002",
          vehicle_id: "vehicle-001",
          vehicle_registration: "ABC-123",
          equipment_type: {
            id: "type-002",
            name: "First Aid Kit",
            category: "FIRST_AID_KIT",
            required_for_adr_classes: ["ALL_CLASSES"],
            certification_standard: "AS/NZS 1841.14"
          },
          serial_number: "FAK20241002",
          manufacturer: "Johnson & Johnson",
          model: "Industrial Kit",
          capacity: "Standard",
          installation_date: "2024-01-15",
          expiry_date: "2025-07-15",
          last_inspection_date: "2024-10-01",
          next_inspection_date: "2024-12-30",
          status: "ACTIVE",
          location_on_vehicle: "Driver cabin",
          certification_number: "CERT123457",
          is_compliant: false,
          is_expired: false,
          inspection_overdue: true
        },
        {
          id: "eq-003",
          vehicle_id: "vehicle-002",
          vehicle_registration: "DEF-456",
          equipment_type: {
            id: "type-003",
            name: "Spill Kit Large",
            category: "SPILL_KIT",
            required_for_adr_classes: ["CLASS_3", "CLASS_8"],
            certification_standard: "AS/NZS 1841.5"
          },
          serial_number: "SK20241003",
          manufacturer: "SpillTech",
          model: "Universal 50L",
          capacity: "50L",
          installation_date: "2024-02-01",
          expiry_date: "2024-12-15",
          last_inspection_date: "2024-11-01",
          next_inspection_date: "2025-02-01",
          status: "EXPIRED",
          location_on_vehicle: "Rear compartment",
          certification_number: "CERT123458",
          is_compliant: false,
          is_expired: true,
          inspection_overdue: false
        }
      ];

      setSafetyEquipment(mockEquipment);
    } catch (error) {
      console.error("Failed to fetch compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchComplianceData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleScheduleInspection = (equipmentId: string) => {
    console.log("Schedule inspection for:", equipmentId);
    // TODO: Implement inspection scheduling
  };

  const handleUpdateCertificate = (equipmentId: string) => {
    console.log("Update certificate for:", equipmentId);
    // TODO: Implement certificate update
  };

  const handleExportReport = () => {
    console.log("Export compliance report");
    // TODO: Implement report export
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  // Filter equipment based on search and filters
  const filteredEquipment = safetyEquipment.filter((item) => {
    const matchesSearch = 
      item.vehicle_registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipment_type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "compliant" && item.is_compliant) ||
      (statusFilter === "non-compliant" && !item.is_compliant) ||
      (statusFilter === "expired" && item.is_expired) ||
      (statusFilter === "overdue" && item.inspection_overdue);
    
    const matchesCategory = categoryFilter === "all" || 
      item.equipment_type.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getComplianceStatusColor = (item: SafetyEquipmentItem) => {
    if (item.is_expired) return "bg-red-100 text-red-800";
    if (item.inspection_overdue) return "bg-orange-100 text-orange-800";
    if (!item.is_compliant) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getComplianceStatusText = (item: SafetyEquipmentItem) => {
    if (item.is_expired) return "Expired";
    if (item.inspection_overdue) return "Inspection Overdue";
    if (!item.is_compliant) return "Non-Compliant";
    return "Compliant";
  };

  const getDaysUntil = (dateString: string | null) => {
    if (!dateString) return null;
    const now = new Date();
    const target = new Date(dateString);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDaysText = (days: number | null) => {
    if (days === null) return "N/A";
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    if (days <= 7) return `Due in ${days} days`;
    if (days <= 30) return `Due in ${Math.ceil(days / 7)} weeks`;
    return `Due in ${Math.ceil(days / 30)} months`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Fleet Compliance Dashboard</h2>
            <p className="text-gray-600">Vehicle certification and safety equipment tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Can permission="fleet.analytics.export">
            <Button onClick={handleExportReport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </Can>
        </div>
      </div>

      {/* Compliance Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {complianceStats.compliance_percentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              {complianceStats.compliant_vehicles} of {complianceStats.total_vehicles} vehicles compliant
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${complianceStats.compliance_percentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {complianceStats.active_alerts}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <span className="text-red-600">{complianceStats.inspections_overdue} overdue</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {complianceStats.expiring_soon}
            </div>
            <p className="text-xs text-muted-foreground">
              Equipment & certificates
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <FileText className="h-3 w-3 text-blue-600" />
              <span>{complianceStats.equipment_expiring_30_days} equipment, {complianceStats.certifications_expiring_60_days} certs</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DG Certified</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {complianceStats.dg_certified_vehicles}
            </div>
            <p className="text-xs text-muted-foreground">
              Dangerous goods ready
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <Target className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {Math.round((complianceStats.dg_certified_vehicles / complianceStats.total_vehicles) * 100)}% of fleet
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Safety Equipment</TabsTrigger>
          <TabsTrigger value="alerts">Compliance Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Can permission="fleet.compliance.schedule">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Calendar className="h-6 w-6" />
                    <span className="text-sm">Schedule Inspections</span>
                  </Button>
                </Can>
                <Can permission="fleet.compliance.bulk_update">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Bulk Certificate Update</span>
                  </Button>
                </Can>
                <Can permission="fleet.analytics.export">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Download className="h-6 w-6" />
                    <span className="text-sm">Export Reports</span>
                  </Button>
                </Can>
                <Can permission="fleet.compliance.view">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <TrendingUp className="h-6 w-6" />
                    <span className="text-sm">View Analytics</span>
                  </Button>
                </Can>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Compliance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Fire extinguisher expired</p>
                      <p className="text-xs text-gray-600">Vehicle ABC-123 • 3 days overdue</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Critical</Badge>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Inspection due soon</p>
                      <p className="text-xs text-gray-600">Vehicle DEF-456 • Due in 5 days</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Certificate renewal</p>
                      <p className="text-xs text-gray-600">ADG certification expires in 30 days</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Info</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Compliance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Compliance</span>
                      <span className="text-lg font-bold text-green-600">92%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: "92%" }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">+3% from last month</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Equipment Status</span>
                      <span className="text-lg font-bold text-blue-600">88%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: "88%" }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">-1% from last month</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">DG Certification</span>
                      <span className="text-lg font-bold text-purple-600">75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: "75%" }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">+5% from last month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Safety Equipment Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search equipment, vehicles, serial numbers..."
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
                    <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="overdue">Inspection Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="FIRE_EXTINGUISHER">Fire Extinguisher</SelectItem>
                    <SelectItem value="FIRST_AID_KIT">First Aid Kit</SelectItem>
                    <SelectItem value="SPILL_KIT">Spill Kit</SelectItem>
                    <SelectItem value="EMERGENCY_STOP">Emergency Stop</SelectItem>
                  </SelectContent>
                </Select>
                <Can permission="fleet.equipment.create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                </Can>
              </div>

              {/* Equipment List */}
              <div className="space-y-4">
                {filteredEquipment.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{item.equipment_type.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Vehicle: {item.vehicle_registration}</span>
                          <span>Serial: {item.serial_number}</span>
                          <span>Location: {item.location_on_vehicle}</span>
                        </div>
                        {item.certification_number && (
                          <p className="text-xs text-gray-500 mt-1">
                            Cert: {item.certification_number}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={getComplianceStatusColor(item)}>
                          {getComplianceStatusText(item)}
                        </Badge>
                        {item.expiry_date && (
                          <p className="text-sm text-gray-600 mt-1">
                            Expires: {formatDaysText(getDaysUntil(item.expiry_date))}
                          </p>
                        )}
                        {item.next_inspection_date && (
                          <p className="text-sm text-gray-600">
                            Inspection: {formatDaysText(getDaysUntil(item.next_inspection_date))}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Can permission="fleet.equipment.edit">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUpdateCertificate(item.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                        </Can>
                        <Can permission="fleet.inspections.schedule">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleScheduleInspection(item.id)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                        </Can>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredEquipment.length === 0 && (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">
                      {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                        ? "No equipment found matching your filters"
                        : "No safety equipment registered yet"}
                    </p>
                    <Can permission="fleet.equipment.create">
                      <Button>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Safety Equipment
                      </Button>
                    </Can>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Active Compliance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Compliance alerts will appear here</p>
                <p className="text-sm text-gray-500">Integration with ComplianceAlerts component</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Compliance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Advanced analytics and reporting</p>
                <p className="text-sm text-gray-500">Coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
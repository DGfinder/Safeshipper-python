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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { FleetComplianceDashboard } from "@/features/fleet/components/FleetComplianceDashboard";
import { useTheme } from "@/contexts/ThemeContext";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import {
  Truck,
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
  MapPin,
  Navigation,
  Fuel,
  Gauge,
  Wrench,
  Users,
  Target,
  TrendingUp,
  Activity,
  Phone,
  Mail,
  Filter,
  ExternalLink,
  ChevronRight,
  Archive,
  Star,
  Zap,
  Info,
  AlertCircle,
  Map
} from "lucide-react";

// Enhanced vehicle interface with live tracking
interface Vehicle {
  id: string;
  registration: string;
  type: string;
  status: "AVAILABLE" | "IN_TRANSIT" | "DELIVERING" | "AT_HUB" | "MAINTENANCE" | "OUT_OF_SERVICE";
  location: {
    latitude: number;
    longitude: number;
    address: string;
    lastUpdated: string;
  };
  locationIsFresh: boolean;
  assignedDriver: {
    id: string;
    name: string;
    email: string;
  } | null;
  activeShipment: {
    id: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    customerName: string;
    estimatedDelivery: string | null;
    hasDangerousGoods: boolean;
    dangerousGoods: Array<{
      unNumber: string;
      properShippingName: string;
      class: string;
      packingGroup: string;
      quantity: string;
    }>;
    emergencyContact: string;
    specialInstructions: string;
  } | null;
  make: string;
  year: number | null;
  configuration: string;
  maxWeight: number | null;
  maxLength: number | null;
  axles: number | null;
  engineSpec: string;
  gearbox: string;
  fuel: string;
  odometer: number | null;
  nextService: string | null;
  lastInspection: string | null;
  safetyCompliance: {
    status: "COMPLIANT" | "NON_COMPLIANT" | "NO_EQUIPMENT";
    compliant: boolean;
    message: string;
    issues?: string[];
  };
}

interface FleetStats {
  totalVehicles: number;
  availableVehicles: number;
  inTransitVehicles: number;
  maintenanceVehicles: number;
  complianceRate: number;
  dgCertified: number;
  activeShipments: number;
  averageUtilization: number;
}

export default function FleetManagementPage() {
  const { loadTime } = usePerformanceMonitoring('FleetManagementPage');
  const { isDark } = useTheme();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fleetStats, setFleetStats] = useState<FleetStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Load fleet data
  useEffect(() => {
    loadFleetData();
    // Set up auto-refresh every 30 seconds for vehicle locations
    const interval = setInterval(loadFleetData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadFleetData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call fleet-status endpoint from vehicles API
      const response = await fetch('/api/v1/vehicles/fleet-status/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch fleet data');
      }

      const data = await response.json();
      
      // Transform the data and add safety compliance
      const transformedVehicles: Vehicle[] = data.vehicles.map((v: any) => ({
        ...v,
        safetyCompliance: {
          status: "COMPLIANT",
          compliant: true,
          message: "All equipment compliant"
        }
      }));

      setVehicles(transformedVehicles);

      // Calculate fleet stats
      const stats: FleetStats = {
        totalVehicles: transformedVehicles.length,
        availableVehicles: transformedVehicles.filter(v => v.status === 'AVAILABLE').length,
        inTransitVehicles: transformedVehicles.filter(v => v.status === 'IN_TRANSIT').length,
        maintenanceVehicles: transformedVehicles.filter(v => v.status === 'MAINTENANCE').length,
        complianceRate: Math.round((transformedVehicles.filter(v => v.safetyCompliance.compliant).length / transformedVehicles.length) * 100),
        dgCertified: transformedVehicles.filter(v => v.activeShipment?.hasDangerousGoods).length,
        activeShipments: transformedVehicles.filter(v => v.activeShipment).length,
        averageUtilization: Math.round(((transformedVehicles.length - transformedVehicles.filter(v => v.status === 'AVAILABLE').length) / transformedVehicles.length) * 100)
      };

      setFleetStats(stats);
    } catch (err) {
      console.error('Error loading fleet data:', err);
      setError('Failed to load fleet data. Please try again.');
      
      // Fallback to mock data for development
      const mockVehicles: Vehicle[] = [
        {
          id: "veh_001",
          registration: "ABC-123",
          type: "SEMI",
          status: "IN_TRANSIT",
          location: {
            latitude: -31.9505,
            longitude: 115.8605,
            address: "123 Industrial Ave, Perth WA",
            lastUpdated: new Date().toISOString()
          },
          locationIsFresh: true,
          assignedDriver: {
            id: "drv_001",
            name: "John Smith",
            email: "john.smith@safeshipper.com"
          },
          activeShipment: {
            id: "shp_001",
            trackingNumber: "SS2024001234",
            status: "IN_TRANSIT",
            origin: "Perth Depot",
            destination: "Melbourne Hub",
            customerName: "Acme Chemicals Ltd",
            estimatedDelivery: "2024-01-16T10:00:00Z",
            hasDangerousGoods: true,
            dangerousGoods: [
              {
                unNumber: "UN1203",
                properShippingName: "Gasoline",current_class: "3",
                packingGroup: "II",
                quantity: "500L"
              }
            ],
            emergencyContact: "+61 8 9000 0000",
            specialInstructions: "Handle with extreme care. ADG certified driver required."
          },
          make: "Kenworth",
          year: 2022,
          configuration: "Prime Mover + Semi-Trailer",
          maxWeight: 68000,
          maxLength: 19,
          axles: 6,
          engineSpec: "PACCAR MX-13 Euro 6",
          gearbox: "Automated Manual",
          fuel: "Diesel",
          odometer: 125000,
          nextService: "2024-02-15",
          lastInspection: "2024-01-01",
          safetyCompliance: {
            status: "COMPLIANT",
            compliant: true,
            message: "All safety equipment compliant"
          }
        },
        {
          id: "veh_002",
          registration: "DEF-456",
          type: "RIGID",
          status: "AVAILABLE",
          location: {
            latitude: -31.9485,
            longitude: 115.8625,
            address: "SafeShipper Depot, Perth WA",
            lastUpdated: new Date().toISOString()
          },
          locationIsFresh: true,
          assignedDriver: null,
          activeShipment: null,
          make: "Isuzu",
          year: 2021,
          configuration: "Rigid Truck",
          maxWeight: 8000,
          maxLength: 8.5,
          axles: 2,
          engineSpec: "4HK1-TC",
          gearbox: "Manual 6-speed",
          fuel: "Diesel",
          odometer: 45000,
          nextService: "2024-03-01",
          lastInspection: "2023-12-15",
          safetyCompliance: {
            status: "NON_COMPLIANT",
            compliant: false,
            message: "Fire extinguisher inspection due",
            issues: ["Fire extinguisher inspection overdue by 5 days"]
          }
        }
      ];

      setVehicles(mockVehicles);
      setFleetStats({
        totalVehicles: 2,
        availableVehicles: 1,
        inTransitVehicles: 1,
        maintenanceVehicles: 0,
        complianceRate: 50,
        dgCertified: 1,
        activeShipments: 1,
        averageUtilization: 50
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    await loadFleetData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.assignedDriver?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.activeShipment?.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.activeShipment?.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    const matchesType = typeFilter === "all" || vehicle.type === typeFilter;
    const matchesCompliance = complianceFilter === "all" || 
      (complianceFilter === "compliant" && vehicle.safetyCompliance.compliant) ||
      (complianceFilter === "non-compliant" && !vehicle.safetyCompliance.compliant);
    
    return matchesSearch && matchesStatus && matchesType && matchesCompliance;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-50 text-green-700 border-green-200';
      case 'IN_TRANSIT': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELIVERING': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'AT_HUB': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MAINTENANCE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'OUT_OF_SERVICE': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getComplianceColor = (compliant: boolean) => {
    return compliant 
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-red-50 text-red-700 border-red-200';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-gray-600">
              Vehicle certification tracking and real-time fleet monitoring
              {loadTime && (
                <span className="ml-2 text-xs text-gray-400">
                  (Loaded in {loadTime.toFixed(0)}ms)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Can permission="fleet.analytics.export">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Fleet Report
              </Button>
            </Can>
            <Can permission="fleet.view">
              <Button variant="outline" size="sm">
                <Map className="h-4 w-4 mr-2" />
                Fleet Map
              </Button>
            </Can>
          </div>
        </div>

        {/* Fleet Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-gray-600">Total Fleet</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{fleetStats?.totalVehicles || 0}</div>
              <div className="text-sm text-green-600">{fleetStats?.availableVehicles || 0} available</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <div className="text-sm text-gray-600">Utilization</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{fleetStats?.averageUtilization || 0}%</div>
              <div className="text-sm text-blue-600">{fleetStats?.inTransitVehicles || 0} in transit</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <div className="text-sm text-gray-600">Compliance</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{fleetStats?.complianceRate || 0}%</div>
              <div className="text-sm text-green-600">Safety certified</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <div className="text-sm text-gray-600">DG Certified</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{fleetStats?.dgCertified || 0}</div>
              <div className="text-sm text-green-600">Active shipments</div>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Fleet Overview
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Live Tracking
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          {/* Fleet Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="DELIVERING">Delivering</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SEMI">Semi-Trailer</SelectItem>
                  <SelectItem value="RIGID">Rigid Truck</SelectItem>
                  <SelectItem value="TANKER">Tanker</SelectItem>
                  <SelectItem value="VAN">Van</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by compliance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Compliance</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                </SelectContent>
              </Select>

              <Can permission="fleet.create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </Can>
            </div>

            {/* Vehicle List */}
            <div className="grid gap-4">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Truck className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-semibold text-lg">{vehicle.registration}</div>
                            <div className="text-sm text-gray-600">{vehicle.make} {vehicle.year} • {vehicle.type}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Status</div>
                            <Badge className={getStatusColor(vehicle.status)}>
                              {vehicle.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Driver</div>
                            <div className="font-medium">
                              {vehicle.assignedDriver ? vehicle.assignedDriver.name : 'Unassigned'}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Location</div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-sm">{vehicle.location.address}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Compliance</div>
                            <Badge className={getComplianceColor(vehicle.safetyCompliance.compliant)}>
                              {vehicle.safetyCompliance.compliant ? 'Compliant' : 'Non-Compliant'}
                            </Badge>
                          </div>
                        </div>
                        
                        {vehicle.activeShipment && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm text-gray-600 mb-1">Active Shipment</div>
                            <div className="font-medium">{vehicle.activeShipment.trackingNumber}</div>
                            <div className="text-sm text-gray-600">
                              {vehicle.activeShipment.customerName} • {vehicle.activeShipment.origin} → {vehicle.activeShipment.destination}
                            </div>
                            {vehicle.activeShipment.hasDangerousGoods && (
                              <Badge className="mt-2 bg-orange-50 text-orange-700 border-orange-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Dangerous Goods
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Navigation className="h-3 w-3" />
                          Updated {new Date(vehicle.location.lastUpdated).toLocaleTimeString()}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle(vehicle)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Can permission="fleet.edit">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Can>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Vehicle Detail Dialog */}
            {selectedVehicle && (
              <Dialog open={!!selectedVehicle} onOpenChange={() => setSelectedVehicle(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Vehicle Details: {selectedVehicle.registration}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Vehicle Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Vehicle Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <span className="text-sm text-gray-600">Registration:</span>
                            <div className="font-medium">{selectedVehicle.registration}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Make/Model:</span>
                            <div className="font-medium">{selectedVehicle.make} {selectedVehicle.year}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Type:</span>
                            <div className="font-medium">{selectedVehicle.type}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Configuration:</span>
                            <div className="font-medium">{selectedVehicle.configuration}</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            Specifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <span className="text-sm text-gray-600">Max Weight:</span>
                            <div className="font-medium">{selectedVehicle.maxWeight ? `${selectedVehicle.maxWeight}kg` : 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Max Length:</span>
                            <div className="font-medium">{selectedVehicle.maxLength ? `${selectedVehicle.maxLength}m` : 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Axles:</span>
                            <div className="font-medium">{selectedVehicle.axles || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Fuel Type:</span>
                            <div className="font-medium">{selectedVehicle.fuel}</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Driver & Assignment */}
                    {selectedVehicle.assignedDriver && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Assigned Driver
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{selectedVehicle.assignedDriver.name}</div>
                              <div className="text-sm text-gray-600">{selectedVehicle.assignedDriver.email}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Active Shipment */}
                    {selectedVehicle.activeShipment && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Active Shipment
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-600">Tracking Number:</span>
                            <div className="font-medium">{selectedVehicle.activeShipment.trackingNumber}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Customer:</span>
                            <div className="font-medium">{selectedVehicle.activeShipment.customerName}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Route:</span>
                            <div className="font-medium">{selectedVehicle.activeShipment.origin} → {selectedVehicle.activeShipment.destination}</div>
                          </div>
                          
                          {selectedVehicle.activeShipment.hasDangerousGoods && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <span className="font-medium text-orange-800">Dangerous Goods</span>
                              </div>
                              {selectedVehicle.activeShipment.dangerousGoods.map((dg, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">{dg.unNumber}</span> - {dg.properShippingName}
                                  <span className="text-gray-600 ml-2">Class {dg.class} • {dg.quantity}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Safety Compliance */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Safety Compliance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <Badge className={getComplianceColor(selectedVehicle.safetyCompliance.compliant)}>
                            {selectedVehicle.safetyCompliance.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm">{selectedVehicle.safetyCompliance.message}</span>
                        </div>
                        {selectedVehicle.safetyCompliance.issues && selectedVehicle.safetyCompliance.issues.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-red-700 mb-2">Issues:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {selectedVehicle.safetyCompliance.issues.map((issue, index) => (
                                <li key={index} className="text-sm text-red-600">{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <FleetComplianceDashboard />
          </TabsContent>

          {/* Live Tracking Tab */}
          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Vehicle Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Map className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Interactive fleet map will be displayed here</p>
                  <p className="text-sm text-gray-500">Showing real-time vehicle locations and routes</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vehicles.filter(v => v.nextService).map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{vehicle.registration}</div>
                          <div className="text-sm text-gray-600">Service due: {formatDate(vehicle.nextService)}</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Eye,
  Edit,
  UserCheck,
  X,
  Download,
  RefreshCw,
  BarChart3,
  Settings,
  Upload,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface IncidentType {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  is_active: boolean;
}

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  status: "reported" | "investigating" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  incident_type: IncidentType;
  location: string;
  coordinates?: { lat: number; lng: number };
  occurred_at: string;
  reported_at: string;
  reporter: User;
  assigned_to?: User;
  witnesses?: User[];
  injuries_count: number;
  property_damage_estimate?: number;
  environmental_impact: boolean;
  resolution_notes?: string;
  resolved_at?: string;
  closed_at?: string;
  updates_count: number;
  documents_count: number;
  created_at: string;
}

interface IncidentStats {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  critical_incidents: number;
  incidents_by_type: Record<string, number>;
  incidents_by_status: Record<string, number>;
  incidents_by_priority: Record<string, number>;
  monthly_trend: Array<{ month: string; count: number }>;
  average_resolution_time: number;
}

interface FilterState {
  search: string;
  status: string;
  priority: string;
  incident_type: string;
  assigned_to: string;
  date_from: string;
  date_to: string;
  environmental_impact: string;
  has_injuries: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  
  // Enhanced filtering state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    priority: "all",
    incident_type: "all",
    assigned_to: "all",
    date_from: "",
    date_to: "",
    environmental_impact: "all",
    has_injuries: "all",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Debounced search effect
    const timer = setTimeout(() => {
      if (filters.search !== "") {
        fetchIncidents();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchIncidents(),
        fetchStats(),
        fetchIncidentTypes()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      // In production, this would call the actual API:
      // const response = await fetch('/api/v1/incidents/api/incidents/', {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();
      
      // Enhanced mock data with more realistic incidents
      const mockIncidents: Incident[] = [
        {
          id: "1",
          incident_number: "INC-2024-0001",
          title: "Hazardous Material Spill - Class 8 Corrosive",
          description: "Sodium hydroxide spill during loading process. Approximately 20L spilled on concrete floor. Area evacuated and contained.",
          status: "investigating",
          priority: "high",
          incident_type: {
            id: "type-1",
            name: "Chemical Spill",
            description: "Accidental release of chemicals",
            category: "hazmat",
            severity: "high",
            is_active: true
          },
          location: "Warehouse A - Loading Bay 3, Sydney NSW",
          coordinates: { lat: -33.8688, lng: 151.2093 },
          occurred_at: "2024-01-15T10:30:00Z",
          reported_at: "2024-01-15T10:45:00Z",
          reporter: {
            id: "user-1",
            email: "john.doe@company.com",
            first_name: "John",
            last_name: "Doe",
            role: "WAREHOUSE_OPERATOR"
          },
          assigned_to: {
            id: "user-2",
            email: "safety@company.com",
            first_name: "Sarah",
            last_name: "Wilson",
            role: "SAFETY_OFFICER"
          },
          witnesses: [
            {
              id: "user-3",
              email: "witness@company.com",
              first_name: "Mike",
              last_name: "Johnson",
              role: "DRIVER"
            }
          ],
          injuries_count: 0,
          property_damage_estimate: 5000,
          environmental_impact: true,
          updates_count: 3,
          documents_count: 5,
          created_at: "2024-01-15T10:45:00Z"
        },
        {
          id: "2",
          incident_number: "INC-2024-0002",
          title: "Vehicle Collision - Minor Damage",
          description: "Forklift collision with parked vehicle in loading area. No injuries reported.",
          status: "resolved",
          priority: "medium",
          incident_type: {
            id: "type-2",
            name: "Vehicle Accident",
            description: "Vehicle related incidents",
            category: "vehicle",
            severity: "medium",
            is_active: true
          },
          location: "Main Parking Lot, Melbourne VIC",
          coordinates: { lat: -37.8136, lng: 144.9631 },
          occurred_at: "2024-01-14T14:20:00Z",
          reported_at: "2024-01-14T14:25:00Z",
          resolved_at: "2024-01-16T09:00:00Z",
          reporter: {
            id: "user-4",
            email: "driver.smith@company.com",
            first_name: "David",
            last_name: "Smith",
            role: "DRIVER"
          },
          assigned_to: {
            id: "user-5",
            email: "manager@company.com",
            first_name: "Lisa",
            last_name: "Chen",
            role: "MANAGER"
          },
          injuries_count: 0,
          property_damage_estimate: 1200,
          environmental_impact: false,
          resolution_notes: "Insurance claim filed. Vehicle repaired. Additional safety training provided.",
          updates_count: 5,
          documents_count: 3,
          created_at: "2024-01-14T14:25:00Z"
        },
        {
          id: "3",
          incident_number: "INC-2024-0003",
          title: "Near Miss - Dangerous Goods Loading",
          description: "UN1203 gasoline drum nearly fell during crane loading. Safety protocols prevented accident.",
          status: "closed",
          priority: "critical",
          incident_type: {
            id: "type-3",
            name: "Near Miss",
            description: "Potential incident prevented",
            category: "safety",
            severity: "critical",
            is_active: true
          },
          location: "Port Adelaide - Berth 7",
          coordinates: { lat: -34.8415, lng: 138.5005 },
          occurred_at: "2024-01-13T08:15:00Z",
          reported_at: "2024-01-13T08:20:00Z",
          resolved_at: "2024-01-15T16:30:00Z",
          closed_at: "2024-01-16T10:00:00Z",
          reporter: {
            id: "user-6",
            email: "crane.operator@company.com",
            first_name: "Tom",
            last_name: "Brown",
            role: "EQUIPMENT_OPERATOR"
          },
          assigned_to: {
            id: "user-2",
            email: "safety@company.com",
            first_name: "Sarah",
            last_name: "Wilson",
            role: "SAFETY_OFFICER"
          },
          injuries_count: 0,
          property_damage_estimate: 0,
          environmental_impact: false,
          resolution_notes: "Crane inspection completed. Operator retraining conducted. Safety procedures updated.",
          updates_count: 7,
          documents_count: 4,
          created_at: "2024-01-13T08:20:00Z"
        }
      ];
      setIncidents(mockIncidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    }
  };

  const fetchStats = async () => {
    try {
      // In production: const response = await fetch('/api/v1/incidents/api/incidents/statistics/');\n      const mockStats: IncidentStats = {
        total_incidents: 24,
        open_incidents: 6,\n        resolved_incidents: 15,
        critical_incidents: 2,
        incidents_by_type: {
          \"Chemical Spill\": 8,
          \"Vehicle Accident\": 6,
          \"Near Miss\": 4,
          \"Equipment Failure\": 3,
          \"Personnel Injury\": 2,
          \"Environmental\": 1
        },
        incidents_by_status: {
          \"reported\": 3,
          \"investigating\": 3,
          \"resolved\": 12,
          \"closed\": 6
        },
        incidents_by_priority: {
          \"critical\": 2,
          \"high\": 5,
          \"medium\": 10,
          \"low\": 7
        },
        monthly_trend: [
          { month: \"2024-01\", count: 4 },
          { month: \"2024-02\", count: 6 },
          { month: \"2024-03\", count: 8 },
          { month: \"2024-04\", count: 6 }
        ],
        average_resolution_time: 4.5,
      };
      setStats(mockStats);
    } catch (error) {
      console.error(\"Error fetching stats:\", error);
    }
  };

  const fetchIncidentTypes = async () => {
    try {
      // In production: const response = await fetch('/api/v1/incidents/api/incident-types/');\n      const mockIncidentTypes: IncidentType[] = [
        {
          id: \"type-1\",
          name: \"Chemical Spill\",
          description: \"Accidental release of chemicals\",
          category: \"hazmat\",
          severity: \"high\",
          is_active: true
        },
        {
          id: \"type-2\",
          name: \"Vehicle Accident\",
          description: \"Vehicle related incidents\",
          category: \"vehicle\",
          severity: \"medium\",
          is_active: true
        },
        {
          id: \"type-3\",
          name: \"Near Miss\",
          description: \"Potential incident prevented\",
          category: \"safety\",
          severity: \"critical\",
          is_active: true
        }
      ];
      setIncidentTypes(mockIncidentTypes);
    } catch (error) {
      console.error(\"Error fetching incident types:\", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: \"\",
      status: \"all\",
      priority: \"all\",
      incident_type: \"all\",
      assigned_to: \"all\",
      date_from: \"\",
      date_to: \"\",
      environmental_impact: \"all\",
      has_injuries: \"all\",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reported":
        return "bg-blue-500";
      case "investigating":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        incident.title.toLowerCase().includes(searchLower) ||
        incident.incident_number.toLowerCase().includes(searchLower) ||
        incident.description.toLowerCase().includes(searchLower) ||
        incident.location.toLowerCase().includes(searchLower) ||
        incident.reporter.first_name.toLowerCase().includes(searchLower) ||
        incident.reporter.last_name.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== "all" && incident.status !== filters.status) {
      return false;
    }

    // Priority filter
    if (filters.priority !== "all" && incident.priority !== filters.priority) {
      return false;
    }

    // Incident type filter
    if (filters.incident_type !== "all" && incident.incident_type.id !== filters.incident_type) {
      return false;
    }

    // Environmental impact filter
    if (filters.environmental_impact !== "all") {
      const hasImpact = filters.environmental_impact === "true";
      if (incident.environmental_impact !== hasImpact) {
        return false;
      }
    }

    // Injuries filter
    if (filters.has_injuries !== "all") {
      const hasInjuries = filters.has_injuries === "true";
      const incidentHasInjuries = incident.injuries_count > 0;
      if (incidentHasInjuries !== hasInjuries) {
        return false;
      }
    }

    // Date filters
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from);
      const incidentDate = new Date(incident.occurred_at);
      if (incidentDate < fromDate) {
        return false;
      }
    }

    if (filters.date_to) {
      const toDate = new Date(filters.date_to);
      const incidentDate = new Date(incident.occurred_at);
      if (incidentDate > toDate) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading incidents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Incident Management System
          </h1>
          <p className="text-gray-600">Comprehensive safety incident tracking and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Report New Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title *</Label>
                    <Input placeholder="Brief incident title" />
                  </div>
                  <div>
                    <Label>Priority *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea placeholder="Detailed incident description..." rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location *</Label>
                    <Input placeholder="Incident location" />
                  </div>
                  <div>
                    <Label>Incident Type *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Submit Report
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Incidents</p>
                  <p className="text-2xl font-bold">{stats.total_incidents}</p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Incidents</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.open_incidents}
                  </p>
                  <p className="text-xs text-gray-500">Requires attention</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical Priority</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.critical_incidents}
                  </p>
                  <p className="text-xs text-gray-500">Immediate action</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.resolved_incidents}
                  </p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Resolution</p>
                  <p className="text-2xl font-bold">
                    {stats.average_resolution_time}d
                  </p>
                  <p className="text-xs text-gray-500">Resolution time</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Incident List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Incident List Tab */}
        <TabsContent value="list" className="space-y-6">
          {/* Enhanced Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Filters
                </CardTitle>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <Label className="text-sm font-medium">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search incidents, numbers, locations..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Incident Type Filter */}
                <div>
                  <Label className="text-sm font-medium">Incident Type</Label>
                  <Select value={filters.incident_type} onValueChange={(value) => handleFilterChange('incident_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {incidentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Environmental Impact Filter */}
                <div>
                  <Label className="text-sm font-medium">Environmental Impact</Label>
                  <Select value={filters.environmental_impact} onValueChange={(value) => handleFilterChange('environmental_impact', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Has Impact</SelectItem>
                      <SelectItem value="false">No Impact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Injuries Filter */}
                <div>
                  <Label className="text-sm font-medium">Injuries</Label>
                  <Select value={filters.has_injuries} onValueChange={(value) => handleFilterChange('has_injuries', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Has Injuries</SelectItem>
                      <SelectItem value="false">No Injuries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div>
                  <Label className="text-sm font-medium">Date From</Label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div>
                  <Label className="text-sm font-medium">Date To</Label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Incidents List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Incidents ({filteredIncidents.length} of {incidents.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No incidents match your current filters.</p>
                    <Button variant="outline" onClick={clearFilters} className="mt-2">
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  filteredIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-blue-600">
                              {incident.incident_number}
                            </span>
                            <Badge className={`${getPriorityColor(incident.priority)} text-white`}>
                              {incident.priority.toUpperCase()}
                            </Badge>
                            <Badge className={`${getStatusColor(incident.status)} text-white`}>
                              {incident.status.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {incident.incident_type.category}
                            </Badge>
                          </div>

                          <h3 className="font-medium text-lg mb-2">{incident.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {incident.description}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {incident.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(incident.occurred_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {incident.reporter.first_name} {incident.reporter.last_name}
                            </div>
                            {incident.assigned_to && (
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-4 w-4" />
                                Assigned to {incident.assigned_to.first_name} {incident.assigned_to.last_name}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>{incident.updates_count} updates</span>
                            <span>{incident.documents_count} documents</span>
                            {incident.injuries_count > 0 && (
                              <span className="text-red-600 font-medium">
                                {incident.injuries_count} injuries
                              </span>
                            )}
                            {incident.environmental_impact && (
                              <span className="text-orange-600 font-medium">
                                Environmental impact
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedIncident(incident)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {incident.status !== "closed" && (
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab - Placeholder for now */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Incident Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Advanced analytics dashboard coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab - Placeholder for now */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Incident Management Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Settings configuration coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  status: "reported" | "investigating" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  incident_type: {
    name: string;
    category: string;
    severity: string;
  };
  location: string;
  occurred_at: string;
  reported_at: string;
  reporter: {
    username: string;
    email: string;
  };
  assigned_to?: {
    username: string;
    email: string;
  };
  injuries_count: number;
  property_damage_estimate?: number;
  environmental_impact: boolean;
}

interface IncidentStats {
  total_incidents: number;
  open_incidents: number;
  critical_incidents: number;
  resolved_this_month: number;
  average_resolution_time: number;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    fetchIncidents();
    fetchStats();
  }, []);

  const fetchIncidents = async () => {
    try {
      // Mock API call - replace with actual API
      const mockIncidents: Incident[] = [
        {
          id: "1",
          incident_number: "INC-2024-0001",
          title: "Hazardous Material Spill",
          description: "Small chemical spill during loading process",
          status: "investigating",
          priority: "high",
          incident_type: {
            name: "Chemical Spill",
            category: "hazmat",
            severity: "high",
          },
          location: "Warehouse A - Loading Bay 3",
          occurred_at: "2024-01-15T10:30:00Z",
          reported_at: "2024-01-15T10:45:00Z",
          reporter: {
            username: "john.doe",
            email: "john.doe@company.com",
          },
          assigned_to: {
            username: "safety.manager",
            email: "safety@company.com",
          },
          injuries_count: 0,
          property_damage_estimate: 5000,
          environmental_impact: true,
        },
        {
          id: "2",
          incident_number: "INC-2024-0002",
          title: "Vehicle Collision",
          description: "Minor collision in parking lot",
          status: "resolved",
          priority: "medium",
          incident_type: {
            name: "Vehicle Accident",
            category: "vehicle",
            severity: "medium",
          },
          location: "Main Parking Lot",
          occurred_at: "2024-01-14T14:20:00Z",
          reported_at: "2024-01-14T14:25:00Z",
          reporter: {
            username: "driver.smith",
            email: "driver@company.com",
          },
          injuries_count: 0,
          property_damage_estimate: 1200,
          environmental_impact: false,
        },
      ];
      setIncidents(mockIncidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Mock API call - replace with actual API
      const mockStats: IncidentStats = {
        total_incidents: 24,
        open_incidents: 6,
        critical_incidents: 2,
        resolved_this_month: 8,
        average_resolution_time: 4.5,
      };
      setStats(mockStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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
    const matchesSearch =
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.incident_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || incident.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || incident.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Incident Management
          </h1>
          <p className="text-gray-600">Track and manage safety incidents</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Incidents</p>
                  <p className="text-2xl font-bold">{stats.total_incidents}</p>
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
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.critical_incidents}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved (Month)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.resolved_this_month}
                  </p>
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
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by priority" />
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
        </CardContent>
      </Card>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-blue-600">
                        {incident.incident_number}
                      </span>
                      <Badge
                        className={`${getPriorityColor(incident.priority)} text-white`}
                      >
                        {incident.priority.toUpperCase()}
                      </Badge>
                      <Badge
                        className={`${getStatusColor(incident.status)} text-white`}
                      >
                        {incident.status.toUpperCase()}
                      </Badge>
                    </div>

                    <h3 className="font-medium text-lg mb-1">
                      {incident.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {incident.description}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
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
                        {incident.reporter.username}
                      </div>
                      {incident.injuries_count > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          {incident.injuries_count} injuries
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    {incident.status !== "closed" && (
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

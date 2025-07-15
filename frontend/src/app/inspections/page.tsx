"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/utils/performance";
import {
  ClipboardCheck,
  Calendar,
  Camera,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  FileText,
  Upload,
  Image,
  Star,
  Flag,
  Target,
  Truck,
  Package,
  Building,
  Settings,
  Activity,
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  Archive,
  Bookmark,
  Bell,
  Info,
  AlertCircle,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  Paperclip,
  Calendar as CalendarIcon,
  Clock3,
  MapPin as LocationIcon,
  Phone,
  Mail,
  Globe,
  Monitor,
  Server,
  Database,
  Code,
  Terminal,
  HelpCircle
} from "lucide-react";

// Mock data for inspections
const mockInspections = [
  {
    id: "1",
    title: "Quarterly Safety Inspection",
    type: "safety",
    status: "completed",
    priority: "high",
    inspector: "John Smith",
    facility: "Warehouse A",
    scheduledDate: "2024-01-15",
    completedDate: "2024-01-15",
    score: 94,
    findings: 2,
    photos: 12,
    checklist: {
      total: 25,
      completed: 25,
      passed: 23,
      failed: 2
    }
  },
  {
    id: "2",
    title: "DG Storage Compliance Check",
    type: "compliance",
    status: "in_progress",
    priority: "high",
    inspector: "Jane Doe",
    facility: "Storage Facility B",
    scheduledDate: "2024-01-16",
    completedDate: null,
    score: null,
    findings: 0,
    photos: 8,
    checklist: {
      total: 30,
      completed: 18,
      passed: 15,
      failed: 3
    }
  },
  {
    id: "3",
    title: "Monthly Equipment Check",
    type: "equipment",
    status: "scheduled",
    priority: "medium",
    inspector: "Mike Johnson",
    facility: "Maintenance Shop",
    scheduledDate: "2024-01-20",
    completedDate: null,
    score: null,
    findings: 0,
    photos: 0,
    checklist: {
      total: 20,
      completed: 0,
      passed: 0,
      failed: 0
    }
  },
  {
    id: "4",
    title: "Annual Fire Safety Audit",
    type: "safety",
    status: "overdue",
    priority: "high",
    inspector: "Sarah Wilson",
    facility: "Main Office",
    scheduledDate: "2024-01-10",
    completedDate: null,
    score: null,
    findings: 0,
    photos: 0,
    checklist: {
      total: 35,
      completed: 0,
      passed: 0,
      failed: 0
    }
  }
];

const mockTemplates = [
  {
    id: "1",
    name: "Safety Inspection Checklist",
    type: "safety",
    items: 25,
    lastUpdated: "2024-01-10",
    usage: 15
  },
  {
    id: "2",
    name: "DG Compliance Check",
    type: "compliance",
    items: 30,
    lastUpdated: "2024-01-12",
    usage: 8
  },
  {
    id: "3",
    name: "Equipment Maintenance",
    type: "equipment",
    items: 20,
    lastUpdated: "2024-01-08",
    usage: 12
  },
  {
    id: "4",
    name: "Fire Safety Audit",
    type: "safety",
    items: 35,
    lastUpdated: "2024-01-05",
    usage: 3
  }
];

const mockChecklistItems = [
  {
    id: "1",
    title: "Emergency exits are clearly marked",
    category: "Safety",
    required: true,
    status: "passed",
    notes: "All exits properly marked and illuminated",
    photos: ["exit1.jpg", "exit2.jpg"]
  },
  {
    id: "2",
    title: "Fire extinguishers are accessible",
    category: "Safety",
    required: true,
    status: "passed",
    notes: "All extinguishers in designated locations",
    photos: ["extinguisher1.jpg"]
  },
  {
    id: "3",
    title: "DG storage areas properly ventilated",
    category: "Compliance",
    required: true,
    status: "failed",
    notes: "Ventilation system in Area C needs repair",
    photos: ["ventilation_issue.jpg"]
  },
  {
    id: "4",
    title: "Safety equipment inventory complete",
    category: "Equipment",
    required: true,
    status: "pending",
    notes: "Inventory in progress",
    photos: []
  }
];

export default function InspectionsPage() {
  const { loadTime } = usePerformanceMonitoring('InspectionsPage');
  const { isDark } = useTheme();
  const [selectedInspection, setSelectedInspection] = useState<typeof mockInspections[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof mockTemplates[0] | null>(null);

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const filteredInspections = mockInspections.filter(inspection => {
    const matchesSearch = inspection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.inspector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inspection.status === statusFilter;
    const matchesType = typeFilter === "all" || inspection.type === typeFilter;
    const matchesPriority = priorityFilter === "all" || inspection.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "in_progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "scheduled":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "overdue":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "safety":
        return <Shield className="h-4 w-4" />;
      case "compliance":
        return <ClipboardCheck className="h-4 w-4" />;
      case "equipment":
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Square className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inspection Management</h1>
              <p className="text-gray-600">
                Schedule, track, and manage facility inspections and compliance checks
                {loadTime && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Loaded in {loadTime.toFixed(0)}ms)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button size="sm" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Inspection
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-blue-600" />
                  <div className="text-sm text-gray-600">Total Inspections</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">127</div>
                <div className="text-sm text-green-600">+5 this week</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">89</div>
                <div className="text-sm text-blue-600">70% completion rate</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div className="text-sm text-gray-600">Overdue</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">3</div>
                <div className="text-sm text-red-600">Requires attention</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <div className="text-sm text-gray-600">Avg Score</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">91.5</div>
                <div className="text-sm text-green-600">+2.3 from last month</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="inspections" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inspections" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Inspections
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Inspections Tab */}
            <TabsContent value="inspections" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search inspections..."
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
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inspections List */}
              <div className="grid gap-4">
                {filteredInspections.map((inspection) => (
                  <Card key={inspection.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(inspection.type)}
                          <div>
                            <div className="font-semibold">{inspection.title}</div>
                            <div className="text-sm text-gray-600">
                              {inspection.facility} • {inspection.inspector}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(inspection.status)}>
                            {inspection.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(inspection.priority)}>
                            {inspection.priority}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedInspection(inspection)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Scheduled</div>
                          <div className="font-semibold">{inspection.scheduledDate}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Progress</div>
                          <div className="font-semibold">
                            {inspection.checklist.completed}/{inspection.checklist.total} items
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Score</div>
                          <div className="font-semibold">
                            {inspection.score ? `${inspection.score}%` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Photos</div>
                          <div className="font-semibold">{inspection.photos}</div>
                        </div>
                      </div>
                      
                      {inspection.status === "in_progress" && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Completion Progress</span>
                            <span>{Math.round((inspection.checklist.completed / inspection.checklist.total) * 100)}%</span>
                          </div>
                          <Progress value={(inspection.checklist.completed / inspection.checklist.total) * 100} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Selected Inspection Detail */}
              {selectedInspection && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Inspection Details: {selectedInspection.title}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedInspection(null)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Inspector</div>
                          <div className="font-semibold">{selectedInspection.inspector}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Facility</div>
                          <div className="font-semibold">{selectedInspection.facility}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Type</div>
                          <div className="font-semibold">{selectedInspection.type}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Priority</div>
                          <div className="font-semibold">{selectedInspection.priority}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold">Checklist Items</h4>
                        {mockChecklistItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {getStatusIcon(item.status)}
                            <div className="flex-1">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-sm text-gray-600">{item.category}</div>
                              {item.notes && (
                                <div className="text-sm text-gray-600 mt-1">{item.notes}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.photos.length > 0 && (
                                <Badge variant="outline">
                                  <Camera className="h-3 w-3 mr-1" />
                                  {item.photos.length}
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Inspection Templates</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              <div className="grid gap-4">
                {mockTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(template.type)}
                          <div>
                            <div className="font-semibold">{template.name}</div>
                            <div className="text-sm text-gray-600">
                              {template.items} items • Last updated {template.lastUpdated}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Used {template.usage} times
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Inspection Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Inspection trends chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Score Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Score distribution chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Common Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ventilation Issues</span>
                        <span className="text-sm font-semibold">23%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Safety Equipment</span>
                        <span className="text-sm font-semibold">18%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Documentation</span>
                        <span className="text-sm font-semibold">15%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Storage Compliance</span>
                        <span className="text-sm font-semibold">12%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Inspector Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">John Smith</span>
                        <span className="text-sm font-semibold">94.2%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Jane Doe</span>
                        <span className="text-sm font-semibold">91.8%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mike Johnson</span>
                        <span className="text-sm font-semibold">89.5%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Sarah Wilson</span>
                        <span className="text-sm font-semibold">87.3%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </DashboardLayout>
  );
}
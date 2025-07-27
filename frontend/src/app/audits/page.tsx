"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Calendar } from "@/shared/components/ui/calendar";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import {
  Shield,
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Activity,
  Database,
  Settings,
  Lock,
  Unlock,
  Calendar as CalendarIcon,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Users,
  Building,
  Package,
  Truck,
  AlertCircle,
  Info,
  Plus,
  Edit,
  Trash2,
  Archive,
  Star,
  BookOpen,
  Clipboard,
  Target,
  Zap,
  Globe,
  Monitor,
  Server,
  Code,
  Terminal,
  HelpCircle
} from "lucide-react";

// Mock data for audits
const mockAuditLogs = [
  {
    id: "1",
    timestamp: "2024-01-15T10:30:00Z",
    action: "CREATE_SHIPMENT",
    user: "john.doe@company.com",
    resource: "shipment:SH-2024-001",
    details: "Created new dangerous goods shipment",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    status: "success",
    severity: "info"
  },
  {
    id: "2",
    timestamp: "2024-01-15T10:25:00Z",
    action: "UPDATE_CLASSIFICATION",
    user: "jane.smith@company.com",
    resource: "dg-classification:DG-001",
    details: "Updated dangerous goods classification for Class 3 materials",
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    status: "success",
    severity: "warning"
  },
  {
    id: "3",
    timestamp: "2024-01-15T10:20:00Z",
    action: "FAILED_LOGIN",
    user: "unknown@attacker.com",
    resource: "auth:login",
    details: "Failed login attempt with invalid credentials",
    ipAddress: "203.0.113.45",
    userAgent: "curl/7.68.0",
    status: "failure",
    severity: "high"
  },
  {
    id: "4",
    timestamp: "2024-01-15T10:15:00Z",
    action: "EXPORT_REPORT",
    user: "manager@company.com",
    resource: "report:analytics-2024-01",
    details: "Exported monthly analytics report",
    ipAddress: "192.168.1.102",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    status: "success",
    severity: "info"
  },
  {
    id: "5",
    timestamp: "2024-01-15T10:10:00Z",
    action: "DELETE_USER",
    user: "admin@company.com",
    resource: "user:former.employee@company.com",
    details: "Deleted user account for former employee",
    ipAddress: "192.168.1.103",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    status: "success",
    severity: "high"
  }
];

const mockComplianceReports = [
  {
    id: "1",
    name: "SOC 2 Type II Audit",
    type: "Security",
    status: "completed",
    score: 98,
    dueDate: "2024-03-15",
    lastUpdated: "2024-01-15",
    findings: 2,
    recommendations: 5
  },
  {
    id: "2",
    name: "GDPR Compliance Review",
    type: "Privacy",
    status: "in_progress",
    score: 85,
    dueDate: "2024-02-28",
    lastUpdated: "2024-01-14",
    findings: 8,
    recommendations: 12
  },
  {
    id: "3",
    name: "ISO 27001 Assessment",
    type: "Security",
    status: "scheduled",
    score: 92,
    dueDate: "2024-04-10",
    lastUpdated: "2024-01-10",
    findings: 3,
    recommendations: 7
  },
  {
    id: "4",
    name: "Dangerous Goods Compliance",
    type: "Regulatory",
    status: "completed",
    score: 94,
    dueDate: "2024-01-31",
    lastUpdated: "2024-01-15",
    findings: 1,
    recommendations: 3
  }
];

const mockMetrics = {
  totalEvents: 15234,
  securityEvents: 342,
  failedLogins: 23,
  dataAccess: 1205,
  systemChanges: 89,
  complianceScore: 94.2
};

export default function AuditsPage() {
  const { loadTime } = usePerformanceMonitoring('AuditsPage');
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [selectedLog, setSelectedLog] = useState<typeof mockAuditLogs[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === "all" || log.action === selectedAction;
    const matchesSeverity = selectedSeverity === "all" || log.severity === selectedSeverity;
    const matchesUser = selectedUser === "all" || log.user === selectedUser;
    return matchesSearch && matchesAction && matchesSeverity && matchesUser;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "warning":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "info":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-50 text-green-700 border-green-200";
      case "failure":
        return "bg-red-50 text-red-700 border-red-200";
      case "warning":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "in_progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "scheduled":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Audit Management</h1>
              <p className="text-gray-600">
                Comprehensive audit trail and compliance monitoring system
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
                Export Logs
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Audit
              </Button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <div className="text-sm text-gray-600">Total Events</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{mockMetrics.totalEvents.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <div className="text-sm text-gray-600">Security Events</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{mockMetrics.securityEvents}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <div className="text-sm text-gray-600">Failed Logins</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{mockMetrics.failedLogins}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <div className="text-sm text-gray-600">Data Access</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{mockMetrics.dataAccess}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-purple-600" />
                  <div className="text-sm text-gray-600">System Changes</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{mockMetrics.systemChanges}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-cyan-600" />
                  <div className="text-sm text-gray-600">Compliance Score</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{mockMetrics.complianceScore}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="logs" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Audit Logs
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance Reports
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Audit Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE_SHIPMENT">Create Shipment</SelectItem>
                    <SelectItem value="UPDATE_CLASSIFICATION">Update Classification</SelectItem>
                    <SelectItem value="FAILED_LOGIN">Failed Login</SelectItem>
                    <SelectItem value="EXPORT_REPORT">Export Report</SelectItem>
                    <SelectItem value="DELETE_USER">Delete User</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="john.doe@company.com">John Doe</SelectItem>
                    <SelectItem value="jane.smith@company.com">Jane Smith</SelectItem>
                    <SelectItem value="manager@company.com">Manager</SelectItem>
                    <SelectItem value="admin@company.com">Admin</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Audit Logs List */}
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(log.severity)}>
                              {log.severity}
                            </Badge>
                            <Badge className={getStatusColor(log.status)}>
                              {log.status}
                            </Badge>
                          </div>
                          <div>
                            <div className="font-medium">{log.action.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-gray-600">{log.details}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm text-gray-600">
                            <div>{log.user}</div>
                            <div>{new Date(log.timestamp).toLocaleString()}</div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <span>Resource: {log.resource}</span>
                          <span>IP: {log.ipAddress}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Compliance Reports Tab */}
            <TabsContent value="compliance" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Compliance Reports</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Report
                </Button>
              </div>

              <div className="grid gap-4">
                {mockComplianceReports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-semibold">{report.name}</div>
                            <div className="text-sm text-gray-600">{report.type} • Last updated {report.lastUpdated}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getComplianceStatusColor(report.status)}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Score</div>
                          <div className="text-lg font-bold text-green-600">{report.score}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Findings</div>
                          <div className="text-lg font-bold text-red-600">{report.findings}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Recommendations</div>
                          <div className="text-lg font-bold text-yellow-600">{report.recommendations}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Due Date</div>
                          <div className="text-lg font-bold text-gray-900">{report.dueDate}</div>
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
                      <Activity className="h-5 w-5" />
                      Event Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Event trends chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">User activity chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Failed Login Attempts</span>
                        <span className="text-sm font-semibold">23</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Suspicious Activity</span>
                        <span className="text-sm font-semibold">7</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Permission Violations</span>
                        <span className="text-sm font-semibold">2</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Data Access Alerts</span>
                        <span className="text-sm font-semibold">12</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Compliance Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Security</span>
                        <span className="text-sm font-semibold">95%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Privacy</span>
                        <span className="text-sm font-semibold">88%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Regulatory</span>
                        <span className="text-sm font-semibold">92%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall</span>
                        <span className="text-sm font-semibold">91.7%</span>
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
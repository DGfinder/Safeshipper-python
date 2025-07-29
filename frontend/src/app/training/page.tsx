"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Progress } from "@/shared/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Award,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Users,
  FileText,
  Download,
  RefreshCw,
  Eye,
  Edit,
  XCircle,
  AlertCircle,
  Target,
  BarChart3,
  Settings,
  Bell,
  Shield,
} from "lucide-react";

interface TrainingProgram {
  id: string;
  name: string;
  category: {
    name: string;
    is_mandatory: boolean;
  };
  delivery_method: string;
  difficulty_level: string;
  duration_hours: number;
  is_mandatory: boolean;
  passing_score: number;
  certificate_validity_months?: number;
}

interface UserTrainingRecord {
  id: string;
  user_details: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    role: string;
  };
  program_details: TrainingProgram;
  progress_status: "not_started" | "in_progress" | "completed" | "failed" | "expired" | "suspended";
  overall_progress_percentage: number;
  completion_percentage_display: string;
  started_at?: string;
  last_accessed_at?: string;
  completed_at?: string;
  best_score?: number;
  latest_score?: number;
  passed: boolean;
  compliance_status: "compliant" | "non_compliant" | "pending_renewal" | "overdue" | "exempt";
  is_mandatory_for_role: boolean;
  required_by_date?: string;
  is_overdue: boolean;
  certificate_issued: boolean;
  certificate_number?: string;
  certificate_issued_at?: string;
  certificate_expires_at?: string;
  certificate_renewed_count: number;
  days_until_expiry?: number;
  total_time_spent_minutes: number;
  time_spent_formatted: string;
  estimated_completion_time_minutes?: number;
  estimated_time_formatted: string;
  modules_completed: number;
  total_modules: number;
  renewal_due_date?: string;
  days_until_renewal?: number;
  is_due_for_renewal: boolean;
  next_incomplete_module?: {
    id: string;
    title: string;
    module_type: string;
    estimated_duration_minutes: number;
  };
  created_at: string;
}

interface TrainingModule {
  id: string;
  title: string;
  module_type: "lesson" | "quiz" | "assessment" | "practical" | "video" | "reading" | "simulation";
  order: number;
  is_mandatory: boolean;
  estimated_duration_minutes: number;
  status: "draft" | "published" | "archived";
}

interface ComplianceReport {
  expiring_soon: UserTrainingRecord[];
  expired: UserTrainingRecord[];
  overdue: UserTrainingRecord[];
  summary: {
    total_records: number;
    expiring_soon_count: number;
    expired_count: number;
    overdue_count: number;
    compliance_percentage: number;
  };
}

interface TrainingStats {
  total_records: number;
  compliant_records: number;
  in_progress_records: number;
  overdue_records: number;
  expiring_soon_count: number;
  expired_count: number;
  average_completion_time: number;
  compliance_percentage: number;
}

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userRecords, setUserRecords] = useState<UserTrainingRecord[]>([]);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  
  // Dialog states
  const [selectedRecord, setSelectedRecord] = useState<UserTrainingRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // In production, these would be actual API calls:
      // const recordsResponse = await fetch('/api/v1/training/user-records/');
      // const complianceResponse = await fetch('/api/v1/training/user-records/compliance_report/');
      // const expiringResponse = await fetch('/api/v1/training/user-records/expiring_soon/');
      // const overdueResponse = await fetch('/api/v1/training/user-records/overdue/');

      const mockUserRecords: UserTrainingRecord[] = [
        {
          id: "1",
          user_details: {
            id: "user-1",
            username: "john.doe",
            full_name: "John Doe",
            email: "john@company.com",
            role: "DRIVER"
          },
          program_details: {
            id: "prog-1",
            name: "ADG Dangerous Goods Handling",
            category: { name: "Safety", is_mandatory: true },
            delivery_method: "blended",
            difficulty_level: "intermediate",
            duration_hours: 12,
            is_mandatory: true,
            passing_score: 80,
            certificate_validity_months: 12
          },
          progress_status: "completed",
          overall_progress_percentage: 100,
          completion_percentage_display: "100.0%",
          started_at: "2024-01-10T09:00:00Z",
          last_accessed_at: "2024-01-15T16:30:00Z",
          completed_at: "2024-01-15T16:30:00Z",
          best_score: 92,
          latest_score: 92,
          passed: true,
          compliance_status: "compliant",
          is_mandatory_for_role: true,
          required_by_date: "2024-02-01",
          is_overdue: false,
          certificate_issued: true,
          certificate_number: "CERT-2024-0001",
          certificate_issued_at: "2024-01-15T16:30:00Z",
          certificate_expires_at: "2025-01-15T16:30:00Z",
          certificate_renewed_count: 0,
          days_until_expiry: 215,
          total_time_spent_minutes: 480,
          time_spent_formatted: "8h",
          estimated_completion_time_minutes: 720,
          estimated_time_formatted: "12h",
          modules_completed: 8,
          total_modules: 8,
          renewal_due_date: "2024-12-15",
          days_until_renewal: 185,
          is_due_for_renewal: false,
          created_at: "2024-01-10T09:00:00Z"
        },
        {
          id: "2",
          user_details: {
            id: "user-2",
            username: "sarah.wilson",
            full_name: "Sarah Wilson",
            email: "sarah@company.com",
            role: "SAFETY_OFFICER"
          },
          program_details: {
            id: "prog-2",
            name: "Emergency Response Procedures",
            category: { name: "Emergency", is_mandatory: true },
            delivery_method: "hands_on",
            difficulty_level: "advanced",
            duration_hours: 16,
            is_mandatory: true,
            passing_score: 85,
            certificate_validity_months: 24
          },
          progress_status: "completed",
          overall_progress_percentage: 100,
          completion_percentage_display: "100.0%",
          started_at: "2023-11-01T09:00:00Z",
          last_accessed_at: "2023-11-20T15:45:00Z",
          completed_at: "2023-11-20T15:45:00Z",
          best_score: 95,
          latest_score: 95,
          passed: true,
          compliance_status: "pending_renewal",
          is_mandatory_for_role: true,
          required_by_date: "2023-12-01",
          is_overdue: false,
          certificate_issued: true,
          certificate_number: "CERT-2023-0089",
          certificate_issued_at: "2023-11-20T15:45:00Z",
          certificate_expires_at: "2024-08-15T15:45:00Z",
          certificate_renewed_count: 0,
          days_until_expiry: 25,
          total_time_spent_minutes: 960,
          time_spent_formatted: "16h",
          estimated_completion_time_minutes: 960,
          estimated_time_formatted: "16h",
          modules_completed: 12,
          total_modules: 12,
          renewal_due_date: "2024-07-15",
          days_until_renewal: -5,
          is_due_for_renewal: true,
          created_at: "2023-11-01T09:00:00Z"
        },
        {
          id: "3",
          user_details: {
            id: "user-3",
            username: "mike.johnson",
            full_name: "Mike Johnson",
            email: "mike@company.com",
            role: "WAREHOUSE_OPERATOR"
          },
          program_details: {
            id: "prog-3",
            name: "Basic Safety Training",
            category: { name: "Safety", is_mandatory: true },
            delivery_method: "online",
            difficulty_level: "beginner",
            duration_hours: 4,
            is_mandatory: true,
            passing_score: 75,
            certificate_validity_months: 6
          },
          progress_status: "in_progress",
          overall_progress_percentage: 60,
          completion_percentage_display: "60.0%",
          started_at: "2024-06-15T10:00:00Z",
          last_accessed_at: "2024-07-10T14:20:00Z",
          best_score: 68,
          latest_score: 68,
          passed: false,
          compliance_status: "overdue",
          is_mandatory_for_role: true,
          required_by_date: "2024-07-15",
          is_overdue: true,
          certificate_issued: false,
          certificate_renewed_count: 0,
          total_time_spent_minutes: 120,
          time_spent_formatted: "2h",
          estimated_completion_time_minutes: 240,
          estimated_time_formatted: "4h",
          modules_completed: 3,
          total_modules: 5,
          is_due_for_renewal: false,
          next_incomplete_module: {
            id: "mod-4",
            title: "Personal Protective Equipment",
            module_type: "lesson",
            estimated_duration_minutes: 45
          },
          created_at: "2024-06-15T10:00:00Z"
        }
      ];

      const mockComplianceReport: ComplianceReport = {
        expiring_soon: [mockUserRecords[1]], // Sarah's certificate expiring
        expired: [], 
        overdue: [mockUserRecords[2]], // Mike's overdue training
        summary: {
          total_records: 3,
          expiring_soon_count: 1,
          expired_count: 0,
          overdue_count: 1,
          compliance_percentage: 67 // 2 out of 3 compliant
        }
      };

      const mockStats: TrainingStats = {
        total_records: 3,
        compliant_records: 1,
        in_progress_records: 1,
        overdue_records: 1,
        expiring_soon_count: 1,
        expired_count: 0,
        average_completion_time: 8.67, // Average hours
        compliance_percentage: 67
      };

      setUserRecords(mockUserRecords);
      setComplianceReport(mockComplianceReport);
      setStats(mockStats);
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getProgressStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "not_started":
        return "bg-gray-500";
      case "failed":
        return "bg-red-500";
      case "expired":
        return "bg-red-600";
      case "suspended":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-500";
      case "non_compliant":
        return "bg-red-500";
      case "pending_renewal":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-600";
      case "exempt":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityLevel = (record: UserTrainingRecord) => {
    if (record.is_overdue) return "critical";
    if (record.is_due_for_renewal) return "high";
    if (record.days_until_expiry && record.days_until_expiry <= 30) return "medium";
    return "low";
  };

  const filteredRecords = userRecords.filter((record) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        record.user_details.full_name.toLowerCase().includes(searchLower) ||
        record.user_details.email.toLowerCase().includes(searchLower) ||
        record.program_details.name.toLowerCase().includes(searchLower) ||
        (record.certificate_number && record.certificate_number.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && record.progress_status !== statusFilter) {
      return false;
    }

    // Compliance filter
    if (complianceFilter !== "all" && record.compliance_status !== complianceFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== "all") {
      const priority = getPriorityLevel(record);
      if (priority !== priorityFilter) return false;
    }

    // Show expiring only filter
    if (showExpiringOnly && (!record.days_until_expiry || record.days_until_expiry > 30)) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading training records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Training Records & Compliance Dashboard
          </h1>
          <p className="text-gray-600">
            Comprehensive training compliance monitoring and expiration tracking
          </p>
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
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Assign Training
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold">{stats.total_records}</p>
                  <p className="text-xs text-gray-500">All training records</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.compliance_percentage}%
                  </p>
                  <p className="text-xs text-gray-500">Organization wide</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.in_progress_records}
                  </p>
                  <p className="text-xs text-gray-500">Active training</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.expiring_soon_count}
                  </p>
                  <p className="text-xs text-gray-500">Within 30 days</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.overdue_records}
                  </p>
                  <p className="text-xs text-gray-500">Requires action</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Completion</p>
                  <p className="text-2xl font-bold">
                    {stats.average_completion_time.toFixed(1)}h
                  </p>
                  <p className="text-xs text-gray-500">Training time</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">Training Records</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Compliance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Overall Compliance
                      </span>
                      <span className="text-sm text-gray-600">
                        {stats?.compliance_percentage}%
                      </span>
                    </div>
                    <Progress
                      value={stats?.compliance_percentage || 0}
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {stats?.compliant_records || 0}
                      </div>
                      <div className="text-gray-600">Compliant</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {(stats?.total_records || 0) - (stats?.compliant_records || 0)}
                      </div>
                      <div className="text-gray-600">Non-Compliant</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceReport?.overdue.slice(0, 3).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                    >
                      <div>
                        <div className="font-medium text-red-800">
                          {record.user_details.full_name}
                        </div>
                        <div className="text-sm text-red-600">
                          {record.program_details.name}
                        </div>
                        <div className="text-xs text-red-500">
                          Overdue: {record.required_by_date}
                        </div>
                      </div>
                      <Badge className="bg-red-600 text-white">
                        OVERDUE
                      </Badge>
                    </div>
                  ))}
                  
                  {complianceReport?.expiring_soon.slice(0, 2).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 border border-yellow-200 rounded-lg bg-yellow-50"
                    >
                      <div>
                        <div className="font-medium text-yellow-800">
                          {record.user_details.full_name}
                        </div>
                        <div className="text-sm text-yellow-600">
                          {record.program_details.name}
                        </div>
                        <div className="text-xs text-yellow-500">
                          Expires in {record.days_until_expiry} days
                        </div>
                      </div>
                      <Badge className="bg-yellow-600 text-white">
                        EXPIRING
                      </Badge>
                    </div>
                  ))}
                  
                  {(!complianceReport?.overdue.length && !complianceReport?.expiring_soon.length) && (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No critical alerts at this time
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>Training Records</CardTitle>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Compliance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Compliance</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="expiring-only"
                    checked={showExpiringOnly}
                    onChange={(e) => setShowExpiringOnly(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="expiring-only" className="text-sm">
                    Expiring Only
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-blue-600">
                            {record.certificate_number || 'No Certificate'}
                          </span>
                          <Badge
                            className={`${getProgressStatusColor(record.progress_status)} text-white`}
                          >
                            {record.progress_status.replace("_", " ").toUpperCase()}
                          </Badge>
                          <Badge
                            className={`${getComplianceStatusColor(record.compliance_status)} text-white`}
                          >
                            {record.compliance_status.replace("_", " ").toUpperCase()}
                          </Badge>
                          {record.is_mandatory_for_role && (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-600"
                            >
                              MANDATORY
                            </Badge>
                          )}
                          {getPriorityLevel(record) === 'critical' && (
                            <Badge className="bg-red-700 text-white">
                              CRITICAL
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-medium text-lg mb-1">
                          {record.program_details.name}
                        </h3>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {record.user_details.full_name} ({record.user_details.role})
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Progress: {record.completion_percentage_display}
                          </div>
                          {record.best_score && (
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              Best Score: {record.best_score}%
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Time: {record.time_spent_formatted}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-500">
                              Modules: {record.modules_completed}/{record.total_modules}
                            </span>
                            <span className="text-xs text-gray-500">
                              {record.overall_progress_percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={record.overall_progress_percentage}
                            className="h-2"
                          />
                        </div>

                        {/* Dates and Deadlines */}
                        <div className="flex items-center gap-6 text-xs text-gray-500">
                          {record.started_at && (
                            <span>Started: {new Date(record.started_at).toLocaleDateString()}</span>
                          )}
                          {record.completed_at && (
                            <span>Completed: {new Date(record.completed_at).toLocaleDateString()}</span>
                          )}
                          {record.required_by_date && (
                            <span className={record.is_overdue ? 'text-red-600 font-medium' : ''}>
                              Due: {new Date(record.required_by_date).toLocaleDateString()}
                            </span>
                          )}
                          {record.certificate_expires_at && (
                            <span className={record.days_until_expiry && record.days_until_expiry <= 30 ? 'text-yellow-600 font-medium' : ''}>
                              Expires: {new Date(record.certificate_expires_at).toLocaleDateString()}
                              {record.days_until_expiry !== undefined && ` (${record.days_until_expiry} days)`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        
                        {record.progress_status === 'in_progress' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Continue
                          </Button>
                        )}
                        
                        {record.compliance_status === 'overdue' && (
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowExtensionModal(true);
                            }}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Extend
                          </Button>
                        )}
                        
                        {record.is_due_for_renewal && (
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renew
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredRecords.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No training records found</p>
                    <p className="text-sm">Try adjusting your filters or search terms</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Module Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRecords
                  .filter(record => record.progress_status === 'in_progress')
                  .map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-lg">
                              {record.user_details.full_name}
                            </h3>
                            <Badge className="bg-blue-600 text-white">
                              {record.progress_status.toUpperCase()}
                            </Badge>
                          </div>

                          <p className="text-gray-600 mb-3">
                            {record.program_details.name}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              Progress: {record.completion_percentage_display}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Time Spent: {record.time_spent_formatted}
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              Modules: {record.modules_completed}/{record.total_modules}
                            </div>
                          </div>

                          <Progress
                            value={record.overall_progress_percentage}
                            className="h-2 mb-2"
                          />

                          {record.next_incomplete_module && (
                            <div className="text-sm text-blue-600">
                              Next: {record.next_incomplete_module.title} ({record.next_incomplete_module.module_type})
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Progress
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Continue Training
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {filteredRecords.filter(record => record.progress_status === 'in_progress').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No active training sessions</p>
                    <p className="text-sm">All assigned training has been completed or not yet started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="space-y-6">
            {/* Compliance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Expiring Soon</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {complianceReport?.summary.expiring_soon_count || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">
                        {complianceReport?.summary.overdue_count || 0}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Compliance Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {complianceReport?.summary.compliance_percentage || 0}%
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Critical Compliance Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceReport?.overdue.map((record) => (
                    <div key={record.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-red-800">
                              {record.user_details.full_name}
                            </span>
                            <Badge className="bg-red-600 text-white">
                              OVERDUE
                            </Badge>
                            {record.is_mandatory_for_role && (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                MANDATORY
                              </Badge>
                            )}
                          </div>

                          <h3 className="font-medium text-red-800 mb-1">
                            {record.program_details.name}
                          </h3>

                          <div className="flex items-center gap-6 text-sm text-red-600">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {record.user_details.role}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {new Date(record.required_by_date || '').toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              Progress: {record.completion_percentage_display}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowExtensionModal(true);
                            }}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Extend Deadline
                          </Button>
                          <Button variant="outline" size="sm">
                            <Bell className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Expiring Soon */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Expiring Soon (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceReport?.expiring_soon.map((record) => (
                    <div key={record.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-yellow-800">
                              {record.user_details.full_name}
                            </span>
                            <Badge className="bg-yellow-600 text-white">
                              EXPIRING SOON
                            </Badge>
                          </div>

                          <h3 className="font-medium text-yellow-800 mb-1">
                            {record.program_details.name}
                          </h3>

                          <div className="flex items-center gap-6 text-sm text-yellow-600">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {record.user_details.role}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Expires: {new Date(record.certificate_expires_at || '').toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {record.days_until_expiry} days remaining
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Schedule Renewal
                          </Button>
                          <Button variant="outline" size="sm">
                            <Bell className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* All Clear Message */}
            {(!complianceReport?.overdue.length && !complianceReport?.expiring_soon.length) && (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold text-green-800 mb-2">
                    All Training Compliance Up to Date
                  </h3>
                  <p className="text-gray-600">
                    No immediate compliance issues requiring attention.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Training Record Details</DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="border-b pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold">{selectedRecord.program_details.name}</h2>
                  <Badge className={`${getProgressStatusColor(selectedRecord.progress_status)} text-white`}>
                    {selectedRecord.progress_status.replace("_", " ").toUpperCase()}
                  </Badge>
                  <Badge className={`${getComplianceStatusColor(selectedRecord.compliance_status)} text-white`}>
                    {selectedRecord.compliance_status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                <p className="text-gray-600">{selectedRecord.user_details.full_name} ({selectedRecord.user_details.role})</p>
              </div>

              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedRecord.completion_percentage_display}
                  </div>
                  <div className="text-sm text-gray-600">Progress</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedRecord.modules_completed}/{selectedRecord.total_modules}
                  </div>
                  <div className="text-sm text-gray-600">Modules</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedRecord.time_spent_formatted}
                  </div>
                  <div className="text-sm text-gray-600">Time Spent</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-gray-600">{selectedRecord.completion_percentage_display}</span>
                </div>
                <Progress value={selectedRecord.overall_progress_percentage} className="h-3" />
              </div>

              {/* Key Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Training Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span>{selectedRecord.program_details.category.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Method:</span>
                      <span className="capitalize">{selectedRecord.program_details.delivery_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span>{selectedRecord.program_details.duration_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passing Score:</span>
                      <span>{selectedRecord.program_details.passing_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mandatory:</span>
                      <span>{selectedRecord.is_mandatory_for_role ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Progress & Dates</h3>
                  <div className="space-y-2 text-sm">
                    {selectedRecord.started_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span>{new Date(selectedRecord.started_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedRecord.last_accessed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Accessed:</span>
                        <span>{new Date(selectedRecord.last_accessed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedRecord.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span>{new Date(selectedRecord.completed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedRecord.required_by_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Required By:</span>
                        <span className={selectedRecord.is_overdue ? 'text-red-600 font-medium' : ''}>
                          {new Date(selectedRecord.required_by_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedRecord.certificate_expires_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expires:</span>
                        <span className={selectedRecord.days_until_expiry && selectedRecord.days_until_expiry <= 30 ? 'text-yellow-600 font-medium' : ''}>
                          {new Date(selectedRecord.certificate_expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Scores */}
              {(selectedRecord.best_score || selectedRecord.latest_score) && (
                <div>
                  <h3 className="font-semibold mb-3">Assessment Scores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRecord.best_score && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{selectedRecord.best_score}%</div>
                        <div className="text-xs text-gray-600">Best Score</div>
                      </div>
                    )}
                    {selectedRecord.latest_score && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{selectedRecord.latest_score}%</div>
                        <div className="text-xs text-gray-600">Latest Score</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Next Module */}
              {selectedRecord.next_incomplete_module && (
                <div>
                  <h3 className="font-semibold mb-3">Next Module</h3>
                  <div className="border rounded-lg p-3 bg-blue-50">
                    <div className="font-medium">{selectedRecord.next_incomplete_module.title}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {selectedRecord.next_incomplete_module.module_type} • 
                      {selectedRecord.next_incomplete_module.estimated_duration_minutes} minutes
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
                {selectedRecord.progress_status === 'in_progress' && (
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Continue Training
                  </Button>
                )}
                {selectedRecord.certificate_issued && (
                  <Button variant="outline">
                    View Certificate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Extension Modal */}
      <Dialog open={showExtensionModal} onOpenChange={setShowExtensionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Training Deadline</DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Training Program:</p>
                <p className="font-medium">{selectedRecord.program_details.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Employee:</p>
                <p className="font-medium">{selectedRecord.user_details.full_name}</p>
              </div>

              <div>
                <Label htmlFor="extension-days">Extension Days</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select extension period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="extension-reason">Reason for Extension</Label>
                <Textarea
                  id="extension-reason"
                  placeholder="Provide a reason for the deadline extension..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowExtensionModal(false)}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Extend Deadline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

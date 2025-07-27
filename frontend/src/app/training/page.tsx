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

interface TrainingRecord {
  id: string;
  employee: {
    username: string;
    email: string;
    role: string;
  };
  program: TrainingProgram;
  completed_at: string;
  score: number;
  passed: boolean;
  certificate_number: string;
  certificate_expires_at?: string;
  status: "valid" | "expired" | "expiring_soon";
}

interface TrainingSession {
  id: string;
  program: TrainingProgram;
  session_name: string;
  instructor: {
    username: string;
  };
  scheduled_date: string;
  duration_hours: number;
  location: string;
  max_participants: number;
  enrolled_count: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

interface ComplianceStatus {
  employee: {
    username: string;
    email: string;
    role: string;
  };
  requirement: {
    name: string;
    deadline_days: number;
  };
  status: "compliant" | "non_compliant" | "pending" | "overdue";
  due_date: string;
}

interface TrainingStats {
  total_employees: number;
  compliance_rate: number;
  active_sessions: number;
  certificates_expiring: number;
  completed_this_month: number;
}

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [compliance, setCompliance] = useState<ComplianceStatus[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock API calls - replace with actual API
      const mockStats: TrainingStats = {
        total_employees: 156,
        compliance_rate: 87,
        active_sessions: 8,
        certificates_expiring: 12,
        completed_this_month: 34,
      };

      const mockRecords: TrainingRecord[] = [
        {
          id: "1",
          employee: {
            username: "john.doe",
            email: "john@company.com",
            role: "Driver",
          },
          program: {
            id: "1",
            name: "Hazardous Materials Handling",
            category: { name: "Safety", is_mandatory: true },
            delivery_method: "classroom",
            difficulty_level: "intermediate",
            duration_hours: 8,
            is_mandatory: true,
            passing_score: 80,
            certificate_validity_months: 12,
          },
          completed_at: "2024-01-15T10:00:00Z",
          score: 92,
          passed: true,
          certificate_number: "CERT-2024-0001",
          certificate_expires_at: "2025-01-15T10:00:00Z",
          status: "valid",
        },
        {
          id: "2",
          employee: {
            username: "jane.smith",
            email: "jane@company.com",
            role: "Safety Manager",
          },
          program: {
            id: "2",
            name: "Emergency Response Procedures",
            category: { name: "Emergency", is_mandatory: true },
            delivery_method: "hands_on",
            difficulty_level: "advanced",
            duration_hours: 16,
            is_mandatory: true,
            passing_score: 85,
            certificate_validity_months: 24,
          },
          completed_at: "2023-12-10T14:00:00Z",
          score: 95,
          passed: true,
          certificate_number: "CERT-2023-0089",
          certificate_expires_at: "2025-12-10T14:00:00Z",
          status: "valid",
        },
      ];

      const mockSessions: TrainingSession[] = [
        {
          id: "1",
          program: mockRecords[0].program,
          session_name: "Q1 Hazmat Training",
          instructor: { username: "instructor.wilson" },
          scheduled_date: "2024-02-15T09:00:00Z",
          duration_hours: 8,
          location: "Training Room A",
          max_participants: 20,
          enrolled_count: 15,
          status: "scheduled",
        },
      ];

      const mockCompliance: ComplianceStatus[] = [
        {
          employee: {
            username: "mike.johnson",
            email: "mike@company.com",
            role: "Warehouse Operator",
          },
          requirement: {
            name: "Basic Safety Training",
            deadline_days: 30,
          },
          status: "overdue",
          due_date: "2024-01-10",
        },
      ];

      setStats(mockStats);
      setRecords(mockRecords);
      setSessions(mockSessions);
      setCompliance(mockCompliance);
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-500";
      case "expiring_soon":
        return "bg-yellow-500";
      case "expired":
        return "bg-red-500";
      case "compliant":
        return "bg-green-500";
      case "non_compliant":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      case "scheduled":
        return "bg-blue-500";
      case "in_progress":
        return "bg-yellow-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

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
            Training Management
          </h1>
          <p className="text-gray-600">
            Manage training programs and track compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            Programs
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{stats.total_employees}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.compliance_rate}%
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
                  <p className="text-sm text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.active_sessions}
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
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.certificates_expiring}
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
                  <p className="text-sm text-gray-600">Completed (Month)</p>
                  <p className="text-2xl font-bold">
                    {stats.completed_this_month}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
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
                        {stats?.compliance_rate}%
                      </span>
                    </div>
                    <Progress
                      value={stats?.compliance_rate || 0}
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(
                          ((stats?.total_employees || 0) *
                            (stats?.compliance_rate || 0)) /
                            100,
                        )}
                      </div>
                      <div className="text-gray-600">Compliant</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {(stats?.total_employees || 0) -
                          Math.round(
                            ((stats?.total_employees || 0) *
                              (stats?.compliance_rate || 0)) /
                              100,
                          )}
                      </div>
                      <div className="text-gray-600">Non-Compliant</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {session.session_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {session.program.name} • {session.location}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(
                            session.scheduled_date,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {session.enrolled_count}/{session.max_participants}
                        </div>
                        <Badge
                          className={`${getStatusColor(session.status)} text-white text-xs`}
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>Training Records</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-blue-600">
                            {record.certificate_number}
                          </span>
                          <Badge
                            className={`${getStatusColor(record.status)} text-white`}
                          >
                            {record.status.replace("_", " ").toUpperCase()}
                          </Badge>
                          {record.program.is_mandatory && (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-600"
                            >
                              MANDATORY
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-medium text-lg mb-1">
                          {record.program.name}
                        </h3>
                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {record.employee.username} ({record.employee.role})
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            Score: {record.score}%
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Completed:{" "}
                            {new Date(record.completed_at).toLocaleDateString()}
                          </div>
                          {record.certificate_expires_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Expires:{" "}
                              {new Date(
                                record.certificate_expires_at,
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Certificate
                        </Button>
                        {record.status === "expired" && (
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Renew
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Training Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-lg">
                            {session.session_name}
                          </h3>
                          <Badge
                            className={`${getStatusColor(session.status)} text-white`}
                          >
                            {session.status.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-gray-600 mb-3">
                          {session.program.name}
                        </p>

                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            Instructor: {session.instructor.username}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(
                              session.scheduled_date,
                            ).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {session.duration_hours}h
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {session.enrolled_count}/{session.max_participants}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        {session.status === "scheduled" && (
                          <Button size="sm">Manage Enrollment</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {compliance.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">
                            {item.employee.username}
                          </span>
                          <Badge
                            className={`${getStatusColor(item.status)} text-white`}
                          >
                            {item.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-gray-600 mb-2">
                          {item.requirement.name}
                        </p>

                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {item.employee.role}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Requirements
                        </Button>
                        {item.status === "overdue" && (
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Urgent Action
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

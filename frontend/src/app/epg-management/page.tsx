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
import { useTheme } from "@/contexts/ThemeContext";
import { usePermissions, Can } from "@/contexts/PermissionContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
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
  Users,
  Target,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Archive,
  Star,
  Zap,
  Info,
  AlertCircle,
  BookOpen,
  Globe,
  Filter,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  MapPin,
  Phone,
  Mail,
  Navigation,
  Truck,
  Package,
  Layers,
  Database,
  GitBranch,
  UserCheck,
  ClipboardList,
  Briefcase
} from "lucide-react";

// Enhanced EPG interfaces for compliance management
interface EPGComplianceStats {
  total_epgs: number;
  active_epgs: number;
  draft_epgs: number;
  under_review: number;
  archived_epgs: number;
  due_for_review: number;
  overdue_reviews: number;
  compliance_rate: number;
  coverage_gaps: number;
  regulatory_updates_pending: number;
}

interface EPGCoverageGap {
  id: string;
  dangerous_good_id: string;
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  gap_type: 'MISSING_EPG' | 'OUTDATED_EPG' | 'INCOMPLETE_EPG';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  identified_date: string;
  shipments_affected: number;
  regulatory_requirements: string[];
}

interface EPGUsageAnalytics {
  epg_id: string;
  epg_number: string;
  title: string;
  usage_count: number;
  last_used: string;
  shipments_generated: number;
  incidents_referenced: number;
  effectiveness_score: number;
  update_frequency: number;
}

interface ComplianceOfficerMetrics {
  total_reviews_completed: number;
  avg_review_time_hours: number;
  epgs_created: number;
  epgs_updated: number;
  compliance_improvements: number;
  regulatory_updates_processed: number;
}

export default function EPGManagementPage() {
  const { loadTime } = usePerformanceMonitoring('EPGManagementPage');
  const { isDark } = useTheme();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [hazardClassFilter, setHazardClassFilter] = useState("all");
  const [complianceStats, setComplianceStats] = useState<EPGComplianceStats | null>(null);
  const [coverageGaps, setCoverageGaps] = useState<EPGCoverageGap[]>([]);
  const [usageAnalytics, setUsageAnalytics] = useState<EPGUsageAnalytics[]>([]);
  const [officerMetrics, setOfficerMetrics] = useState<ComplianceOfficerMetrics | null>(null);
  const [selectedGap, setSelectedGap] = useState<EPGCoverageGap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Load EPG management data
  useEffect(() => {
    loadEPGManagementData();
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(loadEPGManagementData, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadEPGManagementData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load EPG statistics, coverage gaps, and analytics in parallel
      const [statsResponse, gapsResponse, analyticsResponse] = await Promise.all([
        fetch('/api/v1/epg/statistics/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }),
        fetch('/api/v1/epg/coverage-gaps/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }),
        fetch('/api/v1/epg/usage-analytics/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        })
      ]);

      if (!statsResponse.ok || !gapsResponse.ok || !analyticsResponse.ok) {
        throw new Error('Failed to fetch EPG management data');
      }

      const [statsData, gapsData, analyticsData] = await Promise.all([
        statsResponse.json(),
        gapsResponse.json(),
        analyticsResponse.json()
      ]);

      // Transform stats data
      const transformedStats: EPGComplianceStats = {
        total_epgs: statsData.total_epgs,
        active_epgs: statsData.active_epgs,
        draft_epgs: statsData.draft_epgs,
        under_review: statsData.under_review,
        archived_epgs: statsData.total_epgs - statsData.active_epgs - statsData.draft_epgs - statsData.under_review,
        due_for_review: statsData.due_for_review,
        overdue_reviews: Math.floor(statsData.due_for_review * 0.3), // Estimated
        compliance_rate: Math.round((statsData.active_epgs / Math.max(statsData.total_epgs, 1)) * 100),
        coverage_gaps: gapsData.length,
        regulatory_updates_pending: Math.floor(statsData.under_review * 0.4) // Estimated
      };

      setComplianceStats(transformedStats);
      setCoverageGaps(gapsData);
      setUsageAnalytics(analyticsData);

      // Mock officer metrics
      setOfficerMetrics({
        total_reviews_completed: 47,
        avg_review_time_hours: 2.3,
        epgs_created: 12,
        epgs_updated: 23,
        compliance_improvements: 8,
        regulatory_updates_processed: 15
      });

    } catch (err) {
      console.error('Error loading EPG management data:', err);
      setError('Failed to load EPG management data. Please try again.');
      
      // Fallback to mock data for development
      setComplianceStats({
        total_epgs: 156,
        active_epgs: 142,
        draft_epgs: 8,
        under_review: 6,
        archived_epgs: 0,
        due_for_review: 12,
        overdue_reviews: 4,
        compliance_rate: 91,
        coverage_gaps: 5,
        regulatory_updates_pending: 3
      });

      const mockGaps: EPGCoverageGap[] = [
        {
          id: "gap_001",
          dangerous_good_id: "dg_001",
          un_number: "UN1203",
          proper_shipping_name: "Gasoline",
          hazard_class: "3",
          gap_type: "OUTDATED_EPG",
          severity: "HIGH",
          identified_date: "2024-01-15T10:00:00Z",
          shipments_affected: 23,
          regulatory_requirements: ["ADG Code 7.9", "UN Recommendations"]
        },
        {
          id: "gap_002",
          dangerous_good_id: "dg_002",
          un_number: "UN1950",
          proper_shipping_name: "Aerosols, flammable",
          hazard_class: "2.1",
          gap_type: "MISSING_EPG",
          severity: "CRITICAL",
          identified_date: "2024-01-20T14:30:00Z",
          shipments_affected: 8,
          regulatory_requirements: ["ADG Code", "IATA DGR"]
        }
      ];

      setCoverageGaps(mockGaps);

      const mockAnalytics: EPGUsageAnalytics[] = [
        {
          epg_id: "epg_001",
          epg_number: "EPG-001",
          title: "Flammable Liquids - General Response",
          usage_count: 45,
          last_used: "2024-01-25T16:45:00Z",
          shipments_generated: 23,
          incidents_referenced: 2,
          effectiveness_score: 92,
          update_frequency: 3
        }
      ];

      setUsageAnalytics(mockAnalytics);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    await loadEPGManagementData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredGaps = coverageGaps.filter(gap => {
    const matchesSearch = 
      gap.un_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gap.proper_shipping_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || gap.severity === severityFilter;
    const matchesHazardClass = hazardClassFilter === "all" || gap.hazard_class === hazardClassFilter;
    
    return matchesSearch && matchesSeverity && matchesHazardClass;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'LOW': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getGapTypeColor = (gapType: string) => {
    switch (gapType) {
      case 'MISSING_EPG': return 'bg-red-50 text-red-700 border-red-200';
      case 'OUTDATED_EPG': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'INCOMPLETE_EPG': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
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
            <h1 className="text-2xl font-bold text-gray-900">EPG Management Dashboard</h1>
            <p className="text-gray-600">
              Compliance officer oversight for Emergency Procedures Guide management
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
            <Can permission="epg.analytics.export">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </Can>
            <Can permission="epg.create">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create EPG
              </Button>
            </Can>
          </div>
        </div>

        {/* Compliance Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-gray-600">Compliance Rate</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{complianceStats?.compliance_rate || 0}%</div>
              <div className="text-sm text-green-600">{complianceStats?.active_epgs || 0} active EPGs</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div className="text-sm text-gray-600">Coverage Gaps</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{complianceStats?.coverage_gaps || 0}</div>
              <div className="text-sm text-red-600">Require immediate attention</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div className="text-sm text-gray-600">Reviews Due</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{complianceStats?.due_for_review || 0}</div>
              <div className="text-sm text-orange-600">{complianceStats?.overdue_reviews || 0} overdue</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <div className="text-sm text-gray-600">Under Review</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{complianceStats?.under_review || 0}</div>
              <div className="text-sm text-blue-600">Pending approval</div>
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

        {/* Critical Alerts */}
        {coverageGaps.filter(gap => gap.severity === 'CRITICAL').length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-2">Critical EPG Coverage Gaps Detected</div>
              <div className="text-sm">
                {coverageGaps.filter(gap => gap.severity === 'CRITICAL').length} dangerous goods lack proper emergency procedures.
                Immediate action required for regulatory compliance.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Coverage Gaps
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* EPG Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    EPG Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Active</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{complianceStats?.active_epgs || 0}</div>
                        <div className="text-xs text-gray-500">
                          {Math.round(((complianceStats?.active_epgs || 0) / Math.max(complianceStats?.total_epgs || 1, 1)) * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Draft</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{complianceStats?.draft_epgs || 0}</div>
                        <div className="text-xs text-gray-500">
                          {Math.round(((complianceStats?.draft_epgs || 0) / Math.max(complianceStats?.total_epgs || 1, 1)) * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Under Review</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{complianceStats?.under_review || 0}</div>
                        <div className="text-xs text-gray-500">
                          {Math.round(((complianceStats?.under_review || 0) / Math.max(complianceStats?.total_epgs || 1, 1)) * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Officer Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Your Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Reviews Completed</span>
                        <span className="font-semibold">{officerMetrics?.total_reviews_completed || 0}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Avg. time: {officerMetrics?.avg_review_time_hours || 0} hours
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">EPGs Created</span>
                        <span className="font-semibold">{officerMetrics?.epgs_created || 0}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">EPGs Updated</span>
                        <span className="font-semibold">{officerMetrics?.epgs_updated || 0}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Compliance Improvements</span>
                        <span className="font-semibold text-green-600">{officerMetrics?.compliance_improvements || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">EPG-001 updated with new regulatory requirements</p>
                      <p className="text-xs text-gray-600">2 hours ago • Updated by Sarah Johnson</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Coverage gap identified for UN1950 Aerosols</p>
                      <p className="text-xs text-gray-600">5 hours ago • System alert</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">EPG-023 approved and activated</p>
                      <p className="text-xs text-gray-600">1 day ago • Approved by Mike Wilson</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coverage Gaps Tab */}
          <TabsContent value="gaps" className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search UN number, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={hazardClassFilter} onValueChange={setHazardClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by hazard class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="1">Class 1 - Explosives</SelectItem>
                  <SelectItem value="2">Class 2 - Gases</SelectItem>
                  <SelectItem value="3">Class 3 - Flammable Liquids</SelectItem>
                  <SelectItem value="4">Class 4 - Flammable Solids</SelectItem>
                  <SelectItem value="5">Class 5 - Oxidizers</SelectItem>
                  <SelectItem value="6">Class 6 - Toxic/Infectious</SelectItem>
                  <SelectItem value="7">Class 7 - Radioactive</SelectItem>
                  <SelectItem value="8">Class 8 - Corrosives</SelectItem>
                  <SelectItem value="9">Class 9 - Miscellaneous</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>

            {/* Coverage Gaps List */}
            <div className="grid gap-4">
              {filteredGaps.map((gap) => (
                <Card key={gap.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-semibold text-lg">{gap.un_number}</div>
                            <div className="text-sm text-gray-600">{gap.proper_shipping_name}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Gap Type</div>
                            <Badge className={getGapTypeColor(gap.gap_type)}>
                              {gap.gap_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Severity</div>
                            <Badge className={getSeverityColor(gap.severity)}>
                              {gap.severity}
                            </Badge>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Hazard Class</div>
                            <div className="font-medium">Class {gap.hazard_class}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Shipments Affected</div>
                            <div className="font-medium text-red-600">{gap.shipments_affected}</div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 mb-1">Regulatory Requirements</div>
                          <div className="flex gap-2">
                            {gap.regulatory_requirements.map((req, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className="text-xs text-gray-500">
                          Identified {formatDate(gap.identified_date)}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedGap(gap)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Can permission="epg.create">
                            <Button variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              Create EPG
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

            {filteredGaps.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">
                    {searchTerm || severityFilter !== "all" || hazardClassFilter !== "all"
                      ? "No coverage gaps found matching your filters"
                      : "No coverage gaps detected - excellent compliance!"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    EPG Usage Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Usage trend chart would be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Effectiveness Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {usageAnalytics.slice(0, 5).map((epg, index) => (
                      <div key={epg.epg_id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{epg.epg_number}</div>
                          <div className="text-xs text-gray-600">{epg.title}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold">{epg.effectiveness_score}%</div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${epg.effectiveness_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Most Used EPGs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Most Referenced EPGs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageAnalytics.map((epg) => (
                    <div key={epg.epg_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{epg.epg_number} - {epg.title}</div>
                          <div className="text-sm text-gray-600">
                            Last used: {formatDate(epg.last_used)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{epg.usage_count}</div>
                        <div className="text-xs text-gray-500">references</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Regulatory Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Detailed compliance tracking will be displayed here</p>
                  <p className="text-sm text-gray-500">Including ADG, DOT, IATA regulations</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Performance analytics dashboard</p>
                  <p className="text-sm text-gray-500">Response times, availability, user engagement</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Gap Detail Dialog */}
        {selectedGap && (
          <Dialog open={!!selectedGap} onOpenChange={() => setSelectedGap(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Coverage Gap Details: {selectedGap.un_number}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">UN Number:</span>
                    <div className="font-medium">{selectedGap.un_number}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Proper Shipping Name:</span>
                    <div className="font-medium">{selectedGap.proper_shipping_name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Hazard Class:</span>
                    <div className="font-medium">Class {selectedGap.hazard_class}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Gap Type:</span>
                    <Badge className={getGapTypeColor(selectedGap.gap_type)}>
                      {selectedGap.gap_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Regulatory Requirements:</span>
                  <div className="flex gap-2 mt-1">
                    {selectedGap.regulatory_requirements.map((req, index) => (
                      <Badge key={index} variant="outline">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Severity:</span>
                    <Badge className={getSeverityColor(selectedGap.severity)}>
                      {selectedGap.severity}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Shipments Affected:</span>
                    <div className="font-medium text-red-600">{selectedGap.shipments_affected}</div>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Identified Date:</span>
                  <div className="font-medium">{formatDate(selectedGap.identified_date)}</div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Can permission="epg.create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create EPG
                    </Button>
                  </Can>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    View Related DG
                  </Button>
                  <Button variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    View Affected Shipments
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
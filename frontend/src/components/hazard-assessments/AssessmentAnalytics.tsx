"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { usePermissions } from '@/contexts/PermissionContext';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

interface AssessmentAnalyticsProps {
  analytics?: any;
  onRefresh?: () => void;
}

export function AssessmentAnalytics({ analytics, onRefresh }: AssessmentAnalyticsProps) {
  const { can } = usePermissions();
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedTemplate, setSelectedTemplate] = useState('all');

  // Mock analytics data - in real implementation, this would come from the API
  const mockAnalytics = {
    overview: {
      total_assessments: 1247,
      completed_assessments: 1156,
      failed_assessments: 89,
      pending_overrides: 12,
      average_completion_time: '8.5 minutes',
      completion_rate: 92.7,
      failure_rate: 7.1,
      override_approval_rate: 85.4
    },
    trends: {
      assessments_trend: '+12%',
      completion_rate_trend: '+3.2%',
      failure_rate_trend: '-1.8%',
      average_time_trend: '-2.1%'
    },
    by_template: [
      { name: 'Pre-Transport Safety Check', count: 456, pass_rate: 94.3, avg_time: '7.2 min' },
      { name: 'Loading Dock Assessment', count: 334, pass_rate: 89.1, avg_time: '12.4 min' },
      { name: 'Vehicle Inspection', count: 287, pass_rate: 96.2, avg_time: '5.8 min' },
      { name: 'Emergency Response Drill', count: 170, pass_rate: 88.8, avg_time: '15.3 min' }
    ],
    by_user: [
      { name: 'John Driver', assessments: 89, pass_rate: 96.6, avg_time: '6.2 min' },
      { name: 'Sarah Transport', assessments: 76, pass_rate: 92.1, avg_time: '8.1 min' },
      { name: 'Mike Safety', assessments: 71, pass_rate: 94.4, avg_time: '7.5 min' },
      { name: 'Lisa Field', assessments: 65, pass_rate: 90.8, avg_time: '9.3 min' }
    ],
    common_failures: [
      { question: 'Are all emergency equipment items present?', failure_count: 34, failure_rate: 12.3 },
      { question: 'Is the vehicle documentation complete?', failure_count: 28, failure_rate: 10.1 },
      { question: 'Are safety placards properly displayed?', failure_count: 22, failure_rate: 8.9 },
      { question: 'Is protective equipment available?', failure_count: 19, failure_rate: 7.2 }
    ],
    time_analysis: {
      suspicious_completions: 23,
      average_time_by_hour: [
        { hour: '06:00', avg_time: 12.3, count: 45 },
        { hour: '08:00', avg_time: 8.7, count: 78 },
        { hour: '10:00', avg_time: 9.2, count: 89 },
        { hour: '12:00', avg_time: 7.8, count: 112 },
        { hour: '14:00', avg_time: 8.9, count: 98 },
        { hour: '16:00', avg_time: 10.1, count: 87 },
        { hour: '18:00', avg_time: 11.4, count: 56 }
      ]
    }
  };

  const data = analytics || mockAnalytics;

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    trend, 
    color = "text-gray-600" 
  }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="text-right">
            <Icon className={`h-8 w-8 ${color}`} />
            {trend && (
              <div className="flex items-center mt-2">
                {trend.startsWith('+') ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={`text-xs ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {trend}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              <SelectItem value="pre-transport">Pre-Transport Safety Check</SelectItem>
              <SelectItem value="loading-dock">Loading Dock Assessment</SelectItem>
              <SelectItem value="vehicle">Vehicle Inspection</SelectItem>
              <SelectItem value="emergency">Emergency Response Drill</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          {can('hazard.analytics.export') && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              title="Total Assessments"
              value={data.overview.total_assessments.toLocaleString()}
              subtitle={`${timeRange} period`}
              trend={data.trends.assessments_trend}
            />
            <StatCard
              icon={CheckCircle}
              title="Completion Rate"
              value={`${data.overview.completion_rate}%`}
              subtitle={`${data.overview.completed_assessments} completed`}
              trend={data.trends.completion_rate_trend}
              color="text-green-600"
            />
            <StatCard
              icon={AlertTriangle}
              title="Failure Rate"
              value={`${data.overview.failure_rate}%`}
              subtitle={`${data.overview.failed_assessments} failed`}
              trend={data.trends.failure_rate_trend}
              color="text-red-600"
            />
            <StatCard
              icon={Clock}
              title="Avg. Time"
              value={data.overview.average_completion_time}
              subtitle="Per assessment"
              trend={data.trends.average_time_trend}
              color="text-blue-600"
            />
          </div>

          {/* Template Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance by Template
              </CardTitle>
              <CardDescription>
                Assessment completion rates and timing by template type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.by_template.map((template: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.count} assessments</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-medium">{template.pass_rate}%</p>
                        <p className="text-xs text-gray-500">Pass Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{template.avg_time}</p>
                        <p className="text-xs text-gray-500">Avg Time</p>
                      </div>
                      <Badge variant={template.pass_rate > 90 ? 'default' : 'secondary'}>
                        {template.pass_rate > 95 ? 'Excellent' : template.pass_rate > 90 ? 'Good' : 'Needs Attention'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* User Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performing Users
              </CardTitle>
              <CardDescription>
                Assessment performance by individual users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.by_user.map((user: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.assessments} assessments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-medium">{user.pass_rate}%</p>
                        <p className="text-xs text-gray-500">Pass Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{user.avg_time}</p>
                        <p className="text-xs text-gray-500">Avg Time</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Analysis
              </CardTitle>
              <CardDescription>
                Assessment timing patterns and anomaly detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-800">Suspicious Completions</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {data.time_analysis.suspicious_completions}
                        </p>
                        <p className="text-sm text-orange-600">Flagged for review</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">Peak Hours</p>
                        <p className="text-2xl font-bold text-blue-600">12:00-14:00</p>
                        <p className="text-sm text-blue-600">Most assessments</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Efficiency Trend</p>
                        <p className="text-2xl font-bold text-green-600">+5.2%</p>
                        <p className="text-sm text-green-600">Time improvement</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Common Failures */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Common Failure Points
              </CardTitle>
              <CardDescription>
                Questions with highest failure rates requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.common_failures.map((failure: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{failure.question}</h4>
                      <p className="text-sm text-gray-600">{failure.failure_count} failures</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-red-600">{failure.failure_rate}%</p>
                        <p className="text-xs text-gray-500">Failure Rate</p>
                      </div>
                      <Badge variant="destructive">
                        High Risk
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Override Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Override Management
              </CardTitle>
              <CardDescription>
                Override request patterns and approval rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{data.overview.pending_overrides}</p>
                  <p className="text-sm text-gray-600">Pending Overrides</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{data.overview.override_approval_rate}%</p>
                  <p className="text-sm text-gray-600">Approval Rate</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">2.3 hrs</p>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Assessment Trends
              </CardTitle>
              <CardDescription>
                Historical trends and performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Volume Trends</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">This Month</span>
                        <span className="text-sm font-medium text-green-600">+12% ↗</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Last Month</span>
                        <span className="text-sm font-medium text-green-600">+8% ↗</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Quarter</span>
                        <span className="text-sm font-medium text-green-600">+15% ↗</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Quality Trends</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Pass Rate</span>
                        <span className="text-sm font-medium text-green-600">+3.2% ↗</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Completion Time</span>
                        <span className="text-sm font-medium text-green-600">-2.1% ↗</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Override Rate</span>
                        <span className="text-sm font-medium text-red-600">+1.3% ↘</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
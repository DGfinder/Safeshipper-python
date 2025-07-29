"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Package,
  Star,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  MapPin,
  Truck
} from 'lucide-react';

interface FeedbackAnalytics {
  total_feedback_count: number;
  average_delivery_score: number;
  difot_rate: number;
  on_time_rate: number;
  complete_rate: number;
  professional_rate: number;
  excellent_count: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  trend_data: Array<{
    date: string;
    average_score: number;
    feedback_count: number;
    difot_rate: number;
  }>;
}

interface FilterOptions {
  period: '7d' | '30d' | '90d' | 'qtd';
  driver_id?: string;
  customer_id?: string;
  route_origin?: string;
  route_destination?: string;
  freight_type_id?: string;
}

interface FeedbackAnalyticsDashboardProps {
  companyId?: string;
}

const PERFORMANCE_COLORS = {
  excellent: '#22c55e',
  good: '#3b82f6',
  needs_improvement: '#f59e0b',
  poor: '#ef4444'
};

const FeedbackAnalyticsDashboard: React.FC<FeedbackAnalyticsDashboardProps> = ({
  companyId
}) => {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({ period: '30d' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock data for development
  const mockAnalytics: FeedbackAnalytics = {
    total_feedback_count: 1247,
    average_delivery_score: 87.3,
    difot_rate: 0.834,
    on_time_rate: 0.891,
    complete_rate: 0.923,
    professional_rate: 0.964,
    excellent_count: 543,
    good_count: 389,
    needs_improvement_count: 247,
    poor_count: 68,
    trend_data: [
      { date: '2024-01-01', average_score: 85.2, feedback_count: 42, difot_rate: 0.81 },
      { date: '2024-01-02', average_score: 87.1, feedback_count: 38, difot_rate: 0.84 },
      { date: '2024-01-03', average_score: 86.8, feedback_count: 45, difot_rate: 0.83 },
      { date: '2024-01-04', average_score: 88.5, feedback_count: 41, difot_rate: 0.86 },
      { date: '2024-01-05', average_score: 89.2, feedback_count: 39, difot_rate: 0.87 },
      { date: '2024-01-06', average_score: 87.9, feedback_count: 44, difot_rate: 0.85 },
      { date: '2024-01-07', average_score: 88.7, feedback_count: 43, difot_rate: 0.88 }
    ]
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For development, use mock data
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
        setAnalytics(mockAnalytics);
        setLastUpdated(new Date());
        return;
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await fetch(`/api/v1/shipments/analytics/?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      // Fallback to mock data on error
      setAnalytics(mockAnalytics);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
      queryParams.append('format', format);

      const response = await fetch(`/api/v1/shipments/feedback/export_data/?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 95) return 'default';
    if (score >= 85) return 'secondary';
    if (score >= 70) return 'outline';
    return 'destructive';
  };

  const performanceDistributionData = analytics ? [
    { name: 'Excellent (>95%)', value: analytics.excellent_count, color: PERFORMANCE_COLORS.excellent },
    { name: 'Good (85-94%)', value: analytics.good_count, color: PERFORMANCE_COLORS.good },
    { name: 'Needs Improvement (70-84%)', value: analytics.needs_improvement_count, color: PERFORMANCE_COLORS.needs_improvement },
    { name: 'Poor (<70%)', value: analytics.poor_count, color: PERFORMANCE_COLORS.poor }
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Failed to load feedback analytics. {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Customer feedback insights and delivery performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select
                value={filters.period}
                onValueChange={(value) => handleFilterChange('period', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="qtd">Quarter to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Route Origin</label>
              <Input
                placeholder="e.g., Sydney"
                value={filters.route_origin || ''}
                onChange={(e) => handleFilterChange('route_origin', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Route Destination</label>
              <Input
                placeholder="e.g., Melbourne"
                value={filters.route_destination || ''}
                onChange={(e) => handleFilterChange('route_destination', e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
            <Badge variant="outline" className="text-xs">
              {analytics.total_feedback_count} feedback responses
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(analytics.average_delivery_score)}`}>
                  {analytics.average_delivery_score.toFixed(1)}%
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">DIFOT Rate</p>
                <p className={`text-2xl font-bold ${getScoreColor(analytics.difot_rate * 100)}`}>
                  {(analytics.difot_rate * 100).toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On-Time Rate</p>
                <p className={`text-2xl font-bold ${getScoreColor(analytics.on_time_rate * 100)}`}>
                  {(analytics.on_time_rate * 100).toFixed(1)}%
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.total_feedback_count.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trend_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis yAxisId="score" domain={[0, 100]} />
                    <YAxis yAxisId="rate" orientation="right" domain={[0, 1]} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value, name) => [
                        name === 'difot_rate' ? `${(Number(value) * 100).toFixed(1)}%` : `${Number(value).toFixed(1)}%`,
                        name === 'average_score' ? 'Average Score' : 'DIFOT Rate'
                      ]}
                    />
                    <Legend />
                    <Line
                      yAxisId="score"
                      type="monotone"
                      dataKey="average_score"
                      stroke="#3b82f6"
                      name="Average Score"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="difot_rate"
                      stroke="#10b981"
                      name="DIFOT Rate"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceDistributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {performanceDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} responses`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  On-Time Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {(analytics.on_time_rate * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">
                  Deliveries completed on schedule
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Complete Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {(analytics.complete_rate * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">
                  Shipments delivered complete & undamaged
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Professional Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {(analytics.professional_rate * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">
                  Professional driver interactions
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackAnalyticsDashboard;
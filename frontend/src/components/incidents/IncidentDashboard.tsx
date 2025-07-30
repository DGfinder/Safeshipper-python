"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Zap,
  Shield,
  MapPin,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { incidentService } from '@/shared/services/incidentService';
import {
  IncidentStatistics,
  IncidentListItem,
} from '@/shared/types/incident';

interface DashboardProps {
  onViewIncident?: (incident: IncidentListItem) => void;
  onCreateIncident?: () => void;
}

export function IncidentDashboard({ onViewIncident, onCreateIncident }: DashboardProps) {
  const [stats, setStats] = useState<IncidentStatistics | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<IncidentListItem[]>([]);
  const [overdueIncidents, setOverdueIncidents] = useState<IncidentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, recentData, overdueData] = await Promise.all([
        incidentService.getStatistics(),
        incidentService.getIncidents({ ordering: '-reported_at' }),
        incidentService.getOverdueIncidents(),
      ]);

      setStats(statsData);
      setRecentIncidents(recentData.results.slice(0, 5)); // Top 5 recent
      setOverdueIncidents(overdueData.slice(0, 3)); // Top 3 overdue
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      reported: 'bg-blue-500',
      investigating: 'bg-yellow-500',
      resolved: 'bg-green-500',
      closed: 'bg-gray-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Incident Management Dashboard</h2>
          <p className="text-gray-600">Real-time overview of safety incidents and compliance status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onCreateIncident && (
            <Button onClick={onCreateIncident} className="bg-blue-600 hover:bg-blue-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Incidents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_incidents}</p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Open Incidents</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.open_incidents}</p>
                  <p className="text-xs text-gray-500">Requires attention</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Critical Priority</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical_incidents}</p>
                  <p className="text-xs text-gray-500">Immediate action</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved_incidents}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Avg Resolution</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.average_resolution_time.toFixed(1)}d
                  </p>
                  <p className="text-xs text-gray-500">Resolution time</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Recent Incidents
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
                onClick={() => {/* Navigate to full list */}}
              >
                View All <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent incidents</p>
                </div>
              ) : (
                recentIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onViewIncident?.(incident)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-blue-600 text-sm">
                          {incident.incident_number}
                        </span>
                        <Badge className={`${getPriorityColor(incident.priority)} text-white text-xs`}>
                          {incident.priority.toUpperCase()}
                        </Badge>
                        <Badge className={`${getStatusColor(incident.status)} text-white text-xs`}>
                          {incident.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm mb-1">{incident.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {incident.location}
                        </div>
                        <span>{new Date(incident.occurred_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {incident.is_overdue && (
                      <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                        <Zap className="h-3 w-3" />
                        Overdue
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Overdue Incidents */}
              {overdueIncidents.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-600 text-sm">
                      {overdueIncidents.length} Overdue Incidents
                    </span>
                  </div>
                  <div className="space-y-2">
                    {overdueIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="text-xs text-red-700 cursor-pointer hover:underline"
                        onClick={() => onViewIncident?.(incident)}
                      >
                        {incident.incident_number} - {incident.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regulatory Required */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-600 text-sm">
                    Regulatory Notifications
                  </span>
                </div>
                <p className="text-xs text-orange-700">
                  {stats?.critical_incidents || 0} incidents require regulatory notification
                </p>
              </div>

              {/* Environmental Impact */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-600 text-sm">
                    Environmental Impact
                  </span>
                </div>
                <p className="text-xs text-yellow-700">
                  Monitor incidents with environmental consequences
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* By Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.incidents_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                      <span className="text-sm capitalize">{status}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.incidents_by_priority).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority)}`} />
                      <span className="text-sm capitalize">{priority}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.incidents_by_type).slice(0, 5).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
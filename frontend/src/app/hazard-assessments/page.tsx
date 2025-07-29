"use client";

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin,
  Camera,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AssessmentDetailDialog } from '@/components/hazard-assessments/AssessmentDetailDialog';
import { AssessmentAnalytics } from '@/components/hazard-assessments/AssessmentAnalytics';
import { useHazardAssessments } from '@/hooks/useHazardAssessments';

export default function HazardAssessmentsPage() {
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [activeTab, setActiveTab] = useState('assessments');

  const { 
    assessments, 
    isLoading, 
    analytics,
    approveOverride,
    denyOverride 
  } = useHazardAssessments({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined
  });

  // Check permissions
  if (!can('hazard.assessment.view')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view hazard assessments.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string, overallResult?: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant={overallResult === 'FAIL' ? 'destructive' : 'default'} className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {overallResult === 'FAIL' ? 'Failed' : 'Completed'}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case 'OVERRIDE_REQUESTED':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-orange-300 text-orange-700">
            <AlertTriangle className="h-3 w-3" />
            Override Requested
          </Badge>
        );
      case 'OVERRIDE_APPROVED':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-green-300 text-green-700">
            <CheckCircle className="h-3 w-3" />
            Override Approved
          </Badge>
        );
      case 'OVERRIDE_DENIED':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-red-300 text-red-700">
            <AlertTriangle className="h-3 w-3" />
            Override Denied
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleOverrideAction = async (assessmentId: string, action: 'approve' | 'deny', notes?: string) => {
    try {
      if (action === 'approve') {
        await approveOverride(assessmentId, notes);
      } else {
        await denyOverride(assessmentId, notes);
      }
    } catch (error) {
      console.error('Failed to process override:', error);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "text-gray-600" }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hazard Assessments</h1>
          <p className="text-gray-500">
            Monitor and review hazard assessments across your organization
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          {can('hazard.analytics.view') && (
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="assessments" className="space-y-6">
          {/* Stats Overview */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={FileText}
                title="Total Assessments"
                value={analytics.total_assessments}
                subtitle="All time"
              />
              <StatCard
                icon={CheckCircle}
                title="Completed"
                value={analytics.completed_assessments}
                subtitle={`${Math.round((analytics.completed_assessments / analytics.total_assessments) * 100)}% completion rate`}
                color="text-green-600"
              />
              <StatCard
                icon={AlertTriangle}
                title="Failed"
                value={analytics.failed_assessments}
                subtitle={`${Math.round((analytics.failed_assessments / analytics.total_assessments) * 100)}% failure rate`}
                color="text-red-600"
              />
              <StatCard
                icon={Clock}
                title="Pending Overrides"
                value={analytics.pending_overrides}
                subtitle="Requiring review"
                color="text-orange-600"
              />
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by shipment, template, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="OVERRIDE_REQUESTED">Override Requested</SelectItem>
                <SelectItem value="OVERRIDE_APPROVED">Override Approved</SelectItem>
                <SelectItem value="OVERRIDE_DENIED">Override Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assessments List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : assessments?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'No assessments match your search criteria.' : 'No hazard assessments have been completed yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assessments?.map((assessment) => (
                <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">
                            {assessment.shipment_tracking}
                          </h3>
                          {getStatusBadge(assessment.status, assessment.overall_result)}
                          {assessment.is_suspiciously_fast && (
                            <Badge variant="outline" className="border-red-300 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Suspicious Timing
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Template:</span>
                            <br />
                            {assessment.template_name}
                          </div>
                          <div>
                            <span className="font-medium">Completed by:</span>
                            <br />
                            {assessment.completed_by_name || 'Not assigned'}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span>
                            <br />
                            {assessment.completion_time_display}
                          </div>
                          <div>
                            <span className="font-medium">Answers:</span>
                            <br />
                            {assessment.answers_count} provided
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Completed {new Date(assessment.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {assessment.status === 'OVERRIDE_REQUESTED' && can('hazard.assessment.override.approve') && (
                          <div className="flex gap-2">
                            <Button
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOverrideAction(assessment.id, 'approve')}
                              className="text-green-700 border-green-300 hover:bg-green-50"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOverrideAction(assessment.id, 'deny')}
                              className="text-red-700 border-red-300 hover:bg-red-50"
                            >
                              Deny
                            </Button>
                          </div>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAssessment(assessment)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <AssessmentAnalytics />
        </TabsContent>
      </Tabs>

      {/* Assessment Detail Dialog */}
      {selectedAssessment && (
        <AssessmentDetailDialog
          assessment={selectedAssessment}
          isOpen={!!selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          onOverrideAction={handleOverrideAction}
        />
      )}
    </div>
  );
}
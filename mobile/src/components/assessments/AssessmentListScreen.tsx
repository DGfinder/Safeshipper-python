"use client";

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Search, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  Target,
  Filter,
  RefreshCw
} from 'lucide-react-native';
import { useHazardAssessments } from '@/hooks/useHazardAssessments';
import { usePermissions } from '@/contexts/PermissionContext';
import { MobileAssessmentFlow } from './MobileAssessmentFlow';

interface AssessmentListScreenProps {
  navigation: any;
}

export function AssessmentListScreen({ navigation }: AssessmentListScreenProps) {
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    assessments,
    isLoading,
    refetch,
    analytics
  } = useHazardAssessments({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined
  });

  const filteredAssessments = assessments.filter(assessment => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        assessment.shipment_tracking.toLowerCase().includes(query) ||
        assessment.template_name.toLowerCase().includes(query) ||
        assessment.completed_by_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string, overallResult?: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge 
            variant={overallResult === 'FAIL' ? 'destructive' : 'default'} 
            className="flex-row items-center"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            <Text className="text-xs">{overallResult === 'FAIL' ? 'Failed' : 'Completed'}</Text>
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="secondary" className="flex-row items-center">
            <Clock className="h-3 w-3 mr-1" />
            <Text className="text-xs">In Progress</Text>
          </Badge>
        );
      case 'OVERRIDE_REQUESTED':
        return (
          <Badge variant="outline" className="flex-row items-center border-orange-300">
            <AlertTriangle className="h-3 w-3 mr-1 text-orange-600" />
            <Text className="text-xs text-orange-700">Override Requested</Text>
          </Badge>
        );
      case 'OVERRIDE_APPROVED':
        return (
          <Badge variant="outline" className="flex-row items-center border-green-300">
            <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
            <Text className="text-xs text-green-700">Override Approved</Text>
          </Badge>
        );
      case 'OVERRIDE_DENIED':
        return (
          <Badge variant="outline" className="flex-row items-center border-red-300">
            <AlertTriangle className="h-3 w-3 mr-1 text-red-600" />
            <Text className="text-xs text-red-700">Override Denied</Text>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Text className="text-xs">{status}</Text>
          </Badge>
        );
    }
  };

  const handleStartAssessment = (assessmentId: string) => {
    if (!can('hazard.assessment.create')) {
      Alert.alert('Permission Denied', 'You do not have permission to complete assessments.');
      return;
    }
    setSelectedAssessment(assessmentId);
  };

  const handleAssessmentComplete = () => {
    setSelectedAssessment(null);
    onRefresh();
    Alert.alert('Success', 'Assessment completed successfully!');
  };

  const StatusCard = ({ 
    icon: Icon, 
    title, 
    count, 
    color = "text-gray-600",
    onPress 
  }: any) => (
    <TouchableOpacity onPress={onPress}>
      <Card className="p-4 mr-3 min-w-[120px]">
        <View className="items-center">
          <Icon className={`h-6 w-6 ${color} mb-2`} />
          <Text className={`text-2xl font-bold ${color}`}>{count}</Text>
          <Text className="text-xs text-gray-600 text-center">{title}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (selectedAssessment) {
    return (
      <MobileAssessmentFlow
        assessmentId={selectedAssessment}
        onComplete={handleAssessmentComplete}
        onCancel={() => setSelectedAssessment(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 pt-12 pb-4 px-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold">Assessments</Text>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Filter className="h-6 w-6 text-gray-600" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="relative mb-4">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search assessments..."
            className="pl-10"
          />
        </View>

        {/* Filters */}
        {showFilters && (
          <View className="mb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                {[
                  { label: 'All', value: 'all' },
                  { label: 'In Progress', value: 'IN_PROGRESS' },
                  { label: 'Completed', value: 'COMPLETED' },
                  { label: 'Failed', value: 'FAILED' },
                  { label: 'Override Requested', value: 'OVERRIDE_REQUESTED' }
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    onPress={() => setStatusFilter(filter.value)}
                    className={`px-4 py-2 rounded-full border ${
                      statusFilter === filter.value
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm ${
                      statusFilter === filter.value ? 'text-white' : 'text-gray-700'
                    }`}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Stats Overview */}
      {analytics && (
        <View className="bg-white border-b border-gray-200 p-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              <StatusCard
                icon={Target}
                title="Total"
                count={analytics.total_assessments}
                onPress={() => setStatusFilter('all')}
              />
              <StatusCard
                icon={CheckCircle}
                title="Completed"
                count={analytics.completed_assessments}
                color="text-green-600"
                onPress={() => setStatusFilter('COMPLETED')}
              />
              <StatusCard
                icon={XCircle}
                title="Failed"
                count={analytics.failed_assessments}
                color="text-red-600"
                onPress={() => setStatusFilter('FAILED')}
              />
              <StatusCard
                icon={AlertTriangle}
                title="Pending"
                count={analytics.pending_overrides}
                color="text-orange-600"
                onPress={() => setStatusFilter('OVERRIDE_REQUESTED')}
              />
            </View>
          </ScrollView>
        </View>
      )}

      {/* Assessment List */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && !refreshing ? (
          <View className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <View className="space-y-3">
                  <View className="h-4 bg-gray-200 rounded w-3/4" />
                  <View className="h-3 bg-gray-200 rounded w-1/2" />
                  <View className="h-3 bg-gray-200 rounded w-2/3" />
                </View>
              </Card>
            ))}
          </View>
        ) : filteredAssessments.length === 0 ? (
          <Card className="p-8">
            <View className="items-center">
              <Target className="h-12 w-12 text-gray-400 mb-4" />
              <Text className="text-lg font-medium text-gray-900 mb-2">No assessments found</Text>
              <Text className="text-gray-500 text-center mb-4">
                {searchQuery 
                  ? 'No assessments match your search criteria.' 
                  : 'No assessments have been assigned to you yet.'
                }
              </Text>
              {!searchQuery && (
                <Button onPress={onRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <Text>Refresh</Text>
                </Button>
              )}
            </View>
          </Card>
        ) : (
          <View className="space-y-4">
            {filteredAssessments.map((assessment) => (
              <TouchableOpacity
                key={assessment.id}
                onPress={() => handleStartAssessment(assessment.id)}
                disabled={assessment.status === 'COMPLETED'}
              >
                <Card className={`p-4 ${
                  assessment.status === 'COMPLETED' ? 'opacity-75' : 'opacity-100'
                }`}>
                  <View className="space-y-3">
                    {/* Header */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-semibold flex-1">
                        {assessment.shipment_tracking}
                      </Text>
                      {getStatusBadge(assessment.status, assessment.overall_result)}
                    </View>

                    {/* Template and warning indicators */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600 flex-1">
                        {assessment.template_name}
                      </Text>
                      {assessment.is_suspiciously_fast && (
                        <Badge variant="outline" className="border-red-300">
                          <AlertTriangle className="h-3 w-3 mr-1 text-red-600" />
                          <Text className="text-xs text-red-700">Suspicious</Text>
                        </Badge>
                      )}
                    </View>

                    {/* Details Grid */}
                    <View className="flex-row justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <Text className="text-xs text-gray-600">Assigned to</Text>
                        </View>
                        <Text className="text-sm font-medium">
                          {assessment.completed_by_name || 'Unassigned'}
                        </Text>
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <Text className="text-xs text-gray-600">Duration</Text>
                        </View>
                        <Text className="text-sm font-medium">
                          {assessment.completion_time_display || 'Not started'}
                        </Text>
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Target className="h-4 w-4 text-gray-400 mr-2" />
                          <Text className="text-xs text-gray-600">Answers</Text>
                        </View>
                        <Text className="text-sm font-medium">
                          {assessment.answers_count || 0} provided
                        </Text>
                      </View>
                    </View>

                    {/* Timestamp */}
                    <View className="flex-row items-center border-t border-gray-100 pt-2">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <Text className="text-xs text-gray-500">
                        {assessment.status === 'COMPLETED' 
                          ? `Completed ${new Date(assessment.updated_at).toLocaleDateString()}`
                          : `Created ${new Date(assessment.created_at).toLocaleDateString()}`
                        }
                      </Text>
                    </View>

                    {/* Action Button */}
                    {assessment.status === 'IN_PROGRESS' && can('hazard.assessment.create') && (
                      <Button className="mt-2">
                        <Text>Continue Assessment</Text>
                      </Button>
                    )}
                    
                    {assessment.status !== 'COMPLETED' && assessment.status !== 'IN_PROGRESS' && can('hazard.assessment.create') && (
                      <Button variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        <Text>Start Assessment</Text>
                      </Button>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB for Quick Actions */}
      {can('hazard.assessment.create') && (
        <View className="absolute bottom-6 right-6">
          <TouchableOpacity 
            onPress={() => {
              // Navigate to template selection or create new assessment
              Alert.alert(
                'New Assessment',
                'Would you like to start a new assessment?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Start', 
                    onPress: () => {
                      // This would typically navigate to template selection
                      // For now, we'll simulate starting with a template
                      const mockAssessmentId = `assessment-${Date.now()}`;
                      setSelectedAssessment(mockAssessmentId);
                    }
                  }
                ]
              );
            }}
            className="bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          >
            <Plus className="h-6 w-6 text-white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
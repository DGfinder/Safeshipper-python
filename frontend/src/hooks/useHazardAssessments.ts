import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverApi } from '@/shared/lib/server-api';

interface HazardAssessment {
  id: string;
  shipment_tracking: string;
  template_name: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'OVERRIDE_REQUESTED' | 'OVERRIDE_APPROVED' | 'OVERRIDE_DENIED';
  overall_result: 'PASS' | 'FAIL';
  completed_by_name: string;
  completion_time_display: string;
  answers_count: number;
  is_suspiciously_fast: boolean;
  start_timestamp: string;
  end_timestamp: string;
  start_gps_latitude?: number;
  start_gps_longitude?: number;
  end_gps_latitude?: number;
  end_gps_longitude?: number;
  start_location_accuracy?: number;
  end_location_accuracy?: number;
  created_at: string;
  updated_at: string;
  answers?: AssessmentAnswer[];
  audit_trail?: AuditEntry[];
}

interface AssessmentAnswer {
  id: string;
  question_text: string;
  section_title: string;
  answer_value: string;
  comment?: string;
  photo_url?: string;
  photo_metadata?: {
    timestamp: string;
    gps_latitude?: number;
    gps_longitude?: number;
    device_info?: string;
  };
  is_override: boolean;
  override_reason?: string;
  created_at: string;
}

interface AuditEntry {
  action: string;
  user: string;
  timestamp: string;
  notes?: string;
}

interface AssessmentFilters {
  search?: string;
  status?: string;
  template?: string;
  user?: string;
  date_from?: string;
  date_to?: string;
}

interface AssessmentAnalytics {
  total_assessments: number;
  completed_assessments: number;
  failed_assessments: number;
  pending_overrides: number;
  completion_rate: number;
  failure_rate: number;
  average_completion_time: number;
  by_template: Array<{
    template_name: string;
    count: number;
    pass_rate: number;
    avg_completion_time: number;
  }>;
  by_user: Array<{
    user_name: string;
    count: number;
    pass_rate: number;
    avg_completion_time: number;
  }>;
  common_failures: Array<{
    question_text: string;
    failure_count: number;
    failure_rate: number;
  }>;
  time_trends: Array<{
    date: string;
    count: number;
    pass_rate: number;
  }>;
}

// API functions
const hazardAssessmentsApi = {
  // Get all assessments with filters
  getAssessments: async (filters: AssessmentFilters = {}): Promise<{ results: HazardAssessment[]; count: number }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    const response = await serverApi.get(`/hazard-assessments/api/assessments/?${params.toString()}`);
    return response.data;
  },

  // Get single assessment with full details
  getAssessment: async (id: string): Promise<HazardAssessment> => {
    const response = await serverApi.get(`/hazard-assessments/api/assessments/${id}/`);
    return response.data;
  },

  // Get assessment analytics
  getAnalytics: async (filters: AssessmentFilters = {}): Promise<AssessmentAnalytics> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    const response = await serverApi.get(`/hazard-assessments/api/assessments/analytics/?${params.toString()}`);
    return response.data;
  },

  // Approve override request
  approveOverride: async (assessmentId: string, notes?: string): Promise<HazardAssessment> => {
    const response = await serverApi.post(`/hazard-assessments/api/assessments/${assessmentId}/approve_override/`, {
      notes
    });
    return response.data;
  },

  // Deny override request
  denyOverride: async (assessmentId: string, notes?: string): Promise<HazardAssessment> => {
    const response = await serverApi.post(`/hazard-assessments/api/assessments/${assessmentId}/deny_override/`, {
      notes
    });
    return response.data;
  },

  // Export assessments
  exportAssessments: async (filters: AssessmentFilters = {}, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    params.append('format', format);
    
    const response = await serverApi.get(`/hazard-assessments/api/assessments/export/?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get assessment assignment suggestions
  getAssignmentSuggestions: async (shipmentId: string) => {
    const response = await serverApi.get(`/hazard-assessments/api/assessments/assignment_suggestions/?shipment_id=${shipmentId}`);
    return response.data;
  },

  // Bulk assign assessments
  bulkAssign: async (assignments: Array<{ template_id: string; shipment_id: string; assigned_to?: string }>) => {
    const response = await serverApi.post('/hazard-assessments/api/assessments/bulk_assign/', {
      assignments
    });
    return response.data;
  }
};

// Main hook for hazard assessments
export function useHazardAssessments(filters: AssessmentFilters = {}) {
  const queryClient = useQueryClient();

  // Query for fetching assessments
  const {
    data: assessmentsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['hazard-assessments', filters],
    queryFn: () => hazardAssessmentsApi.getAssessments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Query for analytics
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['hazard-assessments-analytics', filters],
    queryFn: () => hazardAssessmentsApi.getAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for approving overrides
  const approveOverrideMutation = useMutation({
    mutationFn: ({ assessmentId, notes }: { assessmentId: string; notes?: string }) =>
      hazardAssessmentsApi.approveOverride(assessmentId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hazard-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['hazard-assessments-analytics'] });
    },
  });

  // Mutation for denying overrides
  const denyOverrideMutation = useMutation({
    mutationFn: ({ assessmentId, notes }: { assessmentId: string; notes?: string }) =>
      hazardAssessmentsApi.denyOverride(assessmentId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hazard-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['hazard-assessments-analytics'] });
    },
  });

  // Mutation for bulk assignment
  const bulkAssignMutation = useMutation({
    mutationFn: hazardAssessmentsApi.bulkAssign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hazard-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assessment-assignments'] });
    },
  });

  return {
    assessments: assessmentsData?.results || [],
    totalCount: assessmentsData?.count || 0,
    analytics,
    isLoading,
    isAnalyticsLoading,
    error,
    refetch,
    refetchAnalytics,

    // Actions
    approveOverride: async (assessmentId: string, notes?: string) => {
      return approveOverrideMutation.mutateAsync({ assessmentId, notes });
    },

    denyOverride: async (assessmentId: string, notes?: string) => {
      return denyOverrideMutation.mutateAsync({ assessmentId, notes });
    },

    bulkAssign: async (assignments: Array<{ template_id: string; shipment_id: string; assigned_to?: string }>) => {
      return bulkAssignMutation.mutateAsync(assignments);
    },

    exportAssessments: async (format: 'csv' | 'xlsx' = 'csv') => {
      const blob = await hazardAssessmentsApi.exportAssessments(filters, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hazard_assessments.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },

    // Loading states
    isApprovingOverride: approveOverrideMutation.isPending,
    isDenyingOverride: denyOverrideMutation.isPending,
    isBulkAssigning: bulkAssignMutation.isPending,
  };
}

// Hook for single assessment with full details
export function useHazardAssessment(id: string | null) {
  const {
    data: assessment,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['hazard-assessment', id],
    queryFn: () => hazardAssessmentsApi.getAssessment(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    assessment,
    isLoading,
    error,
    refetch,
  };
}

// Hook for assessment assignment suggestions
export function useAssessmentAssignmentSuggestions(shipmentId: string | null) {
  const {
    data: suggestions,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['assessment-assignment-suggestions', shipmentId],
    queryFn: () => hazardAssessmentsApi.getAssignmentSuggestions(shipmentId!),
    enabled: !!shipmentId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    suggestions,
    isLoading,
    error,
    refetch,
  };
}

// Hook for real-time assessment updates (WebSocket integration)
export function useAssessmentRealTimeUpdates() {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    // WebSocket connection for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/hazard-assessments/`;
    
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      setConnectionStatus('connecting');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('Connected to hazard assessment updates');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle different types of updates
        switch (data.type) {
          case 'assessment_updated':
            // Invalidate specific assessment query
            queryClient.invalidateQueries({ 
              queryKey: ['hazard-assessment', data.assessment_id] 
            });
            // Invalidate assessments list
            queryClient.invalidateQueries({ 
              queryKey: ['hazard-assessments'] 
            });
            break;
            
          case 'override_requested':
            // Invalidate assessments and analytics
            queryClient.invalidateQueries({ 
              queryKey: ['hazard-assessments'] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['hazard-assessments-analytics'] 
            });
            break;
            
          case 'analytics_updated':
            // Invalidate analytics
            queryClient.invalidateQueries({ 
              queryKey: ['hazard-assessments-analytics'] 
            });
            break;
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [queryClient]);

  return {
    connectionStatus,
  };
}

// Hook for assessment completion tracking (for mobile)
export function useAssessmentCompletion(assessmentId: string | null) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: any }) => {
      const response = await serverApi.post(`/hazard-assessments/api/assessments/${assessmentId}/save_answer/`, {
        question_id: questionId,
        ...answer
      });
      return response.data;
    },
    onSuccess: () => {
      // Update local state
      queryClient.invalidateQueries({ queryKey: ['hazard-assessment', assessmentId] });
    },
  });

  const completeAssessmentMutation = useMutation({
    mutationFn: async () => {
      const response = await serverApi.post(`/hazard-assessments/api/assessments/${assessmentId}/complete/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hazard-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['hazard-assessment', assessmentId] });
    },
  });

  return {
    currentStep,
    setCurrentStep,
    answers,
    setAnswers,
    
    saveAnswer: async (questionId: string, answer: any) => {
      setAnswers(prev => ({ ...prev, [questionId]: answer }));
      return saveAnswerMutation.mutateAsync({ questionId, answer });
    },
    
    completeAssessment: async () => {
      return completeAssessmentMutation.mutateAsync();
    },
    
    isSaving: saveAnswerMutation.isPending,
    isCompleting: completeAssessmentMutation.isPending,
  };
}
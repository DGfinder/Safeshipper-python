import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverApi } from '@/shared/lib/server-api';

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string;
  version: number;
  is_active: boolean;
  is_default: boolean;
  sections_count: number;
  questions_count: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  sections?: AssessmentSection[];
}

interface AssessmentSection {
  id: string;
  title: string;
  description: string;
  order: number;
  is_required: boolean;
  questions: AssessmentQuestion[];
}

interface AssessmentQuestion {
  id: string;
  text: string;
  question_type: 'YES_NO_NA' | 'PASS_FAIL_NA' | 'TEXT' | 'NUMERIC';
  order: number;
  is_photo_required_on_fail: boolean;
  is_comment_required_on_fail: boolean;
  is_critical_failure: boolean;
  is_required: boolean;
  help_text: string;
}

interface CreateTemplateData {
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  sections: Omit<AssessmentSection, 'id'>[];
}

// API functions
const assessmentTemplatesApi = {
  // Get all templates
  getTemplates: async (): Promise<AssessmentTemplate[]> => {
    const response = await serverApi.get('/hazard-assessments/api/templates/');
    return response.data.results || response.data;
  },

  // Get single template with full details
  getTemplate: async (id: string): Promise<AssessmentTemplate> => {
    const response = await serverApi.get(`/hazard-assessments/api/templates/${id}/`);
    return response.data;
  },

  // Create new template
  createTemplate: async (data: CreateTemplateData): Promise<AssessmentTemplate> => {
    const response = await serverApi.post('/hazard-assessments/api/templates/', data);
    return response.data;
  },

  // Update existing template
  updateTemplate: async (id: string, data: Partial<CreateTemplateData>): Promise<AssessmentTemplate> => {
    const response = await serverApi.patch(`/hazard-assessments/api/templates/${id}/`, data);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: string): Promise<void> => {
    await serverApi.delete(`/hazard-assessments/api/templates/${id}/`);
  },

  // Clone template
  cloneTemplate: async (id: string, name: string): Promise<AssessmentTemplate> => {
    const response = await serverApi.post(`/hazard-assessments/api/templates/${id}/clone_template/`, {
      name
    });
    return response.data;
  },

  // Get template analytics
  getTemplateAnalytics: async (id: string) => {
    const response = await serverApi.get(`/hazard-assessments/api/templates/${id}/analytics/`);
    return response.data;
  },

  // Assign template to shipment
  assignToShipment: async (templateId: string, shipmentId: string) => {
    const response = await serverApi.post(`/hazard-assessments/api/templates/${templateId}/assign_to_shipment/`, {
      shipment_id: shipmentId
    });
    return response.data;
  }
};

// Main hook for assessment templates
export function useAssessmentTemplates() {
  const queryClient = useQueryClient();

  // Query for fetching all templates
  const {
    data: templates,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['assessment-templates'],
    queryFn: assessmentTemplatesApi.getTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating templates
  const createTemplateMutation = useMutation({
    mutationFn: assessmentTemplatesApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  // Mutation for updating templates
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTemplateData> }) =>
      assessmentTemplatesApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  // Mutation for deleting templates
  const deleteTemplateMutation = useMutation({
    mutationFn: assessmentTemplatesApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  // Mutation for cloning templates
  const cloneTemplateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      assessmentTemplatesApi.cloneTemplate(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  return {
    templates,
    isLoading,
    error,
    refetch,
    
    // Actions
    createTemplate: async (data: CreateTemplateData) => {
      return createTemplateMutation.mutateAsync(data);
    },
    
    updateTemplate: async (id: string, data: Partial<CreateTemplateData>) => {
      return updateTemplateMutation.mutateAsync({ id, data });
    },
    
    deleteTemplate: async (id: string) => {
      return deleteTemplateMutation.mutateAsync(id);
    },
    
    cloneTemplate: async (id: string, name: string) => {
      return cloneTemplateMutation.mutateAsync({ id, name });
    },

    // Loading states
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    isCloning: cloneTemplateMutation.isPending,
  };
}

// Hook for single template with full details
export function useAssessmentTemplate(id: string | null) {
  const {
    data: template,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['assessment-template', id],
    queryFn: () => assessmentTemplatesApi.getTemplate(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    template,
    isLoading,
    error,
    refetch,
  };
}

// Hook for template analytics
export function useTemplateAnalytics(id: string | null) {
  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['template-analytics', id],
    queryFn: () => assessmentTemplatesApi.getTemplateAnalytics(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics
  });

  return {
    analytics,
    isLoading,
    error,
    refetch,
  };
}

// Hook for template assignment
export function useTemplateAssignment() {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: ({ templateId, shipmentId }: { templateId: string; shipmentId: string }) =>
      assessmentTemplatesApi.assignToShipment(templateId, shipmentId),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['hazard-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment-assessments'] });
    },
  });

  return {
    assignToShipment: async (templateId: string, shipmentId: string) => {
      return assignMutation.mutateAsync({ templateId, shipmentId });
    },
    isAssigning: assignMutation.isPending,
  };
}

// Hook for template sections management
export function useAssessmentSections() {
  const queryClient = useQueryClient();

  // API functions for sections
  const sectionsApi = {
    createSection: async (data: Omit<AssessmentSection, 'id' | 'questions'> & { template: string }) => {
      const response = await serverApi.post('/hazard-assessments/api/sections/', data);
      return response.data;
    },

    updateSection: async (id: string, data: Partial<AssessmentSection>) => {
      const response = await serverApi.patch(`/hazard-assessments/api/sections/${id}/`, data);
      return response.data;
    },

    deleteSection: async (id: string) => {
      await serverApi.delete(`/hazard-assessments/api/sections/${id}/`);
    },
  };

  const createSectionMutation = useMutation({
    mutationFn: sectionsApi.createSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssessmentSection> }) =>
      sectionsApi.updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: sectionsApi.deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  return {
    createSection: async (data: Omit<AssessmentSection, 'id' | 'questions'> & { template: string }) => {
      return createSectionMutation.mutateAsync(data);
    },
    
    updateSection: async (id: string, data: Partial<AssessmentSection>) => {
      return updateSectionMutation.mutateAsync({ id, data });
    },
    
    deleteSection: async (id: string) => {
      return deleteSectionMutation.mutateAsync(id);
    },

    isCreating: createSectionMutation.isPending,
    isUpdating: updateSectionMutation.isPending,
    isDeleting: deleteSectionMutation.isPending,
  };
}

// Hook for template questions management
export function useAssessmentQuestions() {
  const queryClient = useQueryClient();

  // API functions for questions
  const questionsApi = {
    createQuestion: async (data: Omit<AssessmentQuestion, 'id'> & { section: string }) => {
      const response = await serverApi.post('/hazard-assessments/api/questions/', data);
      return response.data;
    },

    updateQuestion: async (id: string, data: Partial<AssessmentQuestion>) => {
      const response = await serverApi.patch(`/hazard-assessments/api/questions/${id}/`, data);
      return response.data;
    },

    deleteQuestion: async (id: string) => {
      await serverApi.delete(`/hazard-assessments/api/questions/${id}/`);
    },
  };

  const createQuestionMutation = useMutation({
    mutationFn: questionsApi.createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssessmentQuestion> }) =>
      questionsApi.updateQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: questionsApi.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-templates'] });
    },
  });

  return {
    createQuestion: async (data: Omit<AssessmentQuestion, 'id'> & { section: string }) => {
      return createQuestionMutation.mutateAsync(data);
    },
    
    updateQuestion: async (id: string, data: Partial<AssessmentQuestion>) => {
      return updateQuestionMutation.mutateAsync({ id, data });
    },
    
    deleteQuestion: async (id: string) => {
      return deleteQuestionMutation.mutateAsync(id);
    },

    isCreating: createQuestionMutation.isPending,
    isUpdating: updateQuestionMutation.isPending,
    isDeleting: deleteQuestionMutation.isPending,
  };
}
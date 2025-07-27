// hooks/useEPG.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

// Types
export interface EmergencyProcedureGuide {
  id: string;
  dangerous_good?: string;
  dangerous_good_display: string;
  epg_number: string;
  title: string;
  hazard_class: string;
  subsidiary_risks: string[];
  emergency_types: string[];
  immediate_actions: string;
  personal_protection: string;
  fire_procedures?: string;
  spill_procedures?: string;
  medical_procedures?: string;
  evacuation_procedures?: string;
  notification_requirements: string;
  emergency_contacts: Record<string, any>;
  isolation_distances: Record<string, any>;
  protective_action_distances: Record<string, any>;
  environmental_precautions?: string;
  water_pollution_response?: string;
  transport_specific_guidance?: string;
  weather_considerations?: string;
  status: "ACTIVE" | "DRAFT" | "UNDER_REVIEW" | "ARCHIVED";
  status_display: string;
  severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity_level_display: string;
  version: string;
  effective_date: string;
  review_date?: string;
  regulatory_references: string[];
  country_code: string;
  is_active: boolean;
  is_due_for_review: boolean;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEmergencyPlan {
  id: string;
  shipment: string;
  shipment_display: string;
  plan_number: string;
  referenced_epgs: string[];
  referenced_epgs_display: Array<{
    id: string;
    epg_number: string;
    title: string;
  }>;
  executive_summary: string;
  hazard_assessment: Record<string, any>;
  immediate_response_actions: string;
  specialized_procedures: Record<string, any>;
  route_emergency_contacts: Record<string, any>;
  hospital_locations: Array<any>;
  special_considerations?: string;
  notification_matrix: Record<string, any>;
  status: "GENERATED" | "REVIEWED" | "APPROVED" | "ACTIVE" | "EXPIRED";
  status_display: string;
  generated_at: string;
  generated_by?: string;
  generated_by_name?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
}

export interface EmergencyIncident {
  id: string;
  incident_number: string;
  shipment?: string;
  shipment_display?: string;
  emergency_plan?: string;
  emergency_plan_display?: string;
  incident_type: string;
  incident_type_display: string;
  severity: string;
  severity_display: string;
  location: string;
  incident_datetime: string;
  response_actions_taken: string;
  response_effectiveness: string;
  response_effectiveness_display: string;
  lessons_learned?: string;
  epg_improvements?: string;
  reported_by?: string;
  reported_by_name?: string;
  reported_at: string;
}

export interface EPGSearchParams {
  query?: string;
  hazard_class?: string;
  dangerous_good?: string;
  status?: string;
  severity_level?: string;
  country_code?: string;
  emergency_type?: string;
  include_inactive?: boolean;
  page?: number;
  page_size?: number;
}

export interface EPGStatistics {
  total_epgs: number;
  active_epgs: number;
  draft_epgs: number;
  under_review: number;
  due_for_review: number;
  by_hazard_class: Record<string, number>;
  by_severity_level: Record<string, number>;
  by_country: Record<string, number>;
  by_emergency_type: Record<string, number>;
  recent_updates: Array<{
    id: string;
    epg_number: string;
    title: string;
    updated_at: string;
    status: string;
  }>;
}

export interface EmergencyPlanStatistics {
  total_plans: number;
  active_plans: number;
  generated_plans: number;
  approved_plans: number;
  plans_this_month: number;
  by_status: Record<string, number>;
  by_hazard_class: Record<string, number>;
  average_epgs_per_plan: number;
  recent_plans: Array<{
    id: string;
    plan_number: string;
    shipment_tracking: string;
    status: string;
    generated_at: string;
  }>;
}

// API Functions
const epgAPI = {
  // EPG Management
  getEPGs: async (params: EPGSearchParams = {}) => {
    const response = await api.get("/epg/emergency-procedure-guides/", {
      params,
    });
    return response.data;
  },

  getEPG: async (id: string) => {
    const response = await api.get(`/epg/emergency-procedure-guides/${id}/`);
    return response.data;
  },

  createEPG: async (data: Partial<EmergencyProcedureGuide>) => {
    const response = await api.post("/epg/emergency-procedure-guides/", data);
    return response.data;
  },

  updateEPG: async (id: string, data: Partial<EmergencyProcedureGuide>) => {
    const response = await api.patch(
      `/epg/emergency-procedure-guides/${id}/`,
      data,
    );
    return response.data;
  },

  deleteEPG: async (id: string) => {
    await api.delete(`/epg/emergency-procedure-guides/${id}/`);
  },

  searchEPGs: async (searchData: EPGSearchParams) => {
    const response = await api.post(
      "/epg/emergency-procedure-guides/search/",
      searchData,
    );
    return response.data;
  },

  createFromTemplate: async (data: {
    hazard_class: string;
    dangerous_good?: string;
  }) => {
    const response = await api.post(
      "/epg/emergency-procedure-guides/create_from_template/",
      data,
    );
    return response.data;
  },

  activateEPG: async (id: string) => {
    const response = await api.post(
      `/epg/emergency-procedure-guides/${id}/activate/`,
    );
    return response.data;
  },

  archiveEPG: async (id: string) => {
    const response = await api.post(
      `/epg/emergency-procedure-guides/${id}/archive/`,
    );
    return response.data;
  },

  getEPGStatistics: async () => {
    const response = await api.get(
      "/epg/emergency-procedure-guides/statistics/",
    );
    return response.data;
  },

  getDueForReview: async (days: number = 30) => {
    const response = await api.get(
      "/epg/emergency-procedure-guides/due_for_review/",
      {
        params: { days },
      },
    );
    return response.data;
  },

  // Emergency Plans
  getEmergencyPlans: async (params: any = {}) => {
    const response = await api.get("/epg/emergency-plans/", { params });
    return response.data;
  },

  getEmergencyPlan: async (id: string) => {
    const response = await api.get(`/epg/emergency-plans/${id}/`);
    return response.data;
  },

  generateEmergencyPlan: async (shipmentId: string) => {
    const response = await api.post("/epg/emergency-plans/generate_plan/", {
      shipment: shipmentId,
    });
    return response.data;
  },

  reviewEmergencyPlan: async (id: string) => {
    const response = await api.post(`/epg/emergency-plans/${id}/review/`);
    return response.data;
  },

  approveEmergencyPlan: async (id: string) => {
    const response = await api.post(`/epg/emergency-plans/${id}/approve/`);
    return response.data;
  },

  activateEmergencyPlan: async (id: string) => {
    const response = await api.post(`/epg/emergency-plans/${id}/activate/`);
    return response.data;
  },

  getEmergencyPlanStatistics: async () => {
    const response = await api.get("/epg/emergency-plans/statistics/");
    return response.data;
  },

  // Incidents
  getIncidents: async (params: any = {}) => {
    const response = await api.get("/epg/incidents/", { params });
    return response.data;
  },

  createIncident: async (data: Partial<EmergencyIncident>) => {
    const response = await api.post("/epg/incidents/", data);
    return response.data;
  },

  getRecentIncidents: async (days: number = 30) => {
    const response = await api.get("/epg/incidents/recent/", {
      params: { days },
    });
    return response.data;
  },

  getIncidentsByEffectiveness: async () => {
    const response = await api.get("/epg/incidents/by_effectiveness/");
    return response.data;
  },
};

// React Query Hooks

// EPG Hooks
export const useEPGs = (params: EPGSearchParams = {}) => {
  return useQuery({
    queryKey: ["epgs", params],
    queryFn: () => epgAPI.getEPGs(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEPG = (id: string) => {
  return useQuery({
    queryKey: ["epg", id],
    queryFn: () => epgAPI.getEPG(id),
    enabled: !!id,
  });
};

export const useCreateEPG = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.createEPG,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epgs"] });
      queryClient.invalidateQueries({ queryKey: ["epg-statistics"] });
    },
  });
};

export const useUpdateEPG = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<EmergencyProcedureGuide>;
    }) => epgAPI.updateEPG(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["epg", id] });
      queryClient.invalidateQueries({ queryKey: ["epgs"] });
      queryClient.invalidateQueries({ queryKey: ["epg-statistics"] });
    },
  });
};

export const useDeleteEPG = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.deleteEPG,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epgs"] });
      queryClient.invalidateQueries({ queryKey: ["epg-statistics"] });
    },
  });
};

export const useEPGSearch = () => {
  return useMutation({
    mutationFn: epgAPI.searchEPGs,
  });
};

export const useCreateEPGFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.createFromTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epgs"] });
      queryClient.invalidateQueries({ queryKey: ["epg-statistics"] });
    },
  });
};

export const useActivateEPG = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.activateEPG,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epgs"] });
      queryClient.invalidateQueries({ queryKey: ["epg-statistics"] });
    },
  });
};

export const useArchiveEPG = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.archiveEPG,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epgs"] });
      queryClient.invalidateQueries({ queryKey: ["epg-statistics"] });
    },
  });
};

export const useEPGStatistics = () => {
  return useQuery({
    queryKey: ["epg-statistics"],
    queryFn: epgAPI.getEPGStatistics,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useEPGsDueForReview = (days: number = 30) => {
  return useQuery({
    queryKey: ["epgs-due-for-review", days],
    queryFn: () => epgAPI.getDueForReview(days),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Emergency Plan Hooks
export const useEmergencyPlans = (params: any = {}) => {
  return useQuery({
    queryKey: ["emergency-plans", params],
    queryFn: () => epgAPI.getEmergencyPlans(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useEmergencyPlan = (id: string) => {
  return useQuery({
    queryKey: ["emergency-plan", id],
    queryFn: () => epgAPI.getEmergencyPlan(id),
    enabled: !!id,
  });
};

export const useGenerateEmergencyPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.generateEmergencyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["emergency-plan-statistics"],
      });
    },
  });
};

export const useReviewEmergencyPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.reviewEmergencyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-plans"] });
    },
  });
};

export const useApproveEmergencyPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.approveEmergencyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-plans"] });
    },
  });
};

export const useActivateEmergencyPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.activateEmergencyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-plans"] });
    },
  });
};

export const useEmergencyPlanStatistics = () => {
  return useQuery({
    queryKey: ["emergency-plan-statistics"],
    queryFn: epgAPI.getEmergencyPlanStatistics,
    staleTime: 10 * 60 * 1000,
  });
};

// Incident Hooks
export const useIncidents = (params: any = {}) => {
  return useQuery({
    queryKey: ["incidents", params],
    queryFn: () => epgAPI.getIncidents(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: epgAPI.createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
};

export const useRecentIncidents = (days: number = 30) => {
  return useQuery({
    queryKey: ["recent-incidents", days],
    queryFn: () => epgAPI.getRecentIncidents(days),
    staleTime: 5 * 60 * 1000,
  });
};

export const useIncidentsByEffectiveness = () => {
  return useQuery({
    queryKey: ["incidents-by-effectiveness"],
    queryFn: epgAPI.getIncidentsByEffectiveness,
    staleTime: 10 * 60 * 1000,
  });
};

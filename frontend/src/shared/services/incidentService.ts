// Incident Management API Service for SafeShipper
import { api } from './api';
import {
  Incident,
  IncidentListItem,
  IncidentListResponse,
  IncidentType,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  AddDangerousGoodRequest,
  IncidentStatistics,
  IncidentFilters,
  IncidentDocument,
  CorrectiveAction
} from '../types/incident';

class IncidentService {
  private readonly baseUrl = '/incidents';

  // Incident CRUD operations
  async getIncidents(filters?: IncidentFilters): Promise<IncidentListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    const response = await api.get(`${this.baseUrl}/api/incidents/?${params.toString()}`);
    return response.data;
  }

  async getIncident(id: string): Promise<Incident> {
    const response = await api.get(`${this.baseUrl}/api/incidents/${id}/`);
    return response.data;
  }

  async createIncident(data: CreateIncidentRequest): Promise<Incident> {
    const response = await api.post(`${this.baseUrl}/api/incidents/`, data);
    return response.data;
  }

  async updateIncident(id: string, data: UpdateIncidentRequest): Promise<Incident> {
    const response = await api.patch(`${this.baseUrl}/api/incidents/${id}/`, data);
    return response.data;
  }

  async deleteIncident(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/api/incidents/${id}/`);
  }

  // Incident actions
  async assignIncident(id: string, assignedToId: string): Promise<{ message: string; assigned_to: any }> {
    const response = await api.post(`${this.baseUrl}/api/incidents/${id}/assign/`, {
      assigned_to_id: assignedToId
    });
    return response.data;
  }

  async closeIncident(id: string, resolutionNotes?: string): Promise<{ message: string; status: string; closed_at: string }> {
    const response = await api.post(`${this.baseUrl}/api/incidents/${id}/close/`, {
      resolution_notes: resolutionNotes
    });
    return response.data;
  }

  async reopenIncident(id: string, reason?: string): Promise<{ message: string; status: string }> {
    const response = await api.post(`${this.baseUrl}/api/incidents/${id}/reopen/`, {
      reason: reason
    });
    return response.data;
  }

  async addDangerousGood(id: string, data: AddDangerousGoodRequest): Promise<{ message: string; dangerous_good: any }> {
    const response = await api.post(`${this.baseUrl}/api/incidents/${id}/add_dangerous_good/`, data);
    return response.data;
  }

  // Specialized incident queries
  async getMyIncidents(filters?: IncidentFilters): Promise<IncidentListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    const response = await api.get(`${this.baseUrl}/api/incidents/my_incidents/?${params.toString()}`);
    return response.data;
  }

  async getOverdueIncidents(): Promise<IncidentListItem[]> {
    const response = await api.get(`${this.baseUrl}/api/incidents/overdue/`);
    return response.data;
  }

  async getIncidentsByHazardClass(hazardClass: string, filters?: IncidentFilters): Promise<IncidentListResponse> {
    const params = new URLSearchParams({ hazard_class: hazardClass });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    const response = await api.get(`${this.baseUrl}/api/incidents/by_hazard_class/?${params.toString()}`);
    return response.data;
  }

  async getRegulatoryRequiredIncidents(): Promise<IncidentListResponse> {
    const response = await api.get(`${this.baseUrl}/api/incidents/regulatory_required/`);
    return response.data;
  }

  // Statistics and analytics
  async getStatistics(startDate?: string, endDate?: string): Promise<IncidentStatistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`${this.baseUrl}/api/incidents/statistics/?${params.toString()}`);
    return response.data;
  }

  // Incident Types
  async getIncidentTypes(): Promise<IncidentType[]> {
    const response = await api.get(`${this.baseUrl}/api/incident-types/`);
    return response.data.results || response.data;
  }

  async getIncidentType(id: string): Promise<IncidentType> {
    const response = await api.get(`${this.baseUrl}/api/incident-types/${id}/`);
    return response.data;
  }

  async createIncidentType(data: Omit<IncidentType, 'id' | 'created_at' | 'updated_at'>): Promise<IncidentType> {
    const response = await api.post(`${this.baseUrl}/api/incident-types/`, data);
    return response.data;
  }

  async updateIncidentType(id: string, data: Partial<IncidentType>): Promise<IncidentType> {
    const response = await api.patch(`${this.baseUrl}/api/incident-types/${id}/`, data);
    return response.data;
  }

  async deleteIncidentType(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/api/incident-types/${id}/`);
  }

  // Document management
  async uploadDocument(incidentId: string, file: File, documentType: string, title: string, description?: string): Promise<IncidentDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('title', title);
    formData.append('incident', incidentId);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post(`${this.baseUrl}/api/incident-documents/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getIncidentDocuments(incidentId: string): Promise<IncidentDocument[]> {
    const response = await api.get(`${this.baseUrl}/api/incident-documents/?incident=${incidentId}`);
    return response.data.results || response.data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/api/incident-documents/${documentId}/`);
  }

  // Corrective Actions
  async getCorrectiveActions(incidentId?: string): Promise<CorrectiveAction[]> {
    const params = incidentId ? `?incident=${incidentId}` : '';
    const response = await api.get(`${this.baseUrl}/api/corrective-actions/${params}`);
    return response.data.results || response.data;
  }

  async createCorrectiveAction(data: {
    incident: string;
    title: string;
    description: string;
    assigned_to_id: string;
    due_date: string;
  }): Promise<CorrectiveAction> {
    const response = await api.post(`${this.baseUrl}/api/corrective-actions/`, data);
    return response.data;
  }

  async updateCorrectiveAction(id: string, data: Partial<CorrectiveAction>): Promise<CorrectiveAction> {
    const response = await api.patch(`${this.baseUrl}/api/corrective-actions/${id}/`, data);
    return response.data;
  }

  async completeCorrectiveAction(id: string, completionNotes?: string): Promise<{ message: string; status: string; completed_at: string }> {
    const response = await api.post(`${this.baseUrl}/api/corrective-actions/${id}/complete/`, {
      completion_notes: completionNotes
    });
    return response.data;
  }

  async getOverdueCorrectiveActions(): Promise<CorrectiveAction[]> {
    const response = await api.get(`${this.baseUrl}/api/corrective-actions/overdue/`);
    return response.data;
  }

  // Export functionality
  async exportIncidents(filters?: IncidentFilters, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams({ format });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    const response = await api.get(`${this.baseUrl}/api/incidents/export/?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Utility methods
  async searchIncidents(query: string, filters?: IncidentFilters): Promise<IncidentListResponse> {
    return this.getIncidents({ ...filters, search: query });
  }

  // Real-time updates (if WebSocket is implemented)
  subscribeToIncidentUpdates(incidentId: string, callback: (update: any) => void): () => void {
    // This would connect to WebSocket for real-time updates
    // Implementation depends on WebSocket setup
    console.log(`Subscribing to updates for incident ${incidentId}`);
    
    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribing from updates for incident ${incidentId}`);
    };
  }

  // Helper methods for status management
  canTransitionStatus(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'reported': ['investigating', 'resolved', 'closed'],
      'investigating': ['reported', 'resolved', 'closed'],
      'resolved': ['closed', 'investigating'],
      'closed': []
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'reported': 'orange',
      'investigating': 'blue',
      'resolved': 'green',
      'closed': 'gray'
    };
    return colors[status] || 'gray';
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'low': 'green',
      'medium': 'yellow',
      'high': 'orange',
      'critical': 'red'
    };
    return colors[priority] || 'gray';
  }
}

export const incidentService = new IncidentService();
export default incidentService;
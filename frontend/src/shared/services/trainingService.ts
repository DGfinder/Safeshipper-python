/**
 * Enhanced Training Service - Comprehensive API interface for SafeShipper training system
 * Handles all training-related API operations with dangerous goods integration
 */
import { apiHelpers } from './api';
import {
  TrainingProgram,
  TrainingModule,
  TrainingCategory,
  UserTrainingRecord,
  UserModuleProgress,
  TrainingCertificate,
  TrainingStats,
  ComplianceReport,
  TrainingAnalytics,
  TrainingQuestion,
  TrainingAttempt,
  PaginatedResponse,
  TrainingAPIFilters,
  UserTrainingFilters
} from '@/shared/types/training';

export class TrainingService {
  private static baseUrl = '/training/api';

  // ============================================================================
  // TRAINING PROGRAMS & MODULES
  // ============================================================================

  /**
   * Get all training programs with filtering and pagination
   */
  static async getTrainingPrograms(
    filters?: TrainingAPIFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<TrainingProgram>> {
    const params = {
      ...filters,
      page,
      page_size: pageSize,
    };
    return apiHelpers.get(`${this.baseUrl}/programs/`, params);
  }

  /**
   * Get a specific training program by ID
   */
  static async getTrainingProgram(id: string): Promise<TrainingProgram> {
    return apiHelpers.get(`${this.baseUrl}/programs/${id}/`);
  }

  /**
   * Get training modules for a specific program
   */
  static async getProgramModules(
    programId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResponse<TrainingModule>> {
    return apiHelpers.get(`${this.baseUrl}/programs/${programId}/modules/`, {
      page,
      page_size: pageSize
    });
  }

  /**
   * Get a specific training module
   */
  static async getTrainingModule(moduleId: string): Promise<TrainingModule> {
    return apiHelpers.get(`${this.baseUrl}/modules/${moduleId}/`);
  }

  /**
   * Get training categories
   */
  static async getTrainingCategories(): Promise<TrainingCategory[]> {
    const response = await apiHelpers.get(`${this.baseUrl}/categories/`);
    return response.results || response;
  }

  /**
   * Search training programs by text, hazard class, UN number
   */
  static async searchTrainingPrograms(
    query: string,
    hazardClass?: string,
    unNumber?: string
  ): Promise<TrainingProgram[]> {
    const params = {
      search: query,
      hazard_class: hazardClass,
      un_number: unNumber
    };
    const response = await apiHelpers.get(`${this.baseUrl}/programs/search/`, params);
    return response.results || response;
  }

  /**
   * Get recommended training programs for user
   */
  static async getRecommendedPrograms(
    userId?: string,
    role?: string,
    hazardClasses?: string[]
  ): Promise<TrainingProgram[]> {
    const params = {
      user_id: userId,
      role,
      hazard_classes: hazardClasses?.join(',')
    };
    return apiHelpers.get(`${this.baseUrl}/programs/recommended/`, params);
  }

  // ============================================================================
  // USER TRAINING RECORDS
  // ============================================================================

  /**
   * Get user training records with comprehensive filtering
   */
  static async getUserTrainingRecords(
    filters?: UserTrainingFilters,
    page: number = 1,
    pageSize: number = 25
  ): Promise<PaginatedResponse<UserTrainingRecord>> {
    const params = {
      ...filters,
      page,
      page_size: pageSize,
    };
    return apiHelpers.get(`${this.baseUrl}/user-records/`, params);
  }

  /**
   * Get a specific user training record
   */
  static async getUserTrainingRecord(recordId: string): Promise<UserTrainingRecord> {
    return apiHelpers.get(`${this.baseUrl}/user-records/${recordId}/`);
  }

  /**
   * Enroll user in a training program
   */
  static async enrollUserInProgram(
    userId: string,
    programId: string,
    requiredByDate?: string,
    notes?: string
  ): Promise<UserTrainingRecord> {
    return apiHelpers.post(`${this.baseUrl}/user-records/`, {
      user: userId,
      program: programId,
      required_by_date: requiredByDate,
      enrollment_notes: notes
    });
  }

  /**
   * Bulk enroll users in training programs
   */
  static async bulkEnrollUsers(enrollments: {
    user_id: string;
    program_id: string;
    required_by_date?: string;
  }[]): Promise<{ created: number; errors: any[] }> {
    return apiHelpers.post(`${this.baseUrl}/user-records/bulk_enroll/`, {
      enrollments
    });
  }

  /**
   * Start a training program
   */
  static async startTraining(recordId: string): Promise<UserTrainingRecord> {
    return apiHelpers.post(`${this.baseUrl}/user-records/${recordId}/start/`);
  }

  /**
   * Update training progress
   */
  static async updateTrainingProgress(
    recordId: string,
    progressData: {
      current_module?: string;
      progress_percentage?: number;
      time_spent_minutes?: number;
      notes?: string;
    }
  ): Promise<UserTrainingRecord> {
    return apiHelpers.patch(`${this.baseUrl}/user-records/${recordId}/`, progressData);
  }

  /**
   * Complete a training program
   */
  static async completeTraining(
    recordId: string,
    finalScore?: number,
    completionNotes?: string
  ): Promise<UserTrainingRecord> {
    return apiHelpers.post(`${this.baseUrl}/user-records/${recordId}/complete/`, {
      final_score: finalScore,
      completion_notes: completionNotes
    });
  }

  // ============================================================================
  // MODULE PROGRESS TRACKING
  // ============================================================================

  /**
   * Get user's progress for specific modules
   */
  static async getUserModuleProgress(
    recordId: string
  ): Promise<UserModuleProgress[]> {
    return apiHelpers.get(`${this.baseUrl}/user-records/${recordId}/module-progress/`);
  }

  /**
   * Update module progress
   */
  static async updateModuleProgress(
    recordId: string,
    moduleId: string,
    progressData: {
      progress_percentage?: number;
      time_spent_minutes?: number;
      last_position?: string;
      notes?: string;
      status?: string;
    }
  ): Promise<UserModuleProgress> {
    return apiHelpers.patch(
      `${this.baseUrl}/user-records/${recordId}/modules/${moduleId}/`,
      progressData
    );
  }

  /**
   * Complete a training module
   */
  static async completeModule(
    recordId: string,
    moduleId: string,
    completionData?: {
      final_score?: number;
      time_spent_minutes?: number;
      notes?: string;
    }
  ): Promise<UserModuleProgress> {
    return apiHelpers.post(
      `${this.baseUrl}/user-records/${recordId}/modules/${moduleId}/complete/`,
      completionData
    );
  }

  /**
   * Add bookmark to training content
   */
  static async addBookmark(
    recordId: string,
    moduleId: string,
    bookmarkData: {
      title: string;
      position: string;
      notes?: string;
    }
  ): Promise<any> {
    return apiHelpers.post(
      `${this.baseUrl}/user-records/${recordId}/modules/${moduleId}/bookmarks/`,
      bookmarkData
    );
  }

  // ============================================================================
  // ASSESSMENTS & QUESTIONS
  // ============================================================================

  /**
   * Get questions for a module assessment
   */
  static async getModuleQuestions(moduleId: string): Promise<TrainingQuestion[]> {
    return apiHelpers.get(`${this.baseUrl}/modules/${moduleId}/questions/`);
  }

  /**
   * Submit assessment answers
   */
  static async submitAssessment(
    recordId: string,
    moduleId: string,
    answers: {
      question_id: string;
      answer: string | string[];
      time_spent_seconds?: number;
    }[]
  ): Promise<TrainingAttempt> {
    return apiHelpers.post(
      `${this.baseUrl}/user-records/${recordId}/modules/${moduleId}/submit-assessment/`,
      { answers }
    );
  }

  /**
   * Get assessment attempts for a module
   */
  static async getAssessmentAttempts(
    recordId: string,
    moduleId: string
  ): Promise<TrainingAttempt[]> {
    return apiHelpers.get(
      `${this.baseUrl}/user-records/${recordId}/modules/${moduleId}/attempts/`
    );
  }

  /**
   * Get detailed results for an assessment attempt
   */
  static async getAttemptResults(attemptId: string): Promise<TrainingAttempt> {
    return apiHelpers.get(`${this.baseUrl}/attempts/${attemptId}/`);
  }

  // ============================================================================
  // CERTIFICATES
  // ============================================================================

  /**
   * Get user's training certificates
   */
  static async getUserCertificates(
    userId?: string,
    programId?: string
  ): Promise<TrainingCertificate[]> {
    const params = {
      user: userId,
      program: programId
    };
    return apiHelpers.get(`${this.baseUrl}/certificates/`, params);
  }

  /**
   * Generate certificate for completed training
   */
  static async generateCertificate(recordId: string): Promise<TrainingCertificate> {
    return apiHelpers.post(`${this.baseUrl}/user-records/${recordId}/generate-certificate/`);
  }

  /**
   * Download certificate as PDF
   */
  static async downloadCertificate(certificateId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/certificates/${certificateId}/download/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download certificate');
    }
    
    return response.blob();
  }

  /**
   * Verify certificate authenticity
   */
  static async verifyCertificate(
    verificationCode: string
  ): Promise<{
    is_valid: boolean;
    certificate?: TrainingCertificate;
    message: string;
  }> {
    return apiHelpers.get(`${this.baseUrl}/certificates/verify/${verificationCode}/`);
  }

  // ============================================================================
  // COMPLIANCE & REPORTING
  // ============================================================================

  /**
   * Get training statistics overview
   */
  static async getTrainingStats(
    filters?: {
      date_from?: string;
      date_to?: string;
      department?: string;
      role?: string;
    }
  ): Promise<TrainingStats> {
    return apiHelpers.get(`${this.baseUrl}/statistics/`, filters);
  }

  /**
   * Get compliance report
   */
  static async getComplianceReport(
    daysAhead: number = 30
  ): Promise<ComplianceReport> {
    return apiHelpers.get(`${this.baseUrl}/user-records/compliance_report/`, {
      days_ahead: daysAhead
    });
  }

  /**
   * Get expiring training records
   */
  static async getExpiringTraining(
    withinDays: number = 30
  ): Promise<UserTrainingRecord[]> {
    return apiHelpers.get(`${this.baseUrl}/user-records/expiring_soon/`, {
      within_days: withinDays
    });
  }

  /**
   * Get overdue training records
   */
  static async getOverdueTraining(): Promise<UserTrainingRecord[]> {
    return apiHelpers.get(`${this.baseUrl}/user-records/overdue/`);
  }

  /**
   * Get detailed analytics for a training program
   */
  static async getProgramAnalytics(
    programId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<TrainingAnalytics> {
    const params = {
      date_from: dateFrom,
      date_to: dateTo
    };
    return apiHelpers.get(`${this.baseUrl}/programs/${programId}/analytics/`, params);
  }

  // ============================================================================
  // DANGEROUS GOODS SPECIFIC
  // ============================================================================

  /**
   * Get training programs for specific hazard classes
   */
  static async getTrainingByHazardClass(
    hazardClasses: string[]
  ): Promise<TrainingProgram[]> {
    return apiHelpers.get(`${this.baseUrl}/programs/by-hazard-class/`, {
      hazard_classes: hazardClasses.join(',')
    });
  }

  /**
   * Get training programs covering specific UN numbers
   */
  static async getTrainingByUNNumbers(
    unNumbers: string[]
  ): Promise<TrainingProgram[]> {
    return apiHelpers.get(`${this.baseUrl}/programs/by-un-numbers/`, {
      un_numbers: unNumbers.join(',')
    });
  }

  /**
   * Get user's dangerous goods qualifications
   */
  static async getDGQualifications(
    userId?: string
  ): Promise<{
    qualified_hazard_classes: string[];
    qualified_un_numbers: string[];
    expired_qualifications: any[];
    pending_renewals: any[];
  }> {
    return apiHelpers.get(`${this.baseUrl}/user-records/dg-qualifications/`, {
      user: userId
    });
  }

  /**
   * Validate if user is qualified for specific dangerous goods
   */
  static async validateDGQualification(
    userId: string,
    hazardClass: string,
    unNumber?: string
  ): Promise<{
    is_qualified: boolean;
    required_training: TrainingProgram[];
    expiring_soon: UserTrainingRecord[];
    message: string;
  }> {
    return apiHelpers.post(`${this.baseUrl}/validate-dg-qualification/`, {
      user_id: userId,
      hazard_class: hazardClass,
      un_number: unNumber
    });
  }

  // ============================================================================
  // ADMINISTRATIVE FUNCTIONS
  // ============================================================================

  /**
   * Extend training deadline
   */
  static async extendTrainingDeadline(
    recordId: string,
    extensionDays: number,
    reason: string
  ): Promise<UserTrainingRecord> {
    return apiHelpers.post(`${this.baseUrl}/user-records/${recordId}/extend_deadline/`, {
      extension_days: extensionDays,
      reason
    });
  }

  /**
   * Send training reminder
   */
  static async sendTrainingReminder(
    recordIds: string[],
    message?: string
  ): Promise<{ sent: number; failed: number }> {
    return apiHelpers.post(`${this.baseUrl}/user-records/send_reminders/`, {
      record_ids: recordIds,
      custom_message: message
    });
  }

  /**
   * Export training data
   */
  static async exportTrainingData(
    format: 'csv' | 'excel' | 'pdf',
    filters?: UserTrainingFilters
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/user-records/export/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({
        format,
        filters: filters || {}
      })
    });

    if (!response.ok) {
      throw new Error('Failed to export training data');
    }

    return response.blob();
  }

  /**
   * Get training calendar events
   */
  static async getTrainingCalendar(
    userId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    scheduled_training: any[];
    due_dates: any[];
    expiration_dates: any[];
  }> {
    const params = {
      user: userId,
      date_from: dateFrom,
      date_to: dateTo
    };
    return apiHelpers.get(`${this.baseUrl}/calendar/`, params);
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get training content streaming URL
   */
  static getStreamingUrl(moduleId: string, contentType: 'video' | 'audio'): string {
    return `${this.baseUrl}/modules/${moduleId}/stream/${contentType}/`;
  }

  /**
   * Download training resource
   */
  static async downloadResource(resourceId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/resources/${resourceId}/download/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download resource');
    }
    
    return response.blob();
  }

  /**
   * Track user activity for analytics
   */
  static async trackActivity(
    recordId: string,
    moduleId: string,
    activityType: string,
    data?: any
  ): Promise<void> {
    await apiHelpers.post(`${this.baseUrl}/track-activity/`, {
      record_id: recordId,
      module_id: moduleId,
      activity_type: activityType,
      data
    });
  }
}

export default TrainingService;
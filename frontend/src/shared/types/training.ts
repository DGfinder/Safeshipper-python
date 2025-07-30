/**
 * Enhanced TypeScript interfaces for SafeShipper Training System
 * Comprehensive type definitions for dangerous goods training management
 */

// Core Training Types
export interface TrainingCategory {
  id: string;
  name: string;
  description: string;
  is_mandatory: boolean;
  color_code?: string;
  icon?: string;
  order: number;
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  category: TrainingCategory;
  delivery_method: 'online' | 'blended' | 'hands_on' | 'virtual_reality' | 'self_paced';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration_hours: number;
  is_mandatory: boolean;
  passing_score: number;
  certificate_validity_months?: number;
  prerequisite_programs: string[];
  applicable_roles: string[];
  created_at: string;
  updated_at: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  program_id: string;
  module_type: 'lesson' | 'quiz' | 'assessment' | 'practical' | 'video' | 'reading' | 'simulation' | 'vr_training';
  order: number;
  is_mandatory: boolean;
  estimated_duration_minutes: number;
  content_url?: string;
  content_type?: 'video' | 'document' | 'interactive' | 'scorm';
  video_url?: string;
  document_url?: string;
  interactive_content?: any;
  scorm_package?: string;
  status: 'draft' | 'published' | 'archived';
  
  // Dangerous Goods Specific Fields
  applicable_un_numbers: string[];
  hazard_classes_covered: string[];
  emergency_procedures: string[];
  regulatory_framework: ('ADG' | 'IATA' | 'IMDG')[];
  
  // Content Metadata
  learning_objectives: string[];
  key_topics: string[];
  resources: TrainingResource[];
  assessments: TrainingAssessment[];
  
  created_at: string;
  updated_at: string;
}

export interface TrainingResource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'image' | 'simulation';
  url: string;
  description?: string;
  file_size?: number;
  duration?: number;
  is_downloadable: boolean;
}

export interface TrainingAssessment {
  id: string;
  title: string;
  type: 'quiz' | 'practical' | 'simulation' | 'oral' | 'written';
  questions_count: number;
  time_limit_minutes?: number;
  passing_score: number;
  max_attempts: number;
  is_mandatory: boolean;
}

export interface TrainingQuestion {
  id: string;
  module_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'matching' | 'scenario';
  hazard_class_focus?: string;
  un_number_context?: string;
  difficulty_level: 'easy' | 'medium' | 'hard' | 'expert';
  points_value: number;
  answers: QuestionAnswer[];
  correct_answer: string | string[];
  explanation: string;
  media_url?: string;
  regulatory_reference?: string;
  created_at: string;
}

export interface QuestionAnswer {
  id: string;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

// User Training Records
export interface UserTrainingRecord {
  id: string;
  user_details: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    role: string;
    department?: string;
    employee_id?: string;
  };
  program_details: TrainingProgram;
  progress_status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired' | 'suspended';
  overall_progress_percentage: number;
  completion_percentage_display: string;
  enrolled_at: string;
  started_at?: string;
  last_accessed_at?: string;
  completed_at?: string;
  best_score?: number;
  latest_score?: number;
  passed: boolean;
  
  // Compliance Fields
  compliance_status: 'compliant' | 'non_compliant' | 'pending_renewal' | 'overdue' | 'exempt';
  is_mandatory_for_role: boolean;
  required_by_date?: string;
  is_overdue: boolean;
  
  // Certificate Fields
  certificate_issued: boolean;
  certificate_number?: string;
  certificate_issued_at?: string;
  certificate_expires_at?: string;
  certificate_renewed_count: number;
  days_until_expiry?: number;
  
  // Progress Tracking
  total_time_spent_minutes: number;
  time_spent_formatted: string;
  estimated_completion_time_minutes?: number;
  estimated_time_formatted: string;
  modules_completed: number;
  total_modules: number;
  
  // Renewal Information
  renewal_due_date?: string;
  days_until_renewal?: number;
  is_due_for_renewal: boolean;
  
  // Current Progress
  next_incomplete_module?: {
    id: string;
    title: string;
    module_type: string;
    estimated_duration_minutes: number;
  };
  
  created_at: string;
  updated_at: string;
}

export interface UserModuleProgress {
  id: string;
  user_training_record: string;
  module_id: string;
  module_details: TrainingModule;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  progress_percentage: number;
  time_spent_minutes: number;
  started_at?: string;
  completed_at?: string;
  last_position?: string; // For video/content bookmarking
  notes?: string;
  bookmarks: TrainingBookmark[];
  attempts: TrainingAttempt[];
  created_at: string;
  updated_at: string;
}

export interface TrainingBookmark {
  id: string;
  title: string;
  position: string; // Video timestamp or page number
  notes?: string;
  created_at: string;
}

export interface TrainingAttempt {
  id: string;
  user_record_id: string;
  module_id: string;
  attempt_number: number;
  started_at: string;
  completed_at?: string;
  score: number;
  passed: boolean;
  time_taken_minutes: number;
  question_responses: QuestionResponse[];
  feedback_provided?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface QuestionResponse {
  question_id: string;
  user_answer: string | string[];
  is_correct: boolean;
  points_earned: number;
  time_spent_seconds: number;
  attempt_count: number;
}

// Training Certificates
export interface TrainingCertificate {
  id: string;
  user_record_id: string;
  certificate_type: 'completion' | 'competency' | 'refresher' | 'advanced';
  certificate_number: string;
  issued_at: string;
  expires_at?: string;
  verification_code: string;
  digital_signature: string;
  qr_code_data: string;
  certificate_file: string;
  blockchain_hash?: string;
  sharing_url?: string;
  download_count: number;
  
  // Certificate Details
  program_name: string;
  user_name: string;
  completion_date: string;
  final_score: number;
  instructor_name?: string;
  accreditation_body?: string;
  
  created_at: string;
  updated_at: string;
}

// Analytics and Reporting
export interface TrainingStats {
  total_records: number;
  compliant_records: number;
  in_progress_records: number;
  overdue_records: number;
  expiring_soon_count: number;
  expired_count: number;
  average_completion_time: number;
  compliance_percentage: number;
  
  // Additional Enhanced Stats
  total_modules_completed: number;
  average_score: number;
  certificate_issuance_rate: number;
  time_to_completion_avg_days: number;
  dropout_rate: number;
}

export interface ComplianceReport {
  expiring_soon: UserTrainingRecord[];
  expired: UserTrainingRecord[];
  overdue: UserTrainingRecord[];
  summary: {
    total_records: number;
    expiring_soon_count: number;
    expired_count: number;
    overdue_count: number;
    compliance_percentage: number;
  };
}

export interface TrainingAnalytics {
  program_id: string;
  program_name: string;
  enrollment_count: number;
  completion_rate: number;
  average_score: number;
  average_completion_time_hours: number;
  pass_rate: number;
  dropout_rate: number;
  satisfaction_score?: number;
  
  // Time-based metrics
  completions_by_month: { month: string; count: number }[];
  scores_distribution: { range: string; count: number }[];
  time_spent_distribution: { range: string; count: number }[];
  
  // Dangerous Goods Specific
  hazard_class_performance: { hazard_class: string; average_score: number }[];
  un_number_coverage: { un_number: string; training_count: number }[];
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TrainingAPIFilters {
  category?: string;
  difficulty_level?: string;
  delivery_method?: string;
  is_mandatory?: boolean;
  hazard_class?: string;
  un_number?: string;
  status?: string;
  search?: string;
  prerequisite_completed?: boolean;
}

export interface UserTrainingFilters {
  progress_status?: string;
  compliance_status?: string;
  is_overdue?: boolean;
  expiring_within_days?: number;
  program?: string;
  user_role?: string;
  department?: string;
  search?: string;
}

// Enhanced Training Enums
export const TRAINING_DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate', 
  ADVANCED: 'advanced',
  EXPERT: 'expert'
} as const;

export const TRAINING_DELIVERY_METHODS = {
  ONLINE: 'online',
  BLENDED: 'blended',
  HANDS_ON: 'hands_on',
  VIRTUAL_REALITY: 'virtual_reality',
  SELF_PACED: 'self_paced'
} as const;

export const TRAINING_MODULE_TYPES = {
  LESSON: 'lesson',
  QUIZ: 'quiz',
  ASSESSMENT: 'assessment',
  PRACTICAL: 'practical',
  VIDEO: 'video',
  READING: 'reading',
  SIMULATION: 'simulation',
  VR_TRAINING: 'vr_training'
} as const;

export const PROGRESS_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended'
} as const;

export const COMPLIANCE_STATUS = {
  COMPLIANT: 'compliant',
  NON_COMPLIANT: 'non_compliant',
  PENDING_RENEWAL: 'pending_renewal',
  OVERDUE: 'overdue',
  EXEMPT: 'exempt'
} as const;

export const HAZARD_CLASSES = {
  CLASS_1: '1',
  CLASS_2: '2',
  CLASS_3: '3',
  CLASS_4: '4',
  CLASS_5: '5',
  CLASS_6: '6',
  CLASS_7: '7',
  CLASS_8: '8',
  CLASS_9: '9'
} as const;

export const REGULATORY_FRAMEWORKS = {
  ADG: 'ADG',
  IATA: 'IATA',
  IMDG: 'IMDG'
} as const;

export type TrainingDifficultyLevel = typeof TRAINING_DIFFICULTY_LEVELS[keyof typeof TRAINING_DIFFICULTY_LEVELS];
export type TrainingDeliveryMethod = typeof TRAINING_DELIVERY_METHODS[keyof typeof TRAINING_DELIVERY_METHODS];
export type TrainingModuleType = typeof TRAINING_MODULE_TYPES[keyof typeof TRAINING_MODULE_TYPES];
export type ProgressStatus = typeof PROGRESS_STATUS[keyof typeof PROGRESS_STATUS];
export type ComplianceStatus = typeof COMPLIANCE_STATUS[keyof typeof COMPLIANCE_STATUS];
export type HazardClass = typeof HAZARD_CLASSES[keyof typeof HAZARD_CLASSES];
export type RegulatoryFramework = typeof REGULATORY_FRAMEWORKS[keyof typeof REGULATORY_FRAMEWORKS];
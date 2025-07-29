# training/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    TrainingCategory, TrainingProgram, TrainingSession, 
    TrainingEnrollment, TrainingRecord, ComplianceRequirement, ComplianceStatus,
    TrainingModule, UserTrainingRecord, UserModuleProgress
)
from .adg_driver_qualifications import (
    DriverLicense, ADGDriverCertificate, DriverCompetencyProfile
)

User = get_user_model()


# Core Training System Serializers

class TrainingCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingCategory
        fields = [
            'id', 'name', 'description', 'is_mandatory', 
            'renewal_period_months', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TrainingProgramSerializer(serializers.ModelSerializer):
    category_details = TrainingCategorySerializer(source='category', read_only=True)
    instructor_name = serializers.CharField(source='instructor.get_full_name', read_only=True)
    
    class Meta:
        model = TrainingProgram
        fields = [
            'id', 'name', 'description', 'category', 'category_details',
            'delivery_method', 'difficulty_level', 'duration_hours',
            'learning_objectives', 'content_outline', 'materials_url',
            'is_mandatory', 'compliance_required', 'passing_score',
            'certificate_validity_months', 'instructor', 'instructor_name',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TrainingSessionSerializer(serializers.ModelSerializer):
    program_details = TrainingProgramSerializer(source='program', read_only=True)
    instructor_name = serializers.CharField(source='instructor.get_full_name', read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)
    available_spots = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TrainingSession
        fields = [
            'id', 'program', 'program_details', 'session_name',
            'instructor', 'instructor_name', 'scheduled_date', 'duration_hours',
            'location', 'max_participants', 'enrolled_count', 'available_spots',
            'status', 'session_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TrainingEnrollmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    session_details = TrainingSessionSerializer(source='session', read_only=True)
    
    class Meta:
        model = TrainingEnrollment
        fields = [
            'id', 'employee', 'employee_name', 'session', 'session_details',
            'status', 'enrolled_at', 'completed_at', 'score', 'passed',
            'feedback', 'rating', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'enrolled_at', 'created_at', 'updated_at']


class TrainingRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    program_details = TrainingProgramSerializer(source='program', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = TrainingRecord
        fields = [
            'id', 'employee', 'employee_name', 'program', 'program_details',
            'completed_at', 'score', 'passed', 'certificate_number',
            'certificate_issued_at', 'certificate_expires_at', 'days_until_expiry',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'certificate_issued_at', 'created_at', 'updated_at']
    
    def get_days_until_expiry(self, obj):
        if obj.certificate_expires_at:
            from django.utils import timezone
            return (obj.certificate_expires_at.date() - timezone.now().date()).days
        return None


class ComplianceRequirementSerializer(serializers.ModelSerializer):
    required_programs_details = TrainingProgramSerializer(source='required_programs', many=True, read_only=True)
    
    class Meta:
        model = ComplianceRequirement
        fields = [
            'id', 'name', 'description', 'applicable_roles', 'applicable_departments',
            'required_programs', 'required_programs_details', 'deadline_days',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ADG Driver Qualification Serializers

class DriverLicenseSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    is_valid_for_dangerous_goods = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DriverLicense
        fields = [
            'id', 'driver', 'driver_name', 'license_number', 'license_class',
            'state_issued', 'issue_date', 'expiry_date', 'days_until_expiry',
            'endorsements', 'restrictions', 'status', 'is_valid_for_dangerous_goods',
            'verified_by', 'verified_by_name', 'verified_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']
    
    def get_days_until_expiry(self, obj):
        from django.utils import timezone
        return (obj.expiry_date - timezone.now().date()).days


class ADGDriverCertificateSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    certificate_type_display = serializers.CharField(source='get_certificate_type_display', read_only=True)
    training_program_name = serializers.CharField(source='training_program.name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = ADGDriverCertificate
        fields = [
            'id', 'driver', 'driver_name', 'certificate_type', 'certificate_type_display',
            'certificate_number', 'issuing_authority', 'issue_date', 'expiry_date',
            'days_until_expiry', 'training_program', 'training_program_name',
            'hazard_classes_covered', 'competency_areas', 'status',
            'verified_by', 'verified_by_name', 'verified_at',
            'certificate_file', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']
    
    def get_days_until_expiry(self, obj):
        from django.utils import timezone
        return (obj.expiry_date - timezone.now().date()).days


class DriverCompetencyProfileSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    driver_email = serializers.CharField(source='driver.email', read_only=True)
    overall_status_display = serializers.CharField(source='get_overall_status_display', read_only=True)
    
    # Related data
    driver_licenses = DriverLicenseSerializer(source='driver.driver_licenses', many=True, read_only=True)
    adg_certificates = ADGDriverCertificateSerializer(source='driver.adg_certificates', many=True, read_only=True)
    
    # Calculated fields
    days_until_medical_expiry = serializers.SerializerMethodField()
    days_until_next_assessment = serializers.SerializerMethodField()
    
    class Meta:
        model = DriverCompetencyProfile
        fields = [
            'id', 'driver', 'driver_name', 'driver_email',
            'overall_status', 'overall_status_display', 'qualified_hazard_classes',
            'years_experience', 'total_loads_transported', 'last_incident_date',
            'last_assessment_date', 'next_assessment_due', 'days_until_next_assessment',
            'assessment_score', 'medical_certificate_expiry', 'days_until_medical_expiry',
            'competency_notes', 'restrictions', 'compliance_percentage',
            'driver_licenses', 'adg_certificates',
            'last_updated', 'created_at'
        ]
        read_only_fields = ['id', 'compliance_percentage', 'last_updated', 'created_at']
    
    def get_days_until_medical_expiry(self, obj):
        if obj.medical_certificate_expiry:
            from django.utils import timezone
            return (obj.medical_certificate_expiry - timezone.now().date()).days
        return None
    
    def get_days_until_next_assessment(self, obj):
        if obj.next_assessment_due:
            from django.utils import timezone
            return (obj.next_assessment_due - timezone.now().date()).days
        return None


# Validation and Report Serializers

class DriverQualificationValidationSerializer(serializers.Serializer):
    """Serializer for driver qualification validation results"""
    
    driver_id = serializers.UUIDField(read_only=True)
    driver_name = serializers.CharField(read_only=True)
    overall_qualified = serializers.BooleanField(read_only=True)
    overall_status = serializers.CharField(read_only=True)
    compliance_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    profile_issues = serializers.ListField(child=serializers.CharField(), read_only=True)
    class_validations = serializers.DictField(read_only=True)
    critical_issues = serializers.ListField(child=serializers.CharField(), read_only=True)
    warnings = serializers.ListField(child=serializers.CharField(), read_only=True)
    
    def to_representation(self, instance):
        """Enhanced representation with additional details"""
        data = super().to_representation(instance)
        
        # Add summary of class validations
        if 'class_validations' in data:
            class_summary = {}
            for dg_class, validation in data['class_validations'].items():
                class_summary[dg_class] = {
                    'qualified': validation['qualified'],
                    'issue_count': len(validation['issues'])
                }
            data['class_validation_summary'] = class_summary
        
        return data


class FleetCompetencyReportSerializer(serializers.Serializer):
    """Serializer for fleet competency reports"""
    
    total_drivers = serializers.IntegerField(read_only=True)
    fully_qualified = serializers.IntegerField(read_only=True)
    partially_qualified = serializers.IntegerField(read_only=True)
    not_qualified = serializers.IntegerField(read_only=True)
    expired_qualifications = serializers.IntegerField(read_only=True)
    pending_verification = serializers.IntegerField(read_only=True)
    
    average_compliance = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    drivers_by_class = serializers.DictField(read_only=True)
    expiring_qualifications = serializers.ListField(read_only=True)
    compliance_summary = serializers.ListField(read_only=True)
    
    generated_at = serializers.DateTimeField(read_only=True)
    regulatory_framework = serializers.CharField(read_only=True)
    
    def to_representation(self, instance):
        """Add percentage calculations"""
        data = super().to_representation(instance)
        
        total = data.get('total_drivers', 0)
        if total > 0:
            data['qualification_percentages'] = {
                'fully_qualified': round((data.get('fully_qualified', 0) / total) * 100, 2),
                'partially_qualified': round((data.get('partially_qualified', 0) / total) * 100, 2),
                'not_qualified': round((data.get('not_qualified', 0) / total) * 100, 2),
                'expired_qualifications': round((data.get('expired_qualifications', 0) / total) * 100, 2),
                'pending_verification': round((data.get('pending_verification', 0) / total) * 100, 2)
            }
        else:
            data['qualification_percentages'] = {
                'fully_qualified': 0,
                'partially_qualified': 0,
                'not_qualified': 0,
                'expired_qualifications': 0,
                'pending_verification': 0
            }
        
        # Add critical metrics
        data['critical_metrics'] = {
            'compliance_rate': data.get('average_compliance', 0),
            'total_hazard_classes_covered': len(data.get('drivers_by_class', {})),
            'drivers_with_expiring_qualifications': len(data.get('expiring_qualifications', [])),
            'overall_fleet_status': self._determine_fleet_status(data)
        }
        
        return data
    
    def _determine_fleet_status(self, data):
        """Determine overall fleet qualification status"""
        total = data.get('total_drivers', 0)
        if total == 0:
            return 'NO_DRIVERS'
        
        fully_qualified_percent = (data.get('fully_qualified', 0) / total) * 100
        
        if fully_qualified_percent >= 80:
            return 'EXCELLENT'
        elif fully_qualified_percent >= 60:
            return 'GOOD'
        elif fully_qualified_percent >= 40:
            return 'NEEDS_IMPROVEMENT'
        else:
            return 'CRITICAL'


# User Profile Extension Serializer

class DriverProfileSerializer(serializers.ModelSerializer):
    """Extended user profile for drivers with qualification information"""
    
    competency_profile = DriverCompetencyProfileSerializer(read_only=True)
    active_licenses = DriverLicenseSerializer(
        source='driver_licenses.filter',
        many=True,
        read_only=True
    )
    active_certificates = ADGDriverCertificateSerializer(
        source='adg_certificates.filter',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'is_active', 'competency_profile',
            'active_licenses', 'active_certificates'
        ]
        read_only_fields = ['id', 'username', 'role']
    
    def to_representation(self, instance):
        """Filter for active qualifications only"""
        data = super().to_representation(instance)
        
        # Filter active licenses
        active_licenses = instance.driver_licenses.filter(
            status__in=[DriverLicense.LicenseStatus.VALID, DriverLicense.LicenseStatus.EXPIRING_SOON]
        )
        data['active_licenses'] = DriverLicenseSerializer(active_licenses, many=True).data
        
        # Filter active certificates
        active_certificates = instance.adg_certificates.filter(
            status__in=[ADGDriverCertificate.CertificateStatus.VALID, 
                       ADGDriverCertificate.CertificateStatus.EXPIRING_SOON]
        )
        data['active_certificates'] = ADGDriverCertificateSerializer(active_certificates, many=True).data
        
        return data


# Enhanced Training Management Serializers (TrainingModule and UserTrainingRecord)

class TrainingModuleSerializer(serializers.ModelSerializer):
    """Serializer for training modules within programs"""
    
    program_name = serializers.CharField(source='program.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    completion_rate = serializers.FloatField(read_only=True)
    next_module = serializers.SerializerMethodField()
    previous_module = serializers.SerializerMethodField()
    
    class Meta:
        model = TrainingModule
        fields = [
            'id', 'program', 'program_name', 'title', 'description', 'module_type',
            'order', 'is_mandatory', 'content', 'video_url', 'document_url', 'external_link',
            'passing_score', 'max_attempts', 'time_limit_minutes', 'estimated_duration_minutes',
            'completion_criteria', 'status', 'created_by', 'created_by_name', 'completion_rate',
            'next_module', 'previous_module', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'completion_rate', 'created_at', 'updated_at']
    
    def get_next_module(self, obj):
        next_module = obj.get_next_module()
        if next_module:
            return {'id': next_module.id, 'title': next_module.title, 'order': next_module.order}
        return None
    
    def get_previous_module(self, obj):
        previous_module = obj.get_previous_module()
        if previous_module:
            return {'id': previous_module.id, 'title': previous_module.title, 'order': previous_module.order}
        return None


class TrainingModuleLightSerializer(serializers.ModelSerializer):
    """Lightweight serializer for training modules in lists"""
    
    class Meta:
        model = TrainingModule
        fields = [
            'id', 'title', 'module_type', 'order', 'is_mandatory',
            'estimated_duration_minutes', 'status'
        ]


class UserModuleProgressSerializer(serializers.ModelSerializer):
    """Serializer for user progress on individual modules"""
    
    module_details = TrainingModuleLightSerializer(source='module', read_only=True)
    user_name = serializers.CharField(source='user_record.user.get_full_name', read_only=True)
    time_spent_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = UserModuleProgress
        fields = [
            'id', 'user_record', 'module', 'module_details', 'user_name',
            'status', 'progress_percentage', 'started_at', 'completed_at',
            'time_spent_minutes', 'time_spent_formatted', 'attempts_count',
            'best_score', 'latest_score', 'passed', 'last_position',
            'bookmarked_positions', 'interaction_data', 'user_notes',
            'completion_feedback', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'time_spent_formatted', 'created_at', 'updated_at']
    
    def get_time_spent_formatted(self, obj):
        if obj.time_spent_minutes == 0:
            return "0m"
        
        hours = obj.time_spent_minutes // 60
        minutes = obj.time_spent_minutes % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
        return f"{minutes}m"


class UserTrainingRecordSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for user training records with expiration tracking"""
    
    user_details = serializers.SerializerMethodField()
    program_details = TrainingProgramSerializer(source='program', read_only=True)
    enrollment_details = TrainingEnrollmentSerializer(source='enrollment', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    module_progress = UserModuleProgressSerializer(many=True, read_only=True)
    
    # Progress and time calculations
    time_spent_formatted = serializers.SerializerMethodField()
    estimated_time_formatted = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    days_until_renewal = serializers.SerializerMethodField()
    is_due_for_renewal = serializers.SerializerMethodField()
    next_incomplete_module = serializers.SerializerMethodField()
    
    # Status indicators
    is_overdue = serializers.SerializerMethodField()
    completion_percentage_display = serializers.SerializerMethodField()
    
    class Meta:
        model = UserTrainingRecord
        fields = [
            'id', 'user', 'user_details', 'program', 'program_details', 'enrollment', 'enrollment_details',
            'progress_status', 'overall_progress_percentage', 'completion_percentage_display',
            'started_at', 'last_accessed_at', 'completed_at', 'total_attempts', 'best_score', 'latest_score', 'passed',
            'compliance_status', 'is_mandatory_for_role', 'required_by_date', 'is_overdue',
            'certificate_issued', 'certificate_number', 'certificate_issued_at', 'certificate_expires_at', 
            'certificate_renewed_count', 'days_until_expiry',
            'total_time_spent_minutes', 'time_spent_formatted', 'estimated_completion_time_minutes', 'estimated_time_formatted',
            'modules_completed', 'total_modules', 'bookmarks', 'notes', 'next_incomplete_module',
            'assigned_by', 'assigned_by_name', 'supervisor_approved', 'supervisor_approval_date', 'supervisor_notes',
            'renewal_due_date', 'days_until_renewal', 'is_due_for_renewal', 'renewal_reminders_sent', 'last_reminder_sent',
            'module_progress', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'overall_progress_percentage', 'modules_completed', 'total_modules',
            'time_spent_formatted', 'estimated_time_formatted', 'days_until_expiry', 
            'days_until_renewal', 'is_due_for_renewal', 'is_overdue', 'completion_percentage_display',
            'next_incomplete_module', 'created_at', 'updated_at'
        ]
    
    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'full_name': obj.user.get_full_name(),
            'email': obj.user.email,
            'role': getattr(obj.user, 'role', None)
        }
    
    def get_time_spent_formatted(self, obj):
        return obj.get_time_spent_formatted()
    
    def get_estimated_time_formatted(self, obj):
        if not obj.estimated_completion_time_minutes:
            return "Unknown"
        
        hours = obj.estimated_completion_time_minutes // 60
        minutes = obj.estimated_completion_time_minutes % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
        return f"{minutes}m"
    
    def get_days_until_expiry(self, obj):
        if not obj.certificate_expires_at:
            return None
        
        from django.utils import timezone
        days = (obj.certificate_expires_at.date() - timezone.now().date()).days
        return max(0, days)
    
    def get_days_until_renewal(self, obj):
        if not obj.renewal_due_date:
            return None
        
        from django.utils import timezone
        days = (obj.renewal_due_date - timezone.now().date()).days
        return max(0, days)
    
    def get_is_due_for_renewal(self, obj):
        return obj.is_due_for_renewal()
    
    def get_is_overdue(self, obj):
        if not obj.required_by_date:
            return False
        
        from django.utils import timezone
        return obj.required_by_date < timezone.now().date() and obj.progress_status != 'completed'
    
    def get_completion_percentage_display(self, obj):
        return f"{obj.overall_progress_percentage:.1f}%"
    
    def get_next_incomplete_module(self, obj):
        next_module = obj.get_next_module()
        if next_module:
            return {
                'id': next_module.id,
                'title': next_module.title,
                'module_type': next_module.module_type,
                'estimated_duration_minutes': next_module.estimated_duration_minutes
            }
        return None


class UserTrainingRecordListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for training record lists"""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    time_spent_formatted = serializers.CharField(source='get_time_spent_formatted', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = UserTrainingRecord
        fields = [
            'id', 'user', 'user_name', 'program', 'program_name',
            'progress_status', 'overall_progress_percentage', 'compliance_status',
            'completed_at', 'certificate_expires_at', 'days_until_expiry',
            'is_mandatory_for_role', 'required_by_date', 'is_overdue',
            'time_spent_formatted', 'renewal_due_date'
        ]
    
    def get_days_until_expiry(self, obj):
        if not obj.certificate_expires_at:
            return None
        
        from django.utils import timezone
        days = (obj.certificate_expires_at.date() - timezone.now().date()).days
        return max(0, days)
    
    def get_is_overdue(self, obj):
        if not obj.required_by_date:
            return False
        
        from django.utils import timezone
        return obj.required_by_date < timezone.now().date() and obj.progress_status != 'completed'


class TrainingExpirationReportSerializer(serializers.Serializer):
    """Serializer for training expiration reports"""
    
    expiring_soon = UserTrainingRecordListSerializer(many=True, read_only=True)
    expired = UserTrainingRecordListSerializer(many=True, read_only=True)
    overdue = UserTrainingRecordListSerializer(many=True, read_only=True)
    summary = serializers.DictField(read_only=True)
    
    def to_representation(self, instance):
        return {
            'expiring_soon': instance.get('expiring_soon', []),
            'expired': instance.get('expired', []),
            'overdue': instance.get('overdue', []),
            'summary': {
                'total_records': instance.get('total_records', 0),
                'expiring_soon_count': len(instance.get('expiring_soon', [])),
                'expired_count': len(instance.get('expired', [])),
                'overdue_count': len(instance.get('overdue', [])),
                'compliance_percentage': instance.get('compliance_percentage', 0)
            }
        }
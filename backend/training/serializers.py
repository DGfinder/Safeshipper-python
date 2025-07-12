# training/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    TrainingCategory, TrainingProgram, TrainingSession, 
    TrainingEnrollment, TrainingRecord, ComplianceRequirement, ComplianceStatus
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
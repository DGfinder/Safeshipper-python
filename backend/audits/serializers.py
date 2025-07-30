from rest_framework import serializers
from .models import (
    AuditLog, ShipmentAuditLog, ComplianceAuditLog, 
    DangerousGoodsAuditLog, AuditMetrics
)
from users.models import User
from companies.models import Company
from django.contrib.contenttypes.models import ContentType


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for audit logs"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']


class ContentTypeSerializer(serializers.ModelSerializer):
    """Content type serializer for generic relations"""
    
    class Meta:
        model = ContentType
        fields = ['id', 'app_label', 'model']
        read_only_fields = ['id', 'app_label', 'model']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit log entries"""
    
    user = UserBasicSerializer(read_only=True)
    content_type = ContentTypeSerializer(read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'action_type', 'action_type_display', 'action_description',
            'user', 'user_role', 'content_type', 'object_id',
            'old_values', 'new_values', 'ip_address', 'user_agent',
            'session_key', 'metadata', 'timestamp'
        ]
        read_only_fields = [
            'id', 'action_type', 'action_type_display', 'action_description',
            'user', 'user_role', 'content_type', 'object_id',
            'old_values', 'new_values', 'ip_address', 'user_agent',
            'session_key', 'metadata', 'timestamp'
        ]


class ShipmentAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for shipment-specific audit logs"""
    
    audit_log = AuditLogSerializer(read_only=True)
    impact_level_display = serializers.CharField(source='get_impact_level_display', read_only=True)
    
    class Meta:
        model = ShipmentAuditLog
        fields = [
            'id', 'shipment', 'audit_log', 'previous_status', 'new_status',
            'location_at_time', 'assigned_vehicle', 'assigned_driver',
            'impact_level', 'impact_level_display'
        ]
        read_only_fields = [
            'id', 'shipment', 'audit_log', 'previous_status', 'new_status',
            'location_at_time', 'assigned_vehicle', 'assigned_driver',
            'impact_level', 'impact_level_display'
        ]


class ComplianceAuditLogSerializer(serializers.ModelSerializer):
    """Enhanced serializer for compliance-specific audit logs with dangerous goods support"""
    
    audit_log = AuditLogSerializer(read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    regulation_type_display = serializers.CharField(source='get_regulation_type_display', read_only=True)
    compliance_status_display = serializers.CharField(source='get_compliance_status_display', read_only=True)
    remediation_status_display = serializers.CharField(source='get_remediation_status_display', read_only=True)
    
    # Calculated fields
    days_until_remediation = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceAuditLog
        fields = [
            'id', 'audit_log', 'company', 'company_name',
            'regulation_type', 'regulation_type_display',
            'compliance_status', 'compliance_status_display',
            'un_numbers_affected', 'hazard_classes_affected',
            'shipment_reference', 'vehicle_reference', 'driver_reference',
            'violation_details', 'risk_assessment_score', 'regulatory_citation',
            'remediation_required', 'remediation_deadline', 'remediation_status',
            'remediation_status_display', 'regulatory_authority_notified',
            'notification_reference', 'estimated_financial_impact',
            'actual_financial_impact', 'compliance_hash',
            'days_until_remediation', 'is_overdue'
        ]
        read_only_fields = [
            'id', 'audit_log', 'company', 'company_name', 'compliance_hash',
            'days_until_remediation', 'is_overdue'
        ]
    
    def get_days_until_remediation(self, obj):
        """Calculate days until remediation deadline"""
        if not obj.remediation_deadline:
            return None
        
        from django.utils import timezone
        delta = obj.remediation_deadline - timezone.now()
        return delta.days
    
    def get_is_overdue(self, obj):
        """Check if remediation is overdue"""
        if not obj.remediation_deadline or not obj.remediation_required:
            return False
        
        from django.utils import timezone
        return (obj.remediation_deadline < timezone.now() and 
                obj.remediation_status not in ['COMPLETED', 'NOT_REQUIRED'])


class DangerousGoodsAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for dangerous goods specific audit logs"""
    
    audit_log = AuditLogSerializer(read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    operation_type_display = serializers.CharField(source='get_operation_type_display', read_only=True)
    quantity_unit_display = serializers.CharField(source='get_quantity_unit_display', read_only=True)
    
    # Calculated fields
    quantity_changed = serializers.SerializerMethodField()
    packaging_changed = serializers.SerializerMethodField()
    overall_compliance = serializers.SerializerMethodField()
    
    class Meta:
        model = DangerousGoodsAuditLog
        fields = [
            'id', 'audit_log', 'company', 'company_name',
            'un_number', 'proper_shipping_name', 'hazard_class',
            'subsidiary_hazard_classes', 'packing_group',
            'operation_type', 'operation_type_display', 'operation_details',
            'quantity_before', 'quantity_after', 'quantity_unit',
            'quantity_unit_display', 'packaging_type_before', 'packaging_type_after',
            'adg_compliant', 'iata_compliant', 'imdg_compliant', 'compliance_notes',
            'emergency_response_guide', 'safety_data_sheet_version',
            'transport_document_number', 'manifest_reference',
            'regulatory_notification_required', 'regulatory_notification_sent',
            'notification_reference_number',
            'quantity_changed', 'packaging_changed', 'overall_compliance'
        ]
        read_only_fields = [
            'id', 'audit_log', 'company', 'company_name',
            'quantity_changed', 'packaging_changed', 'overall_compliance'
        ]
    
    def get_quantity_changed(self, obj):
        """Check if quantity was changed"""
        return (obj.quantity_before is not None and 
                obj.quantity_after is not None and 
                obj.quantity_before != obj.quantity_after)
    
    def get_packaging_changed(self, obj):
        """Check if packaging was changed"""
        return (obj.packaging_type_before and 
                obj.packaging_type_after and 
                obj.packaging_type_before != obj.packaging_type_after)
    
    def get_overall_compliance(self, obj):
        """Calculate overall compliance status"""
        compliance_checks = [obj.adg_compliant, obj.iata_compliant, obj.imdg_compliant]
        total_checks = len([c for c in compliance_checks if c is not None])
        if total_checks == 0:
            return 'UNKNOWN'
        
        compliant_checks = sum(compliance_checks)
        if compliant_checks == total_checks:
            return 'FULLY_COMPLIANT'
        elif compliant_checks > 0:
            return 'PARTIALLY_COMPLIANT'
        else:
            return 'NON_COMPLIANT'


class AuditMetricsSerializer(serializers.ModelSerializer):
    """Serializer for audit metrics and analytics"""
    
    company_name = serializers.CharField(source='company.name', read_only=True)
    period_type_display = serializers.CharField(source='get_period_type_display', read_only=True)
    
    # Calculated fields
    compliance_rate = serializers.SerializerMethodField()
    remediation_completion_rate = serializers.SerializerMethodField()
    security_event_rate = serializers.SerializerMethodField()
    risk_trend = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditMetrics
        fields = [
            'id', 'company', 'company_name', 'date', 'period_type', 'period_type_display',
            'total_audit_events', 'security_events', 'compliance_events',
            'dangerous_goods_events', 'failed_login_attempts',
            'compliance_violations', 'compliance_warnings',
            'remediation_actions_required', 'remediation_actions_completed',
            'average_compliance_score', 'highest_risk_score',
            'unique_users_active', 'most_active_user',
            'data_export_events', 'system_configuration_changes',
            'un_numbers_processed', 'hazard_classes_involved',
            'emergency_procedures_activated', 'calculation_timestamp',
            'compliance_rate', 'remediation_completion_rate',
            'security_event_rate', 'risk_trend'
        ]
        read_only_fields = [
            'id', 'company', 'company_name', 'calculation_timestamp',
            'compliance_rate', 'remediation_completion_rate',
            'security_event_rate', 'risk_trend'
        ]
    
    def get_compliance_rate(self, obj):
        """Calculate overall compliance rate"""
        if obj.compliance_events == 0:
            return 100.0
        
        compliant_events = obj.compliance_events - obj.compliance_violations - obj.compliance_warnings
        return round((compliant_events / obj.compliance_events) * 100, 2)
    
    def get_remediation_completion_rate(self, obj):
        """Calculate remediation completion rate"""
        if obj.remediation_actions_required == 0:
            return 100.0
        
        return round((obj.remediation_actions_completed / obj.remediation_actions_required) * 100, 2)
    
    def get_security_event_rate(self, obj):
        """Calculate security event rate"""
        if obj.total_audit_events == 0:
            return 0.0
        
        return round((obj.security_events / obj.total_audit_events) * 100, 2)
    
    def get_risk_trend(self, obj):
        """Get risk trend indication"""
        if obj.highest_risk_score is None:
            return 'UNKNOWN'
        elif obj.highest_risk_score >= 80:
            return 'HIGH_RISK'
        elif obj.highest_risk_score >= 60:
            return 'MEDIUM_RISK'
        elif obj.highest_risk_score >= 40:
            return 'LOW_RISK'
        else:
            return 'MINIMAL_RISK'


class AuditLogSummarySerializer(serializers.Serializer):
    """Serializer for audit log summary statistics"""
    
    total_actions = serializers.IntegerField()
    actions_by_type = serializers.DictField()
    actions_by_user = serializers.DictField()
    recent_actions = AuditLogSerializer(many=True)
    compliance_issues = serializers.IntegerField()
    high_impact_actions = serializers.IntegerField()
    
    class Meta:
        fields = [
            'total_actions', 'actions_by_type', 'actions_by_user',
            'recent_actions', 'compliance_issues', 'high_impact_actions'
        ]

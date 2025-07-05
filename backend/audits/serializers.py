from rest_framework import serializers
from .models import AuditLog, ShipmentAuditLog, ComplianceAuditLog
from users.models import User
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
    """Serializer for compliance-specific audit logs"""
    
    audit_log = AuditLogSerializer(read_only=True)
    regulation_type_display = serializers.CharField(source='get_regulation_type_display', read_only=True)
    compliance_status_display = serializers.CharField(source='get_compliance_status_display', read_only=True)
    
    class Meta:
        model = ComplianceAuditLog
        fields = [
            'id', 'audit_log', 'regulation_type', 'regulation_type_display',
            'compliance_status', 'compliance_status_display', 'violation_details',
            'remediation_required', 'remediation_deadline'
        ]
        read_only_fields = [
            'id', 'audit_log', 'regulation_type', 'regulation_type_display',
            'compliance_status', 'compliance_status_display', 'violation_details',
            'remediation_required', 'remediation_deadline'
        ]


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

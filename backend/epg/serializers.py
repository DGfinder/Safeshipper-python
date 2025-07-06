# serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import EmergencyProcedureGuide, ShipmentEmergencyPlan, EmergencyIncident
from dangerous_goods.models import DangerousGood
from shipments.models import Shipment
from documents.serializers import DocumentSerializer

User = get_user_model()

class EmergencyProcedureGuideSerializer(serializers.ModelSerializer):
    """Serializer for Emergency Procedure Guide"""
    dangerous_good_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    severity_level_display = serializers.CharField(source='get_severity_level_display', read_only=True)
    is_active = serializers.ReadOnlyField()
    is_due_for_review = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = EmergencyProcedureGuide
        fields = [
            'id', 'dangerous_good', 'dangerous_good_display', 'epg_number', 'title',
            'hazard_class', 'subsidiary_risks', 'emergency_types', 'immediate_actions',
            'personal_protection', 'fire_procedures', 'spill_procedures', 
            'medical_procedures', 'evacuation_procedures', 'notification_requirements',
            'emergency_contacts', 'isolation_distances', 'protective_action_distances',
            'environmental_precautions', 'water_pollution_response', 
            'transport_specific_guidance', 'weather_considerations', 'status',
            'status_display', 'severity_level', 'severity_level_display', 'version',
            'effective_date', 'review_date', 'regulatory_references', 'country_code',
            'is_active', 'is_due_for_review', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_dangerous_good_display(self, obj):
        if obj.dangerous_good:
            return f"{obj.dangerous_good.un_number} - {obj.dangerous_good.proper_shipping_name}"
        return f"Generic Class {obj.hazard_class}"

class EmergencyProcedureGuideListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for EPG lists"""
    dangerous_good_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    severity_level_display = serializers.CharField(source='get_severity_level_display', read_only=True)
    is_active = serializers.ReadOnlyField()
    is_due_for_review = serializers.ReadOnlyField()
    
    class Meta:
        model = EmergencyProcedureGuide
        fields = [
            'id', 'epg_number', 'title', 'dangerous_good_display', 'hazard_class',
            'status', 'status_display', 'severity_level', 'severity_level_display',
            'version', 'effective_date', 'review_date', 'country_code',
            'is_active', 'is_due_for_review', 'created_at', 'updated_at'
        ]
    
    def get_dangerous_good_display(self, obj):
        if obj.dangerous_good:
            return f"{obj.dangerous_good.un_number} - {obj.dangerous_good.proper_shipping_name}"
        return f"Generic Class {obj.hazard_class}"

class ShipmentEmergencyPlanSerializer(serializers.ModelSerializer):
    """Serializer for Shipment Emergency Plan"""
    shipment_display = serializers.CharField(source='shipment.tracking_number', read_only=True)
    referenced_epgs_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = ShipmentEmergencyPlan
        fields = [
            'id', 'shipment', 'shipment_display', 'plan_number', 'referenced_epgs',
            'referenced_epgs_display', 'executive_summary', 'hazard_assessment',
            'immediate_response_actions', 'specialized_procedures', 
            'route_emergency_contacts', 'hospital_locations', 'special_considerations',
            'notification_matrix', 'status', 'status_display', 'generated_at',
            'generated_by', 'generated_by_name', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at', 'approved_by', 'approved_by_name', 'approved_at'
        ]
        read_only_fields = [
            'id', 'plan_number', 'generated_at', 'generated_by', 'generated_by_name'
        ]
    
    def get_referenced_epgs_display(self, obj):
        return [
            {'id': epg.id, 'epg_number': epg.epg_number, 'title': epg.title}
            for epg in obj.referenced_epgs.all()
        ]

class ShipmentEmergencyPlanListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for emergency plan lists"""
    shipment_display = serializers.CharField(source='shipment.tracking_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    epg_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ShipmentEmergencyPlan
        fields = [
            'id', 'shipment', 'shipment_display', 'plan_number', 'status',
            'status_display', 'epg_count', 'generated_at', 'reviewed_at', 'approved_at'
        ]
    
    def get_epg_count(self, obj):
        return obj.referenced_epgs.count()

class EmergencyIncidentSerializer(serializers.ModelSerializer):
    """Serializer for Emergency Incident reporting"""
    shipment_display = serializers.CharField(source='shipment.tracking_number', read_only=True)
    emergency_plan_display = serializers.CharField(source='emergency_plan.plan_number', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    response_effectiveness_display = serializers.CharField(source='get_response_effectiveness_display', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    
    class Meta:
        model = EmergencyIncident
        fields = [
            'id', 'incident_number', 'shipment', 'shipment_display', 'emergency_plan',
            'emergency_plan_display', 'incident_type', 'incident_type_display',
            'severity', 'severity_display', 'location', 'incident_datetime',
            'response_actions_taken', 'response_effectiveness', 
            'response_effectiveness_display', 'lessons_learned', 'epg_improvements',
            'reported_by', 'reported_by_name', 'reported_at'
        ]
        read_only_fields = ['id', 'incident_number', 'reported_at', 'reported_by']

class EPGCreateFromTemplateSerializer(serializers.Serializer):
    """Serializer for creating EPG from template"""
    hazard_class = serializers.CharField(max_length=10)
    dangerous_good = serializers.PrimaryKeyRelatedField(
        queryset=DangerousGood.objects.all(),
        required=False,
        allow_null=True
    )

class EmergencyPlanGenerationSerializer(serializers.Serializer):
    """Serializer for emergency plan generation"""
    shipment = serializers.PrimaryKeyRelatedField(queryset=Shipment.objects.all())
    
    def validate_shipment(self, value):
        # Check if plan already exists
        if hasattr(value, 'emergency_plan'):
            raise serializers.ValidationError(
                "Emergency plan already exists for this shipment"
            )
        return value

class EPGSearchSerializer(serializers.Serializer):
    """Serializer for EPG search parameters"""
    query = serializers.CharField(required=False, allow_blank=True)
    hazard_class = serializers.CharField(required=False, allow_blank=True)
    dangerous_good = serializers.PrimaryKeyRelatedField(
        queryset=DangerousGood.objects.all(),
        required=False,
        allow_null=True
    )
    status = serializers.ChoiceField(
        choices=EmergencyProcedureGuide._meta.get_field('status').choices,
        required=False,
        allow_blank=True
    )
    severity_level = serializers.ChoiceField(
        choices=EmergencyProcedureGuide._meta.get_field('severity_level').choices,
        required=False,
        allow_blank=True
    )
    country_code = serializers.CharField(required=False, allow_blank=True)
    emergency_type = serializers.CharField(required=False, allow_blank=True)
    include_inactive = serializers.BooleanField(required=False, default=False)

class EPGStatisticsSerializer(serializers.Serializer):
    """Serializer for EPG statistics"""
    total_epgs = serializers.IntegerField()
    active_epgs = serializers.IntegerField()
    draft_epgs = serializers.IntegerField()
    under_review = serializers.IntegerField()
    due_for_review = serializers.IntegerField()
    by_hazard_class = serializers.DictField()
    by_severity_level = serializers.DictField()
    by_country = serializers.DictField()
    by_emergency_type = serializers.DictField()
    recent_updates = serializers.ListField()

class EmergencyPlanStatisticsSerializer(serializers.Serializer):
    """Serializer for emergency plan statistics"""
    total_plans = serializers.IntegerField()
    active_plans = serializers.IntegerField()
    generated_plans = serializers.IntegerField()
    approved_plans = serializers.IntegerField()
    plans_this_month = serializers.IntegerField()
    by_status = serializers.DictField()
    by_hazard_class = serializers.DictField()
    average_epgs_per_plan = serializers.FloatField()
    recent_plans = serializers.ListField()

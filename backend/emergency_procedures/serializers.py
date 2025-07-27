# emergency_procedures/serializers.py
from rest_framework import serializers
from rest_framework_gis.serializers import GeoModelSerializer
from django.contrib.auth import get_user_model
from .models import EmergencyProcedure, EmergencyIncident, EmergencyContact

User = get_user_model()

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for emergency procedures"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'email']

class EmergencyProcedureSerializer(serializers.ModelSerializer):
    """
    Serializer for Emergency Procedures with comprehensive validation
    and business logic handling.
    """
    
    # Related field serializers
    created_by = UserBasicSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    
    # Computed fields
    is_current = serializers.ReadOnlyField()
    needs_review = serializers.ReadOnlyField()
    days_until_review = serializers.ReadOnlyField()
    
    # Custom validation
    def validate_applicable_hazard_classes(self, value):
        """Validate hazard classes are valid ADG classes"""
        valid_classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
        if not isinstance(value, list):
            raise serializers.ValidationError("Hazard classes must be a list")
        
        for hazard_class in value:
            if str(hazard_class) not in valid_classes:
                raise serializers.ValidationError(f"Invalid hazard class: {hazard_class}")
        
        return value
    
    def validate_specific_un_numbers(self, value):
        """Validate UN numbers format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("UN numbers must be a list")
        
        for un_number in value:
            if not isinstance(un_number, str) or not un_number.startswith('UN'):
                raise serializers.ValidationError(f"Invalid UN number format: {un_number}")
        
        return value
    
    def validate_response_time_minutes(self, value):
        """Validate response time is reasonable"""
        if value < 1:
            raise serializers.ValidationError("Response time must be at least 1 minute")
        if value > 480:  # 8 hours
            raise serializers.ValidationError("Response time cannot exceed 8 hours")
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        # Ensure review date is after effective date
        effective_date = attrs.get('effective_date')
        review_date = attrs.get('review_date')
        
        if effective_date and review_date and review_date <= effective_date:
            raise serializers.ValidationError({
                'review_date': 'Review date must be after effective date'
            })
        
        return attrs
    
    class Meta:
        model = EmergencyProcedure
        fields = [
            'id', 'title', 'emergency_type', 'procedure_code',
            'applicable_hazard_classes', 'specific_un_numbers',
            'immediate_actions', 'safety_precautions', 'containment_procedures',
            'cleanup_procedures', 'emergency_contacts', 'regulatory_references',
            'required_equipment', 'training_requirements', 'environmental_impact',
            'reporting_requirements', 'severity_level', 'response_time_minutes',
            'version', 'effective_date', 'review_date', 'status',
            'approved_by', 'approval_date', 'created_by', 'created_at', 'updated_at',
            'is_current', 'needs_review', 'days_until_review'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_at', 'updated_at',
            'is_current', 'needs_review', 'days_until_review'
        ]

class EmergencyProcedureListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing emergency procedures"""
    
    is_current = serializers.ReadOnlyField()
    needs_review = serializers.ReadOnlyField()
    
    class Meta:
        model = EmergencyProcedure
        fields = [
            'id', 'title', 'emergency_type', 'procedure_code',
            'applicable_hazard_classes', 'severity_level', 'response_time_minutes',
            'status', 'effective_date', 'review_date',
            'is_current', 'needs_review'
        ]

class EmergencyIncidentSerializer(GeoModelSerializer):
    """
    Serializer for Emergency Incidents with spatial data support
    and comprehensive incident tracking.
    """
    
    # Related field serializers
    procedure_used = EmergencyProcedureListSerializer(read_only=True)
    procedure_used_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    reported_by = UserBasicSerializer(read_only=True)
    incident_commander = UserBasicSerializer(read_only=True)
    incident_commander_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    # Computed fields
    response_time_minutes = serializers.ReadOnlyField()
    resolution_time_hours = serializers.ReadOnlyField()
    
    def validate_dangerous_goods_involved(self, value):
        """Validate dangerous goods data structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Dangerous goods must be a list")
        
        for dg in value:
            if not isinstance(dg, dict):
                raise serializers.ValidationError("Each dangerous good must be an object")
            
            required_fields = ['un_number', 'proper_shipping_name']
            for field in required_fields:
                if field not in dg:
                    raise serializers.ValidationError(f"Missing required field: {field}")
        
        return value
    
    def validate_responding_personnel(self, value):
        """Validate responding personnel data structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Responding personnel must be a list")
        
        for person in value:
            if not isinstance(person, dict):
                raise serializers.ValidationError("Each person must be an object")
            
            if 'name' not in person:
                raise serializers.ValidationError("Each person must have a name")
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation for incidents"""
        reported_at = attrs.get('reported_at')
        response_started_at = attrs.get('response_started_at')
        resolved_at = attrs.get('resolved_at')
        
        # Validate time sequence
        if response_started_at and reported_at and response_started_at < reported_at:
            raise serializers.ValidationError({
                'response_started_at': 'Response start time cannot be before report time'
            })
        
        if resolved_at and reported_at and resolved_at < reported_at:
            raise serializers.ValidationError({
                'resolved_at': 'Resolution time cannot be before report time'
            })
        
        if resolved_at and response_started_at and resolved_at < response_started_at:
            raise serializers.ValidationError({
                'resolved_at': 'Resolution time cannot be before response start time'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create incident with automatic incident number generation"""
        if 'incident_number' not in validated_data:
            # Generate incident number
            import datetime
            today = datetime.date.today()
            incident_count = EmergencyIncident.objects.filter(
                reported_at__date=today
            ).count() + 1
            
            validated_data['incident_number'] = f"INC-{today.strftime('%Y%m%d')}-{incident_count:03d}"
        
        # Set reported_by to current user if not provided
        if 'reported_by' not in validated_data and hasattr(self.context.get('request'), 'user'):
            validated_data['reported_by'] = self.context['request'].user
        
        return super().create(validated_data)
    
    class Meta:
        model = EmergencyIncident
        geo_field = 'coordinates'
        fields = [
            'id', 'incident_number', 'emergency_type', 'procedure_used', 'procedure_used_id',
            'description', 'location', 'coordinates', 'reported_at', 'response_started_at',
            'resolved_at', 'severity_level', 'dangerous_goods_involved', 'quantities_involved',
            'responding_personnel', 'equipment_used', 'external_agencies', 'casualties',
            'property_damage', 'environmental_impact', 'procedure_effectiveness',
            'lessons_learned', 'improvements_recommended', 'status', 'reported_by',
            'incident_commander', 'incident_commander_id', 'created_at', 'updated_at',
            'response_time_minutes', 'resolution_time_hours'
        ]
        read_only_fields = [
            'id', 'incident_number', 'reported_by', 'created_at', 'updated_at',
            'response_time_minutes', 'resolution_time_hours'
        ]

class EmergencyContactSerializer(GeoModelSerializer):
    """
    Serializer for Emergency Contacts with location-based features
    and contact verification tracking.
    """
    
    needs_verification = serializers.ReadOnlyField()
    
    def validate_primary_phone(self, value):
        """Validate phone number format"""
        import re
        
        # Basic phone number validation (Australian format)
        phone_pattern = r'^(\+61|0)[2-9]\d{8}$|^(000|112)$'
        if not re.match(phone_pattern, value.replace(' ', '').replace('-', '')):
            raise serializers.ValidationError("Invalid Australian phone number format")
        
        return value
    
    def validate_capabilities(self, value):
        """Validate capabilities list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Capabilities must be a list")
        
        valid_capabilities = [
            'hazmat_response', 'fire_suppression', 'medical_emergency',
            'spill_containment', 'evacuation', 'decontamination',
            'chemical_analysis', 'environmental_monitoring'
        ]
        
        for capability in value:
            if capability not in valid_capabilities:
                raise serializers.ValidationError(f"Invalid capability: {capability}")
        
        return value
    
    class Meta:
        model = EmergencyContact
        geo_field = 'coordinates'
        fields = [
            'id', 'organization_name', 'contact_type', 'primary_phone',
            'secondary_phone', 'service_area', 'coordinates', 'capabilities',
            'available_24_7', 'contact_person', 'email', 'notes',
            'is_active', 'last_verified', 'created_at', 'updated_at',
            'needs_verification'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'needs_verification']

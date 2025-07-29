# incidents/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Incident, IncidentType, IncidentDocument, IncidentUpdate, CorrectiveAction

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for nested serialization"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']


class IncidentTypeSerializer(serializers.ModelSerializer):
    """Serializer for incident types"""
    class Meta:
        model = IncidentType
        fields = [
            'id', 'name', 'description', 'severity', 'category', 
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class IncidentDocumentSerializer(serializers.ModelSerializer):
    """Serializer for incident documents"""
    uploaded_by = UserBasicSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = IncidentDocument
        fields = [
            'id', 'document_type', 'title', 'description', 'file', 'file_url',
            'uploaded_by', 'uploaded_at'
        ]
        read_only_fields = ['uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None
    
    def create(self, validated_data):
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)


class IncidentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for incident updates"""
    created_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = IncidentUpdate
        fields = [
            'id', 'update_type', 'description', 'created_by', 
            'created_at', 'metadata'
        ]
        read_only_fields = ['created_at']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CorrectiveActionSerializer(serializers.ModelSerializer):
    """Serializer for corrective actions"""
    assigned_to = UserBasicSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=True)
    
    class Meta:
        model = CorrectiveAction
        fields = [
            'id', 'title', 'description', 'assigned_to', 'assigned_to_id',
            'status', 'due_date', 'completed_at', 'completion_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'completed_at']
    
    def validate_assigned_to_id(self, value):
        try:
            user = User.objects.get(id=value)
            # Verify user has appropriate role for handling corrective actions
            if user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'SAFETY_OFFICER']:
                raise serializers.ValidationError(
                    "User does not have appropriate role for corrective actions"
                )
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")


class IncidentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for incident lists"""
    incident_type = IncidentTypeSerializer(read_only=True)
    reporter = UserBasicSerializer(read_only=True)
    assigned_to = UserBasicSerializer(read_only=True)
    updates_count = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Incident
        fields = [
            'id', 'incident_number', 'title', 'incident_type', 'location',
            'occurred_at', 'reported_at', 'reporter', 'assigned_to',
            'status', 'priority', 'injuries_count', 'environmental_impact',
            'updates_count', 'documents_count', 'created_at'
        ]
    
    def get_updates_count(self, obj):
        return obj.updates.count()
    
    def get_documents_count(self, obj):
        return obj.documents.count()


class IncidentDetailSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for incident details"""
    incident_type = IncidentTypeSerializer(read_only=True)
    incident_type_id = serializers.UUIDField(write_only=True, required=True)
    
    reporter = UserBasicSerializer(read_only=True)
    assigned_to = UserBasicSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    witnesses = UserBasicSerializer(many=True, read_only=True)
    witness_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    documents = IncidentDocumentSerializer(many=True, read_only=True)
    updates = IncidentUpdateSerializer(many=True, read_only=True)
    corrective_actions = CorrectiveActionSerializer(many=True, read_only=True)
    
    # Related entities
    shipment_info = serializers.SerializerMethodField()
    vehicle_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Incident
        fields = [
            'id', 'incident_number', 'title', 'description',
            'incident_type', 'incident_type_id',
            'location', 'coordinates', 'occurred_at', 'reported_at',
            'reporter', 'assigned_to', 'assigned_to_id',
            'witnesses', 'witness_ids',
            'status', 'priority',
            'injuries_count', 'property_damage_estimate', 'environmental_impact',
            'resolution_notes', 'resolved_at', 'closed_at',
            'shipment', 'vehicle', 'shipment_info', 'vehicle_info',
            'metadata', 'created_at', 'updated_at',
            'documents', 'updates', 'corrective_actions'
        ]
        read_only_fields = [
            'incident_number', 'reporter', 'reported_at', 
            'created_at', 'updated_at'
        ]
    
    def get_shipment_info(self, obj):
        if obj.shipment:
            return {
                'id': obj.shipment.id,
                'tracking_number': obj.shipment.tracking_number,
                'status': obj.shipment.status,
                'customer': obj.shipment.customer.name if obj.shipment.customer else None
            }
        return None
    
    def get_vehicle_info(self, obj):
        if obj.vehicle:
            return {
                'id': obj.vehicle.id,
                'registration_number': obj.vehicle.registration_number,
                'vehicle_type': obj.vehicle.vehicle_type,
                'driver': obj.vehicle.driver.get_full_name() if obj.vehicle.driver else None
            }
        return None
    
    def validate_incident_type_id(self, value):
        try:
            incident_type = IncidentType.objects.get(id=value, is_active=True)
            return value
        except IncidentType.DoesNotExist:
            raise serializers.ValidationError("Active incident type not found")
    
    def validate_assigned_to_id(self, value):
        if value is None:
            return value
        try:
            user = User.objects.get(id=value)
            # Verify user has appropriate role for incident handling
            if user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'SAFETY_OFFICER']:
                raise serializers.ValidationError(
                    "User does not have appropriate role for incident handling"
                )
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
    
    def validate_witness_ids(self, value):
        if not value:
            return value
        
        existing_users = User.objects.filter(id__in=value).values_list('id', flat=True)
        missing_ids = set(value) - set(existing_users)
        
        if missing_ids:
            raise serializers.ValidationError(f"Users not found: {missing_ids}")
        
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        # Ensure resolved_at is set when status is resolved
        if data.get('status') == 'resolved' and not data.get('resolved_at'):
            data['resolved_at'] = timezone.now()
        
        # Ensure closed_at is set when status is closed
        if data.get('status') == 'closed' and not data.get('closed_at'):
            data['closed_at'] = timezone.now()
        
        # Validate occurred_at is not in the future
        occurred_at = data.get('occurred_at')
        if occurred_at and occurred_at > timezone.now():
            raise serializers.ValidationError({
                'occurred_at': 'Incident occurrence time cannot be in the future'
            })
        
        return data
    
    def create(self, validated_data):
        witness_ids = validated_data.pop('witness_ids', [])
        incident_type_id = validated_data.pop('incident_type_id')
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        
        # Set reporter to current user
        validated_data['reporter'] = self.context['request'].user
        validated_data['incident_type_id'] = incident_type_id
        
        if assigned_to_id:
            validated_data['assigned_to_id'] = assigned_to_id
        
        incident = Incident.objects.create(**validated_data)
        
        # Set witnesses
        if witness_ids:
            incident.witnesses.set(witness_ids)
        
        # Create initial update
        IncidentUpdate.objects.create(
            incident=incident,
            update_type='status_change',
            description=f'Incident reported: {incident.title}',
            created_by=self.context['request'].user,
            metadata={'initial_status': incident.status}
        )
        
        return incident
    
    def update(self, instance, validated_data):
        witness_ids = validated_data.pop('witness_ids', None)
        incident_type_id = validated_data.pop('incident_type_id', None)
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        
        # Track status changes for audit
        old_status = instance.status
        old_assigned_to = instance.assigned_to
        
        if incident_type_id:
            validated_data['incident_type_id'] = incident_type_id
        
        if assigned_to_id is not None:
            validated_data['assigned_to_id'] = assigned_to_id
        
        # Update incident
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update witnesses
        if witness_ids is not None:
            instance.witnesses.set(witness_ids)
        
        # Create update records for significant changes
        current_user = self.context['request'].user
        
        if old_status != instance.status:
            IncidentUpdate.objects.create(
                incident=instance,
                update_type='status_change',
                description=f'Status changed from {old_status} to {instance.status}',
                created_by=current_user,
                metadata={'old_status': old_status, 'new_status': instance.status}
            )
        
        if old_assigned_to != instance.assigned_to:
            IncidentUpdate.objects.create(
                incident=instance,
                update_type='assignment',
                description=f'Assigned to {instance.assigned_to.get_full_name() if instance.assigned_to else "unassigned"}',
                created_by=current_user,
                metadata={
                    'old_assigned_to': old_assigned_to.id if old_assigned_to else None,
                    'new_assigned_to': instance.assigned_to.id if instance.assigned_to else None
                }
            )
        
        return instance


class IncidentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new incidents"""
    incident_type_id = serializers.UUIDField(required=True)
    witness_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Incident
        fields = [
            'title', 'description', 'incident_type_id',
            'location', 'coordinates', 'occurred_at',
            'witness_ids', 'priority',
            'injuries_count', 'property_damage_estimate', 'environmental_impact',
            'shipment', 'vehicle', 'metadata'
        ]
    
    def validate_incident_type_id(self, value):
        try:
            IncidentType.objects.get(id=value, is_active=True)
            return value
        except IncidentType.DoesNotExist:
            raise serializers.ValidationError("Active incident type not found")
    
    def validate_witness_ids(self, value):
        if not value:
            return value
        
        existing_users = User.objects.filter(id__in=value).values_list('id', flat=True)
        missing_ids = set(value) - set(existing_users)
        
        if missing_ids:
            raise serializers.ValidationError(f"Users not found: {missing_ids}")
        
        return value


# Statistics and Analytics Serializers
class IncidentStatsSerializer(serializers.Serializer):
    """Serializer for incident statistics"""
    total_incidents = serializers.IntegerField()
    open_incidents = serializers.IntegerField()
    resolved_incidents = serializers.IntegerField()
    critical_incidents = serializers.IntegerField()
    incidents_by_type = serializers.DictField()
    incidents_by_status = serializers.DictField()
    incidents_by_priority = serializers.DictField()
    monthly_trend = serializers.ListField()
    average_resolution_time = serializers.FloatField()
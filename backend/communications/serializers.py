# communications/serializers.py
from rest_framework import serializers
from .models import ShipmentEvent, EventRead, EventMention
from users.models import User


class EventUserSerializer(serializers.ModelSerializer):
    """Serializer for user information in events"""
    display_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'display_name', 'role_display']
    
    def get_display_name(self, obj):
        """Get user display name"""
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.username or obj.email
    
    def get_role_display(self, obj):
        """Get user role display"""
        return getattr(obj, 'role', 'USER').replace('_', ' ').title()


class EventMentionSerializer(serializers.ModelSerializer):
    """Serializer for event mentions"""
    mentioned_user = EventUserSerializer(read_only=True)
    
    class Meta:
        model = EventMention
        fields = ['id', 'mentioned_user', 'created_at']


class EventReadSerializer(serializers.ModelSerializer):
    """Serializer for event read receipts"""
    user = EventUserSerializer(read_only=True)
    
    class Meta:
        model = EventRead
        fields = ['id', 'user', 'read_at']


class ShipmentEventSerializer(serializers.ModelSerializer):
    """Serializer for shipment events"""
    user = EventUserSerializer(read_only=True)
    user_display_name = serializers.ReadOnlyField()
    user_role_display = serializers.ReadOnlyField()
    is_recent = serializers.ReadOnlyField()
    mentions = EventMentionSerializer(many=True, read_only=True)
    read_receipts = EventReadSerializer(many=True, read_only=True)
    
    # Inspection details if related
    inspection_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ShipmentEvent
        fields = [
            'id', 'shipment', 'user', 'user_display_name', 'user_role_display',
            'event_type', 'title', 'details', 'priority', 'attachment_url', 
            'attachment_type', 'timestamp', 'is_internal', 'is_automated',
            'is_recent', 'mentions', 'read_receipts', 'inspection_details'
        ]
        read_only_fields = ['id', 'timestamp', 'user']
    
    def get_inspection_details(self, obj):
        """Get related inspection details if available"""
        if obj.related_inspection:
            return {
                'id': str(obj.related_inspection.id),
                'inspection_type': obj.related_inspection.inspection_type,
                'status': obj.related_inspection.status,
                'overall_result': obj.related_inspection.overall_result,
            }
        return None


class ShipmentEventCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating shipment events"""
    mentioned_users = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = ShipmentEvent
        fields = [
            'shipment', 'event_type', 'title', 'details', 'priority',
            'attachment_url', 'attachment_type', 'is_internal',
            'mentioned_users'
        ]
    
    def create(self, validated_data):
        mentioned_users_ids = validated_data.pop('mentioned_users', [])
        
        # Set the user from the request context
        validated_data['user'] = self.context['request'].user
        
        # Create the event
        event = ShipmentEvent.objects.create(**validated_data)
        
        # Create mentions
        mentioned_users = User.objects.filter(id__in=mentioned_users_ids)
        for user in mentioned_users:
            EventMention.objects.create(event=event, mentioned_user=user)
        
        return event


class ShipmentEventCommentSerializer(serializers.ModelSerializer):
    """Simplified serializer for comment-only events"""
    mentioned_users = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = ShipmentEvent
        fields = ['shipment', 'details', 'mentioned_users']
    
    def create(self, validated_data):
        mentioned_users_ids = validated_data.pop('mentioned_users', [])
        
        # Set defaults for comments
        validated_data.update({
            'user': self.context['request'].user,
            'event_type': 'COMMENT',
            'title': 'Comment',
            'priority': 'NORMAL',
            'is_internal': False,
            'is_automated': False
        })
        
        # Create the event
        event = ShipmentEvent.objects.create(**validated_data)
        
        # Create mentions
        mentioned_users = User.objects.filter(id__in=mentioned_users_ids)
        for user in mentioned_users:
            EventMention.objects.create(event=event, mentioned_user=user)
        
        return event
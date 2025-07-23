# communications/serializers.py
from rest_framework import serializers
from .models import (
    ShipmentEvent, EventRead, EventMention,
    Channel, ChannelMembership, Message, MessageRead, MessageReaction,
    DirectMessage, NotificationPreference, NotificationQueue
)
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


# ============================================================================
# ENHANCED SERIALIZERS FOR COMPREHENSIVE COMMUNICATION SYSTEM
# ============================================================================

class ChannelMembershipSerializer(serializers.ModelSerializer):
    """Serializer for channel membership information"""
    user = EventUserSerializer(read_only=True)
    
    class Meta:
        model = ChannelMembership
        fields = [
            'id', 'user', 'role', 'joined_at', 'is_active', 'is_muted',
            'notify_on_all_messages', 'notify_on_mentions', 'notify_on_keywords',
            'keywords', 'last_read_at'
        ]
        read_only_fields = ['id', 'joined_at']


class ChannelSerializer(serializers.ModelSerializer):
    """Serializer for communication channels"""
    created_by = EventUserSerializer(read_only=True)
    participants = EventUserSerializer(many=True, read_only=True)
    memberships = ChannelMembershipSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    participant_count = serializers.ReadOnlyField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'channel_type', 'created_by',
            'created_at', 'updated_at', 'is_private', 'is_archived',
            'archived_at', 'related_shipment', 'related_company',
            'is_emergency_channel', 'emergency_level', 'participants',
            'memberships', 'last_message', 'participant_count', 'unread_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_last_message(self, obj):
        """Get the last message in this channel"""
        last_message = obj.last_message
        if last_message:
            return {
                'id': str(last_message.id),
                'content': last_message.content[:100],
                'sender': last_message.sender.get_full_name(),
                'created_at': last_message.created_at,
                'message_type': last_message.message_type
            }
        return None
    
    def get_unread_count(self, obj):
        """Get unread message count for the current user"""
        request_user = self.context.get('request')
        if request_user and hasattr(request_user, 'user'):
            user = request_user.user
            # Get user's last read time for this channel
            try:
                membership = obj.memberships.get(user=user)
                last_read = membership.last_read_at
                if last_read:
                    return obj.messages.filter(created_at__gt=last_read).count()
                else:
                    return obj.messages.count()
            except ChannelMembership.DoesNotExist:
                return 0
        return 0


class ChannelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating channels"""
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Channel
        fields = [
            'name', 'description', 'channel_type', 'is_private',
            'related_shipment', 'related_company', 'is_emergency_channel',
            'emergency_level', 'participant_ids'
        ]
    
    def create(self, validated_data):
        participant_ids = validated_data.pop('participant_ids', [])
        
        # Set the creator from request context
        validated_data['created_by'] = self.context['request'].user
        
        # Create the channel
        channel = Channel.objects.create(**validated_data)
        
        # Add creator as owner
        ChannelMembership.objects.create(
            user=self.context['request'].user,
            channel=channel,
            role='OWNER'
        )
        
        # Add other participants
        participants = User.objects.filter(id__in=participant_ids)
        for user in participants:
            if user != self.context['request'].user:  # Don't add creator twice
                ChannelMembership.objects.create(
                    user=user,
                    channel=channel,
                    role='MEMBER'
                )
        
        return channel


class MessageReactionSerializer(serializers.ModelSerializer):
    """Serializer for message reactions"""
    user = EventUserSerializer(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'reaction', 'created_at']
        read_only_fields = ['id', 'created_at', 'user']


class MessageReadSerializer(serializers.ModelSerializer):
    """Serializer for message read receipts"""
    user = EventUserSerializer(read_only=True)
    
    class Meta:
        model = MessageRead
        fields = ['id', 'user', 'read_at']
        read_only_fields = ['id', 'read_at', 'user']


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages"""
    sender = EventUserSerializer(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    read_receipts = MessageReadSerializer(many=True, read_only=True)
    reply_to_message = serializers.SerializerMethodField()
    thread_message_count = serializers.ReadOnlyField()
    is_thread_starter = serializers.ReadOnlyField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'channel', 'sender', 'message_type', 'content',
            'file_url', 'file_name', 'file_size', 'file_type',
            'latitude', 'longitude', 'location_name',
            'reply_to', 'thread_id', 'created_at', 'updated_at',
            'edited_at', 'is_deleted', 'is_edited', 'is_pinned',
            'is_emergency', 'priority', 'metadata',
            'reactions', 'read_receipts', 'reply_to_message',
            'thread_message_count', 'is_thread_starter'
        ]
        read_only_fields = [
            'id', 'sender', 'created_at', 'updated_at', 'is_deleted',
            'is_edited', 'thread_message_count', 'is_thread_starter'
        ]
    
    def get_reply_to_message(self, obj):
        """Get basic info about the message being replied to"""
        if obj.reply_to:
            return {
                'id': str(obj.reply_to.id),
                'content': obj.reply_to.content[:100],
                'sender': obj.reply_to.sender.get_full_name(),
                'created_at': obj.reply_to.created_at
            }
        return None


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating messages"""
    mentioned_users = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Message
        fields = [
            'channel', 'message_type', 'content', 'file_url', 'file_name',
            'file_size', 'file_type', 'latitude', 'longitude', 'location_name',
            'reply_to', 'is_emergency', 'priority', 'metadata', 'mentioned_users'
        ]
    
    def create(self, validated_data):
        mentioned_users_ids = validated_data.pop('mentioned_users', [])
        
        # Set the sender from request context
        validated_data['sender'] = self.context['request'].user
        
        # Set thread_id if this is a reply
        if validated_data.get('reply_to'):
            reply_to = validated_data['reply_to']
            validated_data['thread_id'] = reply_to.thread_id or reply_to.id
        
        # Create the message
        message = Message.objects.create(**validated_data)
        
        # TODO: Handle mentions (create EventMention records)
        # This would require extending the EventMention model or creating a new MessageMention model
        
        return message


class DirectMessageSerializer(serializers.ModelSerializer):
    """Serializer for direct messages"""
    user1 = EventUserSerializer(read_only=True)
    user2 = EventUserSerializer(read_only=True)
    channel = ChannelSerializer(read_only=True)
    other_user = serializers.SerializerMethodField()
    
    class Meta:
        model = DirectMessage
        fields = [
            'id', 'user1', 'user2', 'channel', 'created_at',
            'last_message_at', 'is_active', 'other_user'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_other_user(self, obj):
        """Get the other user in the DM (not the current user)"""
        request_user = self.context.get('request')
        if request_user and hasattr(request_user, 'user'):
            current_user = request_user.user
            other_user = obj.user2 if obj.user1 == current_user else obj.user1
            return EventUserSerializer(other_user).data
        return None


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'notification_type', 'delivery_method', 'is_enabled',
            'quiet_hours_start', 'quiet_hours_end', 'timezone',
            'immediate', 'digest_daily', 'digest_weekly',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationQueueSerializer(serializers.ModelSerializer):
    """Serializer for notification queue entries"""
    user = EventUserSerializer(read_only=True)
    
    class Meta:
        model = NotificationQueue
        fields = [
            'id', 'user', 'notification_type', 'delivery_method',
            'subject', 'message', 'recipient_address', 'status',
            'priority', 'scheduled_at', 'sent_at', 'retry_count',
            'max_retries', 'last_error', 'created_at', 'updated_at',
            'related_message', 'related_event'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'sent_at', 'retry_count', 'last_error',
            'created_at', 'updated_at'
        ]


# ============================================================================
# SPECIALIZED SERIALIZERS FOR DIFFERENT USE CASES
# ============================================================================

class ChannelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for channel lists"""
    last_message = serializers.SerializerMethodField()
    participant_count = serializers.ReadOnlyField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'channel_type', 'is_private', 'is_archived',
            'updated_at', 'last_message', 'participant_count', 'unread_count'
        ]
    
    def get_last_message(self, obj):
        last_message = obj.last_message
        if last_message:
            return {
                'content': last_message.content[:50],
                'sender': last_message.sender.get_full_name(),
                'created_at': last_message.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        request_user = self.context.get('request')
        if request_user and hasattr(request_user, 'user'):
            user = request_user.user
            try:
                membership = obj.memberships.get(user=user)
                last_read = membership.last_read_at
                if last_read:
                    return obj.messages.filter(created_at__gt=last_read).count()
                else:
                    return obj.messages.count()
            except ChannelMembership.DoesNotExist:
                return 0
        return 0


class MessageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for message lists"""
    sender = EventUserSerializer(read_only=True)
    reaction_counts = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'message_type', 'content', 'file_url', 'file_name',
            'created_at', 'is_edited', 'is_pinned', 'is_emergency',
            'priority', 'reaction_counts'
        ]
    
    def get_reaction_counts(self, obj):
        """Get reaction counts grouped by reaction type"""
        reactions = obj.reactions.all()
        counts = {}
        for reaction in reactions:
            emoji = reaction.reaction
            counts[emoji] = counts.get(emoji, 0) + 1
        return counts


class EmergencyChannelSerializer(serializers.ModelSerializer):
    """Specialized serializer for emergency channels"""
    created_by = EventUserSerializer(read_only=True)
    active_participants = serializers.SerializerMethodField()
    recent_messages = serializers.SerializerMethodField()
    
    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'emergency_level', 'created_by',
            'created_at', 'related_shipment', 'active_participants',
            'recent_messages'
        ]
    
    def get_active_participants(self, obj):
        """Get currently active participants"""
        active_memberships = obj.memberships.filter(is_active=True)
        return EventUserSerializer([m.user for m in active_memberships], many=True).data
    
    def get_recent_messages(self, obj):
        """Get the 5 most recent messages"""
        recent_messages = obj.messages.order_by('-created_at')[:5]
        return MessageListSerializer(recent_messages, many=True).data
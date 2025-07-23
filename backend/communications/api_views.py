# communications/api_views.py
import logging
from datetime import timedelta
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Prefetch, Count, Max
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)
User = get_user_model()

from .models import (
    ShipmentEvent, EventRead, EventMention,
    Channel, ChannelMembership, Message, MessageRead, MessageReaction,
    DirectMessage, NotificationPreference, NotificationQueue
)
from .serializers import (
    ShipmentEventSerializer, ShipmentEventCreateSerializer, ShipmentEventCommentSerializer, EventReadSerializer,
    ChannelSerializer, ChannelCreateSerializer, ChannelListSerializer,
    MessageSerializer, MessageCreateSerializer, MessageListSerializer,
    DirectMessageSerializer, NotificationPreferenceSerializer,
    NotificationQueueSerializer, EmergencyChannelSerializer
)
from shipments.models import Shipment


class ShipmentEventViewSet(viewsets.ModelViewSet):
    """
    API endpoint for shipment events and communication logs.
    Provides centralized communication for all stakeholders.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'shipment': ['exact'],
        'event_type': ['exact', 'in'],
        'priority': ['exact', 'in'],
        'user': ['exact'],
        'is_internal': ['exact'],
        'is_automated': ['exact'],
        'timestamp': ['date', 'gte', 'lte'],
    }
    search_fields = ['title', 'details']
    ordering_fields = ['timestamp', 'priority']
    ordering = ['-timestamp']

    def get_queryset(self):
        """Filter events based on user permissions"""
        user = self.request.user
        queryset = ShipmentEvent.objects.select_related(
            'user', 'shipment', 'related_inspection'
        ).prefetch_related(
            'mentions__mentioned_user',
            'read_receipts__user'
        )
        
        # Drivers can only see events for their assigned shipments
        if hasattr(user, 'driver_profile'):
            # Get shipments assigned to this driver
            assigned_shipments = Shipment.objects.filter(
                Q(assigned_driver=user) | Q(assigned_loader=user)
            )
            queryset = queryset.filter(shipment__in=assigned_shipments)
        
        # Filter internal events for non-internal users
        if not getattr(user, 'is_staff', False):
            queryset = queryset.filter(is_internal=False)
        
        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ShipmentEventCreateSerializer
        elif self.action == 'comment':
            return ShipmentEventCommentSerializer
        return ShipmentEventSerializer

    @action(detail=False, methods=['post'])
    def comment(self, request):
        """Create a simple comment event"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            event = serializer.save()
            response_serializer = ShipmentEventSerializer(event)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def for_shipment(self, request):
        """Get all events for a specific shipment"""
        shipment_id = request.query_params.get('shipment_id')
        if not shipment_id:
            return Response(
                {'error': 'shipment_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
            events = self.get_queryset().filter(shipment=shipment)
            
            # Apply additional filtering
            event_type = request.query_params.get('event_type')
            if event_type:
                events = events.filter(event_type=event_type)
            
            # Paginate results
            page = self.paginate_queryset(events)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(events, many=True)
            return Response(serializer.data)
            
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an event as read by the current user"""
        event = self.get_object()
        read_receipt, created = EventRead.objects.get_or_create(
            event=event,
            user=request.user
        )
        
        if created:
            logger.info(f"Event {event.id} marked as read by {request.user}")
        
        serializer = EventReadSerializer(read_receipt)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread events for the current user"""
        user = request.user
        
        # Get events the user should see
        visible_events = self.get_queryset()
        
        # Get events the user has read
        read_event_ids = EventRead.objects.filter(
            user=user,
            event__in=visible_events
        ).values_list('event_id', flat=True)
        
        # Count unread events
        unread_count = visible_events.exclude(id__in=read_event_ids).count()
        
        return Response({'unread_count': unread_count})

    @action(detail=False, methods=['get'])
    def mentions(self, request):
        """Get events where the current user is mentioned"""
        user = request.user
        mentions = EventMention.objects.filter(
            mentioned_user=user
        ).select_related('event__user', 'event__shipment')
        
        events = [mention.event for mention in mentions]
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_mark_read(self, request):
        """Mark multiple events as read"""
        event_ids = request.data.get('event_ids', [])
        if not event_ids:
            return Response(
                {'error': 'event_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get events the user can access
        events = self.get_queryset().filter(id__in=event_ids)
        
        # Create read receipts
        read_receipts = []
        for event in events:
            read_receipt, created = EventRead.objects.get_or_create(
                event=event,
                user=request.user
            )
            if created:
                read_receipts.append(read_receipt)
        
        return Response({
            'marked_read': len(read_receipts),
            'total_requested': len(event_ids)
        })

    @action(detail=False, methods=['get'])
    def activity_summary(self, request):
        """Get activity summary for dashboard"""
        user = request.user
        
        # Get recent events (last 7 days)
        from datetime import timedelta
        recent_cutoff = timezone.now() - timedelta(days=7)
        
        queryset = self.get_queryset().filter(timestamp__gte=recent_cutoff)
        
        # Count by event type
        event_counts = {}
        for event_type, _ in ShipmentEvent.EVENT_TYPES:
            count = queryset.filter(event_type=event_type).count()
            if count > 0:
                event_counts[event_type] = count
        
        # Count by priority
        priority_counts = {}
        for priority, _ in ShipmentEvent.PRIORITY_LEVELS:
            count = queryset.filter(priority=priority).count()
            if count > 0:
                priority_counts[priority] = count
        
        # Get unread count
        read_event_ids = EventRead.objects.filter(
            user=user,
            event__in=queryset
        ).values_list('event_id', flat=True)
        unread_count = queryset.exclude(id__in=read_event_ids).count()
        
        return Response({
            'total_events': queryset.count(),
            'unread_count': unread_count,
            'event_type_counts': event_counts,
            'priority_counts': priority_counts,
            'period_days': 7
        })


# ============================================================================
# ENHANCED API VIEWS FOR COMPREHENSIVE COMMUNICATION SYSTEM
# ============================================================================

class ChannelViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing communication channels.
    Supports creating, joining, leaving, and managing channels.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'channel_type': ['exact', 'in'],
        'is_private': ['exact'],
        'is_archived': ['exact'],
        'is_emergency_channel': ['exact'],
        'emergency_level': ['exact', 'gte', 'lte'],
        'created_at': ['date', 'gte', 'lte'],
        'related_shipment': ['exact'],
        'related_company': ['exact'],
    }
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-updated_at']

    def get_queryset(self):
        """Filter channels based on user membership and permissions"""
        user = self.request.user
        
        # Get channels the user is a member of or can access
        queryset = Channel.objects.select_related(
            'created_by', 'related_shipment', 'related_company'
        ).prefetch_related(
            'memberships__user',
            'participants'
        ).annotate(
            message_count=Count('messages'),
            last_activity=Max('messages__created_at')
        )
        
        # Filter based on user permissions
        user_channels = Q(memberships__user=user, memberships__is_active=True)
        public_channels = Q(is_private=False, is_archived=False)
        created_channels = Q(created_by=user)
        
        # Company channels (if user belongs to a company)
        company_channels = Q()
        if hasattr(user, 'company'):
            company_channels = Q(related_company=user.company)
        
        # Shipment channels (if user is involved in shipments)
        shipment_channels = Q()
        if hasattr(user, 'assigned_shipments'):
            user_shipments = user.assigned_shipments.all()
            shipment_channels = Q(related_shipment__in=user_shipments)
        
        queryset = queryset.filter(
            user_channels | public_channels | created_channels | company_channels | shipment_channels
        ).distinct()
        
        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ChannelCreateSerializer
        elif self.action == 'list':
            return ChannelListSerializer
        elif self.action == 'emergency_channels':
            return EmergencyChannelSerializer
        return ChannelSerializer

    @action(detail=False, methods=['get'])
    def my_channels(self, request):
        """Get channels the current user is a member of"""
        user_memberships = ChannelMembership.objects.filter(
            user=request.user,
            is_active=True
        ).select_related('channel').prefetch_related('channel__messages')
        
        channels_data = []
        for membership in user_memberships:
            channel = membership.channel
            last_message = channel.messages.order_by('-created_at').first()
            
            # Calculate unread count
            unread_count = 0
            if membership.last_read_at:
                unread_count = channel.messages.filter(
                    created_at__gt=membership.last_read_at
                ).count()
            else:
                unread_count = channel.messages.count()
            
            channels_data.append({
                'id': str(channel.id),
                'name': channel.name,
                'channel_type': channel.channel_type,
                'is_private': channel.is_private,
                'is_emergency_channel': channel.is_emergency_channel,
                'updated_at': channel.updated_at,
                'unread_count': unread_count,
                'last_message': {
                    'content': last_message.content[:50] if last_message else None,
                    'sender': last_message.sender.get_full_name() if last_message else None,
                    'created_at': last_message.created_at if last_message else None
                } if last_message else None,
                'membership': {
                    'role': membership.role,
                    'is_muted': membership.is_muted,
                    'joined_at': membership.joined_at
                }
            })
        
        return Response(channels_data)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a channel"""
        channel = self.get_object()
        user = request.user
        
        # Check if channel is private
        if channel.is_private:
            return Response(
                {'error': 'Cannot join private channel without invitation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already a member
        membership, created = ChannelMembership.objects.get_or_create(
            user=user,
            channel=channel,
            defaults={'role': 'MEMBER', 'is_active': True}
        )
        
        if not created and membership.is_active:
            return Response(
                {'message': 'Already a member of this channel'},
                status=status.HTTP_200_OK
            )
        
        # Reactivate membership if it was inactive
        if not created:
            membership.is_active = True
            membership.save()
        
        # Broadcast user joined event via WebSocket
        self.broadcast_channel_event(channel.id, 'user_joined', {
            'user_id': str(user.id),
            'user_name': user.get_full_name(),
            'channel_id': str(channel.id)
        })
        
        return Response({'message': 'Successfully joined channel'})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a channel"""
        channel = self.get_object()
        user = request.user
        
        try:
            membership = ChannelMembership.objects.get(
                user=user,
                channel=channel,
                is_active=True
            )
            
            # Don't allow owner to leave without transferring ownership
            if membership.role == 'OWNER':
                other_members = ChannelMembership.objects.filter(
                    channel=channel,
                    is_active=True
                ).exclude(user=user)
                
                if other_members.exists():
                    return Response(
                        {'error': 'Transfer ownership before leaving channel'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Deactivate membership
            membership.is_active = False
            membership.save()
            
            # Broadcast user left event
            self.broadcast_channel_event(channel.id, 'user_left', {
                'user_id': str(user.id),
                'user_name': user.get_full_name(),
                'channel_id': str(channel.id)
            })
            
            return Response({'message': 'Successfully left channel'})
            
        except ChannelMembership.DoesNotExist:
            return Response(
                {'error': 'Not a member of this channel'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def invite_users(self, request, pk=None):
        """Invite users to a channel"""
        channel = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'User IDs are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if current user has permission to invite
        try:
            membership = ChannelMembership.objects.get(
                user=request.user,
                channel=channel,
                is_active=True
            )
            
            if membership.role not in ['OWNER', 'ADMIN', 'MODERATOR']:
                return Response(
                    {'error': 'Insufficient permissions to invite users'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ChannelMembership.DoesNotExist:
            return Response(
                {'error': 'Not a member of this channel'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Invite users
        invited_users = []
        for user_id in user_ids:
            try:
                invite_user = User.objects.get(id=user_id)
                membership, created = ChannelMembership.objects.get_or_create(
                    user=invite_user,
                    channel=channel,
                    defaults={'role': 'MEMBER', 'is_active': True}
                )
                
                if created or not membership.is_active:
                    if not created:
                        membership.is_active = True
                        membership.save()
                    
                    invited_users.append({
                        'id': str(invite_user.id),
                        'name': invite_user.get_full_name(),
                        'email': invite_user.email
                    })
                    
                    # Send notification to invited user
                    from .tasks import send_email
                    send_email.delay(
                        recipient_email=invite_user.email,
                        subject=f'Invited to {channel.name}',
                        message=f'You have been invited to join the channel "{channel.name}" by {request.user.get_full_name()}.'
                    )
                    
            except User.DoesNotExist:
                continue
        
        return Response({
            'message': f'Invited {len(invited_users)} users',
            'invited_users': invited_users
        })

    @action(detail=False, methods=['get'])
    def emergency_channels(self, request):
        """Get active emergency channels"""
        emergency_channels = self.get_queryset().filter(
            is_emergency_channel=True,
            is_archived=False
        ).order_by('-emergency_level', '-created_at')
        
        serializer = self.get_serializer(emergency_channels, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_emergency_channel(self, request):
        """Create an emergency channel for incidents"""
        shipment_id = request.data.get('shipment_id')
        emergency_type = request.data.get('emergency_type', 'General Emergency')
        emergency_level = request.data.get('emergency_level', 4)
        description = request.data.get('description', '')
        
        if not shipment_id:
            return Response(
                {'error': 'Shipment ID is required for emergency channels'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
            
            # Create emergency channel
            channel = Channel.objects.create(
                name=f'EMERGENCY: {emergency_type} - {shipment.tracking_number}',
                description=description,
                channel_type='EMERGENCY',
                created_by=request.user,
                is_private=False,  # Emergency channels are visible to all relevant stakeholders
                is_emergency_channel=True,
                emergency_level=emergency_level,
                related_shipment=shipment
            )
            
            # Add creator as owner
            ChannelMembership.objects.create(
                user=request.user,
                channel=channel,
                role='OWNER'
            )
            
            # Add relevant stakeholders
            stakeholders = []
            if shipment.assigned_driver:
                stakeholders.append(shipment.assigned_driver)
            if hasattr(shipment, 'company') and shipment.company.primary_contact:
                stakeholders.append(shipment.company.primary_contact)
            
            for stakeholder in stakeholders:
                if stakeholder != request.user:
                    ChannelMembership.objects.create(
                        user=stakeholder,
                        channel=channel,
                        role='MEMBER'
                    )
            
            # Send emergency alerts
            from .tasks import send_emergency_alert
            send_emergency_alert.delay(
                shipment_id=str(shipment.id),
                alert_type=emergency_type,
                message=f'Emergency channel created: {channel.name}. {description}',
                severity='CRITICAL'
            )
            
            serializer = ChannelSerializer(channel, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def broadcast_channel_event(self, channel_id, event_type, data):
        """Broadcast channel events via WebSocket"""
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"channel_{channel_id}",
                {
                    'type': event_type.replace('_', '.'),
                    **data
                }
            )
        except Exception as e:
            logger.error(f"Error broadcasting channel event: {str(e)}")


class MessageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing messages within channels.
    Supports sending, editing, deleting, and reacting to messages.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'channel': ['exact'],
        'sender': ['exact'],
        'message_type': ['exact', 'in'],
        'is_emergency': ['exact'],
        'priority': ['exact', 'in'],
        'is_pinned': ['exact'],
        'created_at': ['date', 'gte', 'lte'],
    }
    search_fields = ['content']
    ordering_fields = ['created_at', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter messages based on channel access"""
        user = self.request.user
        
        # Get channels the user has access to
        accessible_channels = Channel.objects.filter(
            Q(memberships__user=user, memberships__is_active=True) |
            Q(is_private=False, is_archived=False) |
            Q(created_by=user)
        ).distinct()
        
        queryset = Message.objects.select_related(
            'sender', 'channel', 'reply_to'
        ).prefetch_related(
            'reactions__user',
            'read_receipts__user'
        ).filter(
            channel__in=accessible_channels,
            is_deleted=False
        )
        
        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return MessageCreateSerializer
        elif self.action == 'list':
            return MessageListSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        """Create message and broadcast via WebSocket"""
        message = serializer.save()
        
        # Broadcast message via WebSocket
        self.broadcast_message(message)
        
        # Mark channel as updated
        message.channel.updated_at = timezone.now()
        message.channel.save(update_fields=['updated_at'])

    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """Add or remove reaction to a message"""
        message = self.get_object()
        reaction_emoji = request.data.get('reaction')
        
        if not reaction_emoji:
            return Response(
                {'error': 'Reaction emoji is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Toggle reaction
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=request.user,
            reaction=reaction_emoji
        )
        
        if not created:
            reaction.delete()
            action = 'removed'
        else:
            action = 'added'
        
        # Broadcast reaction update
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"channel_{message.channel.id}",
            {
                'type': 'reaction_update',
                'message_id': str(message.id),
                'reaction': reaction_emoji,
                'user_id': str(request.user.id),
                'action': action
            }
        )
        
        return Response({
            'action': action,
            'reaction': reaction_emoji,
            'message_id': str(message.id)
        })

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        
        read_receipt, created = MessageRead.objects.get_or_create(
            message=message,
            user=request.user
        )
        
        # Update channel membership last_read_at
        try:
            membership = ChannelMembership.objects.get(
                user=request.user,
                channel=message.channel
            )
            membership.last_read_at = timezone.now()
            membership.save(update_fields=['last_read_at'])
        except ChannelMembership.DoesNotExist:
            pass
        
        return Response({'message': 'Message marked as read'})

    @action(detail=False, methods=['post'])
    def mark_channel_read(self, request):
        """Mark all messages in a channel as read"""
        channel_id = request.data.get('channel_id')
        
        if not channel_id:
            return Response(
                {'error': 'Channel ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            channel = Channel.objects.get(id=channel_id)
            
            # Check if user has access to channel
            membership = ChannelMembership.objects.get(
                user=request.user,
                channel=channel,
                is_active=True
            )
            
            # Get all unread messages
            if membership.last_read_at:
                unread_messages = Message.objects.filter(
                    channel=channel,
                    created_at__gt=membership.last_read_at,
                    is_deleted=False
                )
            else:
                unread_messages = Message.objects.filter(
                    channel=channel,
                    is_deleted=False
                )
            
            # Create read receipts
            read_receipts = []
            for message in unread_messages:
                read_receipt, created = MessageRead.objects.get_or_create(
                    message=message,
                    user=request.user
                )
                if created:
                    read_receipts.append(read_receipt)
            
            # Update membership last_read_at
            membership.last_read_at = timezone.now()
            membership.save(update_fields=['last_read_at'])
            
            return Response({
                'messages_marked_read': len(read_receipts),
                'channel_id': str(channel.id)
            })
            
        except Channel.DoesNotExist:
            return Response(
                {'error': 'Channel not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ChannelMembership.DoesNotExist:
            return Response(
                {'error': 'Not a member of this channel'},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search messages across accessible channels"""
        query = request.query_params.get('q', '').strip()
        channel_id = request.query_params.get('channel_id')
        
        if not query:
            return Response(
                {'error': 'Search query is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        messages = self.get_queryset().filter(
            content__icontains=query
        )
        
        if channel_id:
            messages = messages.filter(channel_id=channel_id)
        
        # Limit results
        messages = messages[:50]
        
        serializer = MessageListSerializer(messages, many=True)
        return Response({
            'query': query,
            'results': serializer.data,
            'total_results': len(serializer.data)
        })

    def broadcast_message(self, message):
        """Broadcast new message via WebSocket"""
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"channel_{message.channel.id}",
                {
                    'type': 'chat_message',
                    'message': {
                        'id': str(message.id),
                        'channel_id': str(message.channel.id),
                        'sender': {
                            'id': str(message.sender.id),
                            'name': message.sender.get_full_name(),
                            'email': message.sender.email
                        },
                        'content': message.content,
                        'message_type': message.message_type,
                        'created_at': message.created_at.isoformat(),
                        'reply_to': str(message.reply_to.id) if message.reply_to else None,
                        'is_emergency': message.is_emergency,
                        'priority': message.priority,
                        'metadata': message.metadata
                    }
                }
            )
        except Exception as e:
            logger.error(f"Error broadcasting message: {str(e)}")


class DirectMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for direct message conversations.
    Read-only viewset for listing and retrieving DM conversations.
    """
    serializer_class = DirectMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-last_message_at', '-created_at']

    def get_queryset(self):
        """Get direct message conversations for the current user"""
        user = self.request.user
        return DirectMessage.objects.filter(
            Q(user1=user) | Q(user2=user),
            is_active=True
        ).select_related(
            'user1', 'user2', 'channel'
        ).prefetch_related(
            'channel__messages'
        )

    @action(detail=False, methods=['post'])
    def start_conversation(self, request):
        """Start a direct message conversation with another user"""
        other_user_id = request.data.get('user_id')
        
        if not other_user_id:
            return Response(
                {'error': 'User ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            other_user = User.objects.get(id=other_user_id)
            
            if other_user == request.user:
                return Response(
                    {'error': 'Cannot start conversation with yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create direct message
            dm = DirectMessage.get_or_create_dm(request.user, other_user)
            
            serializer = self.get_serializer(dm, context={'request': request})
            return Response(serializer.data)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing user notification preferences.
    Allows users to configure how they want to receive different types of notifications.
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    
    filterset_fields = {
        'notification_type': ['exact', 'in'],
        'delivery_method': ['exact', 'in'],
        'is_enabled': ['exact'],
    }
    ordering_fields = ['notification_type', 'delivery_method', 'created_at']
    ordering = ['notification_type', 'delivery_method']

    def get_queryset(self):
        """Get notification preferences for the current user"""
        return NotificationPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Set the user when creating a notification preference"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def defaults(self, request):
        """Get default notification preferences for a user"""
        user = request.user
        
        # Define default preferences
        default_preferences = []
        
        for notification_type, _ in NotificationPreference.NOTIFICATION_TYPES:
            for delivery_method, _ in NotificationPreference.DELIVERY_METHODS:
                # Set intelligent defaults based on type and method
                is_enabled = True
                immediate = True
                
                # Disable SMS for non-critical notifications by default
                if delivery_method == 'SMS' and notification_type not in ['EMERGENCY', 'DIRECT_MESSAGE']:
                    is_enabled = False
                    immediate = False
                
                # Enable digest for channel messages
                digest_daily = notification_type == 'CHANNEL_MESSAGE'
                
                default_preferences.append({
                    'notification_type': notification_type,
                    'delivery_method': delivery_method,
                    'is_enabled': is_enabled,
                    'immediate': immediate,
                    'digest_daily': digest_daily,
                    'digest_weekly': False,
                    'timezone': 'UTC'
                })
        
        return Response(default_preferences)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update notification preferences"""
        preferences_data = request.data.get('preferences', [])
        
        if not preferences_data:
            return Response(
                {'error': 'Preferences data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_preferences = []
        errors = []
        
        for pref_data in preferences_data:
            try:
                notification_type = pref_data.get('notification_type')
                delivery_method = pref_data.get('delivery_method')
                
                if not notification_type or not delivery_method:
                    errors.append('notification_type and delivery_method are required')
                    continue
                
                # Get or create preference
                preference, created = NotificationPreference.objects.get_or_create(
                    user=request.user,
                    notification_type=notification_type,
                    delivery_method=delivery_method,
                    defaults=pref_data
                )
                
                # Update existing preference
                if not created:
                    for field, value in pref_data.items():
                        if hasattr(preference, field) and field not in ['notification_type', 'delivery_method']:
                            setattr(preference, field, value)
                    preference.save()
                
                updated_preferences.append(preference)
                
            except Exception as e:
                errors.append(f"Error updating preference: {str(e)}")
        
        return Response({
            'updated_count': len(updated_preferences),
            'errors': errors,
            'preferences': NotificationPreferenceSerializer(
                updated_preferences, many=True
            ).data
        })

    @action(detail=False, methods=['post'])
    def reset_to_defaults(self, request):
        """Reset all notification preferences to defaults"""
        # Delete existing preferences
        NotificationPreference.objects.filter(user=request.user).delete()
        
        # Create default preferences
        default_preferences = []
        
        for notification_type, _ in NotificationPreference.NOTIFICATION_TYPES:
            for delivery_method, _ in NotificationPreference.DELIVERY_METHODS:
                is_enabled = True
                immediate = True
                
                if delivery_method == 'SMS' and notification_type not in ['EMERGENCY', 'DIRECT_MESSAGE']:
                    is_enabled = False
                    immediate = False
                
                digest_daily = notification_type == 'CHANNEL_MESSAGE'
                
                preference = NotificationPreference.objects.create(
                    user=request.user,
                    notification_type=notification_type,
                    delivery_method=delivery_method,
                    is_enabled=is_enabled,
                    immediate=immediate,
                    digest_daily=digest_daily,
                    digest_weekly=False,
                    timezone='UTC'
                )
                default_preferences.append(preference)
        
        return Response({
            'message': 'Preferences reset to defaults',
            'preferences': NotificationPreferenceSerializer(
                default_preferences, many=True
            ).data
        })


class NotificationQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing notification queue status.
    Read-only access for administrators to monitor notification delivery.
    """
    serializer_class = NotificationQueueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    
    filterset_fields = {
        'user': ['exact'],
        'notification_type': ['exact', 'in'],
        'delivery_method': ['exact', 'in'],
        'status': ['exact', 'in'],
        'priority': ['exact', 'gte', 'lte'],
    }
    ordering_fields = ['created_at', 'priority', 'scheduled_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter notifications based on user permissions"""
        user = self.request.user
        
        # Users can only see their own notifications
        if not user.is_staff:
            return NotificationQueue.objects.filter(user=user)
        
        # Staff can see all notifications
        return NotificationQueue.objects.all()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get notification queue statistics"""
        queryset = self.get_queryset()
        
        # Status counts
        status_counts = {}
        for status, _ in NotificationQueue.STATUS_CHOICES:
            count = queryset.filter(status=status).count()
            if count > 0:
                status_counts[status] = count
        
        # Delivery method counts
        method_counts = {}
        for method, _ in NotificationPreference.DELIVERY_METHODS:
            count = queryset.filter(delivery_method=method).count()
            if count > 0:
                method_counts[method] = count
        
        # Priority distribution
        priority_counts = {}
        priorities = queryset.values_list('priority', flat=True).distinct()
        for priority in priorities:
            count = queryset.filter(priority=priority).count()
            priority_counts[f'priority_{priority}'] = count
        
        # Recent failures
        recent_failures = queryset.filter(
            status='FAILED',
            updated_at__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        return Response({
            'total_notifications': queryset.count(),
            'status_counts': status_counts,
            'delivery_method_counts': method_counts,
            'priority_counts': priority_counts,
            'recent_failures_24h': recent_failures
        })


class EmergencyViewSet(viewsets.ViewSet):
    """
    API endpoint for emergency communication features.
    Handles emergency alerts, incident reporting, and crisis communication.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def send_alert(self, request):
        """Send an emergency alert"""
        alert_type = request.data.get('alert_type', 'General Emergency')
        message = request.data.get('message', '')
        severity = request.data.get('severity', 'HIGH')
        shipment_id = request.data.get('shipment_id')
        affected_area = request.data.get('affected_area', {})
        
        if not message:
            return Response(
                {'error': 'Alert message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create emergency event
            if shipment_id:
                shipment = Shipment.objects.get(id=shipment_id)
                event = ShipmentEvent.objects.create(
                    shipment=shipment,
                    user=request.user,
                    event_type='ALERT',
                    title=f'EMERGENCY: {alert_type}',
                    details=message,
                    priority='URGENT',
                    is_automated=False
                )
                
                # Send emergency alert task
                from .tasks import send_emergency_alert
                task_result = send_emergency_alert.delay(
                    shipment_id=str(shipment.id),
                    alert_type=alert_type,
                    message=message,
                    severity=severity
                )
                
                return Response({
                    'message': 'Emergency alert sent',
                    'alert_id': str(event.id),
                    'task_id': task_result.id,
                    'shipment': shipment.tracking_number
                })
            else:
                # General emergency alert (not shipment-specific)
                # Create emergency channel for coordination
                channel = Channel.objects.create(
                    name=f'EMERGENCY: {alert_type}',
                    description=message,
                    channel_type='EMERGENCY',
                    created_by=request.user,
                    is_private=False,
                    is_emergency_channel=True,
                    emergency_level=5  # Maximum emergency level
                )
                
                ChannelMembership.objects.create(
                    user=request.user,
                    channel=channel,
                    role='OWNER'
                )
                
                # Broadcast emergency alert
                from .tasks import send_bulk_notifications
                
                # Get emergency contacts (this would be configured per organization)
                emergency_contacts = User.objects.filter(
                    is_staff=True,
                    is_active=True
                ).values_list('email', flat=True)
                
                notifications = []
                for email in emergency_contacts:
                    notifications.extend([
                        {
                            'type': 'email',
                            'recipient': email,
                            'subject': f'EMERGENCY ALERT: {alert_type}',
                            'message': f'Emergency Alert: {message}\n\nJoin emergency channel: {channel.name}'
                        },
                        {
                            'type': 'sms',
                            'recipient': email,  # Assuming email is phone for demo
                            'message': f'EMERGENCY: {alert_type}. {message[:100]}...'
                        }
                    ])
                
                task_result = send_bulk_notifications.delay(notifications)
                
                return Response({
                    'message': 'Emergency alert broadcasted',
                    'channel_id': str(channel.id),
                    'task_id': task_result.id,
                    'notifications_queued': len(notifications)
                })
                
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error sending emergency alert: {str(e)}")
            return Response(
                {'error': 'Failed to send emergency alert'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def report_incident(self, request):
        """Report an emergency incident"""
        incident_type = request.data.get('incident_type', 'GENERAL')
        description = request.data.get('description', '')
        location = request.data.get('location', {})
        shipment_id = request.data.get('shipment_id')
        severity = request.data.get('severity', 3)
        
        if not description:
            return Response(
                {'error': 'Incident description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create incident channel
            channel_name = f'INCIDENT: {incident_type}'
            if shipment_id:
                shipment = Shipment.objects.get(id=shipment_id)
                channel_name += f' - {shipment.tracking_number}'
            
            channel = Channel.objects.create(
                name=channel_name,
                description=f'Incident Report: {description}',
                channel_type='EMERGENCY',
                created_by=request.user,
                is_private=False,
                is_emergency_channel=True,
                emergency_level=min(severity, 5),
                related_shipment_id=shipment_id if shipment_id else None
            )
            
            ChannelMembership.objects.create(
                user=request.user,
                channel=channel,
                role='OWNER'
            )
            
            # Create initial incident report message
            Message.objects.create(
                channel=channel,
                sender=request.user,
                message_type='SYSTEM',
                content=f"""INCIDENT REPORT
Type: {incident_type}
Severity: {severity}/5
Location: {location.get('name', 'Not specified')}
Reporter: {request.user.get_full_name()}

Description:
{description}""",
                is_emergency=True,
                priority='URGENT',
                metadata={
                    'incident_type': incident_type,
                    'severity': severity,
                    'location': location,
                    'reporter': str(request.user.id)
                }
            )
            
            # Add relevant stakeholders if shipment-related
            if shipment_id:
                stakeholders = []
                if hasattr(shipment, 'assigned_driver') and shipment.assigned_driver:
                    stakeholders.append(shipment.assigned_driver)
                if hasattr(shipment, 'company') and shipment.company and shipment.company.primary_contact:
                    stakeholders.append(shipment.company.primary_contact)
                
                for stakeholder in stakeholders:
                    if stakeholder != request.user:
                        ChannelMembership.objects.create(
                            user=stakeholder,
                            channel=channel,
                            role='MEMBER'
                        )
            
            return Response({
                'message': 'Incident reported successfully',
                'incident_channel_id': str(channel.id),
                'severity': severity,
                'stakeholders_notified': len(channel.memberships.filter(is_active=True))
            })
            
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error reporting incident: {str(e)}")
            return Response(
                {'error': 'Failed to report incident'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def active_emergencies(self, request):
        """Get active emergency channels and incidents"""
        user = request.user
        
        # Get emergency channels the user has access to
        emergency_channels = Channel.objects.filter(
            Q(memberships__user=user, memberships__is_active=True) |
            Q(is_private=False),
            is_emergency_channel=True,
            is_archived=False
        ).distinct().order_by('-emergency_level', '-created_at')
        
        serializer = EmergencyChannelSerializer(
            emergency_channels, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'active_emergencies': serializer.data,
            'total_count': len(serializer.data)
        })

    @action(detail=False, methods=['post'])
    def escalate_emergency(self, request):
        """Escalate an emergency to higher severity level"""
        channel_id = request.data.get('channel_id')
        new_level = request.data.get('emergency_level', 5)
        reason = request.data.get('reason', '')
        
        if not channel_id:
            return Response(
                {'error': 'Channel ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            channel = Channel.objects.get(
                id=channel_id,
                is_emergency_channel=True
            )
            
            # Check if user has permission to escalate
            try:
                membership = ChannelMembership.objects.get(
                    user=request.user,
                    channel=channel,
                    is_active=True
                )
                
                if membership.role not in ['OWNER', 'ADMIN']:
                    return Response(
                        {'error': 'Insufficient permissions to escalate emergency'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except ChannelMembership.DoesNotExist:
                return Response(
                    {'error': 'Not a member of this emergency channel'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            old_level = channel.emergency_level
            channel.emergency_level = new_level
            channel.save()
            
            # Create escalation message
            Message.objects.create(
                channel=channel,
                sender=request.user,
                message_type='SYSTEM',
                content=f"""EMERGENCY ESCALATED
Previous Level: {old_level}/5
New Level: {new_level}/5
Escalated by: {request.user.get_full_name()}

Reason: {reason}""",
                is_emergency=True,
                priority='URGENT',
                metadata={
                    'escalation': True,
                    'old_level': old_level,
                    'new_level': new_level,
                    'escalated_by': str(request.user.id)
                }
            )
            
            # Send escalation notifications
            from .tasks import send_bulk_notifications
            
            # Notify all channel members
            members = channel.memberships.filter(is_active=True)
            notifications = []
            
            for membership in members:
                if membership.user != request.user:  # Don't notify the escalator
                    notifications.append({
                        'type': 'email',
                        'recipient': membership.user.email,
                        'subject': f'EMERGENCY ESCALATED: {channel.name}',
                        'message': f'Emergency escalated to level {new_level}/5.\n\nReason: {reason}'
                    })
            
            if notifications:
                send_bulk_notifications.delay(notifications)
            
            return Response({
                'message': 'Emergency escalated successfully',
                'old_level': old_level,
                'new_level': new_level,
                'notifications_sent': len(notifications)
            })
            
        except Channel.DoesNotExist:
            return Response(
                {'error': 'Emergency channel not found'},
                status=status.HTTP_404_NOT_FOUND
            )
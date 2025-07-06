# communications/api_views.py
import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Prefetch

logger = logging.getLogger(__name__)

from .models import ShipmentEvent, EventRead, EventMention
from .serializers import (
    ShipmentEventSerializer,
    ShipmentEventCreateSerializer,
    ShipmentEventCommentSerializer,
    EventReadSerializer
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
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import (
    CustomerProfile, CustomerDashboard, CustomerNotification,
    SelfServiceRequest, CustomerFeedback, PortalUsageAnalytics
)
from .serializers import (
    CustomerProfileSerializer, CustomerDashboardSerializer,
    CustomerNotificationSerializer, SelfServiceRequestSerializer,
    CustomerFeedbackSerializer, PortalAnalyticsSerializer
)
from .permissions import IsCustomerOwnerOrAdmin, IsCustomerProfile
from .services import CustomerPortalService, NotificationService
from shipments.models import Shipment
from shipments.serializers import ShipmentSerializer


class CustomerProfileViewSet(viewsets.ModelViewSet):
    """
    Customer profile management for portal users
    """
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerOwnerOrAdmin]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return CustomerProfile.objects.all()
        
        # Customers can only access their own profile
        try:
            return CustomerProfile.objects.filter(user=self.request.user)
        except CustomerProfile.DoesNotExist:
            return CustomerProfile.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @extend_schema(
        summary="Get customer dashboard data",
        description="Get comprehensive dashboard data for customer portal"
    )
    @action(detail=True, methods=['get'])
    def dashboard_data(self, request, pk=None):
        """Get comprehensive dashboard data"""
        profile = self.get_object()
        service = CustomerPortalService(profile)
        
        dashboard_data = service.get_dashboard_data()
        return Response(dashboard_data)
    
    @extend_schema(
        summary="Update notification preferences",
        description="Update customer notification preferences"
    )
    @action(detail=True, methods=['patch'])
    def update_notifications(self, request, pk=None):
        """Update notification preferences"""
        profile = self.get_object()
        preferences = request.data.get('notification_preferences', {})
        
        profile.notification_preferences.update(preferences)
        profile.save()
        
        return Response({'message': 'Notification preferences updated'})
    
    @extend_schema(
        summary="Get usage analytics",
        description="Get portal usage analytics for customer"
    )
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get usage analytics"""
        profile = self.get_object()
        
        analytics = PortalUsageAnalytics.objects.filter(
            customer_profile=profile
        ).values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({'usage_analytics': list(analytics)})


class CustomerDashboardViewSet(viewsets.ModelViewSet):
    """
    Customer dashboard configuration management
    """
    serializer_class = CustomerDashboardSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerProfile]
    
    def get_queryset(self):
        if hasattr(self.request.user, 'customer_profile'):
            return CustomerDashboard.objects.filter(
                customer_profile=self.request.user.customer_profile
            )
        return CustomerDashboard.objects.none()
    
    def perform_create(self, serializer):
        profile = get_object_or_404(CustomerProfile, user=self.request.user)
        serializer.save(customer_profile=profile)
    
    @extend_schema(
        summary="Set as default dashboard",
        description="Set this dashboard as the default for the customer"
    )
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set dashboard as default"""
        dashboard = self.get_object()
        
        # Remove default from other dashboards
        CustomerDashboard.objects.filter(
            customer_profile=dashboard.customer_profile
        ).update(is_default=False)
        
        # Set this as default
        dashboard.is_default = True
        dashboard.save()
        
        return Response({'message': 'Dashboard set as default'})


class CustomerNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Customer notifications - read-only with mark as read functionality
    """
    serializer_class = CustomerNotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerProfile]
    filterset_fields = ['notification_type', 'status', 'priority']
    ordering_fields = ['sent_at', 'priority']
    ordering = ['-sent_at']
    
    def get_queryset(self):
        if hasattr(self.request.user, 'customer_profile'):
            return CustomerNotification.objects.filter(
                customer_profile=self.request.user.customer_profile
            )
        return CustomerNotification.objects.none()
    
    @extend_schema(
        summary="Mark notification as read",
        description="Mark a notification as read"
    )
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        
        return Response({'message': 'Notification marked as read'})
    
    @extend_schema(
        summary="Mark all notifications as read",
        description="Mark all unread notifications as read"
    )
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        if hasattr(request.user, 'customer_profile'):
            CustomerNotification.objects.filter(
                customer_profile=request.user.customer_profile,
                status='unread'
            ).update(status='read', read_at=timezone.now())
        
        return Response({'message': 'All notifications marked as read'})
    
    @extend_schema(
        summary="Get unread count",
        description="Get count of unread notifications"
    )
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread notification count"""
        if hasattr(request.user, 'customer_profile'):
            count = CustomerNotification.objects.filter(
                customer_profile=request.user.customer_profile,
                status='unread'
            ).count()
        else:
            count = 0
        
        return Response({'unread_count': count})


class SelfServiceRequestViewSet(viewsets.ModelViewSet):
    """
    Self-service requests from customers
    """
    serializer_class = SelfServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerProfile]
    filterset_fields = ['request_type', 'status', 'priority']
    search_fields = ['title', 'description']
    ordering_fields = ['submitted_at', 'priority', 'due_date']
    ordering = ['-submitted_at']
    
    def get_queryset(self):
        if hasattr(self.request.user, 'customer_profile'):
            return SelfServiceRequest.objects.filter(
                customer_profile=self.request.user.customer_profile
            )
        return SelfServiceRequest.objects.none()
    
    def perform_create(self, serializer):
        profile = get_object_or_404(CustomerProfile, user=self.request.user)
        serializer.save(customer_profile=profile)
    
    @extend_schema(
        summary="Cancel service request",
        description="Cancel a pending service request"
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel service request"""
        service_request = self.get_object()
        
        if service_request.status in ['submitted', 'in_review']:
            service_request.status = 'cancelled'
            service_request.completed_at = timezone.now()
            service_request.save()
            
            return Response({'message': 'Service request cancelled'})
        else:
            return Response(
                {'error': 'Cannot cancel request in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomerFeedbackViewSet(viewsets.ModelViewSet):
    """
    Customer feedback and ratings
    """
    serializer_class = CustomerFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerProfile]
    filterset_fields = ['feedback_type', 'rating']
    ordering_fields = ['submitted_at', 'rating']
    ordering = ['-submitted_at']
    
    def get_queryset(self):
        if hasattr(self.request.user, 'customer_profile'):
            return CustomerFeedback.objects.filter(
                customer_profile=self.request.user.customer_profile
            )
        return CustomerFeedback.objects.none()
    
    def perform_create(self, serializer):
        profile = get_object_or_404(CustomerProfile, user=self.request.user)
        serializer.save(customer_profile=profile)


class CustomerShipmentsView(APIView):
    """
    Customer-specific shipments view with filtering and tracking
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomerProfile]
    
    @extend_schema(
        summary="Get customer shipments",
        description="Get shipments for the authenticated customer with filtering",
        parameters=[
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by shipment status'
            ),
            OpenApiParameter(
                name='date_from',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter from date (YYYY-MM-DD)'
            ),
            OpenApiParameter(
                name='date_to',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Filter to date (YYYY-MM-DD)'
            ),
            OpenApiParameter(
                name='tracking_number',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Search by tracking number'
            )
        ]
    )
    def get(self, request):
        """Get customer shipments with filtering"""
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'Customer profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        profile = request.user.customer_profile
        
        # Base queryset for customer's company
        shipments = Shipment.objects.filter(customer=profile.company)
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            shipments = shipments.filter(status=status_filter)
        
        date_from = request.query_params.get('date_from')
        if date_from:
            shipments = shipments.filter(created_at__date__gte=date_from)
        
        date_to = request.query_params.get('date_to')
        if date_to:
            shipments = shipments.filter(created_at__date__lte=date_to)
        
        tracking_number = request.query_params.get('tracking_number')
        if tracking_number:
            shipments = shipments.filter(
                Q(tracking_number__icontains=tracking_number) |
                Q(reference_number__icontains=tracking_number)
            )
        
        # Paginate results
        from django.core.paginator import Paginator
        page_size = min(int(request.query_params.get('page_size', 25)), 100)
        page = int(request.query_params.get('page', 1))
        
        paginator = Paginator(shipments.order_by('-created_at'), page_size)
        page_obj = paginator.get_page(page)
        
        serializer = ShipmentSerializer(page_obj, many=True)
        
        return Response({
            'shipments': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_items': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            }
        })


class CustomerTrackingView(APIView):
    """
    Public shipment tracking for customers
    """
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Track shipment by number",
        description="Track shipment using tracking number (public endpoint)",
        parameters=[
            OpenApiParameter(
                name='tracking_number',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Tracking number'
            )
        ]
    )
    def get(self, request):
        """Track shipment by tracking number"""
        tracking_number = request.query_params.get('tracking_number')
        
        if not tracking_number:
            return Response(
                {'error': 'Tracking number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(tracking_number=tracking_number)
            
            # Return limited tracking information for public access
            tracking_data = {
                'tracking_number': shipment.tracking_number,
                'status': shipment.status,
                'origin_location': shipment.origin_location,
                'destination_location': shipment.destination_location,
                'created_at': shipment.created_at,
                'updated_at': shipment.updated_at,
                'estimated_delivery': getattr(shipment, 'estimated_delivery_date', None)
            }
            
            return Response(tracking_data)
            
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class CustomerPortalAnalyticsView(APIView):
    """
    Customer portal usage analytics
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomerProfile]
    
    @extend_schema(
        summary="Get portal usage analytics",
        description="Get customer portal usage analytics and insights"
    )
    def get(self, request):
        """Get portal usage analytics"""
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'Customer profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        profile = request.user.customer_profile
        service = CustomerPortalService(profile)
        
        analytics = service.get_usage_analytics()
        return Response(analytics)


class QuickActionsView(APIView):
    """
    Quick actions for customer portal
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomerProfile]
    
    @extend_schema(
        summary="Get available quick actions",
        description="Get list of available quick actions for customer"
    )
    def get(self, request):
        """Get available quick actions"""
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'Customer profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        profile = request.user.customer_profile
        
        # Define available quick actions based on profile permissions
        actions = [
            {
                'id': 'track_shipment',
                'title': 'Track Shipment',
                'description': 'Track your shipments in real-time',
                'icon': 'tracking',
                'url': '/portal/shipments/track',
                'enabled': True
            },
            {
                'id': 'new_quote',
                'title': 'Request Quote',
                'description': 'Get a quote for new shipment',
                'icon': 'quote',
                'url': '/portal/quotes/new',
                'enabled': True
            },
            {
                'id': 'schedule_pickup',
                'title': 'Schedule Pickup',
                'description': 'Schedule a pickup for your shipment',
                'icon': 'pickup',
                'url': '/portal/pickups/schedule',
                'enabled': True
            },
            {
                'id': 'view_documents',
                'title': 'View Documents',
                'description': 'Access your shipping documents',
                'icon': 'documents',
                'url': '/portal/documents',
                'enabled': profile.show_documents
            },
            {
                'id': 'support_ticket',
                'title': 'Contact Support',
                'description': 'Get help from our support team',
                'icon': 'support',
                'url': '/portal/support/new',
                'enabled': True
            },
            {
                'id': 'account_settings',
                'title': 'Account Settings',
                'description': 'Manage your account preferences',
                'icon': 'settings',
                'url': '/portal/settings',
                'enabled': True
            }
        ]
        
        return Response({'quick_actions': actions})
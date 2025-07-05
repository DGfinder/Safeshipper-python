from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import FilterSet, CharFilter, DateTimeFilter, ChoiceFilter
from .models import AuditLog, ShipmentAuditLog, ComplianceAuditLog, AuditActionType
from .serializers import (
    AuditLogSerializer, ShipmentAuditLogSerializer, ComplianceAuditLogSerializer,
    AuditLogSummarySerializer
)
from shipments.models import Shipment
from .signals import log_custom_action


class AuditLogPagination(PageNumberPagination):
    """Custom pagination for audit logs"""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AuditLogFilter(FilterSet):
    """Filter set for audit logs"""
    
    action_type = ChoiceFilter(choices=AuditActionType.choices)
    user = CharFilter(field_name='user__username', lookup_expr='icontains')
    user_role = CharFilter(field_name='user_role', lookup_expr='iexact')
    date_from = DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    date_to = DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    content_type = CharFilter(field_name='content_type__model', lookup_expr='iexact')
    object_id = CharFilter(field_name='object_id', lookup_expr='exact')
    search = CharFilter(method='filter_search')
    
    def filter_search(self, queryset, name, value):
        """Full-text search across multiple fields"""
        return queryset.filter(
            Q(action_description__icontains=value) |
            Q(user__username__icontains=value) |
            Q(user__email__icontains=value) |
            Q(user_role__icontains=value)
        )
    
    class Meta:
        model = AuditLog
        fields = ['action_type', 'user', 'user_role', 'date_from', 'date_to', 
                 'content_type', 'object_id', 'search']


class AuditLogListView(generics.ListAPIView):
    """
    List all audit logs with filtering and pagination
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditLogPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = AuditLogFilter
    
    def get_queryset(self):
        """Filter based on user permissions"""
        queryset = super().get_queryset()
        
        # Only admins and compliance officers can see all audit logs
        if self.request.user.role in ['ADMIN', 'COMPLIANCE_OFFICER']:
            return queryset
        
        # Regular users can only see their own actions
        return queryset.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Log the audit access"""
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed audit logs with filters: {request.GET}",
            request=request
        )
        
        return super().list(request, *args, **kwargs)


class AuditLogDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific audit log entry
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Ensure user has permission to view this audit log"""
        obj = super().get_object()
        
        # Only admins and compliance officers can see all audit logs
        if self.request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER']:
            if obj.user != self.request.user:
                self.permission_denied(
                    self.request, 
                    message="You don't have permission to view this audit log."
                )
        
        return obj


class ShipmentAuditLogListView(generics.ListAPIView):
    """
    List audit logs for a specific shipment
    """
    serializer_class = ShipmentAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditLogPagination
    
    def get_queryset(self):
        """Get audit logs for specific shipment"""
        shipment_id = self.kwargs['shipment_id']
        shipment = get_object_or_404(Shipment, id=shipment_id)
        
        # Check if user has permission to view this shipment's audit logs
        if self.request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'DISPATCHER']:
            # Regular users can only see logs for shipments they're involved with
            if (shipment.requested_by != self.request.user and 
                shipment.assigned_driver != self.request.user):
                self.permission_denied(
                    self.request,
                    message="You don't have permission to view this shipment's audit logs."
                )
        
        return ShipmentAuditLog.objects.filter(shipment=shipment)
    
    def list(self, request, *args, **kwargs):
        """Log the shipment audit access"""
        shipment_id = self.kwargs['shipment_id']
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed audit logs for shipment {shipment_id}",
            request=request
        )
        
        return super().list(request, *args, **kwargs)


class ComplianceAuditLogListView(generics.ListAPIView):
    """
    List compliance-specific audit logs
    """
    queryset = ComplianceAuditLog.objects.all()
    serializer_class = ComplianceAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditLogPagination
    
    def get_queryset(self):
        """Filter based on user permissions"""
        queryset = super().get_queryset()
        
        # Only admins and compliance officers can see compliance logs
        if self.request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER']:
            self.permission_denied(
                self.request,
                message="You don't have permission to view compliance audit logs."
            )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Log the compliance audit access"""
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description="User accessed compliance audit logs",
            request=request
        )
        
        return super().list(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def audit_summary(request):
    """
    Get audit log summary statistics
    """
    # Check permissions
    if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER']:
        return Response(
            {"error": "You don't have permission to view audit summaries."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get date range (default to last 30 days)
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)
    
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    if date_from:
        start_date = timezone.datetime.fromisoformat(date_from.replace('Z', '+00:00'))
    if date_to:
        end_date = timezone.datetime.fromisoformat(date_to.replace('Z', '+00:00'))
    
    # Get audit logs in date range
    audit_logs = AuditLog.objects.filter(
        timestamp__gte=start_date,
        timestamp__lte=end_date
    )
    
    # Calculate statistics
    total_actions = audit_logs.count()
    
    # Actions by type
    actions_by_type = dict(
        audit_logs.values('action_type')
        .annotate(count=Count('action_type'))
        .values_list('action_type', 'count')
    )
    
    # Actions by user
    actions_by_user = dict(
        audit_logs.exclude(user__isnull=True)
        .values('user__username')
        .annotate(count=Count('user'))
        .values_list('user__username', 'count')
    )
    
    # Recent actions (last 10)
    recent_actions = audit_logs.order_by('-timestamp')[:10]
    
    # Compliance issues
    compliance_issues = ComplianceAuditLog.objects.filter(
        audit_log__timestamp__gte=start_date,
        audit_log__timestamp__lte=end_date,
        compliance_status__in=['NON_COMPLIANT', 'WARNING']
    ).count()
    
    # High impact actions
    high_impact_actions = ShipmentAuditLog.objects.filter(
        audit_log__timestamp__gte=start_date,
        audit_log__timestamp__lte=end_date,
        impact_level__in=['HIGH', 'CRITICAL']
    ).count()
    
    summary_data = {
        'total_actions': total_actions,
        'actions_by_type': actions_by_type,
        'actions_by_user': actions_by_user,
        'recent_actions': AuditLogSerializer(recent_actions, many=True).data,
        'compliance_issues': compliance_issues,
        'high_impact_actions': high_impact_actions
    }
    
    # Log the summary access
    log_custom_action(
        action_type=AuditActionType.ACCESS_GRANTED,
        description=f"User accessed audit summary for period {start_date} to {end_date}",
        request=request,
        metadata={'date_range': {'start': start_date.isoformat(), 'end': end_date.isoformat()}}
    )
    
    serializer = AuditLogSummarySerializer(summary_data)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def export_audit_logs(request):
    """
    Export audit logs to CSV
    """
    # Check permissions
    if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER']:
        return Response(
            {"error": "You don't have permission to export audit logs."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get filters from request
    filters = request.data.get('filters', {})
    
    # Apply filters
    queryset = AuditLog.objects.all()
    
    if 'action_type' in filters:
        queryset = queryset.filter(action_type=filters['action_type'])
    
    if 'user' in filters:
        queryset = queryset.filter(user__username__icontains=filters['user'])
    
    if 'date_from' in filters:
        date_from = timezone.datetime.fromisoformat(filters['date_from'].replace('Z', '+00:00'))
        queryset = queryset.filter(timestamp__gte=date_from)
    
    if 'date_to' in filters:
        date_to = timezone.datetime.fromisoformat(filters['date_to'].replace('Z', '+00:00'))
        queryset = queryset.filter(timestamp__lte=date_to)
    
    # Log the export
    log_custom_action(
        action_type=AuditActionType.EXPORT,
        description=f"User exported {queryset.count()} audit log entries",
        request=request,
        metadata={'filters': filters, 'count': queryset.count()}
    )
    
    # Return export job ID (in a real implementation, this would be async)
    return Response({
        'export_id': 'audit-export-' + timezone.now().strftime('%Y%m%d-%H%M%S'),
        'status': 'pending',
        'count': queryset.count()
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_activity_summary(request, user_id):
    """
    Get activity summary for a specific user
    """
    # Check permissions
    if request.user.role not in ['ADMIN', 'COMPLIANCE_OFFICER']:
        if str(request.user.id) != user_id:
            return Response(
                {"error": "You don't have permission to view this user's activity."},
                status=status.HTTP_403_FORBIDDEN
            )
    
    # Get user's audit logs
    user_logs = AuditLog.objects.filter(user_id=user_id)
    
    # Calculate statistics
    total_actions = user_logs.count()
    last_action = user_logs.order_by('-timestamp').first()
    
    # Actions by type
    actions_by_type = dict(
        user_logs.values('action_type')
        .annotate(count=Count('action_type'))
        .values_list('action_type', 'count')
    )
    
    # Recent actions
    recent_actions = user_logs.order_by('-timestamp')[:5]
    
    return Response({
        'total_actions': total_actions,
        'last_action': last_action.timestamp if last_action else None,
        'actions_by_type': actions_by_type,
        'recent_actions': AuditLogSerializer(recent_actions, many=True).data
    })
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Sum, F, Case, When, IntegerField
from django.db.models.functions import TruncDate, TruncHour, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta, datetime
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import FilterSet, CharFilter, DateTimeFilter, ChoiceFilter, BooleanFilter, NumberFilter
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
import csv
import json
from io import StringIO
from .models import (
    AuditLog, ShipmentAuditLog, ComplianceAuditLog, DangerousGoodsAuditLog, 
    AuditMetrics, AuditActionType
)
from .serializers import (
    AuditLogSerializer, ShipmentAuditLogSerializer, ComplianceAuditLogSerializer,
    DangerousGoodsAuditLogSerializer, AuditMetricsSerializer, AuditLogSummarySerializer
)
from shipments.models import Shipment
from .signals import log_custom_action
from .permissions import AuditPermissions
from companies.models import Company
from .compliance_monitoring import ComplianceMonitoringService


class AuditLogPagination(PageNumberPagination):
    """Custom pagination for audit logs"""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AuditLogFilter(FilterSet):
    """Enhanced filter set for audit logs with dangerous goods and compliance support"""
    
    # Basic filters
    action_type = ChoiceFilter(choices=AuditActionType.choices)
    user = CharFilter(field_name='user__username', lookup_expr='icontains')
    user_email = CharFilter(field_name='user__email', lookup_expr='icontains')
    user_role = CharFilter(field_name='user_role', lookup_expr='iexact')
    ip_address = CharFilter(field_name='ip_address', lookup_expr='exact')
    
    # Date and time filters
    date_from = DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    date_to = DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    today_only = BooleanFilter(method='filter_today_only')
    this_week = BooleanFilter(method='filter_this_week')
    this_month = BooleanFilter(method='filter_this_month')
    
    # Content filters
    content_type = CharFilter(field_name='content_type__model', lookup_expr='iexact')
    object_id = CharFilter(field_name='object_id', lookup_expr='exact')
    
    # Security filters
    failed_logins_only = BooleanFilter(method='filter_failed_logins')
    security_events_only = BooleanFilter(method='filter_security_events')
    high_risk_only = BooleanFilter(method='filter_high_risk')
    
    # Compliance filters
    compliance_violations_only = BooleanFilter(method='filter_compliance_violations')
    dangerous_goods_only = BooleanFilter(method='filter_dangerous_goods')
    
    # Search functionality
    search = CharFilter(method='filter_search')
    advanced_search = CharFilter(method='filter_advanced_search')
    
    def filter_search(self, queryset, name, value):
        """Full-text search across multiple fields"""
        return queryset.filter(
            Q(action_description__icontains=value) |
            Q(user__username__icontains=value) |
            Q(user__email__icontains=value) |
            Q(user_role__icontains=value) |
            Q(metadata__icontains=value) |
            Q(old_values__icontains=value) |
            Q(new_values__icontains=value)
        )
    
    def filter_advanced_search(self, queryset, name, value):
        """Advanced search with JSON support for metadata fields"""
        try:
            # Try to parse as JSON for structured search
            search_terms = json.loads(value)
            q_objects = Q()
            
            for field, term in search_terms.items():
                if field == 'metadata':
                    q_objects |= Q(metadata__icontains=term)
                elif field == 'user':
                    q_objects |= Q(user__username__icontains=term) | Q(user__email__icontains=term)
                elif field == 'action':
                    q_objects |= Q(action_description__icontains=term)
                elif field == 'ip':
                    q_objects |= Q(ip_address__icontains=term)
            
            return queryset.filter(q_objects)
        except json.JSONDecodeError:
            # Fall back to simple text search
            return self.filter_search(queryset, name, value)
    
    def filter_today_only(self, queryset, name, value):
        """Filter for today's events only"""
        if value:
            today = timezone.now().date()
            return queryset.filter(timestamp__date=today)
        return queryset
    
    def filter_this_week(self, queryset, name, value):
        """Filter for this week's events"""
        if value:
            today = timezone.now().date()
            start_week = today - timedelta(days=today.weekday())
            return queryset.filter(timestamp__date__gte=start_week)
        return queryset
    
    def filter_this_month(self, queryset, name, value):
        """Filter for this month's events"""
        if value:
            today = timezone.now().date()
            start_month = today.replace(day=1)
            return queryset.filter(timestamp__date__gte=start_month)
        return queryset
    
    def filter_failed_logins(self, queryset, name, value):
        """Filter for failed login attempts only"""
        if value:
            return queryset.filter(action_type=AuditActionType.LOGIN, metadata__contains='failed')
        return queryset
    
    def filter_security_events(self, queryset, name, value):
        """Filter for security-related events"""
        if value:
            security_actions = [
                AuditActionType.LOGIN, AuditActionType.LOGOUT, 
                AuditActionType.ACCESS_DENIED, AuditActionType.ACCESS_GRANTED
            ]
            return queryset.filter(action_type__in=security_actions)
        return queryset
    
    def filter_high_risk(self, queryset, name, value):
        """Filter for high-risk audit events"""
        if value:
            high_risk_actions = [
                AuditActionType.DELETE, AuditActionType.ACCESS_DENIED,
                AuditActionType.DOCUMENT_DELETE
            ]
            return queryset.filter(
                Q(action_type__in=high_risk_actions) |
                Q(compliance_audits__risk_assessment_score__gte=75)
            )
        return queryset
    
    def filter_compliance_violations(self, queryset, name, value):
        """Filter for compliance violation events"""
        if value:
            return queryset.filter(
                compliance_audits__compliance_status__in=['NON_COMPLIANT', 'WARNING']
            )
        return queryset
    
    def filter_dangerous_goods(self, queryset, name, value):
        """Filter for dangerous goods related events"""
        if value:
            return queryset.filter(dangerous_goods_audits__isnull=False)
        return queryset
    
    class Meta:
        model = AuditLog
        fields = [
            'action_type', 'user', 'user_email', 'user_role', 'ip_address',
            'date_from', 'date_to', 'today_only', 'this_week', 'this_month',
            'content_type', 'object_id', 'failed_logins_only', 'security_events_only',
            'high_risk_only', 'compliance_violations_only', 'dangerous_goods_only',
            'search', 'advanced_search'
        ]


class ComplianceAuditLogFilter(FilterSet):
    """Filter set for compliance audit logs"""
    
    regulation_type = ChoiceFilter(field_name='regulation_type')
    compliance_status = ChoiceFilter(field_name='compliance_status')
    remediation_status = ChoiceFilter(field_name='remediation_status')
    risk_score_min = NumberFilter(field_name='risk_assessment_score', lookup_expr='gte')
    risk_score_max = NumberFilter(field_name='risk_assessment_score', lookup_expr='lte')
    
    # Dangerous goods specific filters
    un_number = CharFilter(method='filter_un_number')
    hazard_class = CharFilter(method='filter_hazard_class')
    
    # Reference filters
    shipment_reference = CharFilter(field_name='shipment_reference', lookup_expr='icontains')
    vehicle_reference = CharFilter(field_name='vehicle_reference', lookup_expr='icontains')
    driver_reference = CharFilter(field_name='driver_reference', lookup_expr='icontains')
    
    # Date filters
    remediation_overdue = BooleanFilter(method='filter_remediation_overdue')
    
    def filter_un_number(self, queryset, name, value):
        """Filter by UN numbers in the affected list"""
        return queryset.filter(un_numbers_affected__contains=[value])
    
    def filter_hazard_class(self, queryset, name, value):
        """Filter by hazard classes in the affected list"""
        return queryset.filter(hazard_classes_affected__contains=[value])
    
    def filter_remediation_overdue(self, queryset, name, value):
        """Filter for overdue remediation actions"""
        if value:
            return queryset.filter(
                remediation_required=True,
                remediation_deadline__lt=timezone.now(),
                remediation_status__in=['PENDING', 'IN_PROGRESS']
            )
        return queryset
    
    class Meta:
        model = ComplianceAuditLog
        fields = [
            'regulation_type', 'compliance_status', 'remediation_status',
            'risk_score_min', 'risk_score_max', 'un_number', 'hazard_class',
            'shipment_reference', 'vehicle_reference', 'driver_reference',
            'remediation_overdue'
        ]


class DangerousGoodsAuditLogFilter(FilterSet):
    """Filter set for dangerous goods audit logs"""
    
    un_number = CharFilter(field_name='un_number', lookup_expr='icontains')
    hazard_class = CharFilter(field_name='hazard_class', lookup_expr='exact')
    packing_group = CharFilter(field_name='packing_group', lookup_expr='exact')
    operation_type = ChoiceFilter(field_name='operation_type')
    
    # Compliance filters
    adg_compliant = BooleanFilter(field_name='adg_compliant')
    iata_compliant = BooleanFilter(field_name='iata_compliant')
    imdg_compliant = BooleanFilter(field_name='imdg_compliant')
    
    # Document filters
    transport_document = CharFilter(field_name='transport_document_number', lookup_expr='icontains')
    manifest_reference = CharFilter(field_name='manifest_reference', lookup_expr='icontains')
    
    # Notification filters
    notification_required = BooleanFilter(field_name='regulatory_notification_required')
    notification_sent = BooleanFilter(field_name='regulatory_notification_sent')
    
    class Meta:
        model = DangerousGoodsAuditLog
        fields = [
            'un_number', 'hazard_class', 'packing_group', 'operation_type',
            'adg_compliant', 'iata_compliant', 'imdg_compliant',
            'transport_document', 'manifest_reference',
            'notification_required', 'notification_sent'
        ]


class AuditLogViewSet(viewsets.ModelViewSet):
    """
    Comprehensive ViewSet for audit log management following SafeShipper patterns
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, AuditPermissions]
    pagination_class = AuditLogPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = AuditLogFilter
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Company-based data filtering for multi-tenant architecture"""
        if not hasattr(self.request.user, 'company'):
            return AuditLog.objects.none()
        
        # Base queryset filtered by company
        queryset = AuditLog.objects.filter(
            Q(user__company=self.request.user.company) |
            Q(metadata__contains={'company_id': str(self.request.user.company.id)})
        ).select_related('user', 'content_type').prefetch_related(
            'compliance_audits', 'dangerous_goods_audits', 'shipment_audits'
        )
        
        # Additional permission-based filtering
        user_role = getattr(self.request.user, 'role', 'VIEWER')
        
        if user_role in ['ADMIN', 'COMPLIANCE_OFFICER']:
            # Full access to company's audit logs
            return queryset
        elif user_role in ['MANAGER', 'SUPERVISOR']:
            # Access to own actions and team member actions
            return queryset.filter(
                Q(user=self.request.user) |
                Q(user__manager=self.request.user) |
                Q(user_role__in=['DRIVER', 'OPERATOR'])
            )
        else:
            # Regular users can only see their own actions
            return queryset.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Log audit access with comprehensive metadata"""
        filters_used = dict(request.GET.items())
        
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed audit logs dashboard",
            request=request,
            metadata={
                'filters_applied': filters_used,
                'access_level': getattr(request.user, 'role', 'UNKNOWN'),
                'company_id': str(request.user.company.id) if hasattr(request.user, 'company') else None
            }
        )
        
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get audit log analytics and trends"""
        queryset = self.get_queryset()
        
        # Date range filtering
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        
        # Calculate analytics
        analytics_data = {
            'total_events': queryset.count(),
            'events_by_type': dict(
                queryset.values('action_type')
                .annotate(count=Count('id'))
                .values_list('action_type', 'count')
            ),
            'events_by_user': dict(
                queryset.exclude(user__isnull=True)
                .values('user__username')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
                .values_list('user__username', 'count')
            ),
            'hourly_distribution': dict(
                queryset.annotate(hour=TruncHour('timestamp'))
                .values('hour')
                .annotate(count=Count('id'))
                .values_list('hour', 'count')
            ),
            'daily_trends': dict(
                queryset.annotate(date=TruncDate('timestamp'))
                .values('date')
                .annotate(count=Count('id'))
                .order_by('date')
                .values_list('date', 'count')
            ),
            'security_events': queryset.filter(
                action_type__in=[
                    AuditActionType.LOGIN, AuditActionType.LOGOUT,
                    AuditActionType.ACCESS_DENIED, AuditActionType.ACCESS_GRANTED
                ]
            ).count(),
            'compliance_events': queryset.filter(
                compliance_audits__isnull=False
            ).count(),
            'dangerous_goods_events': queryset.filter(
                dangerous_goods_audits__isnull=False
            ).count()
        }
        
        return Response(analytics_data)
    
    @action(detail=False, methods=['post'])
    def export(self, request):
        """Export audit logs with multiple format support"""
        export_format = request.data.get('format', 'csv').lower()
        filters = request.data.get('filters', {})
        
        # Apply filters to queryset
        queryset = self.get_queryset()
        if filters:
            filter_instance = self.filterset_class(filters, queryset=queryset)
            queryset = filter_instance.qs
        
        # Log the export action
        log_custom_action(
            action_type=AuditActionType.EXPORT,
            description=f"User exported {queryset.count()} audit log entries in {export_format} format",
            request=request,
            metadata={
                'export_format': export_format,
                'filters_applied': filters,
                'record_count': queryset.count()
            }
        )
        
        if export_format == 'csv':
            return self._export_csv(queryset)
        elif export_format == 'json':
            return self._export_json(queryset)
        elif export_format == 'excel':
            return self._export_excel(queryset)
        else:
            return Response(
                {'error': 'Unsupported export format. Use csv, json, or excel.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _export_csv(self, queryset):
        """Export audit logs as CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Timestamp', 'Action Type', 'Description', 'User', 'User Role',
            'IP Address', 'Content Type', 'Object ID', 'Old Values', 'New Values'
        ])
        
        for log in queryset.select_related('user', 'content_type'):
            writer.writerow([
                str(log.id),
                log.timestamp.isoformat(),
                log.get_action_type_display(),
                log.action_description,
                log.user.username if log.user else 'System',
                log.user_role,
                log.ip_address or '',
                log.content_type.model if log.content_type else '',
                log.object_id or '',
                json.dumps(log.old_values) if log.old_values else '',
                json.dumps(log.new_values) if log.new_values else ''
            ])
        
        return response
    
    def _export_json(self, queryset):
        """Export audit logs as JSON"""
        serializer = self.get_serializer(queryset, many=True)
        response = HttpResponse(
            json.dumps(serializer.data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json"'
        return response
    
    def _export_excel(self, queryset):
        """Export audit logs as Excel (placeholder - would require openpyxl)"""
        # For now, return CSV with Excel content type
        response = self._export_csv(queryset)
        response['Content-Type'] = 'application/vnd.ms-excel'
        response['Content-Disposition'] = response['Content-Disposition'].replace('.csv', '.xls')
        return response
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced search with Elasticsearch-like capabilities"""
        query = request.query_params.get('q', '')
        search_type = request.query_params.get('type', 'basic')  # basic, advanced, semantic
        
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset()
        
        if search_type == 'advanced':
            # Advanced search with structured queries
            try:
                search_params = json.loads(query)
                q_objects = Q()
                
                for field, value in search_params.items():
                    if field == 'action_type':
                        q_objects &= Q(action_type__icontains=value)
                    elif field == 'user':
                        q_objects &= Q(user__username__icontains=value)
                    elif field == 'description':
                        q_objects &= Q(action_description__icontains=value)
                    elif field == 'metadata':
                        q_objects &= Q(metadata__icontains=value)
                    elif field == 'date_range':
                        if 'start' in value and 'end' in value:
                            q_objects &= Q(
                                timestamp__gte=value['start'],
                                timestamp__lte=value['end']
                            )
                
                results = queryset.filter(q_objects)
            except (json.JSONDecodeError, KeyError):
                return Response(
                    {'error': 'Invalid advanced search query format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Basic full-text search
            results = queryset.filter(
                Q(action_description__icontains=query) |
                Q(user__username__icontains=query) |
                Q(user__email__icontains=query) |
                Q(metadata__icontains=query)
            )
        
        # Log the search
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User performed {search_type} search: '{query}'",
            request=request,
            metadata={
                'search_query': query,
                'search_type': search_type,
                'results_count': results.count()
            }
        )
        
        # Paginate results
        page = self.paginate_queryset(results)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def verify_integrity(self, request, pk=None):
        """Verify the integrity of an audit log entry"""
        audit_log = self.get_object()
        
        # Check for compliance audit integrity
        compliance_audits = audit_log.compliance_audits.all()
        integrity_results = {
            'audit_log_id': str(audit_log.id),
            'verified': True,
            'compliance_checks': []
        }
        
        for compliance_audit in compliance_audits:
            if hasattr(compliance_audit, 'verify_integrity'):
                is_valid = compliance_audit.verify_integrity()
                integrity_results['compliance_checks'].append({
                    'id': str(compliance_audit.id),
                    'verified': is_valid,
                    'hash': compliance_audit.compliance_hash
                })
                if not is_valid:
                    integrity_results['verified'] = False
        
        # Log the integrity check
        log_custom_action(
            action_type=AuditActionType.VALIDATION,
            description=f"Integrity verification performed on audit log {audit_log.id}",
            request=request,
            content_object=audit_log,
            metadata=integrity_results
        )
        
        return Response(integrity_results)


class ComplianceAuditLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for compliance-specific audit logs with dangerous goods integration
    """
    serializer_class = ComplianceAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, AuditPermissions]
    pagination_class = AuditLogPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ComplianceAuditLogFilter
    ordering = ['-audit_log__timestamp']
    
    def get_queryset(self):
        """Company-based data filtering for compliance audits"""
        if not hasattr(self.request.user, 'company'):
            return ComplianceAuditLog.objects.none()
        
        return ComplianceAuditLog.objects.filter(
            company=self.request.user.company
        ).select_related(
            'audit_log', 'audit_log__user', 'company'
        )
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get compliance dashboard data"""
        queryset = self.get_queryset()
        
        # Calculate compliance metrics
        total_audits = queryset.count()
        
        # Status breakdown
        status_breakdown = dict(
            queryset.values('compliance_status')
            .annotate(count=Count('id'))
            .values_list('compliance_status', 'count')
        )
        
        # Regulation type breakdown
        regulation_breakdown = dict(
            queryset.values('regulation_type')
            .annotate(count=Count('id'))
            .values_list('regulation_type', 'count')
        )
        
        # Risk assessment statistics
        risk_stats = queryset.exclude(risk_assessment_score__isnull=True).aggregate(
            avg_risk=Avg('risk_assessment_score'),
            max_risk=models.Max('risk_assessment_score'),
            high_risk_count=Count(
                Case(
                    When(risk_assessment_score__gte=75, then=1),
                    output_field=IntegerField()
                )
            )
        )
        
        # Remediation statistics
        remediation_stats = {
            'required': queryset.filter(remediation_required=True).count(),
            'completed': queryset.filter(remediation_status='COMPLETED').count(),
            'overdue': queryset.filter(
                remediation_required=True,
                remediation_deadline__lt=timezone.now(),
                remediation_status__in=['PENDING', 'IN_PROGRESS']
            ).count()
        }
        
        # Recent high-risk violations
        recent_violations = queryset.filter(
            Q(compliance_status='NON_COMPLIANT') |
            Q(risk_assessment_score__gte=75)
        ).order_by('-audit_log__timestamp')[:5]
        
        dashboard_data = {
            'total_audits': total_audits,
            'status_breakdown': status_breakdown,
            'regulation_breakdown': regulation_breakdown,
            'risk_statistics': risk_stats,
            'remediation_statistics': remediation_stats,
            'recent_violations': ComplianceAuditLogSerializer(recent_violations, many=True).data,
            'dangerous_goods_summary': self._get_dangerous_goods_summary(queryset)
        }
        
        return Response(dashboard_data)
    
    def _get_dangerous_goods_summary(self, queryset):
        """Get dangerous goods specific compliance summary"""
        dg_audits = queryset.exclude(un_numbers_affected=[])
        
        # Most frequent UN numbers in violations
        un_number_frequency = {}
        for audit in dg_audits:
            for un_number in audit.un_numbers_affected:
                un_number_frequency[un_number] = un_number_frequency.get(un_number, 0) + 1
        
        # Most frequent hazard classes in violations
        hazard_class_frequency = {}
        for audit in dg_audits:
            for hazard_class in audit.hazard_classes_affected:
                hazard_class_frequency[hazard_class] = hazard_class_frequency.get(hazard_class, 0) + 1
        
        return {
            'total_dg_audits': dg_audits.count(),
            'top_un_numbers': sorted(un_number_frequency.items(), key=lambda x: x[1], reverse=True)[:10],
            'top_hazard_classes': sorted(hazard_class_frequency.items(), key=lambda x: x[1], reverse=True)[:10],
            'adg_compliance_rate': self._calculate_regulation_compliance_rate(queryset, 'ADG_CODE'),
            'iata_compliance_rate': self._calculate_regulation_compliance_rate(queryset, 'IATA_DGR'),
            'imdg_compliance_rate': self._calculate_regulation_compliance_rate(queryset, 'IMDG')
        }
    
    def _calculate_regulation_compliance_rate(self, queryset, regulation_type):
        """Calculate compliance rate for a specific regulation"""
        regulation_audits = queryset.filter(regulation_type=regulation_type)
        if not regulation_audits.exists():
            return 100.0
        
        compliant_count = regulation_audits.filter(compliance_status='COMPLIANT').count()
        total_count = regulation_audits.count()
        
        return round((compliant_count / total_count) * 100, 2)
    
    @action(detail=False, methods=['get'])
    def violations_report(self, request):
        """Generate violations report for regulatory authorities"""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        regulation_type = request.query_params.get('regulation_type')
        
        queryset = self.get_queryset().filter(
            compliance_status__in=['NON_COMPLIANT', 'WARNING']
        )
        
        if date_from:
            queryset = queryset.filter(audit_log__timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(audit_log__timestamp__lte=date_to)
        if regulation_type:
            queryset = queryset.filter(regulation_type=regulation_type)
        
        violations_data = {
            'report_generated': timezone.now().isoformat(),
            'period': {
                'from': date_from,
                'to': date_to
            },
            'regulation_type': regulation_type,
            'total_violations': queryset.count(),
            'violations_by_severity': dict(
                queryset.values('compliance_status')
                .annotate(count=Count('id'))
                .values_list('compliance_status', 'count')
            ),
            'violations_by_regulation': dict(
                queryset.values('regulation_type')
                .annotate(count=Count('id'))
                .values_list('regulation_type', 'count')
            ),
            'violations_detail': ComplianceAuditLogSerializer(
                queryset.order_by('-audit_log__timestamp'), many=True
            ).data
        }
        
        # Log the report generation
        log_custom_action(
            action_type=AuditActionType.EXPORT,
            description=f"Compliance violations report generated for {regulation_type or 'all regulations'}",
            request=request,
            metadata={
                'report_type': 'violations_report',
                'regulation_type': regulation_type,
                'date_range': {'from': date_from, 'to': date_to},
                'violations_count': queryset.count()
            }
        )
        
        return Response(violations_data)


class DangerousGoodsAuditLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for dangerous goods specific audit logs
    """
    serializer_class = DangerousGoodsAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, AuditPermissions]
    pagination_class = AuditLogPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = DangerousGoodsAuditLogFilter
    ordering = ['-audit_log__timestamp']
    
    def get_queryset(self):
        """Company-based data filtering for dangerous goods audits"""
        if not hasattr(self.request.user, 'company'):
            return DangerousGoodsAuditLog.objects.none()
        
        return DangerousGoodsAuditLog.objects.filter(
            company=self.request.user.company
        ).select_related(
            'audit_log', 'audit_log__user', 'company'
        )
    
    @action(detail=False, methods=['get'])
    def un_number_analytics(self, request):
        """Get analytics for UN number operations"""
        queryset = self.get_queryset()
        
        # UN number frequency
        un_number_ops = dict(
            queryset.exclude(un_number='')
            .values('un_number')
            .annotate(count=Count('id'))
            .order_by('-count')
            .values_list('un_number', 'count')
        )
        
        # Operation type breakdown
        operation_breakdown = dict(
            queryset.values('operation_type')
            .annotate(count=Count('id'))
            .values_list('operation_type', 'count')
        )
        
        # Compliance rates by regulation
        compliance_rates = {
            'adg': self._calculate_compliance_rate(queryset, 'adg_compliant'),
            'iata': self._calculate_compliance_rate(queryset, 'iata_compliant'),
            'imdg': self._calculate_compliance_rate(queryset, 'imdg_compliant')
        }
        
        # Recent classification updates
        recent_updates = queryset.filter(
            operation_type='CLASSIFICATION_UPDATE'
        ).order_by('-audit_log__timestamp')[:10]
        
        return Response({
            'un_number_operations': un_number_ops,
            'operation_breakdown': operation_breakdown,
            'compliance_rates': compliance_rates,
            'recent_updates': DangerousGoodsAuditLogSerializer(recent_updates, many=True).data
        })
    
    def _calculate_compliance_rate(self, queryset, compliance_field):
        """Calculate compliance rate for a specific regulation"""
        total = queryset.count()
        if total == 0:
            return 100.0
        
        compliant = queryset.filter(**{compliance_field: True}).count()
        return round((compliant / total) * 100, 2)
    
    @action(detail=False, methods=['get'])
    def regulatory_notifications(self, request):
        """Get regulatory notification status"""
        queryset = self.get_queryset()
        
        notifications_data = {
            'total_requiring_notification': queryset.filter(
                regulatory_notification_required=True
            ).count(),
            'notifications_sent': queryset.filter(
                regulatory_notification_sent=True
            ).count(),
            'pending_notifications': queryset.filter(
                regulatory_notification_required=True,
                regulatory_notification_sent=False
            ).count(),
            'pending_items': DangerousGoodsAuditLogSerializer(
                queryset.filter(
                    regulatory_notification_required=True,
                    regulatory_notification_sent=False
                ).order_by('-audit_log__timestamp'),
                many=True
            ).data
        }
        
        return Response(notifications_data)


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


class ComplianceMonitoringViewSet(viewsets.ViewSet):
    """
    ViewSet for real-time compliance monitoring and alerting
    """
    permission_classes = [permissions.IsAuthenticated, AuditPermissions]
    
    def get_monitoring_service(self):
        """Get compliance monitoring service for user's company"""
        if not hasattr(self.request.user, 'company'):
            raise PermissionDenied("User must be associated with a company")
        return ComplianceMonitoringService(self.request.user.company)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get comprehensive compliance status"""
        period_days = int(request.query_params.get('period_days', 30))
        
        monitoring_service = self.get_monitoring_service()
        compliance_status = monitoring_service.get_compliance_status(period_days)
        
        # Log the status access
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed compliance monitoring status for {period_days} days",
            request=request,
            metadata={
                'period_days': period_days,
                'overall_score': compliance_status.get('overall_compliance_score'),
                'total_audits': compliance_status.get('total_audits')
            }
        )
        
        return Response(compliance_status)
    
    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Get real-time compliance alerts"""
        monitoring_service = self.get_monitoring_service()
        alerts = monitoring_service.get_real_time_alerts()
        
        # Log the alerts access
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed real-time compliance alerts",
            request=request,
            metadata={
                'alerts_count': len(alerts),
                'critical_alerts': len([a for a in alerts if a.get('level') == 'CRITICAL']),
                'high_alerts': len([a for a in alerts if a.get('level') == 'HIGH'])
            }
        )
        
        return Response({
            'alerts': alerts,
            'alert_count': len(alerts),
            'last_updated': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def thresholds(self, request):
        """Get compliance threshold status"""
        monitoring_service = self.get_monitoring_service()
        threshold_status = monitoring_service.get_compliance_threshold_status()
        
        # Log the threshold status access
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed compliance threshold status",
            request=request,
            metadata={
                'threshold_status': threshold_status.get('status'),
                'breaches_count': len(threshold_status.get('threshold_breaches', []))
            }
        )
        
        return Response(threshold_status)
    
    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        """Get compliance dashboard summary data"""
        monitoring_service = self.get_monitoring_service()
        
        # Get data for different time periods
        current_period = monitoring_service.get_compliance_status(30)
        alerts = monitoring_service.get_real_time_alerts()
        threshold_status = monitoring_service.get_compliance_threshold_status()
        
        # Get comparison data for previous period
        previous_period = monitoring_service.get_compliance_status(60)  # Last 60 days for comparison
        
        # Calculate trend indicators
        current_score = current_period.get('overall_compliance_score', 0)
        previous_score = previous_period.get('overall_compliance_score', 0)
        score_trend = 'up' if current_score > previous_score else 'down' if current_score < previous_score else 'stable'
        
        # Get top violation categories
        current_audits = ComplianceAuditLog.objects.filter(
            company=self.request.user.company,
            compliance_status='NON_COMPLIANT',
            audit_log__timestamp__gte=timezone.now() - timedelta(days=30)
        )
        
        top_violations = dict(
            current_audits.values('regulation_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
            .values_list('regulation_type', 'count')
        )
        
        dashboard_data = {
            'overall_compliance_score': current_score,
            'score_trend': score_trend,
            'score_change': round(current_score - previous_score, 2),
            'total_audits_30_days': current_period.get('total_audits', 0),
            'active_alerts': len([a for a in alerts if a.get('requires_immediate_attention')]),
            'critical_alerts': len([a for a in alerts if a.get('level') == 'CRITICAL']),
            'threshold_breaches': len(threshold_status.get('threshold_breaches', [])),
            'top_violation_categories': top_violations,
            'remediation_efficiency': current_period.get('remediation_status', {}).get('completion_rate', 0),
            'dangerous_goods_audits': current_period.get('dangerous_goods_compliance', {}).get('total_dg_audits', 0),
            'last_updated': timezone.now().isoformat()
        }
        
        # Log the dashboard access
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed compliance dashboard summary",
            request=request,
            metadata=dashboard_data
        )
        
        return Response(dashboard_data)
    
    @action(detail=False, methods=['post'])
    def acknowledge_alert(self, request):
        """Acknowledge a compliance alert"""
        alert_id = request.data.get('alert_id')
        acknowledgment_note = request.data.get('note', '')
        
        if not alert_id:
            return Response(
                {'error': 'alert_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log the alert acknowledgment
        log_custom_action(
            action_type=AuditActionType.UPDATE,
            description=f"User acknowledged compliance alert: {alert_id}",
            request=request,
            metadata={
                'alert_id': alert_id,
                'acknowledgment_note': acknowledgment_note,
                'acknowledged_by': request.user.username,
                'acknowledged_at': timezone.now().isoformat()
            }
        )
        
        return Response({
            'status': 'acknowledged',
            'alert_id': alert_id,
            'acknowledged_by': request.user.username,
            'acknowledged_at': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def regulation_compliance(self, request):
        """Get detailed compliance status by regulation type"""
        regulation_type = request.query_params.get('regulation_type')
        period_days = int(request.query_params.get('period_days', 30))
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=period_days)
        
        queryset = ComplianceAuditLog.objects.filter(
            company=self.request.user.company,
            audit_log__timestamp__gte=start_date,
            audit_log__timestamp__lte=end_date
        )
        
        if regulation_type:
            queryset = queryset.filter(regulation_type=regulation_type)
        
        # Calculate detailed metrics
        total_audits = queryset.count()
        
        if total_audits == 0:
            return Response({
                'message': 'No compliance data found for the specified criteria',
                'total_audits': 0
            })
        
        compliance_breakdown = dict(
            queryset.values('compliance_status')
            .annotate(count=Count('id'))
            .values_list('compliance_status', 'count')
        )
        
        regulation_breakdown = dict(
            queryset.values('regulation_type')
            .annotate(count=Count('id'))
            .values_list('regulation_type', 'count')
        )
        
        # Risk analysis
        risk_distribution = {
            'low_risk': queryset.filter(risk_assessment_score__lt=50).count(),
            'medium_risk': queryset.filter(
                risk_assessment_score__gte=50,
                risk_assessment_score__lt=75
            ).count(),
            'high_risk': queryset.filter(
                risk_assessment_score__gte=75,
                risk_assessment_score__lt=90
            ).count(),
            'critical_risk': queryset.filter(risk_assessment_score__gte=90).count()
        }
        
        # Recent violations
        recent_violations = queryset.filter(
            compliance_status='NON_COMPLIANT'
        ).order_by('-audit_log__timestamp')[:10]
        
        detailed_data = {
            'regulation_type': regulation_type,
            'period_days': period_days,
            'total_audits': total_audits,
            'compliance_breakdown': compliance_breakdown,
            'regulation_breakdown': regulation_breakdown,
            'risk_distribution': risk_distribution,
            'compliance_rate': (
                compliance_breakdown.get('COMPLIANT', 0) / total_audits * 100
                if total_audits > 0 else 0
            ),
            'recent_violations': ComplianceAuditLogSerializer(recent_violations, many=True).data,
            'generated_at': timezone.now().isoformat()
        }
        
        # Log the detailed compliance access
        log_custom_action(
            action_type=AuditActionType.ACCESS_GRANTED,
            description=f"User accessed detailed regulation compliance data for {regulation_type or 'all regulations'}",
            request=request,
            metadata={
                'regulation_type': regulation_type,
                'period_days': period_days,
                'total_audits': total_audits
            }
        )
        
        return Response(detailed_data)
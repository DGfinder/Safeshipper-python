# api_views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from datetime import datetime, timedelta
import logging

from .models import EmergencyProcedureGuide, ShipmentEmergencyPlan, EmergencyIncident
from .serializers import (
    EmergencyProcedureGuideSerializer,
    EmergencyProcedureGuideListSerializer,
    ShipmentEmergencyPlanSerializer,
    ShipmentEmergencyPlanListSerializer,
    EmergencyIncidentSerializer,
    EPGCreateFromTemplateSerializer,
    EmergencyPlanGenerationSerializer,
    EPGSearchSerializer,
    EPGStatisticsSerializer,
    EmergencyPlanStatisticsSerializer
)
from .services import EmergencyPlanGenerator, EPGTemplateService
from dangerous_goods.models import DangerousGood
from shipments.models import Shipment

logger = logging.getLogger(__name__)

class EPGPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class EmergencyProcedureGuideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Emergency Procedure Guides with comprehensive management capabilities.
    """
    queryset = EmergencyProcedureGuide.objects.all()
    serializer_class = EmergencyProcedureGuideSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = EPGPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'hazard_class', 'severity_level', 'country_code']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmergencyProcedureGuideListSerializer
        return EmergencyProcedureGuideSerializer
    
    def get_queryset(self):
        queryset = EmergencyProcedureGuide.objects.select_related('dangerous_good', 'created_by')
        
        # Apply search filters
        query = self.request.query_params.get('query', '').strip()
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) |
                Q(epg_number__icontains=query) |
                Q(dangerous_good__proper_shipping_name__icontains=query) |
                Q(dangerous_good__un_number__icontains=query)
            )
        
        # Filter by dangerous good
        dangerous_good_id = self.request.query_params.get('dangerous_good')
        if dangerous_good_id:
            queryset = queryset.filter(dangerous_good_id=dangerous_good_id)
        
        # Filter by emergency type
        emergency_type = self.request.query_params.get('emergency_type')
        if emergency_type:
            queryset = queryset.filter(emergency_types__contains=[emergency_type])
        
        # Include/exclude inactive
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        if not include_inactive:
            queryset = queryset.filter(status='ACTIVE')
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Advanced search with complex filters"""
        serializer = EPGSearchSerializer(data=request.data)
        if serializer.is_valid():
            queryset = self.get_queryset()
            
            # Apply advanced filters
            validated_data = serializer.validated_data
            
            if validated_data.get('hazard_class'):
                queryset = queryset.filter(hazard_class=validated_data['hazard_class'])
            
            if validated_data.get('dangerous_good'):
                queryset = queryset.filter(dangerous_good=validated_data['dangerous_good'])
            
            if validated_data.get('status'):
                queryset = queryset.filter(status=validated_data['status'])
            
            if validated_data.get('severity_level'):
                queryset = queryset.filter(severity_level=validated_data['severity_level'])
            
            if validated_data.get('country_code'):
                queryset = queryset.filter(country_code=validated_data['country_code'])
            
            if validated_data.get('emergency_type'):
                queryset = queryset.filter(emergency_types__contains=[validated_data['emergency_type']])
            
            # Paginate results
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = EmergencyProcedureGuideListSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = EmergencyProcedureGuideListSerializer(queryset, many=True)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_from_template(self, request):
        """Create EPG from hazard class template"""
        serializer = EPGCreateFromTemplateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                template_service = EPGTemplateService()
                epg = template_service.create_epg_from_template(
                    hazard_class=serializer.validated_data['hazard_class'],
                    dangerous_good=serializer.validated_data.get('dangerous_good')
                )
                epg.created_by = request.user
                epg.save()
                
                response_serializer = EmergencyProcedureGuideSerializer(epg)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
            except ValueError as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate an EPG"""
        epg = self.get_object()
        epg.status = 'ACTIVE'
        epg.save()
        
        logger.info(f"EPG {epg.epg_number} activated by {request.user}")
        return Response({'status': 'activated'})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive an EPG"""
        epg = self.get_object()
        epg.status = 'ARCHIVED'
        epg.save()
        
        logger.info(f"EPG {epg.epg_number} archived by {request.user}")
        return Response({'status': 'archived'})
    
    @action(detail=False, methods=['get'])
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def statistics(self, request):
        """Get EPG statistics and analytics"""
        queryset = EmergencyProcedureGuide.objects.all()
        
        # Basic counts
        total_epgs = queryset.count()
        active_epgs = queryset.filter(status='ACTIVE').count()
        draft_epgs = queryset.filter(status='DRAFT').count()
        under_review = queryset.filter(status='UNDER_REVIEW').count()
        
        # Due for review
        due_for_review = queryset.filter(
            review_date__lte=timezone.now().date(),
            status='ACTIVE'
        ).count()
        
        # By hazard class
        by_hazard_class = dict(
            queryset.values('hazard_class')
            .annotate(count=Count('id'))
            .values_list('hazard_class', 'count')
        )
        
        # By severity level
        by_severity_level = dict(
            queryset.values('severity_level')
            .annotate(count=Count('id'))
            .values_list('severity_level', 'count')
        )
        
        # By country
        by_country = dict(
            queryset.values('country_code')
            .annotate(count=Count('id'))
            .values_list('country_code', 'count')
        )
        
        # By emergency type (flatten JSON arrays)
        emergency_type_counts = {}
        for epg in queryset.exclude(emergency_types__isnull=True):
            for emergency_type in epg.emergency_types:
                emergency_type_counts[emergency_type] = emergency_type_counts.get(emergency_type, 0) + 1
        
        # Recent updates
        recent_updates = queryset.filter(
            updated_at__gte=timezone.now() - timedelta(days=30)
        ).order_by('-updated_at')[:10]
        
        recent_updates_data = [
            {
                'id': epg.id,
                'epg_number': epg.epg_number,
                'title': epg.title,
                'updated_at': epg.updated_at,
                'status': epg.status
            }
            for epg in recent_updates
        ]
        
        statistics_data = {
            'total_epgs': total_epgs,
            'active_epgs': active_epgs,
            'draft_epgs': draft_epgs,
            'under_review': under_review,
            'due_for_review': due_for_review,
            'by_hazard_class': by_hazard_class,
            'by_severity_level': by_severity_level,
            'by_country': by_country,
            'by_emergency_type': emergency_type_counts,
            'recent_updates': recent_updates_data
        }
        
        serializer = EPGStatisticsSerializer(statistics_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def due_for_review(self, request):
        """Get EPGs due for review"""
        days_ahead = int(request.query_params.get('days', 30))
        cutoff_date = timezone.now().date() + timedelta(days=days_ahead)
        
        queryset = EmergencyProcedureGuide.objects.filter(
            review_date__lte=cutoff_date,
            status='ACTIVE'
        ).order_by('review_date')
        
        serializer = EmergencyProcedureGuideListSerializer(queryset, many=True)
        return Response(serializer.data)

class ShipmentEmergencyPlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Shipment Emergency Plans with generation capabilities.
    """
    queryset = ShipmentEmergencyPlan.objects.all()
    serializer_class = ShipmentEmergencyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = EPGPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'shipment']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ShipmentEmergencyPlanListSerializer
        return ShipmentEmergencyPlanSerializer
    
    def get_queryset(self):
        return ShipmentEmergencyPlan.objects.select_related(
            'shipment', 'generated_by', 'reviewed_by', 'approved_by'
        ).prefetch_related('referenced_epgs').order_by('-generated_at')
    
    @action(detail=False, methods=['post'])
    def generate_plan(self, request):
        """Generate emergency plan for a shipment"""
        serializer = EmergencyPlanGenerationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                generator = EmergencyPlanGenerator()
                emergency_plan = generator.generate_emergency_plan(
                    shipment=serializer.validated_data['shipment'],
                    user=request.user
                )
                
                response_serializer = ShipmentEmergencyPlanSerializer(emergency_plan)
                logger.info(f"Emergency plan {emergency_plan.plan_number} generated for shipment {emergency_plan.shipment.tracking_number}")
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
            except ValueError as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Mark emergency plan as reviewed"""
        plan = self.get_object()
        plan.status = 'REVIEWED'
        plan.reviewed_by = request.user
        plan.reviewed_at = timezone.now()
        plan.save()
        
        logger.info(f"Emergency plan {plan.plan_number} reviewed by {request.user}")
        return Response({'status': 'reviewed'})
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve emergency plan"""
        plan = self.get_object()
        plan.status = 'APPROVED'
        plan.approved_by = request.user
        plan.approved_at = timezone.now()
        plan.save()
        
        logger.info(f"Emergency plan {plan.plan_number} approved by {request.user}")
        return Response({'status': 'approved'})
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate emergency plan"""
        plan = self.get_object()
        plan.status = 'ACTIVE'
        plan.save()
        
        logger.info(f"Emergency plan {plan.plan_number} activated by {request.user}")
        return Response({'status': 'activated'})
    
    @action(detail=False, methods=['get'])
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def statistics(self, request):
        """Get emergency plan statistics"""
        queryset = ShipmentEmergencyPlan.objects.all()
        
        # Basic counts
        total_plans = queryset.count()
        active_plans = queryset.filter(status='ACTIVE').count()
        generated_plans = queryset.filter(status='GENERATED').count()
        approved_plans = queryset.filter(status='APPROVED').count()
        
        # Plans this month
        current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        plans_this_month = queryset.filter(generated_at__gte=current_month).count()
        
        # By status
        by_status = dict(
            queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        
        # By hazard class (from referenced EPGs)
        hazard_class_counts = {}
        for plan in queryset.prefetch_related('referenced_epgs'):
            hazard_classes = set()
            for epg in plan.referenced_epgs.all():
                hazard_classes.add(epg.hazard_class)
            for hc in hazard_classes:
                hazard_class_counts[hc] = hazard_class_counts.get(hc, 0) + 1
        
        # Average EPGs per plan
        avg_epgs = queryset.annotate(
            epg_count=Count('referenced_epgs')
        ).aggregate(avg=Avg('epg_count'))['avg'] or 0
        
        # Recent plans
        recent_plans = queryset.order_by('-generated_at')[:10]
        recent_plans_data = [
            {
                'id': plan.id,
                'plan_number': plan.plan_number,
                'shipment_tracking': plan.shipment.tracking_number,
                'status': plan.status,
                'generated_at': plan.generated_at
            }
            for plan in recent_plans
        ]
        
        statistics_data = {
            'total_plans': total_plans,
            'active_plans': active_plans,
            'generated_plans': generated_plans,
            'approved_plans': approved_plans,
            'plans_this_month': plans_this_month,
            'by_status': by_status,
            'by_hazard_class': hazard_class_counts,
            'average_epgs_per_plan': round(avg_epgs, 2),
            'recent_plans': recent_plans_data
        }
        
        serializer = EmergencyPlanStatisticsSerializer(statistics_data)
        return Response(serializer.data)

class EmergencyIncidentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Emergency Incident reporting and analysis.
    """
    queryset = EmergencyIncident.objects.all()
    serializer_class = EmergencyIncidentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = EPGPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['incident_type', 'severity', 'response_effectiveness']
    
    def get_queryset(self):
        return EmergencyIncident.objects.select_related(
            'shipment', 'emergency_plan', 'reported_by'
        ).order_by('-incident_datetime')
    
    def perform_create(self, serializer):
        # Generate incident number
        incident_count = EmergencyIncident.objects.count() + 1
        incident_number = f"INC-{timezone.now().year}-{incident_count:04d}"
        serializer.save(
            reported_by=self.request.user,
            incident_number=incident_number
        )
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent incidents"""
        days = int(request.query_params.get('days', 30))
        cutoff_date = timezone.now() - timedelta(days=days)
        
        queryset = self.get_queryset().filter(incident_datetime__gte=cutoff_date)
        serializer = EmergencyIncidentSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_effectiveness(self, request):
        """Get incidents grouped by response effectiveness"""
        effectiveness_stats = dict(
            self.get_queryset()
            .values('response_effectiveness')
            .annotate(count=Count('id'))
            .values_list('response_effectiveness', 'count')
        )
        return Response(effectiveness_stats)


# Additional ViewSets for EPG Management Dashboard

class EPGComplianceViewSet(viewsets.ViewSet):
    """
    ViewSet for EPG compliance management and oversight.
    Designed for compliance officers to monitor and manage EPG coverage.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='coverage-gaps')
    def coverage_gaps(self, request):
        """Identify dangerous goods with missing or inadequate EPG coverage"""
        from dangerous_goods.models import DangerousGood
        from django.db.models import Q, Count, Case, When, IntegerField
        
        # Get all dangerous goods
        dangerous_goods = DangerousGood.objects.all()
        
        coverage_gaps = []
        
        for dg in dangerous_goods:
            # Check for EPG coverage
            epgs = EmergencyProcedureGuide.objects.filter(
                Q(dangerous_good=dg) | 
                Q(dangerous_good__isnull=True, hazard_class=dg.hazard_class),
                status='ACTIVE'
            )
            
            # Determine gap type and severity
            gap_type = None
            severity = 'LOW'
            shipments_affected = 0
            
            if not epgs.exists():
                gap_type = 'MISSING_EPG'
                severity = 'CRITICAL' if dg.hazard_class in ['1', '2', '6', '7'] else 'HIGH'
            else:
                # Check if EPGs are outdated
                outdated_epgs = epgs.filter(
                    review_date__lt=timezone.now().date() - timedelta(days=90)
                )
                if outdated_epgs.exists():
                    gap_type = 'OUTDATED_EPG'
                    severity = 'MEDIUM'
                
                # Check for incomplete EPGs (missing critical sections)
                incomplete_epgs = epgs.filter(
                    Q(immediate_actions='') | 
                    Q(notification_requirements='') |
                    Q(personal_protection='')
                )
                if incomplete_epgs.exists() and not gap_type:
                    gap_type = 'INCOMPLETE_EPG'
                    severity = 'LOW'
            
            # Count affected shipments (mock calculation)
            try:
                from shipments.models import Shipment
                from manifests.models import ConsignmentItem
                shipments_affected = ConsignmentItem.objects.filter(
                    dangerous_good=dg,
                    shipment__status__in=['PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
                ).count()
            except:
                shipments_affected = 0
            
            # Only include if there's a gap
            if gap_type:
                coverage_gaps.append({
                    'id': f"gap_{dg.id}",
                    'dangerous_good_id': str(dg.id),
                    'un_number': dg.un_number,
                    'proper_shipping_name': dg.proper_shipping_name,
                    'hazard_class': dg.hazard_class,
                    'gap_type': gap_type,
                    'severity': severity,
                    'identified_date': timezone.now().isoformat(),
                    'shipments_affected': shipments_affected,
                    'regulatory_requirements': [
                        'ADG Code 7.9',
                        'UN Recommendations',
                        'IATA DGR' if dg.hazard_class in ['1', '2', '7'] else 'ADG Code'
                    ]
                })
        
        return Response(coverage_gaps)
    
    @action(detail=False, methods=['get'], url_path='usage-analytics')
    def usage_analytics(self, request):
        """Get EPG usage analytics and effectiveness metrics"""
        from django.db.models import Count, Avg
        
        # Get EPG usage data
        epgs = EmergencyProcedureGuide.objects.filter(status='ACTIVE')
        
        usage_data = []
        for epg in epgs:
            # Count emergency plans that reference this EPG
            plans_count = ShipmentEmergencyPlan.objects.filter(
                referenced_epgs=epg
            ).count()
            
            # Count incidents that used this EPG
            incidents_count = EmergencyIncident.objects.filter(
                emergency_plan__referenced_epgs=epg
            ).count()
            
            # Calculate effectiveness score (mock calculation)
            effectiveness_score = min(95, 60 + (plans_count * 2) + (incidents_count * 5))
            
            # Get last usage date
            last_plan = ShipmentEmergencyPlan.objects.filter(
                referenced_epgs=epg
            ).order_by('-generated_at').first()
            
            last_used = last_plan.generated_at.isoformat() if last_plan else epg.created_at.isoformat()
            
            usage_data.append({
                'epg_id': str(epg.id),
                'epg_number': epg.epg_number,
                'title': epg.title,
                'usage_count': plans_count + incidents_count,
                'last_used': last_used,
                'shipments_generated': plans_count,
                'incidents_referenced': incidents_count,
                'effectiveness_score': effectiveness_score,
                'update_frequency': len(epg.regulatory_references) + 1
            })
        
        # Sort by usage count
        usage_data.sort(key=lambda x: x['usage_count'], reverse=True)
        
        return Response(usage_data)
    
    @action(detail=False, methods=['get'], url_path='compliance-metrics')
    def compliance_metrics(self, request):
        """Get comprehensive compliance metrics for officers"""
        user = request.user
        
        # Officer-specific metrics
        reviews_completed = EmergencyProcedureGuide.objects.filter(
            created_by=user,
            status__in=['ACTIVE', 'ARCHIVED']
        ).count()
        
        epgs_created = EmergencyProcedureGuide.objects.filter(
            created_by=user
        ).count()
        
        epgs_updated = EmergencyProcedureGuide.objects.filter(
            created_by=user,
            updated_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Plans reviewed/approved
        plans_reviewed = ShipmentEmergencyPlan.objects.filter(
            reviewed_by=user
        ).count()
        
        plans_approved = ShipmentEmergencyPlan.objects.filter(
            approved_by=user
        ).count()
        
        # Calculate average review time (mock calculation)
        avg_review_time = 2.5  # hours
        
        metrics = {
            'total_reviews_completed': reviews_completed,
            'avg_review_time_hours': avg_review_time,
            'epgs_created': epgs_created,
            'epgs_updated': epgs_updated,
            'plans_reviewed': plans_reviewed,
            'plans_approved': plans_approved,
            'compliance_improvements': max(0, epgs_updated - 5),
            'regulatory_updates_processed': epgs_updated,
            'period_days': 30
        }
        
        return Response(metrics)
    
    @action(detail=False, methods=['get'], url_path='regulatory-updates')
    def regulatory_updates(self, request):
        """Get pending regulatory updates and compliance changes"""
        # Mock regulatory updates - in production this would come from regulatory databases
        updates = [
            {
                'id': 'reg_001',
                'title': 'ADG Code 2024 Amendment - Class 3 Transport Requirements',
                'description': 'Updated requirements for flammable liquid transport containers',
                'effective_date': (timezone.now() + timedelta(days=30)).date().isoformat(),
                'priority': 'HIGH',
                'affected_hazard_classes': ['3'],
                'epgs_to_update': EmergencyProcedureGuide.objects.filter(
                    hazard_class='3', status='ACTIVE'
                ).count(),
                'created_date': timezone.now().date().isoformat(),
                'status': 'PENDING_REVIEW'
            },
            {
                'id': 'reg_002',
                'title': 'UN Model Regulations 2024 - Emergency Response Updates',
                'description': 'Updated emergency response procedures for radioactive materials',
                'effective_date': (timezone.now() + timedelta(days=60)).date().isoformat(),
                'priority': 'CRITICAL',
                'affected_hazard_classes': ['7'],
                'epgs_to_update': EmergencyProcedureGuide.objects.filter(
                    hazard_class='7', status='ACTIVE'
                ).count(),
                'created_date': (timezone.now() - timedelta(days=5)).date().isoformat(),
                'status': 'UNDER_REVIEW'
            }
        ]
        
        return Response(updates)
    
    @action(detail=False, methods=['post'], url_path='bulk-update-review-dates')
    def bulk_update_review_dates(self, request):
        """Bulk update review dates for multiple EPGs"""
        epg_ids = request.data.get('epg_ids', [])
        new_review_date = request.data.get('review_date')
        
        if not epg_ids or not new_review_date:
            return Response(
                {'error': 'epg_ids and review_date are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            review_date = datetime.strptime(new_review_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_count = EmergencyProcedureGuide.objects.filter(
            id__in=epg_ids
        ).update(review_date=review_date)
        
        logger.info(f"Bulk updated review dates for {updated_count} EPGs by {request.user}")
        
        return Response({
            'updated_count': updated_count,
            'new_review_date': new_review_date
        })
    
    @action(detail=False, methods=['get'], url_path='audit-trail')
    def audit_trail(self, request):
        """Get audit trail for EPG changes and compliance actions"""
        days = int(request.query_params.get('days', 30))
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Get recent EPG changes
        epg_changes = EmergencyProcedureGuide.objects.filter(
            updated_at__gte=cutoff_date
        ).select_related('created_by').order_by('-updated_at')[:50]
        
        # Get recent plan changes
        plan_changes = ShipmentEmergencyPlan.objects.filter(
            generated_at__gte=cutoff_date
        ).select_related('generated_by', 'reviewed_by', 'approved_by').order_by('-generated_at')[:25]
        
        audit_events = []
        
        # Add EPG changes to audit trail
        for epg in epg_changes:
            audit_events.append({
                'id': f"epg_{epg.id}",
                'type': 'EPG_UPDATE',
                'timestamp': epg.updated_at.isoformat(),
                'user': epg.created_by.get_full_name() if epg.created_by else 'System',
                'description': f"Updated EPG {epg.epg_number} - {epg.title}",
                'object_id': str(epg.id),
                'object_type': 'EmergencyProcedureGuide',
                'status': epg.status
            })
        
        # Add plan changes to audit trail
        for plan in plan_changes:
            audit_events.append({
                'id': f"plan_{plan.id}",
                'type': 'PLAN_GENERATED',
                'timestamp': plan.generated_at.isoformat(),
                'user': plan.generated_by.get_full_name() if plan.generated_by else 'System',
                'description': f"Generated emergency plan {plan.plan_number}",
                'object_id': str(plan.id),
                'object_type': 'ShipmentEmergencyPlan',
                'status': plan.status
            })
        
        # Sort by timestamp
        audit_events.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response({
            'audit_events': audit_events[:100],  # Limit to 100 most recent
            'period_days': days,
            'total_events': len(audit_events)
        })
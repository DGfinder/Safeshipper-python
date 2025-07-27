# emergency_procedures/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import timedelta
import logging

from .models import EmergencyProcedure, EmergencyIncident, EmergencyContact
from .serializers import (
    EmergencyProcedureSerializer, EmergencyProcedureListSerializer,
    EmergencyIncidentSerializer, EmergencyContactSerializer
)
from .permissions import (
    EmergencyProcedurePermissions, EmergencyIncidentPermissions, 
    EmergencyContactPermissions
)

logger = logging.getLogger(__name__)

class EmergencyProcedureViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing emergency procedures with comprehensive
    search, filtering, and emergency response capabilities.
    """
    queryset = EmergencyProcedure.objects.all()
    permission_classes = [EmergencyProcedurePermissions]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['emergency_type', 'status', 'severity_level', 'applicable_hazard_classes']
    search_fields = ['title', 'procedure_code', 'immediate_actions', 'safety_precautions']
    ordering_fields = ['created_at', 'effective_date', 'review_date', 'response_time_minutes']
    ordering = ['emergency_type', 'severity_level']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return EmergencyProcedureListSerializer
        return EmergencyProcedureSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions and request parameters"""
        queryset = super().get_queryset()
        
        # Filter by current/active procedures by default
        if self.request.query_params.get('current_only', 'false').lower() == 'true':
            queryset = queryset.filter(
                status='ACTIVE',
                effective_date__lte=timezone.now().date()
            )
        
        # Filter by hazard class if provided
        hazard_class = self.request.query_params.get('hazard_class')
        if hazard_class:
            queryset = queryset.filter(applicable_hazard_classes__contains=[hazard_class])
        
        # Filter by UN number if provided
        un_number = self.request.query_params.get('un_number')
        if un_number:
            queryset = queryset.filter(specific_un_numbers__contains=[un_number])
        
        return queryset.select_related('created_by', 'approved_by')
    
    def perform_create(self, serializer):
        """Set created_by when creating new procedure"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an emergency procedure"""
        procedure = self.get_object()
        
        if procedure.status != 'UNDER_REVIEW':
            return Response(
                {'error': 'Only procedures under review can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        procedure.status = 'ACTIVE'
        procedure.approved_by = request.user
        procedure.approval_date = timezone.now()
        procedure.save()
        
        logger.info(f"Emergency procedure {procedure.procedure_code} approved by {request.user}")
        
        return Response({'message': 'Procedure approved successfully'})
    
    @action(detail=True, methods=['post'])
    def mark_for_review(self, request, pk=None):
        """Mark procedure for review"""
        procedure = self.get_object()
        procedure.status = 'UNDER_REVIEW'
        procedure.save()
        
        return Response({'message': 'Procedure marked for review'})
    
    @action(detail=False, methods=['get'])
    def search_by_emergency_type(self, request):
        """Search procedures by emergency type and situation"""
        emergency_type = request.query_params.get('type')
        hazard_classes = request.query_params.getlist('hazard_classes')
        severity = request.query_params.get('severity')
        
        if not emergency_type:
            return Response(
                {'error': 'Emergency type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            emergency_type=emergency_type,
            status='ACTIVE'
        )
        
        if hazard_classes:
            # Filter by any of the provided hazard classes
            hazard_filter = Q()
            for hazard_class in hazard_classes:
                hazard_filter |= Q(applicable_hazard_classes__contains=[hazard_class])
            queryset = queryset.filter(hazard_filter)
        
        if severity:
            queryset = queryset.filter(severity_level=severity)
        
        # Order by response time for emergency situations
        queryset = queryset.order_by('response_time_minutes', 'severity_level')
        
        serializer = EmergencyProcedureListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def quick_reference(self, request):
        """Get quick reference information for emergency response"""
        emergency_type = request.query_params.get('type')
        
        if not emergency_type:
            return Response(
                {'error': 'Emergency type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        procedures = self.get_queryset().filter(
            emergency_type=emergency_type,
            status='ACTIVE'
        ).order_by('response_time_minutes')[:3]  # Top 3 fastest response procedures
        
        quick_ref_data = []
        for procedure in procedures:
            quick_ref_data.append({
                'id': procedure.id,
                'title': procedure.title,
                'procedure_code': procedure.procedure_code,
                'immediate_actions': procedure.immediate_actions,
                'safety_precautions': procedure.safety_precautions,
                'emergency_contacts': procedure.emergency_contacts,
                'required_equipment': procedure.required_equipment,
                'response_time_minutes': procedure.response_time_minutes
            })
        
        return Response(quick_ref_data)
    
    @action(detail=False, methods=['get'])
    def needing_review(self, request):
        """Get procedures that need review"""
        queryset = self.get_queryset().filter(
            review_date__lte=timezone.now().date(),
            status='ACTIVE'
        ).order_by('review_date')
        
        serializer = EmergencyProcedureListSerializer(queryset, many=True)
        return Response(serializer.data)

class EmergencyIncidentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing emergency incidents with comprehensive
    tracking, reporting, and analytics capabilities.
    """
    queryset = EmergencyIncident.objects.all()
    serializer_class = EmergencyIncidentSerializer
    permission_classes = [EmergencyIncidentPermissions]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['emergency_type', 'status', 'severity_level', 'procedure_effectiveness']
    search_fields = ['incident_number', 'description', 'location']
    ordering_fields = ['reported_at', 'severity_level', 'response_time_minutes']
    ordering = ['-reported_at']
    
    def get_queryset(self):
        """Filter queryset based on user permissions and request parameters"""
        queryset = super().get_queryset()
        
        # Filter by date range if provided
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(reported_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(reported_at__date__lte=date_to)
        
        # Filter by open incidents only if requested
        if self.request.query_params.get('open_only', 'false').lower() == 'true':
            queryset = queryset.filter(status__in=['OPEN', 'INVESTIGATING'])
        
        return queryset.select_related('procedure_used', 'reported_by', 'incident_commander')
    
    def perform_create(self, serializer):
        """Set reported_by when creating new incident"""
        serializer.save(reported_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start_response(self, request, pk=None):
        """Mark incident response as started"""
        incident = self.get_object()
        
        if incident.response_started_at:
            return Response(
                {'error': 'Response already started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        incident.response_started_at = timezone.now()
        incident.status = 'INVESTIGATING'
        incident.incident_commander = request.user
        incident.save()
        
        logger.info(f"Response started for incident {incident.incident_number} by {request.user}")
        
        return Response({'message': 'Response started successfully'})
    
    @action(detail=True, methods=['post'])
    def resolve_incident(self, request, pk=None):
        """Mark incident as resolved"""
        incident = self.get_object()
        
        # Get additional data from request
        lessons_learned = request.data.get('lessons_learned', '')
        improvements_recommended = request.data.get('improvements_recommended', '')
        procedure_effectiveness = request.data.get('procedure_effectiveness')
        
        incident.resolved_at = timezone.now()
        incident.status = 'RESOLVED'
        incident.lessons_learned = lessons_learned
        incident.improvements_recommended = improvements_recommended
        
        if procedure_effectiveness:
            incident.procedure_effectiveness = procedure_effectiveness
        
        incident.save()
        
        logger.info(f"Incident {incident.incident_number} resolved by {request.user}")
        
        return Response({'message': 'Incident resolved successfully'})
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get incident analytics and statistics"""
        queryset = self.get_queryset()
        
        # Time period filter
        days = int(request.query_params.get('days', 30))
        date_from = timezone.now() - timedelta(days=days)
        period_incidents = queryset.filter(reported_at__gte=date_from)
        
        # Basic statistics
        total_incidents = period_incidents.count()
        open_incidents = period_incidents.filter(status__in=['OPEN', 'INVESTIGATING']).count()
        resolved_incidents = period_incidents.filter(status='RESOLVED').count()
        
        # Response time statistics
        response_times = period_incidents.exclude(
            response_started_at__isnull=True
        ).values_list('response_time_minutes', flat=True)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Resolution time statistics  
        resolution_times = period_incidents.exclude(
            resolved_at__isnull=True
        ).values_list('resolution_time_hours', flat=True)
        
        avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        
        # Incident breakdown by type
        incidents_by_type = dict(
            period_incidents.values_list('emergency_type').annotate(
                count=Count('emergency_type')
            ).values_list('emergency_type', 'count')
        )
        
        # Incident breakdown by severity
        incidents_by_severity = dict(
            period_incidents.values_list('severity_level').annotate(
                count=Count('severity_level')
            ).values_list('severity_level', 'count')
        )
        
        # Procedure effectiveness
        effectiveness_stats = dict(
            period_incidents.exclude(procedure_effectiveness__isnull=True)
            .values_list('procedure_effectiveness').annotate(
                count=Count('procedure_effectiveness')
            ).values_list('procedure_effectiveness', 'count')
        )
        
        analytics_data = {
            'period_days': days,
            'total_incidents': total_incidents,
            'open_incidents': open_incidents,
            'resolved_incidents': resolved_incidents,
            'resolution_rate': resolved_incidents / total_incidents if total_incidents > 0 else 0,
            'average_response_time_minutes': round(avg_response_time, 2),
            'average_resolution_time_hours': round(avg_resolution_time, 2),
            'incidents_by_type': incidents_by_type,
            'incidents_by_severity': incidents_by_severity,
            'procedure_effectiveness': effectiveness_stats
        }
        
        return Response(analytics_data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent incidents for dashboard"""
        limit = int(request.query_params.get('limit', 10))
        queryset = self.get_queryset()[:limit]
        
        incident_data = []
        for incident in queryset:
            incident_data.append({
                'id': incident.id,
                'incident_number': incident.incident_number,
                'emergency_type': incident.emergency_type,
                'description': incident.description[:100] + '...' if len(incident.description) > 100 else incident.description,
                'location': incident.location,
                'reported_at': incident.reported_at,
                'severity_level': incident.severity_level,
                'status': incident.status,
                'response_time_minutes': incident.response_time_minutes
            })
        
        return Response(incident_data)

class EmergencyContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing emergency contacts with location-based
    search and contact verification features.
    """
    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer
    permission_classes = [EmergencyContactPermissions]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['contact_type', 'is_active', 'available_24_7']
    search_fields = ['organization_name', 'service_area', 'contact_person']
    ordering_fields = ['organization_name', 'contact_type', 'last_verified']
    ordering = ['contact_type', 'organization_name']
    
    def get_queryset(self):
        """Filter queryset based on active status and location"""
        queryset = super().get_queryset()
        
        # Filter active contacts by default
        if self.request.query_params.get('include_inactive', 'false').lower() != 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Find emergency contacts by location/service area"""
        location = request.query_params.get('location')
        contact_type = request.query_params.get('type')
        
        if not location:
            return Response(
                {'error': 'Location parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Simple text-based search for service area
        queryset = self.get_queryset().filter(
            service_area__icontains=location,
            is_active=True
        )
        
        if contact_type:
            queryset = queryset.filter(contact_type=contact_type)
        
        # Order by 24/7 availability first
        queryset = queryset.order_by('-available_24_7', 'organization_name')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def emergency_numbers(self, request):
        """Get quick access emergency numbers"""
        emergency_types = ['FIRE', 'POLICE', 'AMBULANCE', 'HAZMAT', 'POISON']
        
        location = request.query_params.get('location', '')
        
        emergency_numbers = {}
        
        for contact_type in emergency_types:
            contacts = self.get_queryset().filter(
                contact_type=contact_type,
                is_active=True
            )
            
            if location:
                contacts = contacts.filter(service_area__icontains=location)
            
            # Get the first available contact
            contact = contacts.first()
            if contact:
                emergency_numbers[contact_type] = {
                    'organization': contact.organization_name,
                    'primary_phone': contact.primary_phone,
                    'secondary_phone': contact.secondary_phone,
                    'available_24_7': contact.available_24_7
                }
        
        return Response(emergency_numbers)
    
    @action(detail=True, methods=['post'])
    def verify_contact(self, request, pk=None):
        """Mark contact as verified"""
        contact = self.get_object()
        contact.last_verified = timezone.now().date()
        contact.save()
        
        logger.info(f"Emergency contact {contact.organization_name} verified by {request.user}")
        
        return Response({'message': 'Contact verified successfully'})
    
    @action(detail=False, methods=['get'])
    def needing_verification(self, request):
        """Get contacts that need verification"""
        six_months_ago = timezone.now().date() - timedelta(days=180)
        
        queryset = self.get_queryset().filter(
            Q(last_verified__lt=six_months_ago) | Q(last_verified__isnull=True),
            is_active=True
        ).order_by('last_verified')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

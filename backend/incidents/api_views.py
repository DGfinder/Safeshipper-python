# incidents/api_views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.utils import timezone
from django.db.models import Count, Q, Avg, F
from datetime import datetime, timedelta
import logging

from .models import Incident, IncidentType, IncidentDocument, IncidentUpdate, CorrectiveAction
from .serializers import (
    IncidentListSerializer, IncidentDetailSerializer, IncidentCreateSerializer,
    IncidentTypeSerializer, IncidentDocumentSerializer, IncidentUpdateSerializer,
    CorrectiveActionSerializer, IncidentStatsSerializer
)
from .permissions import (
    IncidentPermissions, IncidentTypePermissions, IncidentDocumentPermissions,
    CorrectiveActionPermissions, CompanyFilterMixin, CanReportIncident,
    CanAssignIncident, CanCloseIncident
)
from rest_framework import filters

logger = logging.getLogger(__name__)


class IncidentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    Comprehensive ViewSet for incident management with role-based access control,
    filtering, search, and analytics capabilities.
    """
    permission_classes = [permissions.IsAuthenticated, IncidentPermissions]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    # Search configuration
    search_fields = [
        'incident_number', 'title', 'description', 'location',
        'incident_type__name', 'reporter__email', 'assigned_to__email'
    ]
    
    # Ordering configuration
    ordering_fields = [
        'occurred_at', 'reported_at', 'priority', 'status', 
        'incident_number', 'injuries_count'
    ]
    ordering = ['-occurred_at']
    
    # Filtering configuration
    filterset_fields = {
        'status': ['exact', 'in'],
        'priority': ['exact', 'in'],
        'incident_type': ['exact'],
        'reporter': ['exact'],
        'assigned_to': ['exact', 'isnull'],
        'occurred_at': ['date', 'date__gte', 'date__lte', 'year', 'month'],
        'reported_at': ['date', 'date__gte', 'date__lte'],
        'environmental_impact': ['exact'],
        'injuries_count': ['exact', 'gte', 'lte'],
        'shipment': ['exact', 'isnull'],
        'vehicle': ['exact', 'isnull'],
    }
    
    def get_queryset(self):
        """Get filtered queryset with optimized queries"""
        queryset = Incident.objects.select_related(
            'incident_type', 'reporter', 'assigned_to', 'shipment', 'vehicle', 'company'
        ).prefetch_related(
            'witnesses', 'documents', 'updates', 'corrective_actions',
            'investigators', 'dangerous_goods_involved', 
            'incidentdangerousgood_set__dangerous_good'
        )
        
        # Apply company filtering and role-based access from CompanyFilterMixin
        return super().get_queryset()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return IncidentListSerializer
        elif self.action == 'create':
            return IncidentCreateSerializer
        else:
            return IncidentDetailSerializer
    
    def perform_create(self, serializer):
        """Handle incident creation with automatic assignment logic"""
        # Auto-assign to appropriate safety officer or manager if not specified
        assigned_to = serializer.validated_data.get('assigned_to')
        
        if not assigned_to:
            # Try to find available safety officer in the same company
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            safety_officers = User.objects.filter(
                role='SAFETY_OFFICER',
                company=self.request.user.company,
                is_active=True
            ).order_by('?')  # Random order to distribute load
            
            if safety_officers.exists():
                instance = serializer.save(
                    company=self.request.user.company,
                    assigned_to=safety_officers.first()
                )
            else:
                instance = serializer.save(company=self.request.user.company)
        else:
            instance = serializer.save(company=self.request.user.company)
        
        # Set audit context for signals
        instance._audit_user = self.request.user
        instance._audit_ip = self.get_client_ip()
        instance.save()  # Trigger signals with audit context
        
        logger.info(f"Incident {instance.incident_number} created by {self.request.user.email}")
    
    def get_client_ip(self):
        """Get client IP address for audit logging"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip
    
    def perform_update(self, serializer):
        """Handle incident updates with status change validation"""
        old_instance = self.get_object()
        old_status = old_instance.status
        
        # Validate status transitions
        new_status = serializer.validated_data.get('status', old_status)
        if not self._is_valid_status_transition(old_status, new_status):
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({
                'status': f'Invalid status transition from {old_status} to {new_status}'
            })
        
        # Set audit context before saving
        instance = serializer.save()
        instance._audit_user = self.request.user
        instance._audit_ip = self.get_client_ip()
        instance.save()  # Trigger signals with audit context
        
        logger.info(f"Incident {instance.incident_number} updated by {self.request.user.email}")
    
    def _is_valid_status_transition(self, old_status, new_status):
        """Validate status transitions"""
        valid_transitions = {
            'reported': ['investigating', 'resolved', 'closed'],
            'investigating': ['reported', 'resolved', 'closed'],
            'resolved': ['closed', 'investigating'],  # Can reopen if new info
            'closed': []  # Cannot change from closed
        }
        
        if old_status == new_status:
            return True
        
        return new_status in valid_transitions.get(old_status, [])
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, CanAssignIncident])
    def assign(self, request, pk=None):
        """Assign incident to a user"""
        incident = self.get_object()
        user_id = request.data.get('assigned_to_id')
        
        if not user_id:
            return Response(
                {'error': 'assigned_to_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            assigned_user = User.objects.get(id=user_id)
            
            # Validate user has appropriate role
            if assigned_user.role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER', 'MANAGER']:
                return Response(
                    {'error': 'User does not have appropriate role for incident handling'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            old_assigned = incident.assigned_to
            incident.assigned_to = assigned_user
            incident.save()
            
            # Create update record
            IncidentUpdate.objects.create(
                incident=incident,
                update_type='assignment',
                description=f'Assigned to {assigned_user.get_full_name()}',
                created_by=request.user,
                metadata={
                    'old_assigned_to': old_assigned.id if old_assigned else None,
                    'new_assigned_to': assigned_user.id
                }
            )
            
            return Response({
                'message': f'Incident assigned to {assigned_user.get_full_name()}',
                'assigned_to': {
                    'id': assigned_user.id,
                    'email': assigned_user.email,
                    'name': assigned_user.get_full_name()
                }
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error assigning incident {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to assign incident'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, CanCloseIncident])
    def close(self, request, pk=None):
        """Close an incident with resolution notes"""
        incident = self.get_object()
        resolution_notes = request.data.get('resolution_notes', '')
        
        if incident.status == 'closed':
            return Response(
                {'error': 'Incident is already closed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        incident.status = 'closed'
        incident.closed_at = timezone.now()
        if resolution_notes:
            incident.resolution_notes = resolution_notes
        incident.save()
        
        # Create closure update
        IncidentUpdate.objects.create(
            incident=incident,
            update_type='closure',
            description=f'Incident closed: {resolution_notes}',
            created_by=request.user
        )
        
        logger.info(f"Incident {incident.incident_number} closed by {request.user.email}")
        
        return Response({
            'message': 'Incident closed successfully',
            'status': incident.status,
            'closed_at': incident.closed_at
        })
    
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """Reopen a closed incident"""
        incident = self.get_object()
        reason = request.data.get('reason', '')
        
        if incident.status != 'closed':
            return Response(
                {'error': 'Only closed incidents can be reopened'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        incident.status = 'investigating'
        incident.closed_at = None
        incident.save()
        
        # Create reopen update
        IncidentUpdate.objects.create(
            incident=incident,
            update_type='status_change',
            description=f'Incident reopened: {reason}',
            created_by=request.user,
            metadata={'reason': reason}
        )
        
        return Response({
            'message': 'Incident reopened successfully',
            'status': incident.status
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get incident statistics and analytics"""
        # Date range filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset()
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(occurred_at__date__gte=start_date)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(occurred_at__date__lte=end_date)
            except ValueError:
                pass
        
        # Basic statistics
        total_incidents = queryset.count()
        open_incidents = queryset.exclude(status='closed').count()
        resolved_incidents = queryset.filter(status__in=['resolved', 'closed']).count()
        critical_incidents = queryset.filter(priority='critical').count()
        
        # Group by incident type
        incidents_by_type = dict(
            queryset.values('incident_type__name').annotate(
                count=Count('id')
            ).values_list('incident_type__name', 'count')
        )
        
        # Group by status
        incidents_by_status = dict(
            queryset.values('status').annotate(
                count=Count('id')
            ).values_list('status', 'count')
        )
        
        # Group by priority
        incidents_by_priority = dict(
            queryset.values('priority').annotate(
                count=Count('id')
            ).values_list('priority', 'count')
        )
        
        # Monthly trend (last 12 months)
        twelve_months_ago = timezone.now().date() - timedelta(days=365)
        monthly_data = queryset.filter(
            occurred_at__date__gte=twelve_months_ago
        ).extra(
            select={'month': 'date_trunc(\'month\', occurred_at)'}
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        monthly_trend = [
            {
                'month': item['month'].strftime('%Y-%m'),
                'count': item['count']
            }
            for item in monthly_data
        ]
        
        # Average resolution time (in days)
        resolved_incidents_with_time = queryset.filter(
            resolved_at__isnull=False
        ).annotate(
            resolution_time=F('resolved_at') - F('reported_at')
        )
        
        avg_resolution_time = 0
        if resolved_incidents_with_time.exists():
            avg_seconds = resolved_incidents_with_time.aggregate(
                avg_time=Avg('resolution_time')
            )['avg_time']
            if avg_seconds:
                avg_resolution_time = avg_seconds.total_seconds() / (24 * 3600)  # Convert to days
        
        stats_data = {
            'total_incidents': total_incidents,
            'open_incidents': open_incidents,
            'resolved_incidents': resolved_incidents,
            'critical_incidents': critical_incidents,
            'incidents_by_type': incidents_by_type,
            'incidents_by_status': incidents_by_status,
            'incidents_by_priority': incidents_by_priority,
            'monthly_trend': monthly_trend,
            'average_resolution_time': round(avg_resolution_time, 2)
        }
        
        serializer = IncidentStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_incidents(self, request):
        """Get incidents assigned to or reported by the current user"""
        queryset = self.get_queryset().filter(
            Q(assigned_to=request.user) | Q(reporter=request.user)
        )
        
        # Apply standard filtering
        queryset = self.filter_queryset(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = IncidentListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = IncidentListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue incidents (older than 48 hours without resolution)"""
        cutoff_time = timezone.now() - timedelta(hours=48)
        
        queryset = self.get_queryset().filter(
            reported_at__lt=cutoff_time,
            status__in=['reported', 'investigating']
        )
        
        serializer = IncidentListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_dangerous_good(self, request, pk=None):
        """Add a dangerous good to an incident"""
        incident = self.get_object()
        
        dangerous_good_id = request.data.get('dangerous_good_id')
        quantity_involved = request.data.get('quantity_involved', 0)
        quantity_unit = request.data.get('quantity_unit', 'kg')
        packaging_type = request.data.get('packaging_type', '')
        release_amount = request.data.get('release_amount')
        containment_status = request.data.get('containment_status', 'unknown')
        
        try:
            from dangerous_goods.models import DangerousGood
            from .models import IncidentDangerousGood
            
            dangerous_good = DangerousGood.objects.get(id=dangerous_good_id)
            
            # Create or update the relationship
            incident_dg, created = IncidentDangerousGood.objects.get_or_create(
                incident=incident,
                dangerous_good=dangerous_good,
                defaults={
                    'quantity_involved': quantity_involved,
                    'quantity_unit': quantity_unit,
                    'packaging_type': packaging_type,
                    'release_amount': release_amount,
                    'containment_status': containment_status,
                }
            )
            
            if not created:
                # Update existing record
                incident_dg.quantity_involved = quantity_involved
                incident_dg.quantity_unit = quantity_unit
                incident_dg.packaging_type = packaging_type
                incident_dg.release_amount = release_amount
                incident_dg.containment_status = containment_status
                incident_dg.save()
            
            # Create incident update
            IncidentUpdate.objects.create(
                incident=incident,
                update_type='other',
                description=f'Dangerous good added: {dangerous_good.un_number} - {dangerous_good.proper_shipping_name}',
                created_by=request.user,
                metadata={
                    'dangerous_good_id': str(dangerous_good.id),
                    'quantity_involved': str(quantity_involved),
                    'containment_status': containment_status
                }
            )
            
            return Response({
                'message': 'Dangerous good added to incident successfully',
                'dangerous_good': {
                    'id': dangerous_good.id,
                    'un_number': dangerous_good.un_number,
                    'proper_shipping_name': dangerous_good.proper_shipping_name,
                    'quantity_involved': quantity_involved,
                    'containment_status': containment_status
                }
            })
            
        except DangerousGood.DoesNotExist:
            return Response(
                {'error': 'Dangerous good not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error adding dangerous good to incident {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to add dangerous good to incident'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def by_hazard_class(self, request):
        """Get incidents filtered by dangerous goods hazard class"""
        hazard_class = request.query_params.get('hazard_class')
        
        if not hazard_class:
            return Response(
                {'error': 'hazard_class parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            dangerous_goods_involved__hazard_class=hazard_class
        ).distinct()
        
        # Apply standard filtering
        queryset = self.filter_queryset(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = IncidentListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = IncidentListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def regulatory_required(self, request):
        """Get incidents that require regulatory notification"""
        queryset = self.get_queryset()
        
        # Filter for incidents requiring regulatory notification
        regulatory_incidents = []
        for incident in queryset:
            if incident.requires_regulatory_notification():
                regulatory_incidents.append(incident)
        
        # Convert back to queryset for pagination
        incident_ids = [incident.id for incident in regulatory_incidents]
        queryset = queryset.filter(id__in=incident_ids)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = IncidentListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = IncidentListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class IncidentTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing incident types"""
    queryset = IncidentType.objects.all()
    serializer_class = IncidentTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IncidentTypePermissions]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    search_fields = ['name', 'description', 'category']
    ordering_fields = ['name', 'category', 'severity', 'created_at']
    ordering = ['category', 'name']
    filterset_fields = ['category', 'severity', 'is_active']
    
    def get_queryset(self):
        """Filter active incident types for non-admin users"""
        queryset = super().get_queryset()
        
        user_role = getattr(self.request.user, 'role', None)
        if user_role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']:
            queryset = queryset.filter(is_active=True)
        
        return queryset


class IncidentDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing incident documents"""
    serializer_class = IncidentDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IncidentDocumentPermissions]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    
    ordering_fields = ['uploaded_at', 'document_type']
    ordering = ['-uploaded_at']
    filterset_fields = ['document_type', 'incident']
    
    def get_queryset(self):
        """Filter documents based on incident access permissions"""
        # Get incidents the user can access
        incident_viewset = IncidentViewSet()
        incident_viewset.request = self.request
        accessible_incidents = incident_viewset.get_queryset()
        
        return IncidentDocument.objects.filter(
            incident__in=accessible_incidents
        ).select_related('incident', 'uploaded_by')


class IncidentUpdateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing incident updates"""
    serializer_class = IncidentUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    
    ordering_fields = ['created_at', 'update_type']
    ordering = ['-created_at']
    filterset_fields = ['update_type', 'incident']
    
    def get_queryset(self):
        """Filter updates based on incident access permissions"""
        # Get incidents the user can access
        incident_viewset = IncidentViewSet()
        incident_viewset.request = self.request
        accessible_incidents = incident_viewset.get_queryset()
        
        return IncidentUpdate.objects.filter(
            incident__in=accessible_incidents
        ).select_related('incident', 'created_by')


class CorrectiveActionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing corrective actions"""
    serializer_class = CorrectiveActionSerializer
    permission_classes = [permissions.IsAuthenticated, CorrectiveActionPermissions]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'status', 'created_at']
    ordering = ['due_date']
    filterset_fields = ['status', 'assigned_to', 'incident', 'due_date']
    
    def get_queryset(self):
        """Filter corrective actions based on incident access permissions"""
        # Get incidents the user can access
        incident_viewset = IncidentViewSet()
        incident_viewset.request = self.request
        accessible_incidents = incident_viewset.get_queryset()
        
        return CorrectiveAction.objects.filter(
            incident__in=accessible_incidents
        ).select_related('incident', 'assigned_to')
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark corrective action as completed"""
        action = self.get_object()
        completion_notes = request.data.get('completion_notes', '')
        
        if action.status == 'completed':
            return Response(
                {'error': 'Corrective action is already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only assigned user or admin roles can complete
        user_role = getattr(request.user, 'role', None)
        if (action.assigned_to != request.user and 
            user_role not in ['ADMIN', 'COMPLIANCE_OFFICER', 'SAFETY_OFFICER']):
            return Response(
                {'error': 'Only assigned user or admin can complete this action'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        action.status = 'completed'
        action.completed_at = timezone.now()
        action.completion_notes = completion_notes
        action.save()
        
        # Create incident update
        IncidentUpdate.objects.create(
            incident=action.incident,
            update_type='other',
            description=f'Corrective action completed: {action.title}',
            created_by=request.user,
            metadata={'corrective_action_id': str(action.id)}
        )
        
        return Response({
            'message': 'Corrective action marked as completed',
            'status': action.status,
            'completed_at': action.completed_at
        })
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue corrective actions"""
        today = timezone.now().date()
        
        queryset = self.get_queryset().filter(
            due_date__lt=today,
            status__in=['planned', 'in_progress']
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
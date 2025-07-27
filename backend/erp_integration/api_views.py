from django.db.models import Q, Count, Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import JsonResponse
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.openapi import OpenApiTypes

from .models import (
    ERPSystem, IntegrationEndpoint, DataSyncJob, ERPMapping,
    ERPEventLog, ERPDataBuffer, ERPConfiguration
)
from .serializers import (
    ERPSystemSerializer, IntegrationEndpointSerializer, DataSyncJobSerializer,
    ERPMappingSerializer, ERPEventLogSerializer, ERPDataBufferSerializer,
    ERPConfigurationSerializer, ERPSystemSummarySerializer, SyncJobSummarySerializer,
    ManifestImportRequestSerializer, ManifestImportResponseSerializer
)
from .services import ERPIntegrationService, ShipmentSyncService, ERPDataMappingService, ERPManifestImportService
from companies.models import Company
from shipments.models import Shipment
from manifests.models import Manifest


class ERPSystemViewSet(viewsets.ModelViewSet):
    """ViewSet for ERP system management"""
    
    serializer_class = ERPSystemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['system_type', 'connection_type', 'status', 'company']
    search_fields = ['name', 'system_type', 'company__name']
    ordering_fields = ['name', 'system_type', 'status', 'created_at', 'last_sync_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter ERP systems based on user permissions"""
        queryset = ERPSystem.objects.select_related('company', 'created_by')
        
        # Filter by company if user is not admin
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(company=self.request.user.company)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the created_by field when creating a new ERP system"""
        serializer.save(created_by=self.request.user)
    
    @extend_schema(
        methods=['post'],
        description="Test connection to ERP system",
        responses={200: {"description": "Connection test result"}}
    )
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test connection to ERP system"""
        erp_system = self.get_object()
        integration_service = ERPIntegrationService(erp_system)
        
        result = integration_service.test_connection()
        return Response(result)
    
    @extend_schema(
        methods=['post'],
        description="Sync data from ERP system",
        request=None,
        responses={200: {"description": "Sync job created"}}
    )
    @action(detail=True, methods=['post'])
    def sync_data(self, request, pk=None):
        """Trigger data synchronization"""
        erp_system = self.get_object()
        
        # Get active endpoints
        endpoints = erp_system.endpoints.filter(is_active=True)
        
        if not endpoints.exists():
            return Response(
                {'error': 'No active endpoints configured'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sync_jobs = []
        integration_service = ERPIntegrationService(erp_system)
        
        for endpoint in endpoints:
            if endpoint.sync_direction in ['pull', 'bidirectional']:
                sync_job = integration_service.sync_data(endpoint, 'pull')
                sync_jobs.append(sync_job)
        
        return Response({
            'message': f'Started {len(sync_jobs)} sync jobs',
            'sync_jobs': [str(job.id) for job in sync_jobs]
        })
    
    @extend_schema(
        methods=['get'],
        description="Get ERP system statistics",
        responses={200: {"description": "ERP system statistics"}}
    )
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get ERP system statistics"""
        erp_system = self.get_object()
        
        # Get sync job statistics
        sync_jobs = erp_system.sync_jobs.all()
        recent_sync_jobs = sync_jobs.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=30)
        )
        
        # Get event log statistics
        event_logs = erp_system.event_logs.all()
        recent_errors = event_logs.filter(
            severity__in=['error', 'critical'],
            timestamp__gte=timezone.now() - timezone.timedelta(days=7)
        )
        
        stats = {
            'total_sync_jobs': sync_jobs.count(),
            'recent_sync_jobs': recent_sync_jobs.count(),
            'successful_syncs': recent_sync_jobs.filter(status='completed').count(),
            'failed_syncs': recent_sync_jobs.filter(status='failed').count(),
            'active_endpoints': erp_system.endpoints.filter(is_active=True).count(),
            'total_endpoints': erp_system.endpoints.count(),
            'recent_errors': recent_errors.count(),
            'last_sync_at': erp_system.last_sync_at,
            'error_count': erp_system.error_count,
            'status': erp_system.status
        }
        
        return Response(stats)


class IntegrationEndpointViewSet(viewsets.ModelViewSet):
    """ViewSet for integration endpoint management"""
    
    serializer_class = IntegrationEndpointSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['erp_system', 'endpoint_type', 'sync_direction', 'is_active']
    search_fields = ['name', 'endpoint_type', 'path']
    ordering_fields = ['name', 'endpoint_type', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter endpoints based on user permissions"""
        queryset = IntegrationEndpoint.objects.select_related('erp_system')
        
        # Filter by company if user is not admin
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(erp_system__company=self.request.user.company)
        
        return queryset
    
    @extend_schema(
        methods=['post'],
        description="Create standard field mappings for endpoint",
        responses={200: {"description": "Field mappings created"}}
    )
    @action(detail=True, methods=['post'])
    def create_standard_mappings(self, request, pk=None):
        """Create standard field mappings for common ERP integrations"""
        endpoint = self.get_object()
        
        ERPDataMappingService.create_standard_mappings(
            endpoint.erp_system, endpoint
        )
        
        return Response({
            'message': 'Standard field mappings created',
            'mapping_count': endpoint.field_mappings.count()
        })
    
    @extend_schema(
        methods=['post'],
        description="Validate endpoint configuration",
        responses={200: {"description": "Validation result"}}
    )
    @action(detail=True, methods=['post'])
    def validate_config(self, request, pk=None):
        """Validate endpoint configuration"""
        endpoint = self.get_object()
        
        errors = ERPDataMappingService.validate_mappings(endpoint)
        
        return Response({
            'valid': len(errors) == 0,
            'errors': errors,
            'mapping_count': endpoint.field_mappings.filter(is_active=True).count()
        })


class ERPMappingViewSet(viewsets.ModelViewSet):
    """ViewSet for ERP field mapping management"""
    
    serializer_class = ERPMappingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['erp_system', 'endpoint', 'mapping_type', 'is_required', 'is_active']
    search_fields = ['safeshipper_field', 'erp_field']
    ordering_fields = ['safeshipper_field', 'erp_field', 'mapping_type', 'created_at']
    ordering = ['safeshipper_field']
    
    def get_queryset(self):
        """Filter mappings based on user permissions"""
        queryset = ERPMapping.objects.select_related('erp_system', 'endpoint')
        
        # Filter by company if user is not admin
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(erp_system__company=self.request.user.company)
        
        return queryset


class DataSyncJobViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for data sync job monitoring"""
    
    serializer_class = DataSyncJobSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['erp_system', 'endpoint', 'job_type', 'status', 'direction']
    search_fields = ['erp_system__name', 'endpoint__name']
    ordering_fields = ['created_at', 'started_at', 'completed_at', 'records_processed']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter sync jobs based on user permissions"""
        queryset = DataSyncJob.objects.select_related('erp_system', 'endpoint', 'initiated_by')
        
        # Filter by company if user is not admin
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(erp_system__company=self.request.user.company)
        
        return queryset
    
    @extend_schema(
        methods=['post'],
        description="Retry failed sync job",
        responses={200: {"description": "Retry initiated"}}
    )
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed sync job"""
        sync_job = self.get_object()
        
        if sync_job.status != 'failed':
            return Response(
                {'error': 'Only failed sync jobs can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if sync_job.retry_count >= sync_job.max_retries:
            return Response(
                {'error': 'Maximum retry attempts reached'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new sync job for retry
        integration_service = ERPIntegrationService(sync_job.erp_system)
        new_sync_job = integration_service.sync_data(
            sync_job.endpoint, 
            sync_job.direction,
            sync_job.request_payload
        )
        
        return Response({
            'message': 'Retry initiated',
            'new_sync_job_id': str(new_sync_job.id)
        })


class ERPEventLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for ERP event log monitoring"""
    
    serializer_class = ERPEventLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['erp_system', 'event_type', 'severity', 'sync_job']
    search_fields = ['message', 'erp_system__name']
    ordering_fields = ['timestamp', 'severity', 'event_type']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Filter event logs based on user permissions"""
        queryset = ERPEventLog.objects.select_related('erp_system', 'sync_job', 'user')
        
        # Filter by company if user is not admin
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(erp_system__company=self.request.user.company)
        
        return queryset


class ERPDataBufferViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for ERP data buffer monitoring"""
    
    serializer_class = ERPDataBufferSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['erp_system', 'endpoint', 'buffer_type', 'object_type', 'is_processed']
    search_fields = ['object_type', 'external_id']
    ordering_fields = ['created_at', 'processed_at', 'retry_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter buffer data based on user permissions"""
        queryset = ERPDataBuffer.objects.select_related('erp_system', 'endpoint')
        
        # Filter by company if user is not admin
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(erp_system__company=self.request.user.company)
        
        return queryset


class ERPConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for ERP configuration management"""
    
    serializer_class = ERPConfigurationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['erp_system', 'config_type', 'is_sensitive', 'is_editable']
    search_fields = ['config_key', 'description']
    ordering_fields = ['config_key', 'config_type', 'created_at']
    ordering = ['config_key']
    
    def get_queryset(self):
        """Filter configurations based on user permissions"""
        queryset = ERPConfiguration.objects.select_related('erp_system', 'created_by')
        
        # Filter by company if user is not admin
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(erp_system__company=self.request.user.company)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the created_by field when creating a new configuration"""
        serializer.save(created_by=self.request.user)


# Dashboard and summary views
class ERPDashboardView(viewsets.GenericViewSet):
    """ViewSet for ERP dashboard data"""
    
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        methods=['get'],
        description="Get ERP systems dashboard summary",
        responses={200: ERPSystemSummarySerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def systems_summary(self, request):
        """Get summary of all ERP systems"""
        queryset = ERPSystem.objects.all()
        
        # Filter by company if user is not admin
        if not request.user.is_superuser:
            if hasattr(request.user, 'company'):
                queryset = queryset.filter(company=request.user.company)
        
        serializer = ERPSystemSummarySerializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        methods=['get'],
        description="Get recent sync jobs summary",
        responses={200: SyncJobSummarySerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def recent_sync_jobs(self, request):
        """Get recent sync jobs"""
        queryset = DataSyncJob.objects.select_related('erp_system', 'endpoint')
        
        # Filter by company if user is not admin
        if not request.user.is_superuser:
            if hasattr(request.user, 'company'):
                queryset = queryset.filter(erp_system__company=request.user.company)
        
        # Get recent jobs
        queryset = queryset.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).order_by('-created_at')[:20]
        
        serializer = SyncJobSummarySerializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        methods=['get'],
        description="Get ERP integration statistics",
        responses={200: {"description": "Integration statistics"}}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get overall ERP integration statistics"""
        # Base querysets
        erp_systems = ERPSystem.objects.all()
        sync_jobs = DataSyncJob.objects.all()
        
        # Filter by company if user is not admin
        if not request.user.is_superuser:
            if hasattr(request.user, 'company'):
                erp_systems = erp_systems.filter(company=request.user.company)
                sync_jobs = sync_jobs.filter(erp_system__company=request.user.company)
        
        # Recent sync jobs (last 30 days)
        recent_sync_jobs = sync_jobs.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=30)
        )
        
        # Statistics
        stats = {
            'total_erp_systems': erp_systems.count(),
            'active_erp_systems': erp_systems.filter(status='active').count(),
            'total_sync_jobs': sync_jobs.count(),
            'recent_sync_jobs': recent_sync_jobs.count(),
            'successful_syncs': recent_sync_jobs.filter(status='completed').count(),
            'failed_syncs': recent_sync_jobs.filter(status='failed').count(),
            'pending_syncs': recent_sync_jobs.filter(status='pending').count(),
            'total_records_processed': recent_sync_jobs.aggregate(
                total=models.Sum('records_processed')
            )['total'] or 0,
            'avg_success_rate': recent_sync_jobs.aggregate(
                avg_rate=Avg('records_successful') / Avg('records_processed') * 100
            )['avg_rate'] or 0,
            'system_types': list(erp_systems.values_list('system_type', flat=True).distinct())
        }
        
        return Response(stats)


# Manifest import API
class ManifestImportView(viewsets.GenericViewSet):
    """ViewSet for manifest import from ERP systems"""
    
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        methods=['post'],
        description="Import manifest from ERP system",
        request=ManifestImportRequestSerializer,
        responses={200: ManifestImportResponseSerializer}
    )
    @action(detail=False, methods=['post'])
    def import_manifest(self, request):
        """Import manifest from ERP system and create SafeShipper shipment"""
        serializer = ManifestImportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        erp_system = ERPSystem.objects.get(id=data['erp_system_id'])
        
        # Find shipment endpoint
        endpoint = erp_system.endpoints.filter(
            endpoint_type='shipments',
            sync_direction__in=['pull', 'bidirectional'],
            is_active=True
        ).first()
        
        if not endpoint:
            return Response(
                {'error': 'No active shipment endpoint found for ERP system'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Use ERPManifestImportService to import manifest
            manifest_import_service = ERPManifestImportService(erp_system)
            
            # Import manifest from ERP system
            result = manifest_import_service.import_manifest_from_erp(
                external_reference=data['external_reference'],
                manifest_type=data['manifest_type'],
                import_dangerous_goods=data['import_dangerous_goods'],
                create_shipment=data['create_shipment'],
                preserve_external_ids=data['preserve_external_ids']
            )
            
            # Prepare response data
            response_data = {
                'success': result['success'],
                'message': result.get('message', 'Manifest import completed'),
                'external_reference': data['external_reference']
            }
            
            if result['success']:
                response_data.update({
                    'shipment_id': result.get('shipment_id'),
                    'manifest_id': result.get('manifest_id'),
                    'dangerous_goods_found': result.get('dangerous_goods_found', 0)
                })
            else:
                response_data['errors'] = [result.get('error', 'Unknown error')]
            
            response_serializer = ManifestImportResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)
            
            return Response(response_serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to import manifest: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @extend_schema(
        methods=['get'],
        description="Get manifest import status",
        responses={200: {"description": "Import status"}}
    )
    @action(detail=False, methods=['get'])
    def import_status(self, request):
        """Get status of manifest import jobs"""
        sync_job_id = request.query_params.get('sync_job_id')
        
        if not sync_job_id:
            return Response(
                {'error': 'sync_job_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            sync_job = DataSyncJob.objects.get(id=sync_job_id)
            
            # Check permissions
            if not request.user.is_superuser:
                if hasattr(request.user, 'company'):
                    if sync_job.erp_system.company != request.user.company:
                        return Response(
                            {'error': 'Permission denied'},
                            status=status.HTTP_403_FORBIDDEN
                        )
            
            return Response({
                'sync_job_id': str(sync_job.id),
                'status': sync_job.status,
                'records_processed': sync_job.records_processed,
                'records_successful': sync_job.records_successful,
                'records_failed': sync_job.records_failed,
                'error_message': sync_job.error_message,
                'started_at': sync_job.started_at,
                'completed_at': sync_job.completed_at
            })
            
        except DataSyncJob.DoesNotExist:
            return Response(
                {'error': 'Sync job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import Q, Count, Prefetch
from django_filters.rest_framework import DjangoFilterBackend
import logging

from .models import SafetyDataSheet, SDSRequest, SDSAccessLog, SDSStatus
from .serializers import (
    SafetyDataSheetSerializer,
    SafetyDataSheetCreateSerializer,
    SafetyDataSheetListSerializer,
    SDSLookupSerializer
)
from dangerous_goods.models import DangerousGood
# from documents.models import Document  # Temporarily disabled

logger = logging.getLogger(__name__)

class SafetyDataSheetViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Safety Data Sheets.
    
    Provides CRUD operations plus specialized endpoints for:
    - SDS lookup by dangerous good
    - Bulk operations
    - Expiration tracking
    - Access logging
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'language', 'country_code', 'manufacturer']
    search_fields = ['product_name', 'manufacturer', 'dangerous_good__un_number', 'dangerous_good__proper_shipping_name']
    ordering_fields = ['revision_date', 'expiration_date', 'created_at', 'product_name']
    ordering = ['-revision_date', '-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return SafetyDataSheetCreateSerializer
        elif self.action == 'list':
            return SafetyDataSheetListSerializer
        return SafetyDataSheetSerializer
    
    def get_queryset(self):
        """
        Return SDS records based on user permissions and filters.
        """
        queryset = SafetyDataSheet.objects.select_related(
            'dangerous_good', 'document', 'created_by'
        ).prefetch_related(
            'access_logs'
        )
        
        # Filter by user permissions if needed
        user = self.request.user
        if hasattr(user, 'role') and user.role not in ['ADMIN', 'COMPLIANCE_OFFICER']:
            # Regular users see only active, non-expired SDS
            queryset = queryset.filter(
                status=SDSStatus.ACTIVE
            ).filter(
                Q(expiration_date__isnull=True) | Q(expiration_date__gt=timezone.now().date())
            )
        
        # Apply query filters
        query_params = self.request.query_params
        
        # Filter by dangerous good
        if 'dangerous_good_id' in query_params:
            queryset = queryset.filter(dangerous_good_id=query_params['dangerous_good_id'])
        
        # Filter by UN number
        if 'un_number' in query_params:
            queryset = queryset.filter(dangerous_good__un_number=query_params['un_number'])
        
        # Filter by hazard class
        if 'hazard_class' in query_params:
            queryset = queryset.filter(dangerous_good__hazard_class=query_params['hazard_class'])
        
        # Filter by expiration status
        include_expired = query_params.get('include_expired', 'false').lower() == 'true'
        if not include_expired:
            queryset = queryset.filter(
                Q(expiration_date__isnull=True) | Q(expiration_date__gt=timezone.now().date())
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the creator when creating SDS"""
        serializer.save(created_by=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve SDS and log access"""
        instance = self.get_object()
        
        # Log access
        self._log_access(instance, 'VIEW', 'GENERAL')
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def lookup(self, request):
        """
        Quick SDS lookup by dangerous good.
        
        POST /api/v1/sds/lookup/
        {
            "dangerous_good_id": "uuid",
            "language": "EN",
            "country_code": "US"
        }
        """
        serializer = SDSLookupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        dangerous_good_id = serializer.validated_data['dangerous_good_id']
        language = serializer.validated_data['language']
        country_code = serializer.validated_data.get('country_code')
        
        # Build query for best SDS match
        queryset = self.get_queryset().filter(
            dangerous_good_id=dangerous_good_id,
            status=SDSStatus.ACTIVE
        )
        
        # Prefer specific language/country match
        if country_code:
            preferred = queryset.filter(language=language, country_code=country_code).first()
            if preferred:
                self._log_access(preferred, 'SEARCH', 'PLANNING')
                return Response(SafetyDataSheetSerializer(preferred).data)
        
        # Fall back to language match
        preferred = queryset.filter(language=language).first()
        if preferred:
            self._log_access(preferred, 'SEARCH', 'PLANNING')
            return Response(SafetyDataSheetSerializer(preferred).data)
        
        # Fall back to any available SDS
        fallback = queryset.first()
        if fallback:
            self._log_access(fallback, 'SEARCH', 'PLANNING')
            return Response(SafetyDataSheetSerializer(fallback).data)
        
        return Response({
            'error': _('No SDS found for this dangerous good'),
            'dangerous_good_id': dangerous_good_id
        }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        """
        Generate download URL for SDS document.
        """
        sds = self.get_object()
        
        # TODO: Uncomment when documents model is enabled
        # if not sds.document or not sds.document.file:
        #     return Response({
        #         'error': _('No document file available')
        #     }, status=status.HTTP_404_NOT_FOUND)
        
        # Log download access
        self._log_access(sds, 'DOWNLOAD', request.data.get('context', 'GENERAL'))
        
        return Response({
            'message': _('Document download functionality will be enabled when document service is restored'),
            'sds_id': sds.id
        })
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """
        Get SDS documents expiring within specified days.
        
        GET /api/v1/sds/expiring_soon/?days=30
        """
        days = int(request.query_params.get('days', 30))
        cutoff_date = timezone.now().date() + timezone.timedelta(days=days)
        
        queryset = self.get_queryset().filter(
            status=SDSStatus.ACTIVE,
            expiration_date__lte=cutoff_date,
            expiration_date__gt=timezone.now().date()
        ).order_by('expiration_date')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = SafetyDataSheetListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = SafetyDataSheetListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get SDS library statistics.
        """
        queryset = self.get_queryset()
        
        stats = {
            'total_sds': queryset.count(),
            'active_sds': queryset.filter(status=SDSStatus.ACTIVE).count(),
            'expired_sds': queryset.filter(
                expiration_date__lt=timezone.now().date()
            ).count(),
            'expiring_soon': queryset.filter(
                status=SDSStatus.ACTIVE,
                expiration_date__lte=timezone.now().date() + timezone.timedelta(days=30),
                expiration_date__gt=timezone.now().date()
            ).count(),
            'by_language': dict(
                queryset.values('language').annotate(count=Count('id')).values_list('language', 'count')
            ),
            'by_status': dict(
                queryset.values('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
            'top_manufacturers': list(
                queryset.values('manufacturer').annotate(
                    count=Count('id')
                ).order_by('-count')[:10].values_list('manufacturer', 'count')
            )
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['post'])
    def bulk_status_update(self, request):
        """
        Update status for multiple SDS records.
        
        POST /api/v1/sds/bulk_status_update/
        {
            "sds_ids": ["uuid1", "uuid2"],
            "new_status": "SUPERSEDED",
            "reason": "Updated with new version"
        }
        """
        sds_ids = request.data.get('sds_ids', [])
        new_status = request.data.get('new_status')
        reason = request.data.get('reason', '')
        
        if not sds_ids or not new_status:
            return Response({
                'error': _('sds_ids and new_status are required')
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_status not in [choice[0] for choice in SDSStatus.choices]:
            return Response({
                'error': _('Invalid status')
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update records
        updated_count = self.get_queryset().filter(
            id__in=sds_ids
        ).update(
            status=new_status,
            updated_at=timezone.now()
        )
        
        return Response({
            'message': _('Updated {count} SDS records').format(count=updated_count),
            'updated_count': updated_count,
            'new_status': new_status,
            'reason': reason
        })
    
    @action(detail=False, methods=['get'])
    def search_by_chemical(self, request):
        """
        Search SDS by chemical properties or composition.
        
        GET /api/v1/sds/search_by_chemical/?flash_point_min=20&flash_point_max=100
        """
        queryset = self.get_queryset()
        
        # Filter by flash point range
        flash_point_min = request.query_params.get('flash_point_min')
        flash_point_max = request.query_params.get('flash_point_max')
        
        if flash_point_min:
            queryset = queryset.filter(flash_point_celsius__gte=float(flash_point_min))
        if flash_point_max:
            queryset = queryset.filter(flash_point_celsius__lte=float(flash_point_max))
        
        # Filter by physical state
        physical_state = request.query_params.get('physical_state')
        if physical_state:
            queryset = queryset.filter(physical_state=physical_state)
        
        # Filter by hazard statements
        hazard_code = request.query_params.get('hazard_code')
        if hazard_code:
            queryset = queryset.filter(
                hazard_statements__icontains=hazard_code
            )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = SafetyDataSheetListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = SafetyDataSheetListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def _log_access(self, sds, access_type, access_context):
        """Log SDS access for audit purposes"""
        try:
            SDSAccessLog.objects.create(
                sds=sds,
                user=self.request.user,
                access_type=access_type,
                access_context=access_context,
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:500]
            )
        except Exception as e:
            logger.warning(f"Failed to log SDS access: {e}")

class SDSUploadViewSet(viewsets.ViewSet):
    """
    API endpoint for uploading SDS documents.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request):
        """
        Upload SDS document and create SDS record.
        
        POST /api/v1/sds/upload/
        """
        # Validate required fields
        required_fields = ['file', 'dangerous_good_id', 'product_name', 'manufacturer', 'version', 'revision_date']
        missing_fields = [field for field in required_fields if field not in request.data]
        
        if missing_fields:
            return Response({
                'error': _('Missing required fields: {fields}').format(fields=', '.join(missing_fields))
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get dangerous good
            dangerous_good = get_object_or_404(DangerousGood, id=request.data['dangerous_good_id'])
            
            # TODO: Uncomment when documents model is enabled
            # # Create document record
            # document = Document.objects.create(
            #     document_type='SDS',
            #     status='VALIDATED_OK',
            #     file=request.data['file'],
            #     original_filename=request.data['file'].name,
            #     mime_type=request.data['file'].content_type,
            #     file_size=request.data['file'].size,
            #     uploaded_by=request.user
            # )
            
            # Create SDS record without document for now
            sds = SafetyDataSheet.objects.create(
                dangerous_good=dangerous_good,
                # document=document,  # Temporarily disabled
                product_name=request.data['product_name'],
                manufacturer=request.data['manufacturer'],
                version=request.data['version'],
                revision_date=request.data['revision_date'],
                language=request.data.get('language', 'EN'),
                country_code=request.data.get('country_code', 'US'),
                created_by=request.user
            )
            
            return Response({
                'message': _('SDS uploaded successfully'),
                'sds_id': sds.id,
                # 'document_id': document.id,  # Temporarily disabled
                'sds': SafetyDataSheetSerializer(sds).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"SDS upload failed: {e}")
            return Response({
                'error': _('Upload failed: {error}').format(error=str(e))
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
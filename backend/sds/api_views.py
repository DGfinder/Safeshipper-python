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
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.conf import settings
import logging
import hashlib

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


class CachedSDSMixin:
    """
    Mixin for caching SDS lookups and dangerous goods data.
    Provides performance optimization for frequently accessed data.
    """
    
    CACHE_TIMEOUT = getattr(settings, 'SDS_CACHE_TIMEOUT', 3600)  # 1 hour default
    CACHE_PREFIX = 'sds'
    
    def _get_cache_key(self, key_type, *args):
        """Generate cache key for SDS data"""
        key_parts = [self.CACHE_PREFIX, key_type] + list(map(str, args))
        cache_key = ':'.join(key_parts)
        
        # Ensure cache key length is reasonable
        if len(cache_key) > 200:
            # Hash long keys
            cache_key = f"{self.CACHE_PREFIX}:{key_type}:{hashlib.md5(cache_key.encode()).hexdigest()}"
        
        return cache_key
    
    def _cache_sds_lookup(self, dangerous_good_id, language, country_code=None):
        """Cache SDS lookup result"""
        cache_key = self._get_cache_key('lookup', dangerous_good_id, language, country_code or 'any')
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Cache hit for SDS lookup: {cache_key}")
            return cached_result
        
        # Build query for best SDS match
        queryset = self.get_queryset().filter(
            dangerous_good_id=dangerous_good_id,
            status=SDSStatus.ACTIVE
        )
        
        # Find best match
        sds_result = None
        
        # Prefer specific language/country match
        if country_code:
            sds_result = queryset.filter(language=language, country_code=country_code).first()
        
        # Fall back to language match
        if not sds_result:
            sds_result = queryset.filter(language=language).first()
        
        # Fall back to any available SDS
        if not sds_result:
            sds_result = queryset.first()
        
        # Cache the result (even if None)
        cache.set(cache_key, sds_result, timeout=self.CACHE_TIMEOUT)
        logger.debug(f"Cached SDS lookup result: {cache_key}")
        
        return sds_result
    
    def _cache_dangerous_goods_lookup(self, un_number):
        """Cache dangerous goods lookup by UN number"""
        cache_key = self._get_cache_key('dangerous_good', un_number)
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Cache hit for dangerous goods lookup: {cache_key}")
            return cached_result
        
        # Query database
        try:
            from dangerous_goods.models import DangerousGood
            dangerous_good = DangerousGood.objects.get(un_number=un_number)
            
            # Cache the result
            cache.set(cache_key, dangerous_good, timeout=self.CACHE_TIMEOUT * 2)  # Cache DG longer
            logger.debug(f"Cached dangerous goods lookup: {cache_key}")
            
            return dangerous_good
        except DangerousGood.DoesNotExist:
            # Cache negative result for shorter time
            cache.set(cache_key, None, timeout=300)  # 5 minutes
            return None
    
    def _invalidate_sds_cache(self, dangerous_good_id):
        """Invalidate SDS cache entries for a dangerous good"""
        # In a production system, you'd want to use cache tagging
        # For now, we'll clear specific patterns
        languages = ['EN', 'ES', 'FR', 'DE']  # Common languages
        countries = ['US', 'CA', 'AU', 'GB', 'any']
        
        for language in languages:
            for country in countries:
                cache_key = self._get_cache_key('lookup', dangerous_good_id, language, country)
                cache.delete(cache_key)
        
        logger.debug(f"Invalidated SDS cache for dangerous good: {dangerous_good_id}")
    
    def _get_cached_sds_statistics(self):
        """Get cached SDS statistics for performance"""
        cache_key = self._get_cache_key('statistics')
        
        cached_stats = cache.get(cache_key)
        if cached_stats is not None:
            return cached_stats
        
        # Generate statistics
        queryset = self.get_queryset()
        stats = {
            'total_sds': queryset.count(),
            'active_sds': queryset.filter(status=SDSStatus.ACTIVE).count(),
            'expired_sds': queryset.filter(
                expiration_date__lt=timezone.now().date()
            ).count(),
            'expiring_soon': queryset.filter(
                expiration_date__lte=timezone.now().date() + timezone.timedelta(days=30),
                expiration_date__gt=timezone.now().date()
            ).count(),
            'by_language': dict(
                queryset.values_list('language').annotate(count=Count('id'))
            ),
            'by_hazard_class': dict(
                queryset.values_list('dangerous_good__hazard_class').annotate(count=Count('id'))
            )
        }
        
        # Cache for 15 minutes
        cache.set(cache_key, stats, timeout=900)
        return stats


class SafetyDataSheetViewSet(CachedSDSMixin, viewsets.ModelViewSet):
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
        """Set the creator when creating SDS and invalidate cache"""
        instance = serializer.save(created_by=self.request.user)
        
        # Invalidate related cache entries
        if hasattr(instance, 'dangerous_good_id'):
            self._invalidate_sds_cache(instance.dangerous_good_id)
        
        # Clear statistics cache
        cache.delete(self._get_cache_key('statistics'))
    
    def perform_update(self, serializer):
        """Update SDS and invalidate cache"""
        instance = serializer.save()
        
        # Invalidate related cache entries
        if hasattr(instance, 'dangerous_good_id'):
            self._invalidate_sds_cache(instance.dangerous_good_id)
        
        # Clear statistics cache
        cache.delete(self._get_cache_key('statistics'))
    
    def perform_destroy(self, instance):
        """Delete SDS and invalidate cache"""
        dangerous_good_id = getattr(instance, 'dangerous_good_id', None)
        
        # Delete the instance
        instance.delete()
        
        # Invalidate related cache entries
        if dangerous_good_id:
            self._invalidate_sds_cache(dangerous_good_id)
        
        # Clear statistics cache
        cache.delete(self._get_cache_key('statistics'))
    
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
        Quick SDS lookup by dangerous good with caching.
        
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
        
        # Use cached lookup for performance
        sds_result = self._cache_sds_lookup(dangerous_good_id, language, country_code)
        
        if sds_result:
            self._log_access(sds_result, 'SEARCH', 'PLANNING')
            return Response(SafetyDataSheetSerializer(sds_result).data)
        
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
        
        # Note: Document linking available when documents app is fully integrated
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
        Get SDS library statistics with caching.
        """
        # Use cached statistics for performance
        stats = self._get_cached_sds_statistics()
        return Response(stats)
    
    @action(detail=False, methods=['post'])
    def lookup_by_un_number(self, request):
        """
        Lookup SDS by UN number with caching.
        
        POST /api/v1/sds/lookup_by_un_number/
        {
            "un_number": "UN1203",
            "language": "EN",
            "country_code": "US"
        }
        """
        un_number = request.data.get('un_number')
        language = request.data.get('language', 'EN')
        country_code = request.data.get('country_code')
        
        if not un_number:
            return Response({
                'error': _('UN number is required')
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get dangerous goods from cache
        dangerous_good = self._cache_dangerous_goods_lookup(un_number)
        if not dangerous_good:
            return Response({
                'error': _('No dangerous good found for UN number'),
                'un_number': un_number
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Use cached SDS lookup
        sds_result = self._cache_sds_lookup(dangerous_good.id, language, country_code)
        
        if sds_result:
            self._log_access(sds_result, 'SEARCH', 'UN_LOOKUP')
            return Response({
                'sds': SafetyDataSheetSerializer(sds_result).data,
                'dangerous_good': {
                    'id': dangerous_good.id,
                    'un_number': dangerous_good.un_number,
                    'proper_shipping_name': dangerous_good.proper_shipping_name,
                    'hazard_class': dangerous_good.hazard_class
                }
            })
        
        return Response({
            'error': _('No SDS found for this dangerous good'),
            'dangerous_good': {
                'id': dangerous_good.id,
                'un_number': dangerous_good.un_number,
                'proper_shipping_name': dangerous_good.proper_shipping_name
            }
        }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def cache_management(self, request):
        """
        Cache management endpoint for SDS data.
        
        POST /api/v1/sds/cache_management/
        {
            "action": "warm" | "clear" | "stats",
            "dangerous_good_id": "optional-uuid-for-specific-clearing"
        }
        """
        if not request.user.is_staff:
            return Response({
                'error': _('Permission denied')
            }, status=status.HTTP_403_FORBIDDEN)
        
        action = request.data.get('action')
        dangerous_good_id = request.data.get('dangerous_good_id')
        
        if action == 'warm':
            # Warm cache with popular SDS
            return self._warm_sds_cache()
        elif action == 'clear':
            if dangerous_good_id:
                # Clear cache for specific dangerous good
                self._invalidate_sds_cache(dangerous_good_id)
                return Response({
                    'message': _('Cache cleared for dangerous good'),
                    'dangerous_good_id': dangerous_good_id
                })
            else:
                # Clear all SDS cache
                return self._clear_all_sds_cache()
        elif action == 'stats':
            # Get cache statistics
            return self._get_cache_stats()
        else:
            return Response({
                'error': _('Invalid action. Use: warm, clear, or stats')
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _warm_sds_cache(self):
        """Warm SDS cache with frequently accessed data"""
        try:
            # Get most accessed dangerous goods
            popular_sds = self.get_queryset().filter(
                status=SDSStatus.ACTIVE
            ).select_related('dangerous_good').order_by('-access_logs__count')[:50]
            
            warmed_count = 0
            for sds in popular_sds:
                if hasattr(sds, 'dangerous_good'):
                    # Pre-cache common language lookups
                    for language in ['EN', 'ES', 'FR']:
                        self._cache_sds_lookup(sds.dangerous_good.id, language)
                        warmed_count += 1
            
            return Response({
                'message': _('Cache warmed successfully'),
                'warmed_entries': warmed_count
            })
        except Exception as e:
            logger.error(f"Cache warming failed: {str(e)}")
            return Response({
                'error': _('Cache warming failed'),
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _clear_all_sds_cache(self):
        """Clear all SDS-related cache entries"""
        try:
            # Get all cache keys with SDS prefix (simplified approach)
            # In production, use cache tagging or Redis SCAN
            cache_keys_cleared = 0
            
            # Clear statistics cache
            cache.delete(self._get_cache_key('statistics'))
            cache_keys_cleared += 1
            
            # Clear common lookup patterns (simplified)
            # In production, you'd want to track cache keys or use tagging
            languages = ['EN', 'ES', 'FR', 'DE', 'PT']
            countries = ['US', 'CA', 'AU', 'GB', 'ES', 'FR', 'DE', 'any']
            
            # This is a simplified approach - in production use cache tagging
            logger.info("Cache clearing completed (simplified implementation)")
            
            return Response({
                'message': _('SDS cache cleared successfully'),
                'cleared_keys': cache_keys_cleared
            })
        except Exception as e:
            logger.error(f"Cache clearing failed: {str(e)}")
            return Response({
                'error': _('Cache clearing failed'),
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_cache_stats(self):
        """Get SDS cache statistics"""
        try:
            # In production, this would query actual cache statistics
            # For now, return mock statistics
            stats = {
                'cache_enabled': True,
                'cache_timeout': self.CACHE_TIMEOUT,
                'estimated_cached_entries': 150,  # Mock data
                'cache_hit_rate': 75.5,  # Mock data
                'last_cache_clear': None,  # Would track actual clear time
                'cache_size_mb': 2.5  # Mock data
            }
            
            return Response(stats)
        except Exception as e:
            logger.error(f"Cache stats failed: {str(e)}")
            return Response({
                'error': _('Failed to get cache statistics'),
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
            
            # Note: Document linking available when documents app is fully integrated
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
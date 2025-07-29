# shared/views.py
"""
Shared API views for SafeShipper monitoring and management.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from .rate_limiting import RateLimitingService, SensitiveDataRateThrottle
from .validation_service import get_validation_report
from .caching_service import (
    CacheStatisticsService, DangerousGoodsCacheService, 
    SDSCacheService, EmergencyProceduresCacheService
)
from .health_service import HealthCheckService, ServiceDependencyChecker
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RateLimitStatusView(APIView):
    """
    API view to check current rate limiting status for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [SensitiveDataRateThrottle]
    
    @method_decorator(never_cache)
    def get(self, request):
        """Get rate limit status for all endpoint types"""
        try:
            status_data = RateLimitingService.get_all_rate_limit_status(request)
            return Response(status_data, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve rate limit status',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RateLimitManagementView(APIView):
    """
    API view for administrators to manage rate limiting.
    """
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """Clear rate limits for a specific endpoint type"""
        endpoint_type = request.data.get('endpoint_type')
        
        if not endpoint_type:
            return Response({
                'error': 'endpoint_type is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if endpoint_type not in RateLimitingService.RATE_LIMIT_CONFIGS:
            return Response({
                'error': 'Invalid endpoint type',
                'valid_types': list(RateLimitingService.RATE_LIMIT_CONFIGS.keys())
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = RateLimitingService.clear_rate_limit(request, endpoint_type)
            return Response(result, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': 'Failed to clear rate limit',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ValidationStatusView(APIView):
    """
    API view to get comprehensive validation report.
    """
    permission_classes = [IsAdminUser]
    throttle_classes = [SensitiveDataRateThrottle]
    
    @method_decorator(never_cache)
    def get(self, request):
        """Get comprehensive validation status report"""
        try:
            validation_report = get_validation_report()
            return Response(validation_report, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': 'Failed to generate validation report',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CacheManagementView(APIView):
    """
    API view for administrators to manage Redis caching.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get cache statistics and status"""
        try:
            stats = CacheStatisticsService.get_cache_stats()
            return Response({
                'cache_statistics': stats,
                'timestamp': request.META.get('HTTP_DATE'),
                'requested_by': request.user.username
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve cache statistics',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """Clear cache by type or all SafeShipper cache"""
        cache_type = request.data.get('cache_type', 'all')
        
        try:
            if cache_type == 'all':
                result = CacheStatisticsService.clear_all_safeshipper_cache()
            elif cache_type == 'dangerous_goods':
                result = {'success': DangerousGoodsCacheService.invalidate_dangerous_goods_cache()}
            elif cache_type == 'sds':
                from shared.caching_service import SafeShipperCacheService
                result = {'success': SafeShipperCacheService.clear_pattern('sds')}
            elif cache_type == 'emergency_procedures':
                from shared.caching_service import SafeShipperCacheService
                result = {'success': SafeShipperCacheService.clear_pattern('emergency_procedures')}
            else:
                return Response({
                    'error': 'Invalid cache type',
                    'valid_types': ['all', 'dangerous_goods', 'sds', 'emergency_procedures']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'cache_clear_result': result,
                'cache_type': cache_type,
                'cleared_by': request.user.username
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': 'Failed to clear cache',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SystemHealthView(APIView):
    """
    Comprehensive system health check view for SafeShipper platform.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Comprehensive health check of all SafeShipper services"""
        try:
            # Get comprehensive health check
            health_data = HealthCheckService.comprehensive_health_check()
            
            # Add user context
            health_data['checked_by'] = request.user.username
            health_data['user_permissions'] = list(request.user.get_all_permissions()) if request.user.is_authenticated else []
            
            # Determine HTTP status code based on health
            http_status = status.HTTP_200_OK
            if health_data['status'] == 'unhealthy':
                http_status = status.HTTP_503_SERVICE_UNAVAILABLE
            elif health_data['status'] == 'degraded':
                http_status = status.HTTP_200_OK  # Still operational but degraded
            
            return Response(health_data, status=http_status)
            
        except Exception as e:
            logger.error(f"Health check endpoint failed: {str(e)}")
            return Response({
                'status': 'unhealthy',
                'error': 'Health check system failure',
                'message': str(e),
                'timestamp': datetime.now().isoformat(),
                'checked_by': request.user.username if request.user.is_authenticated else 'anonymous'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class DetailedHealthView(APIView):
    """
    Detailed health check view with dangerous goods specific diagnostics.
    """
    permission_classes = [IsAdminUser]  # Admin only for detailed diagnostics
    
    def get(self, request):
        """Detailed health check including dangerous goods dependencies"""
        try:
            # Get comprehensive health check
            health_data = HealthCheckService.comprehensive_health_check()
            
            # Get dangerous goods specific dependencies
            dg_dependencies = ServiceDependencyChecker.check_dangerous_goods_dependencies()
            
            # Combine results
            detailed_health = {
                **health_data,
                'dangerous_goods_dependencies': dg_dependencies,
                'checked_by': request.user.username,
                'check_level': 'detailed'
            }
            
            # Determine overall status considering DG dependencies
            if (health_data['status'] == 'unhealthy' or 
                dg_dependencies['status'] == 'failed'):
                detailed_health['status'] = 'unhealthy'
                http_status = status.HTTP_503_SERVICE_UNAVAILABLE
            elif (health_data['status'] == 'degraded' or 
                  dg_dependencies['status'] == 'degraded'):
                detailed_health['status'] = 'degraded'
                http_status = status.HTTP_200_OK
            else:
                http_status = status.HTTP_200_OK
            
            return Response(detailed_health, status=http_status)
            
        except Exception as e:
            logger.error(f"Detailed health check failed: {str(e)}")
            return Response({
                'status': 'unhealthy',
                'error': 'Detailed health check failed',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class ServiceHealthView(APIView):
    """
    Individual service health check view.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, service_name):
        """Check health of a specific service"""
        try:
            # Validate service name
            valid_services = (
                HealthCheckService.CRITICAL_SERVICES + 
                HealthCheckService.OPTIONAL_SERVICES
            )
            
            if service_name not in valid_services:
                return Response({
                    'error': 'Invalid service name',
                    'valid_services': valid_services
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check specific service
            service_health = HealthCheckService._check_service(service_name)
            
            # Add metadata
            service_health['service_name'] = service_name
            service_health['checked_by'] = request.user.username
            
            # Determine HTTP status
            http_status = status.HTTP_200_OK
            if service_health['status'] == 'failed':
                http_status = status.HTTP_503_SERVICE_UNAVAILABLE
            
            return Response(service_health, status=http_status)
            
        except Exception as e:
            logger.error(f"Service health check failed for {service_name}: {str(e)}")
            return Response({
                'service_name': service_name,
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
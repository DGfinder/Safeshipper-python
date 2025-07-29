# shared/rate_limiting.py
"""
Rate limiting implementation for SafeShipper API endpoints.
Focuses on authentication endpoints and dangerous goods sensitive operations.
"""

import time
import hashlib
from datetime import datetime, timedelta
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
from rest_framework.throttling import BaseThrottle
from rest_framework.views import exception_handler
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class SafeShipperBaseThrottle(BaseThrottle):
    """
    Base throttle class for SafeShipper with enhanced security features.
    """
    
    def __init__(self):
        if not hasattr(settings, 'CACHES') or 'default' not in settings.CACHES:
            logger.warning("Redis cache not configured, rate limiting will use in-memory cache")
    
    def get_cache_key(self, request, view):
        """
        Generate cache key based on user, IP, and endpoint.
        """
        if request.user.is_authenticated:
            ident = str(request.user.id)
        else:
            ident = self.get_ident(request)
        
        # Include endpoint information for granular control
        endpoint = f"{view.__class__.__name__}"
        if hasattr(view, 'action'):
            endpoint += f"_{view.action}"
        
        # Create hash for consistent key length
        key_data = f"{self.scope}_{ident}_{endpoint}"
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        
        return f"throttle_{key_hash}"
    
    def throttle_success(self, request, view):
        """
        Record successful request and check if throttling should be applied.
        """
        if not self.rate:
            return True
            
        key = self.get_cache_key(request, view)
        history = cache.get(key, [])
        now = time.time()
        
        # Remove old entries
        while history and history[-1] <= now - self.duration:
            history.pop()
        
        # Check if we're over the limit
        if len(history) >= self.num_requests:
            return False
        
        # Record this request
        history.insert(0, now)
        cache.set(key, history, self.duration)
        
        return True
    
    def throttle_failure(self, request, view):
        """
        Handle throttle failure with security logging.
        """
        # Log security event
        user_info = f"User: {request.user.id}" if request.user.is_authenticated else f"IP: {self.get_ident(request)}"
        logger.warning(
            f"Rate limit exceeded - {user_info}, "
            f"Endpoint: {view.__class__.__name__}, "
            f"Rate: {self.rate}"
        )
        
        return True


class AuthenticationRateThrottle(SafeShipperBaseThrottle):
    """
    Rate limiting for authentication endpoints.
    Strict limits to prevent brute force attacks.
    """
    scope = 'auth'
    rate = '5/min'  # 5 attempts per minute
    
    def parse_rate(self, rate):
        """Parse rate string into num_requests and duration"""
        if rate is None:
            return None, None
        
        num, period = rate.split('/')
        num_requests = int(num)
        
        duration_map = {
            'sec': 1,
            'min': 60,
            'hour': 3600,
            'day': 86400
        }
        
        duration = duration_map[period]
        return num_requests, duration
    
    def __init__(self):
        super().__init__()
        self.num_requests, self.duration = self.parse_rate(self.rate)


class DangerousGoodsRateThrottle(SafeShipperBaseThrottle):
    """
    Rate limiting for dangerous goods related endpoints.
    Moderate limits for normal operations.
    """
    scope = 'dangerous_goods'
    rate = '100/hour'  # 100 requests per hour
    
    def parse_rate(self, rate):
        if rate is None:
            return None, None
        
        num, period = rate.split('/')
        num_requests = int(num)
        
        duration_map = {
            'sec': 1,
            'min': 60,
            'hour': 3600,
            'day': 86400
        }
        
        duration = duration_map[period]
        return num_requests, duration
    
    def __init__(self):
        super().__init__()
        self.num_requests, self.duration = self.parse_rate(self.rate)


class ShipmentCreationRateThrottle(SafeShipperBaseThrottle):
    """
    Rate limiting for shipment creation endpoints.
    Prevents spam while allowing normal business operations.
    """
    scope = 'shipment_creation'
    rate = '50/hour'  # 50 shipments per hour per user
    
    def parse_rate(self, rate):
        if rate is None:
            return None, None
        
        num, period = rate.split('/')
        num_requests = int(num)
        
        duration_map = {
            'sec': 1,
            'min': 60,
            'hour': 3600,
            'day': 86400
        }
        
        duration = duration_map[period]
        return num_requests, duration
    
    def __init__(self):
        super().__init__()
        self.num_requests, self.duration = self.parse_rate(self.rate)


class EmergencyEndpointRateThrottle(SafeShipperBaseThrottle):
    """
    Rate limiting for emergency procedure endpoints.
    Higher limits as these are safety-critical.
    """
    scope = 'emergency'
    rate = '200/hour'  # 200 requests per hour - higher for safety
    
    def parse_rate(self, rate):
        if rate is None:
            return None, None
        
        num, period = rate.split('/')
        num_requests = int(num)
        
        duration_map = {
            'sec': 1,
            'min': 60,
            'hour': 3600,
            'day': 86400
        }
        
        duration = duration_map[period]
        return num_requests, duration
    
    def __init__(self):
        super().__init__()
        self.num_requests, self.duration = self.parse_rate(self.rate)


class SensitiveDataRateThrottle(SafeShipperBaseThrottle):
    """
    Rate limiting for endpoints that handle sensitive data.
    Conservative limits for user data, SDS, compliance records.
    """
    scope = 'sensitive_data'
    rate = '30/min'  # 30 requests per minute
    
    def parse_rate(self, rate):
        if rate is None:
            return None, None
        
        num, period = rate.split('/')
        num_requests = int(num)
        
        duration_map = {
            'sec': 1,
            'min': 60,
            'hour': 3600,
            'day': 86400
        }
        
        duration = duration_map[period]
        return num_requests, duration
    
    def __init__(self):
        super().__init__()
        self.num_requests, self.duration = self.parse_rate(self.rate)


def rate_limit_exceeded_handler(request, exception):
    """
    Custom handler for rate limit exceeded responses.
    """
    if hasattr(exception, 'detail') and 'throttled' in str(exception.detail).lower():
        # Log the rate limit violation
        user_info = f"User: {request.user.id}" if request.user.is_authenticated else f"IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        logger.warning(f"Rate limit exceeded: {user_info}, Path: {request.path}")
        
        # Return structured error response
        return JsonResponse({
            'error': 'Rate limit exceeded',
            'message': 'Too many requests. Please try again later.',
            'error_code': 'RATE_LIMIT_EXCEEDED',
            'retry_after': getattr(exception, 'wait', 60)  # Default 60 seconds
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Fall back to default exception handler for other errors
    return exception_handler(request, exception)


class RateLimitMiddleware:
    """
    Middleware to add rate limiting headers to responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add rate limiting headers for monitoring
        if hasattr(request, 'throttle_info'):
            response['X-RateLimit-Limit'] = request.throttle_info.get('limit', 'Unknown')
            response['X-RateLimit-Remaining'] = request.throttle_info.get('remaining', 'Unknown')
            response['X-RateLimit-Reset'] = request.throttle_info.get('reset', 'Unknown')
        
        return response


class RateLimitingService:
    """
    Service class for managing rate limiting configurations and monitoring.
    """
    
    RATE_LIMIT_CONFIGS = {
        'authentication': {
            'throttle_class': AuthenticationRateThrottle,
            'rate': '5/min',
            'description': 'Authentication endpoints (login, password reset)'
        },
        'dangerous_goods': {
            'throttle_class': DangerousGoodsRateThrottle,
            'rate': '100/hour',
            'description': 'Dangerous goods lookup and validation'
        },
        'shipment_creation': {
            'throttle_class': ShipmentCreationRateThrottle,
            'rate': '50/hour',
            'description': 'Shipment creation and modification'
        },
        'emergency': {
            'throttle_class': EmergencyEndpointRateThrottle,
            'rate': '200/hour',
            'description': 'Emergency procedures and incident reporting'
        },
        'sensitive_data': {
            'throttle_class': SensitiveDataRateThrottle,
            'rate': '30/min',
            'description': 'User data, SDS, compliance records'
        }
    }
    
    @classmethod
    def get_rate_limit_status(cls, request, endpoint_type):
        """
        Get current rate limit status for a user/IP and endpoint type.
        """
        config = cls.RATE_LIMIT_CONFIGS.get(endpoint_type)
        if not config:
            return {'error': 'Unknown endpoint type'}
        
        throttle = config['throttle_class']()
        
        # Get cache key and check current usage
        cache_key = throttle.get_cache_key(request, type('MockView', (), {'__class__': type(endpoint_type, (), {})}))
        history = cache.get(cache_key, [])
        
        now = time.time()
        # Remove expired entries
        while history and history[-1] <= now - throttle.duration:
            history.pop()
        
        return {
            'endpoint_type': endpoint_type,
            'rate_limit': config['rate'],
            'current_usage': len(history),
            'limit': throttle.num_requests,
            'remaining': max(0, throttle.num_requests - len(history)),
            'reset_time': datetime.fromtimestamp(now + throttle.duration).isoformat() if history else None,
            'description': config['description']
        }
    
    @classmethod
    def get_all_rate_limit_status(cls, request):
        """
        Get rate limit status for all endpoint types.
        """
        status_data = {}
        for endpoint_type in cls.RATE_LIMIT_CONFIGS.keys():
            status_data[endpoint_type] = cls.get_rate_limit_status(request, endpoint_type)
        
        return {
            'user_id': request.user.id if request.user.is_authenticated else None,
            'ip_address': request.META.get('REMOTE_ADDR', 'Unknown'),
            'timestamp': datetime.now().isoformat(),
            'rate_limits': status_data
        }
    
    @classmethod
    def clear_rate_limit(cls, request, endpoint_type):
        """
        Clear rate limit for a specific user/IP and endpoint type.
        Should only be used by administrators.
        """
        config = cls.RATE_LIMIT_CONFIGS.get(endpoint_type)
        if not config:
            return {'error': 'Unknown endpoint type'}
        
        throttle = config['throttle_class']()
        cache_key = throttle.get_cache_key(request, type('MockView', (), {'__class__': type(endpoint_type, (), {})}))
        
        cache.delete(cache_key)
        
        logger.info(f"Rate limit cleared for {endpoint_type} - User: {request.user.id if request.user.is_authenticated else 'Anonymous'}")
        
        return {'success': True, 'message': f'Rate limit cleared for {endpoint_type}'}


# Decorator for applying rate limiting to function-based views
def rate_limit(throttle_class):
    """
    Decorator to apply rate limiting to function-based views.
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            throttle = throttle_class()
            
            # Create mock view for throttle checking
            class MockView:
                def __init__(self):
                    self.__class__.__name__ = view_func.__name__
            
            mock_view = MockView()
            
            if not throttle.throttle_success(request, mock_view):
                throttle.throttle_failure(request, mock_view)
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': 'Too many requests. Please try again later.',
                    'error_code': 'RATE_LIMIT_EXCEEDED'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator
import time
import json
import logging
from django.http import JsonResponse
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from rest_framework import status
from .models import APIKey, APIUsageLog
from .utils import get_client_ip, generate_request_id

logger = logging.getLogger(__name__)

class APIGatewayMiddleware:
    """
    API Gateway middleware for authentication, rate limiting, and logging
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip middleware for non-API requests
        if not request.path.startswith('/api/'):
            return self.get_response(request)
        
        # Generate request ID for tracking
        request.api_request_id = generate_request_id()
        request.api_start_time = time.time()
        
        # Extract API key from headers
        api_key = self._extract_api_key(request)
        
        if api_key:
            # Validate API key
            key_validation = self._validate_api_key(api_key, request)
            if not key_validation['valid']:
                return self._error_response(
                    key_validation['error'], 
                    status.HTTP_401_UNAUTHORIZED
                )
            
            request.api_key_obj = key_validation['api_key']
            
            # Check rate limits
            rate_limit_check = self._check_rate_limit(request.api_key_obj, request)
            if not rate_limit_check['allowed']:
                return self._error_response(
                    f"Rate limit exceeded. Limit: {rate_limit_check['limit']} requests/hour",
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={
                        'X-RateLimit-Limit': str(rate_limit_check['limit']),
                        'X-RateLimit-Remaining': str(rate_limit_check['remaining']),
                        'X-RateLimit-Reset': str(rate_limit_check['reset_time']),
                    }
                )
        
        # Process request
        response = self.get_response(request)
        
        # Log API usage
        if hasattr(request, 'api_key_obj'):
            self._log_api_usage(request, response)
        
        # Add API gateway headers
        response['X-API-Version'] = getattr(settings, 'API_VERSION', '1.0')
        response['X-Request-ID'] = request.api_request_id
        
        return response
    
    def _extract_api_key(self, request):
        """Extract API key from Authorization header"""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer ss_'):
            return auth_header[7:]  # Remove 'Bearer ' prefix
        elif auth_header.startswith('ApiKey '):
            return auth_header[7:]  # Remove 'ApiKey ' prefix
        
        # Check X-API-Key header as fallback
        return request.META.get('HTTP_X_API_KEY')
    
    def _validate_api_key(self, key, request):
        """Validate API key and check permissions"""
        try:
            api_key = APIKey.objects.select_related('created_by').get(key=key)
            
            if not api_key.is_active:
                return {
                    'valid': False,
                    'error': f'API key is {api_key.status}'
                }
            
            # Check IP whitelist
            if api_key.allowed_ips:
                client_ip = get_client_ip(request)
                if client_ip not in api_key.allowed_ips:
                    return {
                        'valid': False,
                        'error': f'IP address {client_ip} not authorized'
                    }
            
            # Update last used timestamp
            api_key.last_used_at = timezone.now()
            api_key.save(update_fields=['last_used_at'])
            
            return {
                'valid': True,
                'api_key': api_key
            }
            
        except APIKey.DoesNotExist:
            return {
                'valid': False,
                'error': 'Invalid API key'
            }
    
    def _check_rate_limit(self, api_key, request):
        """Check rate limits using Redis cache"""
        cache_key = f"api_rate_limit:{api_key.id}"
        current_hour = int(time.time() // 3600)
        
        # Get current usage from cache
        usage_data = cache.get(cache_key, {})
        current_usage = usage_data.get(str(current_hour), 0)
        
        if current_usage >= api_key.rate_limit:
            return {
                'allowed': False,
                'limit': api_key.rate_limit,
                'remaining': 0,
                'reset_time': (current_hour + 1) * 3600
            }
        
        # Increment usage
        usage_data[str(current_hour)] = current_usage + 1
        
        # Clean old entries (keep only current and previous hour)
        cleaned_data = {
            k: v for k, v in usage_data.items() 
            if int(k) >= current_hour - 1
        }
        
        # Update cache (expire in 2 hours)
        cache.set(cache_key, cleaned_data, timeout=7200)
        
        return {
            'allowed': True,
            'limit': api_key.rate_limit,
            'remaining': api_key.rate_limit - (current_usage + 1),
            'reset_time': (current_hour + 1) * 3600
        }
    
    def _log_api_usage(self, request, response):
        """Log API usage for monitoring and billing"""
        try:
            end_time = time.time()
            response_time_ms = int((end_time - request.api_start_time) * 1000)
            
            # Extract response size
            bytes_sent = len(response.content) if hasattr(response, 'content') else 0
            bytes_received = len(request.body) if hasattr(request, 'body') else 0
            
            # Create usage log
            APIUsageLog.objects.create(
                api_key=request.api_key_obj,
                endpoint=request.path,
                method=request.method,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                status_code=response.status_code,
                response_time_ms=response_time_ms,
                bytes_sent=bytes_sent,
                bytes_received=bytes_received,
                request_id=request.api_request_id,
                error_message=getattr(response, 'error_message', ''),
                error_code=getattr(response, 'error_code', '')
            )
            
            # Update API key usage counters
            request.api_key_obj.total_requests += 1
            if response.status_code >= 400:
                request.api_key_obj.total_errors += 1
            request.api_key_obj.save(update_fields=['total_requests', 'total_errors'])
            
        except Exception as e:
            logger.error(f"Failed to log API usage: {e}")
    
    def _error_response(self, message, status_code, headers=None):
        """Return standardized error response"""
        response_data = {
            'error': {
                'message': message,
                'code': status_code,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        response = JsonResponse(response_data, status=status_code)
        
        if headers:
            for key, value in headers.items():
                response[key] = value
        
        return response


class WebhookSecurityMiddleware:
    """
    Middleware to verify webhook signatures
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Only apply to webhook endpoints
        if request.path.startswith('/api/webhooks/'):
            signature = request.META.get('HTTP_X_SAFESHIPPER_SIGNATURE')
            
            if not signature:
                return JsonResponse(
                    {'error': 'Missing webhook signature'}, 
                    status=401
                )
            
            # Verify signature (implementation depends on webhook endpoint)
            if not self._verify_signature(request, signature):
                return JsonResponse(
                    {'error': 'Invalid webhook signature'}, 
                    status=401
                )
        
        return self.get_response(request)
    
    def _verify_signature(self, request, signature):
        """Verify webhook signature using HMAC"""
        import hmac
        import hashlib
        
        # This would be implemented based on specific webhook requirements
        # For now, return True for development
        return True


class APIVersioningMiddleware:
    """
    Handle API versioning through headers or URL paths
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Extract API version from Accept header or URL
        api_version = self._extract_api_version(request)
        request.api_version = api_version
        
        # Add version info to response
        response = self.get_response(request)
        response['X-API-Version'] = api_version
        
        return response
    
    def _extract_api_version(self, request):
        """Extract API version from request"""
        # Check Accept header first
        accept_header = request.META.get('HTTP_ACCEPT', '')
        if 'application/vnd.safeshipper.v' in accept_header:
            import re
            match = re.search(r'application/vnd\.safeshipper\.v(\d+)', accept_header)
            if match:
                return match.group(1)
        
        # Check X-API-Version header
        version_header = request.META.get('HTTP_X_API_VERSION')
        if version_header:
            return version_header
        
        # Default version
        return getattr(settings, 'DEFAULT_API_VERSION', '1')


class CORSMiddleware:
    """
    Enhanced CORS middleware for API gateway
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add CORS headers for API endpoints
        if request.path.startswith('/api/'):
            response['Access-Control-Allow-Origin'] = self._get_allowed_origin(request)
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = (
                'Authorization, Content-Type, X-API-Key, X-API-Version, '
                'X-Request-ID, X-Safeshipper-Signature'
            )
            response['Access-Control-Expose-Headers'] = (
                'X-API-Version, X-Request-ID, X-RateLimit-Limit, '
                'X-RateLimit-Remaining, X-RateLimit-Reset'
            )
            response['Access-Control-Max-Age'] = '86400'  # 24 hours
        
        return response
    
    def _get_allowed_origin(self, request):
        """Get allowed origin based on request"""
        origin = request.META.get('HTTP_ORIGIN')
        
        # In production, this should check against a whitelist
        allowed_origins = getattr(settings, 'API_ALLOWED_ORIGINS', ['*'])
        
        if '*' in allowed_origins or origin in allowed_origins:
            return origin or '*'
        
        return 'null'
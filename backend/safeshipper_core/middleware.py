import logging
import time
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger('safeshipper')

class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log request details and performance metrics.
    """
    
    def process_request(self, request):
        request.start_time = time.time()
        
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Log slow requests (>1 second)
            if duration > 1.0:
                logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"took {duration:.2f}s - User: {getattr(request.user, 'username', 'Anonymous')}"
                )
        
        return response

class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses.
    """
    
    def process_response(self, request, response):
        if not settings.DEBUG:
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['X-XSS-Protection'] = '1; mode=block'
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response

class APIErrorHandlingMiddleware(MiddlewareMixin):
    """
    Global error handling for API responses.
    """
    
    def process_exception(self, request, exception):
        if request.path.startswith('/api/'):
            logger.error(f"API Error: {exception}", exc_info=True)
            
            if settings.DEBUG:
                return JsonResponse({
                    'error': 'Internal server error',
                    'detail': str(exception)
                }, status=500)
            else:
                return JsonResponse({
                    'error': 'Internal server error'
                }, status=500)
        
        return None
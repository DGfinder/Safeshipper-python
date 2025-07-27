from django.utils.deprecation import MiddlewareMixin
from .signals import set_request_context, clear_request_context, get_client_ip


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware to capture request context for audit logging
    """
    
    def process_request(self, request):
        """Set request context at the start of request processing"""
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            set_request_context(
                user=user,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                session_key=request.session.session_key
            )
        else:
            set_request_context(
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                session_key=request.session.session_key
            )
        
        return None
    
    def process_response(self, request, response):
        """Clear request context at the end of request processing"""
        clear_request_context()
        return response
    
    def process_exception(self, request, exception):
        """Clear request context if an exception occurs"""
        clear_request_context()
        return None
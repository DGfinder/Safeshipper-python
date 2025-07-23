# communications/middleware.py
import jwt
import logging
from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)
User = get_user_model()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSocket connections.
    
    Accepts JWT tokens from:
    1. Query parameter: ?token=<jwt_token>
    2. Headers: Authorization: Bearer <jwt_token>
    """

    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        """
        Authenticate the user and add to scope.
        """
        # Only process WebSocket connections
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)

        # Try to authenticate the user
        user = await self.get_user_from_scope(scope)
        
        # Add user to scope
        scope["user"] = user
        
        return await super().__call__(scope, receive, send)

    async def get_user_from_scope(self, scope):
        """
        Extract and validate JWT token from the WebSocket scope.
        """
        token = None
        
        # Try to get token from query parameters
        query_string = scope.get("query_string", b"").decode()
        if query_string:
            query_params = parse_qs(query_string)
            token_list = query_params.get("token")
            if token_list:
                token = token_list[0]
        
        # Try to get token from headers if not found in query params
        if not token:
            headers = dict(scope.get("headers", []))
            auth_header = headers.get(b"authorization")
            if auth_header:
                auth_value = auth_header.decode()
                if auth_value.startswith("Bearer "):
                    token = auth_value[7:]  # Remove "Bearer " prefix
        
        if not token:
            logger.warning("No JWT token provided in WebSocket connection")
            return AnonymousUser()
        
        # Validate the token
        try:
            # Decode JWT token
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )
            
            # Get user ID from payload
            user_id = payload.get("user_id")
            if not user_id:
                logger.warning("No user_id in JWT payload")
                return AnonymousUser()
            
            # Get user from database
            user = await self.get_user_by_id(user_id)
            if user:
                logger.info(f"WebSocket authenticated user: {user.id}")
                return user
            else:
                logger.warning(f"User not found for ID: {user_id}")
                return AnonymousUser()
                
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return AnonymousUser()
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            return AnonymousUser()
        except Exception as e:
            logger.error(f"Error validating JWT token: {str(e)}")
            return AnonymousUser()

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        """
        Get user from database by ID.
        """
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {str(e)}")
            return None


class WebSocketLoggingMiddleware(BaseMiddleware):
    """
    Middleware for logging WebSocket connections and disconnections.
    """

    async def __call__(self, scope, receive, send):
        """
        Log WebSocket events.
        """
        if scope["type"] == "websocket":
            client_ip = self.get_client_ip(scope)
            user = scope.get("user", AnonymousUser())
            user_info = f"User {user.id}" if user.is_authenticated else "Anonymous"
            
            logger.info(f"WebSocket connection attempt from {client_ip} ({user_info})")
        
        return await super().__call__(scope, receive, send)

    def get_client_ip(self, scope):
        """
        Extract client IP from scope.
        """
        headers = dict(scope.get("headers", []))
        
        # Check for forwarded IP (if behind proxy)
        x_forwarded_for = headers.get(b"x-forwarded-for")
        if x_forwarded_for:
            return x_forwarded_for.decode().split(",")[0].strip()
        
        x_real_ip = headers.get(b"x-real-ip")
        if x_real_ip:
            return x_real_ip.decode()
        
        # Fall back to client address
        client = scope.get("client")
        if client:
            return client[0]
        
        return "unknown"


class RateLimitMiddleware(BaseMiddleware):
    """
    Basic rate limiting middleware for WebSocket connections.
    Prevents abuse by limiting connection attempts per IP.
    """

    def __init__(self, inner):
        super().__init__(inner)
        self.connection_counts = {}  # In production, use Redis
        self.max_connections_per_ip = 10

    async def __call__(self, scope, receive, send):
        """
        Apply rate limiting to WebSocket connections.
        """
        if scope["type"] == "websocket":
            client_ip = self.get_client_ip(scope)
            
            # Check connection count for this IP
            current_count = self.connection_counts.get(client_ip, 0)
            
            if current_count >= self.max_connections_per_ip:
                logger.warning(f"Rate limit exceeded for IP {client_ip}")
                # Close connection immediately
                await send({
                    "type": "websocket.close",
                    "code": 4008,  # Policy violation
                    "reason": "Rate limit exceeded"
                })
                return
            
            # Increment connection count
            self.connection_counts[client_ip] = current_count + 1
            
            # Create wrapper to decrement count on disconnect
            original_receive = receive
            
            async def receive_wrapper():
                message = await original_receive()
                if message["type"] == "websocket.disconnect":
                    # Decrement connection count
                    current = self.connection_counts.get(client_ip, 0)
                    if current > 0:
                        self.connection_counts[client_ip] = current - 1
                    if self.connection_counts[client_ip] == 0:
                        del self.connection_counts[client_ip]
                return message
            
            return await super().__call__(scope, receive_wrapper, send)
        
        return await super().__call__(scope, receive, send)

    def get_client_ip(self, scope):
        """Extract client IP from scope."""
        headers = dict(scope.get("headers", []))
        
        x_forwarded_for = headers.get(b"x-forwarded-for")
        if x_forwarded_for:
            return x_forwarded_for.decode().split(",")[0].strip()
        
        x_real_ip = headers.get(b"x-real-ip")
        if x_real_ip:
            return x_real_ip.decode()
        
        client = scope.get("client")
        if client:
            return client[0]
        
        return "unknown"


# Middleware stack for WebSocket connections
def create_websocket_middleware_stack():
    """
    Create the middleware stack for WebSocket connections.
    """
    from channels.auth import AuthMiddlewareStack
    
    return WebSocketLoggingMiddleware(
        RateLimitMiddleware(
            JWTAuthMiddleware(
                AuthMiddlewareStack(
                    # This will be replaced with URLRouter in routing.py
                    None
                )
            )
        )
    )
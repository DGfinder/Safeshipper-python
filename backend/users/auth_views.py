# users/auth_views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class SafeShipperTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that adds user data to the token response"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['user_id'] = user.id
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        token['company'] = user.company.name if user.company else None
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user data to response
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        
        return data

class SafeShipperTokenObtainPairView(TokenObtainPairView):
    """Custom JWT login view"""
    serializer_class = SafeShipperTokenObtainPairSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login endpoint that returns JWT tokens and user data.
    Expected frontend format: { email, password }
    """
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'error': 'Email and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to find user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Authenticate user
        user = authenticate(username=user.username, password=password)
        if not user:
            return Response({
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'error': 'Account is disabled'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Add custom claims
        access_token['user_id'] = user.id
        access_token['username'] = user.username
        access_token['email'] = user.email
        access_token['role'] = user.role
        access_token['company'] = user.company.name if user.company else None
        
        # Serialize user data
        user_serializer = UserSerializer(user)
        
        logger.info(f"User {user.email} logged in successfully")
        
        return Response({
            'access_token': str(access_token),
            'refresh_token': str(refresh),
            'user': user_serializer.data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return Response({
            'error': 'An error occurred during login'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout endpoint that blacklists the refresh token
    """
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        logger.info(f"User {request.user.email} logged out successfully")
        
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return Response({
            'message': 'Logout completed'
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Get current user profile
    """
    try:
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Get user profile error: {str(e)}")
        return Response({
            'error': 'Failed to retrieve user profile'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    User registration endpoint
    """
    try:
        from .serializers import UserCreateSerializer
        
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate tokens for immediate login
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Add custom claims
            access_token['user_id'] = user.id
            access_token['username'] = user.username
            access_token['email'] = user.email
            access_token['role'] = user.role
            access_token['company'] = user.company.name if user.company else None
            
            user_serializer = UserSerializer(user)
            
            logger.info(f"New user registered: {user.email}")
            
            return Response({
                'access_token': str(access_token),
                'refresh_token': str(refresh),
                'user': user_serializer.data,
                'message': 'Registration successful'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return Response({
            'error': 'An error occurred during registration'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Forgot password endpoint
    """
    try:
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            # TODO: Implement password reset email logic
            # For now, just return success message
            
            logger.info(f"Password reset requested for: {email}")
            
            return Response({
                'message': 'If an account with this email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            # Don't reveal whether email exists
            return Response({
                'message': 'If an account with this email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return Response({
            'error': 'An error occurred while processing your request'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
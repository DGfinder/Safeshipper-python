# enterprise_auth/views.py
from django.shortcuts import redirect, get_object_or_404
from django.contrib.auth import login as django_login
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
import logging
import json
from datetime import timedelta
from django.utils import timezone

from .models import SSOProvider, UserSSOAccount, AuthenticationLog, MFADevice
from .serializers import SSOProviderSerializer, MFADeviceSerializer
from .services import MFAService, SSOService

User = get_user_model()
logger = logging.getLogger(__name__)


class GoogleLogin(SocialLoginView):
    """Google OAuth2 login endpoint for API clients"""
    adapter_class = GoogleOAuth2Adapter
    callback_url = settings.CORS_ALLOWED_ORIGINS[0] + "/auth/google/callback/"
    client_class = OAuth2Client
    
    def post(self, request, *args, **kwargs):
        """Custom Google login with JWT response"""
        try:
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                # Get user from response
                user = request.user if request.user.is_authenticated else None
                
                if user:
                    # Create JWT tokens
                    refresh = RefreshToken.for_user(user)
                    access_token = refresh.access_token
                    
                    # Add custom claims
                    access_token['user_id'] = user.id
                    access_token['username'] = user.username
                    access_token['email'] = user.email
                    access_token['role'] = user.role
                    
                    # Log SSO authentication
                    AuthenticationLog.objects.create(
                        user=user,
                        event_type='sso_login',
                        ip_address=request.META.get('REMOTE_ADDR', ''),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        username_attempted=user.email,
                        success=True,
                        metadata={'provider': 'google'}
                    )
                    
                    return Response({
                        'access_token': str(access_token),
                        'refresh_token': str(refresh),
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'email': user.email,
                            'role': user.role,
                        },
                        'message': 'SSO login successful'
                    })
            
            return response
            
        except Exception as e:
            logger.error(f"Google SSO login error: {str(e)}")
            return Response({
                'error': 'SSO authentication failed'
            }, status=status.HTTP_400_BAD_REQUEST)


class MicrosoftLogin(SocialLoginView):
    """Microsoft OAuth2 login endpoint for API clients"""
    adapter_class = MicrosoftOAuth2Adapter
    callback_url = settings.CORS_ALLOWED_ORIGINS[0] + "/auth/microsoft/callback/"
    client_class = OAuth2Client
    
    def post(self, request, *args, **kwargs):
        """Custom Microsoft login with JWT response"""
        try:
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                user = request.user if request.user.is_authenticated else None
                
                if user:
                    # Create JWT tokens
                    refresh = RefreshToken.for_user(user)
                    access_token = refresh.access_token
                    
                    # Add custom claims
                    access_token['user_id'] = user.id
                    access_token['username'] = user.username
                    access_token['email'] = user.email
                    access_token['role'] = user.role
                    
                    # Log SSO authentication
                    AuthenticationLog.objects.create(
                        user=user,
                        event_type='sso_login',
                        ip_address=request.META.get('REMOTE_ADDR', ''),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        username_attempted=user.email,
                        success=True,
                        metadata={'provider': 'microsoft'}
                    )
                    
                    return Response({
                        'access_token': str(access_token),
                        'refresh_token': str(refresh),
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'email': user.email,
                            'role': user.role,
                        },
                        'message': 'SSO login successful'
                    })
            
            return response
            
        except Exception as e:
            logger.error(f"Microsoft SSO login error: {str(e)}")
            return Response({
                'error': 'SSO authentication failed'
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def sso_providers(request):
    """Get available SSO providers for a domain"""
    try:
        domain = request.GET.get('domain')
        
        if domain:
            providers = SSOProvider.objects.filter(
                is_active=True,
                domain__icontains=domain
            )
        else:
            providers = SSOProvider.objects.filter(is_active=True)
        
        serializer = SSOProviderSerializer(providers, many=True)
        
        return Response({
            'providers': serializer.data
        })
        
    except Exception as e:
        logger.error(f"SSO providers error: {str(e)}")
        return Response({
            'error': 'Failed to retrieve SSO providers'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_mfa(request):
    """Enroll user in MFA"""
    try:
        device_type = request.data.get('device_type', 'totp')
        device_name = request.data.get('device_name', 'My Device')
        phone_number = request.data.get('phone_number', '')
        
        mfa_service = MFAService()
        
        if device_type == 'totp':
            device = mfa_service.setup_totp(request.user, device_name)
            
            return Response({
                'device_id': device.id,
                'qr_code_url': mfa_service.generate_qr_code(device),
                'secret_key': device.secret_key,
                'backup_codes': device.backup_codes,
                'message': 'TOTP device created. Please scan QR code and verify.'
            })
            
        elif device_type == 'sms' and phone_number:
            device = mfa_service.setup_sms(request.user, device_name, phone_number)
            
            # Send verification SMS
            verification_code = mfa_service.send_sms_code(device)
            
            return Response({
                'device_id': device.id,
                'message': 'SMS device created. Verification code sent.'
            })
        
        return Response({
            'error': 'Invalid device type or missing required fields'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"MFA enrollment error: {str(e)}")
        return Response({
            'error': 'Failed to enroll MFA device'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_mfa(request):
    """Verify MFA device during enrollment"""
    try:
        device_id = request.data.get('device_id')
        verification_code = request.data.get('code')
        
        device = get_object_or_404(MFADevice, id=device_id, user=request.user)
        mfa_service = MFAService()
        
        if mfa_service.verify_device(device, verification_code):
            device.is_confirmed = True
            
            # Set as primary if it's the first confirmed device
            if not request.user.mfa_devices.filter(is_confirmed=True).exists():
                device.is_primary = True
            
            device.save()
            
            # Log successful MFA setup
            AuthenticationLog.objects.create(
                user=request.user,
                event_type='mfa_success',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                mfa_device=device,
                success=True,
                metadata={'action': 'enrollment_verification'}
            )
            
            return Response({
                'message': 'MFA device verified successfully'
            })
        
        # Log failed MFA verification
        AuthenticationLog.objects.create(
            user=request.user,
            event_type='mfa_failed',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            mfa_device=device,
            success=False,
            failure_reason='Invalid verification code'
        )
        
        return Response({
            'error': 'Invalid verification code'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"MFA verification error: {str(e)}")
        return Response({
            'error': 'Failed to verify MFA device'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mfa_devices(request):
    """Get user's MFA devices"""
    try:
        devices = request.user.mfa_devices.filter(is_confirmed=True)
        serializer = MFADeviceSerializer(devices, many=True)
        
        return Response({
            'devices': serializer.data
        })
        
    except Exception as e:
        logger.error(f"MFA devices error: {str(e)}")
        return Response({
            'error': 'Failed to retrieve MFA devices'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def mfa_challenge(request):
    """Challenge user for MFA during login"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        # Authenticate user credentials first
        from django.contrib.auth import authenticate
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user requires MFA
        mfa_devices = user.mfa_devices.filter(is_confirmed=True)
        
        if not mfa_devices.exists():
            # No MFA required, proceed with normal login
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'access_token': str(access_token),
                'refresh_token': str(refresh),
                'requires_mfa': False,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                }
            })
        
        # User requires MFA
        # Generate temporary token for MFA verification
        temp_token = RefreshToken.for_user(user)
        temp_token.set_exp(lifetime=timedelta(minutes=5))  # 5-minute expiry
        
        return Response({
            'requires_mfa': True,
            'temp_token': str(temp_token),
            'available_methods': [
                {
                    'device_id': device.id,
                    'device_type': device.device_type,
                    'device_name': device.name,
                    'is_primary': device.is_primary
                }
                for device in mfa_devices
            ]
        })
        
    except Exception as e:
        logger.error(f"MFA challenge error: {str(e)}")
        return Response({
            'error': 'Authentication failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def mfa_verify(request):
    """Verify MFA code during login"""
    try:
        temp_token = request.data.get('temp_token')
        device_id = request.data.get('device_id')
        verification_code = request.data.get('code')
        
        # Validate temporary token
        try:
            token = RefreshToken(temp_token)
            user_id = token.payload.get('user_id')
            user = User.objects.get(id=user_id)
        except:
            return Response({
                'error': 'Invalid or expired temporary token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get MFA device
        device = get_object_or_404(MFADevice, id=device_id, user=user)
        
        # Verify MFA code
        mfa_service = MFAService()
        if mfa_service.verify_device(device, verification_code):
            # Generate final JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Update device usage
            device.last_used = timezone.now()
            device.use_count += 1
            device.save()
            
            # Log successful MFA
            AuthenticationLog.objects.create(
                user=user,
                event_type='mfa_success',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                mfa_device=device,
                success=True,
                metadata={'action': 'login_verification'}
            )
            
            return Response({
                'access_token': str(access_token),
                'refresh_token': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                }
            })
        
        # Log failed MFA
        AuthenticationLog.objects.create(
            user=user,
            event_type='mfa_failed',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            mfa_device=device,
            success=False,
            failure_reason='Invalid verification code'
        )
        
        return Response({
            'error': 'Invalid verification code'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"MFA verify error: {str(e)}")
        return Response({
            'error': 'MFA verification failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
# from allauth.socialaccount.providers.microsoft.views import MicrosoftOAuth2Adapter  # Temporarily disabled
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
# from dj_rest_auth.registration.views import SocialLoginView  # Temporarily disabled
import logging
import json
from datetime import timedelta
from django.utils import timezone

from .models import SSOProvider, UserSSOAccount, AuthenticationLog, MFADevice
from .serializers import SSOProviderSerializer, MFADeviceSerializer
from .services import MFAService, SSOService
from shared.rate_limiting import AuthenticationRateThrottle, SensitiveDataRateThrottle

User = get_user_model()
logger = logging.getLogger(__name__)


class GoogleLogin(APIView):
    """Google OAuth2 login endpoint for API clients"""
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationRateThrottle]
    
    def post(self, request, *args, **kwargs):
        """Handle Google OAuth2 login with JWT response"""
        try:
            access_token = request.data.get('access_token')
            id_token = request.data.get('id_token')
            
            if not access_token and not id_token:
                return Response({
                    'error': 'Access token or ID token required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Import here to handle potential missing dependency gracefully
            try:
                from google.oauth2 import id_token as google_id_token
                from google.auth.transport import requests as google_requests
            except ImportError:
                logger.error("Google auth libraries not installed")
                return Response({
                    'error': 'Google authentication not configured'
                }, status=status.HTTP_501_NOT_IMPLEMENTED)
            
            # Verify the token with Google
            try:
                if id_token:
                    # Verify ID token
                    client_id = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
                    if not client_id:
                        raise ValueError("Google client ID not configured")
                    
                    idinfo = google_id_token.verify_oauth2_token(
                        id_token, google_requests.Request(), client_id
                    )
                else:
                    # For access token, we'd need to make an API call to Google
                    # This is a simplified implementation
                    return Response({
                        'error': 'ID token preferred for verification'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Extract user information
                email = idinfo.get('email')
                given_name = idinfo.get('given_name', '')
                family_name = idinfo.get('family_name', '')
                google_id = idinfo.get('sub')
                
                if not email:
                    return Response({
                        'error': 'Email not provided by Google'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Get or create user
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': email,
                        'first_name': given_name,
                        'last_name': family_name,
                        'is_active': True
                    }
                )
                
                # Create or update social account
                try:
                    social_account, _ = SocialAccount.objects.get_or_create(
                        user=user,
                        provider='google',
                        defaults={
                            'uid': google_id,
                            'extra_data': {
                                'given_name': given_name,
                                'family_name': family_name,
                                'email': email
                            }
                        }
                    )
                except Exception as e:
                    logger.warning(f"Social account creation/update failed: {e}")
                
                # Create authentication log
                AuthenticationLog.objects.create(
                    user=user,
                    method='GOOGLE_SSO',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True
                )
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_new_user': created
                    }
                })
                
            except ValueError as e:
                logger.error(f"Google token verification failed: {e}")
                return Response({
                    'error': 'Invalid token'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Google SSO login error: {str(e)}")
            return Response({
                'error': 'SSO authentication failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MicrosoftLogin(APIView):
    """Microsoft OAuth2 login endpoint for API clients"""
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationRateThrottle]
    
    def post(self, request, *args, **kwargs):
        """Handle Microsoft OAuth2 login with JWT response"""
        try:
            access_token = request.data.get('access_token')
            
            if not access_token:
                return Response({
                    'error': 'Access token required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify token with Microsoft Graph API
            try:
                import requests
                
                # Call Microsoft Graph API to get user info
                graph_response = requests.get(
                    'https://graph.microsoft.com/v1.0/me',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                
                if graph_response.status_code != 200:
                    return Response({
                        'error': 'Invalid Microsoft access token'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                user_info = graph_response.json()
                
                # Extract user information
                email = user_info.get('mail') or user_info.get('userPrincipalName')
                given_name = user_info.get('givenName', '')
                family_name = user_info.get('surname', '')
                microsoft_id = user_info.get('id')
                
                if not email:
                    return Response({
                        'error': 'Email not provided by Microsoft'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Get or create user
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': email,
                        'first_name': given_name,
                        'last_name': family_name,
                        'is_active': True
                    }
                )
                
                # Create or update social account
                try:
                    social_account, _ = SocialAccount.objects.get_or_create(
                        user=user,
                        provider='microsoft',
                        defaults={
                            'uid': microsoft_id,
                            'extra_data': {
                                'givenName': given_name,
                                'surname': family_name,
                                'mail': email,
                                'userPrincipalName': user_info.get('userPrincipalName')
                            }
                        }
                    )
                except Exception as e:
                    logger.warning(f"Microsoft social account creation/update failed: {e}")
                
                # Create authentication log
                AuthenticationLog.objects.create(
                    user=user,
                    method='MICROSOFT_SSO',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True
                )
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_new_user': created
                    }
                })
                
            except requests.RequestException as e:
                logger.error(f"Microsoft Graph API error: {e}")
                return Response({
                    'error': 'Failed to verify Microsoft token'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Microsoft SSO login error: {str(e)}")
            return Response({
                'error': 'SSO authentication failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
    # Apply rate limiting for sensitive operations
    throttle = SensitiveDataRateThrottle()
    if not throttle.throttle_success(request, type('MockView', (), {'__class__': type('enroll_mfa', (), {})})):
        throttle.throttle_failure(request, None)
        return Response({
            'error': 'Rate limit exceeded',
            'message': 'Too many MFA enrollment attempts. Please try again later.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
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
    # Apply rate limiting for sensitive operations
    throttle = SensitiveDataRateThrottle()
    if not throttle.throttle_success(request, type('MockView', (), {'__class__': type('verify_mfa', (), {})})):
        throttle.throttle_failure(request, None)
        return Response({
            'error': 'Rate limit exceeded',
            'message': 'Too many MFA verification attempts. Please try again later.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
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
    # Apply rate limiting manually for function-based views
    throttle = AuthenticationRateThrottle()
    if not throttle.throttle_success(request, type('MockView', (), {'__class__': type('mfa_challenge', (), {})})):
        throttle.throttle_failure(request, None)
        return Response({
            'error': 'Rate limit exceeded',
            'message': 'Too many authentication attempts. Please try again later.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
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
    # Apply rate limiting manually for function-based views
    throttle = AuthenticationRateThrottle()
    if not throttle.throttle_success(request, type('MockView', (), {'__class__': type('mfa_verify', (), {})})):
        throttle.throttle_failure(request, None)
        return Response({
            'error': 'Rate limit exceeded',
            'message': 'Too many MFA verification attempts. Please try again later.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
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
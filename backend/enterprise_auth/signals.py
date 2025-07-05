# enterprise_auth/signals.py
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.contrib.auth import get_user_model
from allauth.socialaccount.signals import pre_social_login, social_account_added
from allauth.socialaccount.models import SocialAccount
import logging

from .models import AuthenticationLog, UserSSOAccount, SSOProvider
from .services import SSOService

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log successful user login"""
    try:
        AuthenticationLog.objects.create(
            user=user,
            event_type='login_success',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            session_key=request.session.session_key,
            username_attempted=user.username,
            success=True
        )
        logger.info(f"User login logged: {user.email}")
        
    except Exception as e:
        logger.error(f"Login logging error: {str(e)}")


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout"""
    try:
        if user:
            AuthenticationLog.objects.create(
                user=user,
                event_type='logout',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                session_key=request.session.session_key,
                username_attempted=user.username,
                success=True
            )
            logger.info(f"User logout logged: {user.email}")
            
    except Exception as e:
        logger.error(f"Logout logging error: {str(e)}")


@receiver(user_login_failed)
def log_failed_login(sender, credentials, request, **kwargs):
    """Log failed login attempts"""
    try:
        username = credentials.get('username', '')
        
        AuthenticationLog.objects.create(
            event_type='login_failed',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            username_attempted=username,
            success=False,
            failure_reason='Invalid credentials'
        )
        logger.warning(f"Failed login attempt: {username}")
        
    except Exception as e:
        logger.error(f"Failed login logging error: {str(e)}")


@receiver(pre_social_login)
def handle_pre_social_login(sender, request, sociallogin, **kwargs):
    """Handle pre-social login to check domain restrictions"""
    try:
        # Get provider info
        provider_id = sociallogin.account.provider
        email = sociallogin.account.extra_data.get('email', '')
        
        if email:
            # Check if there's a domain-specific SSO provider configured
            email_domain = email.split('@')[1].lower()
            sso_provider = SSOProvider.objects.filter(
                provider_type=provider_id,
                domain__icontains=email_domain,
                is_active=True
            ).first()
            
            if sso_provider and sso_provider.require_company_email:
                sso_service = SSOService()
                if not sso_service.validate_domain_restriction(sso_provider, email):
                    logger.warning(f"Domain restriction failed for {email} with provider {provider_id}")
                    # You could raise an exception here to block the login
                    # raise ImmediateHttpResponse(redirect('login_error'))
        
    except Exception as e:
        logger.error(f"Pre-social login error: {str(e)}")


@receiver(social_account_added)
def handle_social_account_added(sender, request, sociallogin, **kwargs):
    """Handle new social account connection"""
    try:
        social_account = sociallogin.account
        user = sociallogin.user
        
        # Find matching SSO provider
        provider_id = social_account.provider
        email = social_account.extra_data.get('email', user.email)
        
        if email:
            email_domain = email.split('@')[1].lower()
            sso_provider = SSOProvider.objects.filter(
                provider_type=provider_id,
                domain__icontains=email_domain,
                is_active=True
            ).first()
            
            if sso_provider:
                # Create or update SSO account record
                sso_service = SSOService()
                sso_service.create_or_update_sso_account(
                    user=user,
                    provider=sso_provider,
                    sso_data={
                        'id': social_account.uid,
                        'email': email,
                        'name': social_account.extra_data.get('name', '')
                    }
                )
                
                # Log SSO account creation
                AuthenticationLog.objects.create(
                    user=user,
                    event_type='sso_login',
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    sso_provider=sso_provider,
                    username_attempted=email,
                    success=True,
                    metadata={
                        'provider': provider_id,
                        'first_sso_login': True
                    }
                )
                
                logger.info(f"Social account added for {user.email} via {provider_id}")
        
    except Exception as e:
        logger.error(f"Social account addition error: {str(e)}")


@receiver(post_save, sender=User)
def check_mfa_requirements(sender, instance, created, **kwargs):
    """Check MFA requirements for new or updated users"""
    try:
        if created or 'role' in getattr(instance, '_state', {}).get('fields_cache', {}):
            from .services import MFAService
            
            mfa_service = MFAService()
            if mfa_service.is_mfa_required(instance):
                # Log MFA requirement
                logger.info(f"MFA required for user {instance.email} with role {instance.role}")
                
                # You could send notification here about MFA requirement
                
    except Exception as e:
        logger.error(f"MFA requirement check error: {str(e)}")


@receiver(pre_delete, sender=User)
def cleanup_auth_data(sender, instance, **kwargs):
    """Clean up authentication data when user is deleted"""
    try:
        # Note: Related objects will be cleaned up by CASCADE, but we can log this
        logger.info(f"Cleaning up auth data for deleted user: {instance.email}")
        
        # Log user deletion
        AuthenticationLog.objects.create(
            event_type='account_locked',  # Using closest available event type
            username_attempted=instance.email,
            success=True,
            metadata={'action': 'user_deletion'},
            ip_address='system',
            user_agent='system'
        )
        
    except Exception as e:
        logger.error(f"Auth data cleanup error: {str(e)}")
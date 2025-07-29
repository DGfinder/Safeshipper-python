# notifications/views.py
"""
API views for managing mobile push notifications.
Handles device registration, notification preferences, and push token management.
"""

import logging
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from .models import PushNotificationDevice
from .notification_preferences import FeedbackNotificationPreference, NotificationDigest
from .serializers import (
    PushNotificationDeviceSerializer, FeedbackNotificationPreferenceSerializer,
    NotificationDigestSerializer, NotificationPreferencesUpdateSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_push_token(request):
    """
    Register or update a mobile device's push notification token.
    
    Expected payload:
    {
        "expo_push_token": "ExponentPushToken[xxx]",
        "device_platform": "ios|android",
        "app_version": "1.0.0",
        "device_identifier": "unique_device_id"
    }
    """
    try:
        expo_push_token = request.data.get('expo_push_token')
        device_platform = request.data.get('device_platform')
        app_version = request.data.get('app_version')
        device_identifier = request.data.get('device_identifier')
        
        # Validate required fields
        if not expo_push_token:
            return Response({
                'success': False,
                'error': 'expo_push_token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if device_platform not in ['ios', 'android']:
            return Response({
                'success': False,
                'error': 'device_platform must be ios or android'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update device registration
        device, created = PushNotificationDevice.objects.update_or_create(
            user=request.user,
            device_identifier=device_identifier or 'unknown',
            defaults={
                'expo_push_token': expo_push_token,
                'device_platform': device_platform,
                'app_version': app_version or '1.0.0',
                'is_active': True,
                'last_updated': timezone.now()
            }
        )
        
        # Log registration
        action = "registered" if created else "updated"
        logger.info(f"Push token {action} for user {request.user.id} on {device_platform}")
        
        return Response({
            'success': True,
            'message': f'Push token {action} successfully',
            'device_id': str(device.id),
            'created': created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error registering push token for user {request.user.id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to register push token'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unregister_push_token(request):
    """
    Unregister a mobile device's push notification token.
    
    Expected payload:
    {
        "expo_push_token": "ExponentPushToken[xxx]"
    }
    """
    try:
        expo_push_token = request.data.get('expo_push_token')
        
        if not expo_push_token:
            return Response({
                'success': False,
                'error': 'expo_push_token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find and deactivate the device
        try:
            device = PushNotificationDevice.objects.get(
                user=request.user,
                expo_push_token=expo_push_token,
                is_active=True
            )
            device.is_active = False
            device.unregistered_at = timezone.now()
            device.save(update_fields=['is_active', 'unregistered_at'])
            
            logger.info(f"Push token unregistered for user {request.user.id}")
            
            return Response({
                'success': True,
                'message': 'Push token unregistered successfully'
            }, status=status.HTTP_200_OK)
            
        except PushNotificationDevice.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Push token not found or already unregistered'
            }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"Error unregistering push token for user {request.user.id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to unregister push token'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def push_preferences(request):
    """
    Get or update push notification preferences for the user.
    
    GET: Returns current preferences
    PATCH: Updates preferences
    
    Expected PATCH payload:
    {
        "feedback_notifications": true,
        "shipment_updates": true,
        "emergency_alerts": true
    }
    """
    try:
        if request.method == 'GET':
            # Get user's active devices
            devices = PushNotificationDevice.objects.filter(
                user=request.user,
                is_active=True
            ).order_by('-last_updated')
            
            if not devices.exists():
                return Response({
                    'success': False,
                    'message': 'No registered devices found',
                    'devices': [],
                    'preferences': {}
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get preferences from the most recent device
            latest_device = devices.first()
            preferences = latest_device.notification_preferences
            
            return Response({
                'success': True,
                'devices': PushNotificationDeviceSerializer(devices, many=True).data,
                'preferences': preferences,
                'active_device_count': devices.count()
            }, status=status.HTTP_200_OK)
        
        elif request.method == 'PATCH':
            # Update preferences for all user's active devices
            devices = PushNotificationDevice.objects.filter(
                user=request.user,
                is_active=True
            )
            
            if not devices.exists():
                return Response({
                    'success': False,
                    'error': 'No active devices found to update preferences'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Validate preferences
            valid_preferences = {
                'feedback_notifications',
                'shipment_updates', 
                'emergency_alerts'
            }
            
            new_preferences = {}
            for key, value in request.data.items():
                if key in valid_preferences and isinstance(value, bool):
                    new_preferences[key] = value
            
            if not new_preferences:
                return Response({
                    'success': False,
                    'error': 'No valid preferences provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update all active devices
            updated_count = 0
            for device in devices:
                # Merge with existing preferences
                current_prefs = device.notification_preferences or {}
                current_prefs.update(new_preferences)
                device.notification_preferences = current_prefs
                device.save(update_fields=['notification_preferences'])
                updated_count += 1
            
            logger.info(f"Updated push preferences for {updated_count} devices for user {request.user.id}")
            
            return Response({
                'success': True,
                'message': f'Preferences updated for {updated_count} devices',
                'preferences': new_preferences,
                'devices_updated': updated_count
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error handling push preferences for user {request.user.id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to handle push preferences'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def device_status(request):
    """
    Get status of all registered devices for the user.
    """
    try:
        devices = PushNotificationDevice.objects.filter(
            user=request.user
        ).order_by('-last_updated')
        
        device_data = []
        for device in devices:
            device_data.append({
                'id': str(device.id),
                'device_platform': device.device_platform,
                'app_version': device.app_version,
                'device_identifier': device.device_identifier,
                'is_active': device.is_active,
                'registered_at': device.registered_at.isoformat(),
                'last_updated': device.last_updated.isoformat(),
                'unregistered_at': device.unregistered_at.isoformat() if device.unregistered_at else None,
                'notification_preferences': device.notification_preferences
            })
        
        return Response({
            'success': True,
            'devices': device_data,
            'total_devices': len(device_data),
            'active_devices': sum(1 for d in device_data if d['is_active'])
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting device status for user {request.user.id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to get device status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_notification(request):
    """
    Send a test push notification to user's devices (development only).
    
    Expected payload:
    {
        "title": "Test Notification",
        "body": "This is a test message",
        "data": {"test": true}
    }
    """
    try:
        # Only allow in development/staging
        from django.conf import settings
        if not settings.DEBUG and not getattr(settings, 'ALLOW_TEST_NOTIFICATIONS', False):
            return Response({
                'success': False,
                'error': 'Test notifications not allowed in production'
            }, status=status.HTTP_403_FORBIDDEN)
        
        title = request.data.get('title', 'SafeShipper Test')
        body = request.data.get('body', 'This is a test notification')
        data = request.data.get('data', {'type': 'test'})
        
        # Get user's active devices
        devices = PushNotificationDevice.objects.filter(
            user=request.user,
            is_active=True
        )
        
        if not devices.exists():
            return Response({
                'success': False,
                'error': 'No active devices found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Send test notification to all devices
        from .services import PushNotificationService
        notification_service = PushNotificationService()
        
        sent_count = 0
        failed_count = 0
        errors = []
        
        for device in devices:
            try:
                result = notification_service.send_notification(
                    device.expo_push_token,
                    title,
                    body,
                    data
                )
                if result.get('success'):
                    sent_count += 1
                else:
                    failed_count += 1
                    errors.append(f"Device {device.device_identifier}: {result.get('error', 'Unknown error')}")
            except Exception as e:
                failed_count += 1
                errors.append(f"Device {device.device_identifier}: {str(e)}")
        
        logger.info(f"Test notification sent to {sent_count} devices for user {request.user.id}")
        
        return Response({
            'success': True,
            'message': f'Test notification sent to {sent_count} devices',
            'sent_count': sent_count,
            'failed_count': failed_count,
            'errors': errors if errors else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error sending test notification for user {request.user.id}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to send test notification'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== FEEDBACK NOTIFICATION PREFERENCE VIEWSETS =====

class FeedbackNotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing feedback notification preferences.
    Provides comprehensive preference management for different notification types.
    """
    serializer_class = FeedbackNotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return preferences for the authenticated user only."""
        return FeedbackNotificationPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create preference object for the current user."""
        preferences, created = FeedbackNotificationPreference.objects.get_or_create(
            user=self.request.user,
            defaults={}
        )
        return preferences
    
    def list(self, request):
        """Get user's feedback notification preferences."""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get specific preference (same as list for single user)."""
        return self.list(request)
    
    @transaction.atomic
    def update(self, request, pk=None):
        """Update user's notification preferences."""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            
            logger.info(f"Updated feedback notification preferences for user {request.user.get_full_name()}")
            
            return Response({
                "message": "Notification preferences updated successfully",
                "preferences": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['patch'])
    def bulk_update(self, request):
        """
        Bulk update specific notification preferences.
        Useful for quick toggles without sending all preferences.
        
        Expected payload:
        {
            "feedback_received_enabled": true,
            "feedback_received_methods": ["push", "email"],
            "quiet_hours_enabled": true,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00"
        }
        """
        preferences = self.get_object()
        serializer = NotificationPreferencesUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            validated_data = serializer.validated_data
            
            # Update preferences with validated data
            for field, value in validated_data.items():
                setattr(preferences, field, value)
            
            preferences.save()
            
            # Return updated preferences
            response_serializer = FeedbackNotificationPreferenceSerializer(preferences)
            
            return Response({
                "message": "Preferences updated successfully",
                "updated_fields": list(validated_data.keys()),
                "preferences": response_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def reset_to_defaults(self, request):
        """Reset user's preferences to role-based defaults."""
        preferences = self.get_object()
        
        # Reset to defaults based on user role
        default_methods = preferences.default_methods_for_role
        
        preferences.feedback_received_enabled = True
        preferences.feedback_received_methods = default_methods
        preferences.feedback_received_frequency = 'immediate'
        preferences.feedback_severity_filter = 'all'
        preferences.manager_response_enabled = True
        preferences.manager_response_methods = default_methods
        preferences.incident_created_enabled = True
        preferences.incident_created_methods = default_methods
        preferences.weekly_report_enabled = True
        preferences.weekly_report_methods = ['email']
        preferences.driver_feedback_enabled = request.user.role == 'DRIVER'
        preferences.driver_feedback_methods = ['push'] if request.user.role == 'DRIVER' else []
        preferences.driver_feedback_positive_only = False
        preferences.quiet_hours_enabled = False
        preferences.emergency_override_enabled = True
        
        preferences.save()
        
        serializer = FeedbackNotificationPreferenceSerializer(preferences)
        
        logger.info(f"Reset notification preferences to defaults for user {request.user.get_full_name()}")
        
        return Response({
            "message": "Preferences reset to defaults successfully",
            "preferences": serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def test_settings(self, request):
        """
        Test current notification settings by showing what notifications
        the user would receive for different scenarios.
        """
        preferences = self.get_object()
        
        test_scenarios = [
            {
                'scenario': 'Excellent feedback received (95%)',
                'would_notify': preferences.should_notify('feedback_received', feedback_score=95),
                'methods': preferences.get_notification_methods('feedback_received') if preferences.should_notify('feedback_received', feedback_score=95) else []
            },
            {
                'scenario': 'Poor feedback received (50%)',
                'would_notify': preferences.should_notify('feedback_received', feedback_score=50),
                'methods': preferences.get_notification_methods('feedback_received') if preferences.should_notify('feedback_received', feedback_score=50) else []
            },
            {
                'scenario': 'Critical feedback received (20%)',
                'would_notify': preferences.should_notify('feedback_received', feedback_score=20),
                'methods': preferences.get_notification_methods('feedback_received') if preferences.should_notify('feedback_received', feedback_score=20) else []
            },
            {
                'scenario': 'Manager responds to feedback',
                'would_notify': preferences.should_notify('manager_response'),
                'methods': preferences.get_notification_methods('manager_response') if preferences.should_notify('manager_response') else []
            },
            {
                'scenario': 'Emergency incident created',
                'would_notify': preferences.should_notify('incident_created', is_emergency=True),
                'methods': preferences.get_notification_methods('incident_created') if preferences.should_notify('incident_created', is_emergency=True) else []
            }
        ]
        
        return Response({
            'current_preferences': FeedbackNotificationPreferenceSerializer(preferences).data,
            'test_scenarios': test_scenarios
        }, status=status.HTTP_200_OK)


class NotificationDigestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing notification digests.
    Users can view their digest history and statistics.
    """
    serializer_class = NotificationDigestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return digests for the authenticated user only."""
        return NotificationDigest.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent digest history with summary statistics."""
        queryset = self.get_queryset()[:10]  # Last 10 digests
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate summary stats
        total_digests = queryset.count()
        total_notifications = sum(digest.notification_count for digest in queryset)
        avg_notifications_per_digest = total_notifications / total_digests if total_digests > 0 else 0
        
        return Response({
            'recent_digests': serializer.data,
            'summary': {
                'total_digests': total_digests,
                'total_notifications': total_notifications,
                'average_per_digest': round(avg_notifications_per_digest, 1)
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending (unsent) digests for the user."""
        pending_digests = self.get_queryset().filter(sent_at__isnull=True)
        serializer = self.get_serializer(pending_digests, many=True)
        
        return Response({
            'pending_digests': serializer.data,
            'count': pending_digests.count()
        }, status=status.HTTP_200_OK)
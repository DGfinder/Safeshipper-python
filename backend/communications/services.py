# communications/services.py
import logging
from typing import Dict, List, Optional, Any
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import (
    Channel, ChannelMembership, Message, MessageRead, DirectMessage,
    NotificationPreference, NotificationQueue
)
from .tasks import send_email, send_sms, send_push_notification, send_bulk_notifications

logger = logging.getLogger(__name__)
User = get_user_model()


class CommunicationService:
    """
    High-level service for managing communication operations.
    Provides business logic layer above models and API views.
    """

    @staticmethod
    def create_channel_for_shipment(shipment, creator, channel_type='SHIPMENT', **kwargs):
        """
        Create a communication channel for a specific shipment.
        Automatically adds relevant stakeholders.
        """
        try:
            channel_name = kwargs.get('name', f'{channel_type}: {shipment.tracking_number}')
            
            channel = Channel.objects.create(
                name=channel_name,
                description=kwargs.get('description', f'Communication for shipment {shipment.tracking_number}'),
                channel_type=channel_type,
                created_by=creator,
                is_private=kwargs.get('is_private', False),
                related_shipment=shipment,
                **{k: v for k, v in kwargs.items() if k not in ['name', 'description', 'is_private']}
            )
            
            # Add creator as owner
            ChannelMembership.objects.create(
                user=creator,
                channel=channel,
                role='OWNER'
            )
            
            # Add shipment stakeholders
            stakeholders = CommunicationService._get_shipment_stakeholders(shipment)
            for stakeholder in stakeholders:
                if stakeholder != creator:
                    ChannelMembership.objects.create(
                        user=stakeholder,
                        channel=channel,
                        role='MEMBER'
                    )
            
            logger.info(f"Created {channel_type} channel {channel.id} for shipment {shipment.tracking_number}")
            return channel
            
        except Exception as e:
            logger.error(f"Error creating shipment channel: {str(e)}")
            raise

    @staticmethod
    def send_message_to_channel(channel_id, sender, content, message_type='TEXT', **kwargs):
        """
        Send a message to a channel and handle real-time broadcasting.
        """
        try:
            channel = Channel.objects.get(id=channel_id)
            
            # Check if sender has permission to send to this channel
            if not CommunicationService._can_user_send_to_channel(sender, channel):
                raise PermissionError("User cannot send messages to this channel")
            
            # Create message
            message_data = {
                'channel': channel,
                'sender': sender,
                'content': content,
                'message_type': message_type,
                'metadata': kwargs.get('metadata', {}),
                'priority': kwargs.get('priority', 'NORMAL'),
                'is_emergency': kwargs.get('is_emergency', False)
            }
            
            # Handle reply threading
            if 'reply_to_id' in kwargs:
                try:
                    reply_to = Message.objects.get(id=kwargs['reply_to_id'])
                    message_data['reply_to'] = reply_to
                    message_data['thread_id'] = reply_to.thread_id or reply_to.id
                except Message.DoesNotExist:
                    pass
            
            message = Message.objects.create(**message_data)
            
            # Update channel timestamp
            channel.updated_at = timezone.now()
            channel.save(update_fields=['updated_at'])
            
            # Broadcast via WebSocket
            RealTimeCommunicationService.broadcast_message(message)
            
            # Send notifications to channel members
            NotificationService.notify_channel_message(message)
            
            logger.info(f"Message {message.id} sent to channel {channel_id} by user {sender.id}")
            return message
            
        except Exception as e:
            logger.error(f"Error sending message to channel {channel_id}: {str(e)}")
            raise

    @staticmethod
    def create_direct_message_conversation(user1, user2, initial_message=None):
        """
        Create or get a direct message conversation between two users.
        """
        try:
            # Get or create DM
            dm = DirectMessage.get_or_create_dm(user1, user2)
            
            # Send initial message if provided
            if initial_message:
                message = CommunicationService.send_message_to_channel(
                    channel_id=dm.channel.id,
                    sender=user1,
                    content=initial_message,
                    message_type='TEXT'
                )
                
                # Update DM last message timestamp
                dm.last_message_at = timezone.now()
                dm.save(update_fields=['last_message_at'])
                
                return dm, message
            
            return dm, None
            
        except Exception as e:
            logger.error(f"Error creating DM conversation: {str(e)}")
            raise

    @staticmethod
    def mark_channel_as_read(user, channel_id, up_to_message_id=None):
        """
        Mark all messages in a channel as read for a user.
        """
        try:
            channel = Channel.objects.get(id=channel_id)
            membership = ChannelMembership.objects.get(
                user=user,
                channel=channel,
                is_active=True
            )
            
            # Get messages to mark as read
            messages_query = Message.objects.filter(
                channel=channel,
                is_deleted=False
            )
            
            if up_to_message_id:
                # Mark read up to specific message
                up_to_message = Message.objects.get(id=up_to_message_id)
                messages_query = messages_query.filter(
                    created_at__lte=up_to_message.created_at
                )
            elif membership.last_read_at:
                # Mark unread messages
                messages_query = messages_query.filter(
                    created_at__gt=membership.last_read_at
                )
            
            # Create read receipts
            messages_to_mark = messages_query.exclude(
                read_receipts__user=user
            )
            
            read_receipts = []
            for message in messages_to_mark:
                read_receipt, created = MessageRead.objects.get_or_create(
                    message=message,
                    user=user
                )
                if created:
                    read_receipts.append(read_receipt)
            
            # Update membership last_read_at
            membership.last_read_at = timezone.now()
            membership.save(update_fields=['last_read_at'])
            
            logger.info(f"Marked {len(read_receipts)} messages as read for user {user.id} in channel {channel_id}")
            return len(read_receipts)
            
        except Exception as e:
            logger.error(f"Error marking channel as read: {str(e)}")
            raise

    @staticmethod
    def get_user_unread_counts(user):
        """
        Get unread message counts for all channels the user is a member of.
        """
        try:
            memberships = ChannelMembership.objects.filter(
                user=user,
                is_active=True
            ).select_related('channel')
            
            unread_counts = {}
            total_unread = 0
            
            for membership in memberships:
                channel = membership.channel
                
                if membership.last_read_at:
                    unread_count = Message.objects.filter(
                        channel=channel,
                        created_at__gt=membership.last_read_at,
                        is_deleted=False
                    ).count()
                else:
                    unread_count = Message.objects.filter(
                        channel=channel,
                        is_deleted=False
                    ).count()
                
                if unread_count > 0:
                    unread_counts[str(channel.id)] = {
                        'channel_name': channel.name,
                        'unread_count': unread_count,
                        'channel_type': channel.channel_type,
                        'is_emergency': channel.is_emergency_channel
                    }
                    total_unread += unread_count
            
            return {
                'total_unread': total_unread,
                'channels': unread_counts
            }
            
        except Exception as e:
            logger.error(f"Error getting unread counts for user {user.id}: {str(e)}")
            return {'total_unread': 0, 'channels': {}}

    @staticmethod
    def _get_shipment_stakeholders(shipment):
        """Get all stakeholders for a shipment."""
        stakeholders = set()
        
        # Add assigned driver
        if shipment.assigned_driver:
            stakeholders.add(shipment.assigned_driver)
        
        # Add company contacts
        if hasattr(shipment, 'company') and shipment.company:
            if shipment.company.primary_contact:
                stakeholders.add(shipment.company.primary_contact)
        
        # Add customer contacts (if available)
        if hasattr(shipment, 'customer_contact'):
            stakeholders.add(shipment.customer_contact)
        
        return list(stakeholders)

    @staticmethod
    def _can_user_send_to_channel(user, channel):
        """Check if user can send messages to a channel."""
        try:
            membership = ChannelMembership.objects.get(
                user=user,
                channel=channel,
                is_active=True
            )
            return not membership.is_muted
        except ChannelMembership.DoesNotExist:
            # Check if it's a public channel
            return not channel.is_private
        except Exception:
            return False


class RealTimeCommunicationService:
    """
    Service for handling real-time communication via WebSockets.
    """

    @staticmethod
    def broadcast_message(message):
        """Broadcast a message to all channel subscribers."""
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                logger.warning("No channel layer configured for WebSocket broadcasting")
                return
            
            message_data = {
                'id': str(message.id),
                'channel_id': str(message.channel.id),
                'sender': {
                    'id': str(message.sender.id),
                    'name': message.sender.get_full_name(),
                    'email': message.sender.email
                },
                'content': message.content,
                'message_type': message.message_type,
                'created_at': message.created_at.isoformat(),
                'reply_to': str(message.reply_to.id) if message.reply_to else None,
                'thread_id': str(message.thread_id) if message.thread_id else None,
                'is_emergency': message.is_emergency,
                'priority': message.priority,
                'metadata': message.metadata
            }
            
            async_to_sync(channel_layer.group_send)(
                f"channel_{message.channel.id}",
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )
            
            logger.debug(f"Broadcasted message {message.id} to channel {message.channel.id}")
            
        except Exception as e:
            logger.error(f"Error broadcasting message: {str(e)}")

    @staticmethod
    def broadcast_user_status(user_id, status, channels=None):
        """Broadcast user status change to specified channels or all user's channels."""
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            if channels is None:
                # Get all channels the user is a member of
                user = User.objects.get(id=user_id)
                memberships = ChannelMembership.objects.filter(
                    user=user,
                    is_active=True
                ).select_related('channel')
                channels = [membership.channel.id for membership in memberships]
            
            # Broadcast to each channel
            for channel_id in channels:
                async_to_sync(channel_layer.group_send)(
                    f"channel_{channel_id}",
                    {
                        'type': 'user_status_update',
                        'user_id': str(user_id),
                        'status': status
                    }
                )
            
            logger.debug(f"Broadcasted status '{status}' for user {user_id} to {len(channels)} channels")
            
        except Exception as e:
            logger.error(f"Error broadcasting user status: {str(e)}")

    @staticmethod
    def send_typing_indicator(channel_id, user_id, is_typing=True):
        """Send typing indicator to a channel."""
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            async_to_sync(channel_layer.group_send)(
                f"channel_{channel_id}",
                {
                    'type': 'typing_indicator',
                    'user_id': str(user_id),
                    'channel_id': str(channel_id),
                    'is_typing': is_typing
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending typing indicator: {str(e)}")

    @staticmethod
    def broadcast_emergency_alert(alert_data):
        """Broadcast emergency alert to all relevant users."""
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            # Broadcast to all emergency responders
            async_to_sync(channel_layer.group_send)(
                "emergency_alerts",
                {
                    'type': 'emergency_alert',
                    'alert': alert_data
                }
            )
            
            logger.info("Broadcasted emergency alert to all responders")
            
        except Exception as e:
            logger.error(f"Error broadcasting emergency alert: {str(e)}")


class NotificationService:
    """
    Service for managing notifications across multiple channels.
    """

    @staticmethod
    def notify_channel_message(message):
        """Send notifications for a new channel message."""
        try:
            channel = message.channel
            sender = message.sender
            
            # Get channel members (excluding sender)
            memberships = ChannelMembership.objects.filter(
                channel=channel,
                is_active=True
            ).exclude(user=sender).select_related('user')
            
            # Get notification preferences for each member
            notifications_to_send = []
            
            for membership in memberships:
                user = membership.user
                
                # Skip if user has muted this channel
                if membership.is_muted:
                    continue
                
                # Get user's notification preferences
                preferences = NotificationPreference.objects.filter(
                    user=user,
                    notification_type='CHANNEL_MESSAGE',
                    is_enabled=True
                )
                
                for preference in preferences:
                    # Check if it's within quiet hours
                    if NotificationService._is_quiet_hours(user, preference):
                        continue
                    
                    # Prepare notification
                    notification_data = {
                        'user': user,
                        'notification_type': 'CHANNEL_MESSAGE',
                        'delivery_method': preference.delivery_method,
                        'subject': f'New message in {channel.name}',
                        'message': f'{sender.get_full_name()}: {message.content[:100]}...',
                        'recipient_address': NotificationService._get_recipient_address(user, preference.delivery_method),
                        'priority': 3 if message.is_emergency else 5,
                        'related_message': message,
                        'metadata': {
                            'channel_id': str(channel.id),
                            'channel_name': channel.name,
                            'sender_id': str(sender.id),
                            'sender_name': sender.get_full_name()
                        }
                    }
                    
                    if preference.immediate:
                        notifications_to_send.append(notification_data)
            
            # Queue notifications
            if notifications_to_send:
                NotificationService._queue_notifications(notifications_to_send)
                logger.info(f"Queued {len(notifications_to_send)} notifications for message {message.id}")
            
        except Exception as e:
            logger.error(f"Error notifying channel message: {str(e)}")

    @staticmethod
    def notify_direct_message(message):
        """Send notifications for a direct message."""
        try:
            channel = message.channel
            sender = message.sender
            
            # Get the recipient (the other user in the DM)
            dm_info = DirectMessage.objects.get(channel=channel)
            recipient = dm_info.user2 if dm_info.user1 == sender else dm_info.user1
            
            # Get recipient's notification preferences
            preferences = NotificationPreference.objects.filter(
                user=recipient,
                notification_type='DIRECT_MESSAGE',
                is_enabled=True
            )
            
            notifications_to_send = []
            
            for preference in preferences:
                if NotificationService._is_quiet_hours(recipient, preference):
                    continue
                
                notification_data = {
                    'user': recipient,
                    'notification_type': 'DIRECT_MESSAGE',
                    'delivery_method': preference.delivery_method,
                    'subject': f'Direct message from {sender.get_full_name()}',
                    'message': message.content[:200],
                    'recipient_address': NotificationService._get_recipient_address(recipient, preference.delivery_method),
                    'priority': 2,  # Higher priority for DMs
                    'related_message': message,
                    'metadata': {
                        'sender_id': str(sender.id),
                        'sender_name': sender.get_full_name()
                    }
                }
                
                if preference.immediate:
                    notifications_to_send.append(notification_data)
            
            if notifications_to_send:
                NotificationService._queue_notifications(notifications_to_send)
                logger.info(f"Queued {len(notifications_to_send)} DM notifications for message {message.id}")
            
        except Exception as e:
            logger.error(f"Error notifying direct message: {str(e)}")

    @staticmethod
    def notify_emergency_alert(alert_type, message, recipients=None, severity='HIGH'):
        """Send emergency notifications to specified recipients or all emergency contacts."""
        try:
            if recipients is None:
                # Get all users who should receive emergency notifications
                recipients = User.objects.filter(
                    is_staff=True,
                    is_active=True
                )
            
            notifications_to_send = []
            
            for recipient in recipients:
                # Emergency notifications override quiet hours and user preferences
                for delivery_method in ['EMAIL', 'SMS', 'PUSH']:
                    notification_data = {
                        'user': recipient,
                        'notification_type': 'EMERGENCY',
                        'delivery_method': delivery_method,
                        'subject': f'EMERGENCY ALERT: {alert_type}',
                        'message': message,
                        'recipient_address': NotificationService._get_recipient_address(recipient, delivery_method),
                        'priority': 1,  # Highest priority
                        'metadata': {
                            'alert_type': alert_type,
                            'severity': severity,
                            'override_preferences': True
                        }
                    }
                    notifications_to_send.append(notification_data)
            
            if notifications_to_send:
                NotificationService._queue_notifications(notifications_to_send)
                logger.critical(f"Queued {len(notifications_to_send)} emergency notifications")
            
        except Exception as e:
            logger.error(f"Error sending emergency notifications: {str(e)}")

    @staticmethod
    def _queue_notifications(notifications_data):
        """Queue notifications for delivery."""
        try:
            notification_objects = []
            
            for data in notifications_data:
                notification = NotificationQueue.objects.create(**data)
                notification_objects.append(notification)
            
            # Trigger async delivery for high-priority notifications
            high_priority_notifications = [
                n for n in notification_objects if n.priority <= 3
            ]
            
            if high_priority_notifications:
                # Send immediately for high priority
                bulk_data = []
                for notification in high_priority_notifications:
                    bulk_data.append({
                        'type': notification.delivery_method.lower(),
                        'recipient': notification.recipient_address,
                        'subject': notification.subject,
                        'message': notification.message,
                        'html_message': notification.html_message
                    })
                
                send_bulk_notifications.delay(bulk_data)
            
        except Exception as e:
            logger.error(f"Error queueing notifications: {str(e)}")

    @staticmethod
    def _is_quiet_hours(user, preference):
        """Check if current time is within user's quiet hours."""
        if not preference.quiet_hours_start or not preference.quiet_hours_end:
            return False
        
        try:
            from datetime import datetime
            import pytz
            
            user_tz = pytz.timezone(preference.timezone)
            current_time = datetime.now(user_tz).time()
            
            start_time = preference.quiet_hours_start
            end_time = preference.quiet_hours_end
            
            if start_time <= end_time:
                # Same day quiet hours
                return start_time <= current_time <= end_time
            else:
                # Quiet hours span midnight
                return current_time >= start_time or current_time <= end_time
                
        except Exception:
            return False

    @staticmethod
    def _get_recipient_address(user, delivery_method):
        """Get the recipient address for a delivery method."""
        if delivery_method == 'EMAIL':
            return user.email
        elif delivery_method == 'SMS':
            return getattr(user, 'phone_number', user.email)  # Fallback to email
        elif delivery_method == 'PUSH':
            # This would get device tokens from a user device model
            return getattr(user, 'device_token', '')
        else:
            return user.email
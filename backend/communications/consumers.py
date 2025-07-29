# communications/consumers.py
import json
import logging
from typing import Dict, Any
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from .models import (
    Channel, ChannelMembership, Message, MessageRead, 
    DirectMessage, NotificationQueue
)

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat functionality.
    Handles channel subscriptions, message broadcasting, and user presence.
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        Authenticate user and set up channel groups.
        """
        # Get user from scope (set by AuthMiddleware)
        self.user = self.scope.get('user')
        
        if not self.user or isinstance(self.user, AnonymousUser):
            logger.warning("Anonymous user attempted WebSocket connection")
            await self.close()
            return
        
        # Initialize user's groups and state
        self.user_id = str(self.user.id)
        self.user_group = f"user_{self.user_id}"
        self.channel_groups = set()
        
        # Accept the connection
        await self.accept()
        
        # Add user to their personal group for direct notifications
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        
        # Get user's channels and subscribe to them
        user_channels = await self.get_user_channels()
        for channel_id in user_channels:
            channel_group = f"channel_{channel_id}"
            await self.channel_layer.group_add(channel_group, self.channel_name)
            self.channel_groups.add(channel_group)
        
        # Send connection confirmation
        await self.send_json({
            'type': 'connection_established',
            'user_id': self.user_id,
            'channels_subscribed': len(user_channels)
        })
        
        # Broadcast user online status
        await self.broadcast_user_status('online')
        
        logger.info(f"User {self.user_id} connected to WebSocket")

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Clean up channel groups and broadcast offline status.
        """
        if hasattr(self, 'user') and self.user:
            # Broadcast user offline status
            await self.broadcast_user_status('offline')
            
            # Remove from all groups
            if hasattr(self, 'user_group'):
                await self.channel_layer.group_discard(self.user_group, self.channel_name)
            
            if hasattr(self, 'channel_groups'):
                for group in self.channel_groups:
                    await self.channel_layer.group_discard(group, self.channel_name)
            
            logger.info(f"User {self.user_id} disconnected from WebSocket")

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages.
        Route messages based on their type.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.debug(f"Received message type '{message_type}' from user {self.user_id}")
            
            # Route message based on type
            if message_type == 'send_message':
                await self.handle_send_message(data)
            elif message_type == 'join_channel':
                await self.handle_join_channel(data)
            elif message_type == 'leave_channel':
                await self.handle_leave_channel(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
            elif message_type == 'typing_start':
                await self.handle_typing_start(data)
            elif message_type == 'typing_stop':
                await self.handle_typing_stop(data)
            elif message_type == 'react_to_message':
                await self.handle_react_to_message(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error processing message from user {self.user_id}: {str(e)}")
            await self.send_error("Internal server error")

    async def handle_send_message(self, data: Dict[str, Any]):
        """
        Handle sending a new message to a channel.
        """
        try:
            channel_id = data.get('channel_id')
            content = data.get('content', '').strip()
            message_type = data.get('message_type', 'TEXT')
            reply_to_id = data.get('reply_to')
            
            if not channel_id or not content:
                await self.send_error("Channel ID and content are required")
                return
            
            # Verify user has permission to send to this channel
            can_send = await self.check_channel_permission(channel_id, 'send_message')
            if not can_send:
                await self.send_error("You don't have permission to send messages to this channel")
                return
            
            # Create the message
            message = await self.create_message(
                channel_id=channel_id,
                content=content,
                message_type=message_type,
                reply_to_id=reply_to_id,
                metadata=data.get('metadata', {})
            )
            
            if message:
                # Get message data for broadcasting
                message_data = await self.get_message_data(message)
                
                # Broadcast to channel group
                await self.channel_layer.group_send(
                    f"channel_{channel_id}",
                    {
                        'type': 'chat_message',
                        'message': message_data
                    }
                )
                
                logger.info(f"Message {message.id} sent to channel {channel_id} by user {self.user_id}")
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            await self.send_error("Failed to send message")

    async def handle_join_channel(self, data: Dict[str, Any]):
        """
        Handle joining a new channel.
        """
        try:
            channel_id = data.get('channel_id')
            
            if not channel_id:
                await self.send_error("Channel ID is required")
                return
            
            # Verify user has permission to join this channel
            can_join = await self.check_channel_permission(channel_id, 'join')
            if not can_join:
                await self.send_error("You don't have permission to join this channel")
                return
            
            # Add to channel group
            channel_group = f"channel_{channel_id}"
            await self.channel_layer.group_add(channel_group, self.channel_name)
            self.channel_groups.add(channel_group)
            
            # Send confirmation
            await self.send_json({
                'type': 'channel_joined',
                'channel_id': channel_id
            })
            
            # Broadcast user joined message
            await self.channel_layer.group_send(
                channel_group,
                {
                    'type': 'user_joined',
                    'user_id': self.user_id,
                    'channel_id': channel_id
                }
            )
            
            logger.info(f"User {self.user_id} joined channel {channel_id}")
            
        except Exception as e:
            logger.error(f"Error joining channel: {str(e)}")
            await self.send_error("Failed to join channel")

    async def handle_leave_channel(self, data: Dict[str, Any]):
        """
        Handle leaving a channel.
        """
        try:
            channel_id = data.get('channel_id')
            
            if not channel_id:
                await self.send_error("Channel ID is required")
                return
            
            # Remove from channel group
            channel_group = f"channel_{channel_id}"
            await self.channel_layer.group_discard(channel_group, self.channel_name)
            self.channel_groups.discard(channel_group)
            
            # Send confirmation
            await self.send_json({
                'type': 'channel_left',
                'channel_id': channel_id
            })
            
            # Broadcast user left message
            await self.channel_layer.group_send(
                channel_group,
                {
                    'type': 'user_left',
                    'user_id': self.user_id,
                    'channel_id': channel_id
                }
            )
            
            logger.info(f"User {self.user_id} left channel {channel_id}")
            
        except Exception as e:
            logger.error(f"Error leaving channel: {str(e)}")
            await self.send_error("Failed to leave channel")

    async def handle_mark_read(self, data: Dict[str, Any]):
        """
        Handle marking messages as read.
        """
        try:
            channel_id = data.get('channel_id')
            message_id = data.get('message_id')
            
            if not channel_id:
                await self.send_error("Channel ID is required")
                return
            
            # Mark messages as read
            if message_id:
                # Mark specific message as read
                await self.mark_message_read(message_id)
            else:
                # Mark all messages in channel as read
                await self.mark_channel_read(channel_id)
            
            # Update channel membership last_read_at
            await self.update_last_read(channel_id)
            
            # Send confirmation
            await self.send_json({
                'type': 'messages_marked_read',
                'channel_id': channel_id,
                'message_id': message_id
            })
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}")
            await self.send_error("Failed to mark messages as read")

    async def handle_typing_start(self, data: Dict[str, Any]):
        """
        Handle user starting to type.
        """
        try:
            channel_id = data.get('channel_id')
            
            if not channel_id:
                return
            
            # Broadcast typing indicator
            await self.channel_layer.group_send(
                f"channel_{channel_id}",
                {
                    'type': 'typing_indicator',
                    'user_id': self.user_id,
                    'channel_id': channel_id,
                    'is_typing': True
                }
            )
            
        except Exception as e:
            logger.error(f"Error handling typing start: {str(e)}")

    async def handle_typing_stop(self, data: Dict[str, Any]):
        """
        Handle user stopping typing.
        """
        try:
            channel_id = data.get('channel_id')
            
            if not channel_id:
                return
            
            # Broadcast typing stop
            await self.channel_layer.group_send(
                f"channel_{channel_id}",
                {
                    'type': 'typing_indicator',
                    'user_id': self.user_id,
                    'channel_id': channel_id,
                    'is_typing': False
                }
            )
            
        except Exception as e:
            logger.error(f"Error handling typing stop: {str(e)}")

    async def handle_react_to_message(self, data: Dict[str, Any]):
        """
        Handle adding/removing reaction to a message.
        """
        try:
            message_id = data.get('message_id')
            reaction = data.get('reaction')
            
            if not message_id or not reaction:
                await self.send_error("Message ID and reaction are required")
                return
            
            # Add/remove reaction
            reaction_data = await self.toggle_reaction(message_id, reaction)
            
            if reaction_data:
                # Broadcast reaction update
                message = await self.get_message_by_id(message_id)
                if message:
                    await self.channel_layer.group_send(
                        f"channel_{message.channel.id}",
                        {
                            'type': 'reaction_update',
                            'message_id': message_id,
                            'reaction': reaction,
                            'user_id': self.user_id,
                            'action': reaction_data['action']  # 'added' or 'removed'
                        }
                    )
            
        except Exception as e:
            logger.error(f"Error handling reaction: {str(e)}")
            await self.send_error("Failed to update reaction")

    # WebSocket message handlers for group sends
    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send_json({
            'type': 'chat_message',
            'message': event['message']
        })

    async def user_joined(self, event):
        """Send user joined notification to WebSocket"""
        # Don't send to the user who joined
        if event['user_id'] != self.user_id:
            await self.send_json({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'channel_id': event['channel_id']
            })

    async def user_left(self, event):
        """Send user left notification to WebSocket"""
        # Don't send to the user who left
        if event['user_id'] != self.user_id:
            await self.send_json({
                'type': 'user_left',
                'user_id': event['user_id'],
                'channel_id': event['channel_id']
            })

    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send to the user who is typing
        if event['user_id'] != self.user_id:
            await self.send_json({
                'type': 'typing_indicator',
                'user_id': event['user_id'],
                'channel_id': event['channel_id'],
                'is_typing': event['is_typing']
            })

    async def reaction_update(self, event):
        """Send reaction update to WebSocket"""
        await self.send_json({
            'type': 'reaction_update',
            'message_id': event['message_id'],
            'reaction': event['reaction'],
            'user_id': event['user_id'],
            'action': event['action']
        })

    async def user_status_update(self, event):
        """Send user status update to WebSocket"""
        await self.send_json({
            'type': 'user_status_update',
            'user_id': event['user_id'],
            'status': event['status']
        })

    async def notification(self, event):
        """Send notification to WebSocket"""
        await self.send_json({
            'type': 'notification',
            'notification': event['notification']
        })

    async def feedback_update(self, event):
        """Send feedback update to WebSocket"""
        await self.send_json({
            'type': 'feedback_update',
            'data': event['data']
        })

    async def dashboard_update(self, event):
        """Send dashboard update to WebSocket"""
        await self.send_json({
            'type': 'dashboard_update',
            'data': event['data']
        })

    # Utility methods
    async def send_json(self, content):
        """Send JSON data to WebSocket"""
        await self.send(text_data=json.dumps(content))

    async def send_error(self, message: str):
        """Send error message to WebSocket"""
        await self.send_json({
            'type': 'error',
            'message': message
        })

    async def broadcast_user_status(self, status: str):
        """
        Broadcast user status to all channels the user is in.
        """
        try:
            # Get all channels this user is a member of
            user_channels = await self.get_user_channels()
            
            # Broadcast to each channel
            for channel_id in user_channels:
                await self.channel_layer.group_send(
                    f"channel_{channel_id}",
                    {
                        'type': 'user_status_update',
                        'user_id': self.user_id,
                        'status': status
                    }
                )
        except Exception as e:
            logger.error(f"Error broadcasting user status: {str(e)}")

    # Database operations
    @database_sync_to_async
    def get_user_channels(self):
        """Get list of channel IDs the user is a member of"""
        try:
            memberships = ChannelMembership.objects.filter(
                user=self.user,
                is_active=True
            ).select_related('channel')
            return [str(membership.channel.id) for membership in memberships]
        except Exception as e:
            logger.error(f"Error getting user channels: {str(e)}")
            return []

    @database_sync_to_async
    def check_channel_permission(self, channel_id: str, action: str) -> bool:
        """Check if user has permission to perform action on channel"""
        try:
            membership = ChannelMembership.objects.get(
                user=self.user,
                channel_id=channel_id,
                is_active=True
            )
            
            # Basic permission checks
            if action == 'join':
                return True  # If they have membership, they can join
            elif action == 'send_message':
                return not membership.is_muted
            
            return True
        except ChannelMembership.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error checking channel permission: {str(e)}")
            return False

    @database_sync_to_async
    def create_message(self, channel_id: str, content: str, message_type: str = 'TEXT', 
                      reply_to_id: str = None, metadata: Dict = None):
        """Create a new message in the database"""
        try:
            from .models import Message
            
            message_data = {
                'channel_id': channel_id,
                'sender': self.user,
                'content': content,
                'message_type': message_type,
                'metadata': metadata or {}
            }
            
            if reply_to_id:
                try:
                    reply_to = Message.objects.get(id=reply_to_id)
                    message_data['reply_to'] = reply_to
                    message_data['thread_id'] = reply_to.thread_id or reply_to.id
                except Message.DoesNotExist:
                    pass
            
            message = Message.objects.create(**message_data)
            return message
            
        except Exception as e:
            logger.error(f"Error creating message: {str(e)}")
            return None

    @database_sync_to_async
    def get_message_data(self, message):
        """Get message data for broadcasting"""
        try:
            return {
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
        except Exception as e:
            logger.error(f"Error getting message data: {str(e)}")
            return None

    @database_sync_to_async
    def get_message_by_id(self, message_id: str):
        """Get message by ID"""
        try:
            return Message.objects.select_related('channel', 'sender').get(id=message_id)
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def mark_message_read(self, message_id: str):
        """Mark a specific message as read"""
        try:
            message = Message.objects.get(id=message_id)
            MessageRead.objects.get_or_create(
                message=message,
                user=self.user
            )
        except Exception as e:
            logger.error(f"Error marking message as read: {str(e)}")

    @database_sync_to_async
    def mark_channel_read(self, channel_id: str):
        """Mark all messages in a channel as read"""
        try:
            channel = Channel.objects.get(id=channel_id)
            messages = Message.objects.filter(channel=channel)
            
            for message in messages:
                MessageRead.objects.get_or_create(
                    message=message,
                    user=self.user
                )
        except Exception as e:
            logger.error(f"Error marking channel as read: {str(e)}")

    @database_sync_to_async
    def update_last_read(self, channel_id: str):
        """Update user's last read timestamp for a channel"""
        try:
            from django.utils import timezone
            membership = ChannelMembership.objects.get(
                user=self.user,
                channel_id=channel_id
            )
            membership.last_read_at = timezone.now()
            membership.save(update_fields=['last_read_at'])
        except Exception as e:
            logger.error(f"Error updating last read: {str(e)}")

    @database_sync_to_async
    def toggle_reaction(self, message_id: str, reaction: str):
        """Toggle reaction on a message"""
        try:
            from .models import MessageReaction
            
            message = Message.objects.get(id=message_id)
            reaction_obj, created = MessageReaction.objects.get_or_create(
                message=message,
                user=self.user,
                reaction=reaction
            )
            
            if not created:
                # Remove existing reaction
                reaction_obj.delete()
                return {'action': 'removed'}
            else:
                return {'action': 'added'}
                
        except Exception as e:
            logger.error(f"Error toggling reaction: {str(e)}")
            return None
"""
WebSocket consumers for real-time compliance monitoring and alerting
"""
import json
import logging
from typing import Dict, Any
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import PermissionDenied
from .compliance_monitoring import ComplianceMonitoringService

logger = logging.getLogger(__name__)
User = get_user_model()


class ComplianceMonitoringConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time compliance monitoring and alerts.
    Provides live updates on compliance status, alerts, and threshold breaches.
    """

    async def connect(self):
        """
        Handle WebSocket connection for compliance monitoring.
        Only allow authenticated users with appropriate permissions.
        """
        # Get user from scope (set by AuthMiddleware)
        self.user = self.scope.get('user')
        
        if not self.user or isinstance(self.user, AnonymousUser):
            logger.warning("Anonymous user attempted compliance monitoring WebSocket connection")
            await self.close()
            return
        
        # Check if user has permission for compliance monitoring
        if not await self.check_compliance_permissions():
            logger.warning(f"User {self.user.id} attempted compliance monitoring without permissions")
            await self.close()
            return
        
        # Initialize user state
        self.user_id = str(self.user.id)
        self.company_id = str(self.user.company.id) if hasattr(self.user, 'company') and self.user.company else None
        
        if not self.company_id:
            logger.warning(f"User {self.user.id} attempted compliance monitoring without company association")
            await self.close()
            return
        
        # Set up group names
        self.user_group = f"compliance_user_{self.user_id}"
        self.company_group = f"compliance_company_{self.company_id}"
        
        # Accept the connection
        await self.accept()
        
        # Add user to their personal compliance group
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        
        # Add user to their company's compliance group
        await self.channel_layer.group_add(self.company_group, self.channel_name)
        
        # Send connection confirmation with initial data
        initial_data = await self.get_initial_compliance_data()
        await self.send_json({
            'type': 'connection_established',
            'user_id': self.user_id,
            'company_id': self.company_id,
            'initial_data': initial_data
        })
        
        logger.info(f"User {self.user_id} connected to compliance monitoring WebSocket")

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Clean up channel groups.
        """
        if hasattr(self, 'user') and self.user:
            # Remove from all groups
            if hasattr(self, 'user_group'):
                await self.channel_layer.group_discard(self.user_group, self.channel_name)
            
            if hasattr(self, 'company_group'):
                await self.channel_layer.group_discard(self.company_group, self.channel_name)
            
            logger.info(f"User {self.user_id} disconnected from compliance monitoring WebSocket")

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages for compliance monitoring.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.debug(f"Received compliance monitoring message type '{message_type}' from user {self.user_id}")
            
            # Route message based on type
            if message_type == 'get_status':
                await self.handle_get_status(data)
            elif message_type == 'get_alerts':
                await self.handle_get_alerts(data)
            elif message_type == 'acknowledge_alert':
                await self.handle_acknowledge_alert(data)
            elif message_type == 'get_thresholds':
                await self.handle_get_thresholds(data)
            elif message_type == 'subscribe_to_updates':
                await self.handle_subscribe_updates(data)
            elif message_type == 'unsubscribe_from_updates':
                await self.handle_unsubscribe_updates(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error processing compliance monitoring message from user {self.user_id}: {str(e)}")
            await self.send_error("Internal server error")

    async def handle_get_status(self, data: Dict[str, Any]):
        """
        Handle request for current compliance status.
        """
        try:
            period_days = data.get('period_days', 30)
            
            # Get compliance status
            monitoring_service = await self.get_monitoring_service()
            status_data = await database_sync_to_async(
                monitoring_service.get_compliance_status
            )(period_days)
            
            await self.send_json({
                'type': 'compliance_status',
                'data': status_data
            })
            
        except Exception as e:
            logger.error(f"Error getting compliance status: {str(e)}")
            await self.send_error("Failed to get compliance status")

    async def handle_get_alerts(self, data: Dict[str, Any]):
        """
        Handle request for current compliance alerts.
        """
        try:
            # Get real-time alerts
            monitoring_service = await self.get_monitoring_service()
            alerts = await database_sync_to_async(
                monitoring_service.get_real_time_alerts
            )()
            
            await self.send_json({
                'type': 'compliance_alerts',
                'alerts': alerts,
                'alert_count': len(alerts)
            })
            
        except Exception as e:
            logger.error(f"Error getting compliance alerts: {str(e)}")
            await self.send_error("Failed to get compliance alerts")

    async def handle_acknowledge_alert(self, data: Dict[str, Any]):
        """
        Handle alert acknowledgment.
        """
        try:
            alert_id = data.get('alert_id')
            note = data.get('note', '')
            
            if not alert_id:
                await self.send_error("Alert ID is required")
                return
            
            # Log the acknowledgment
            await self.log_alert_acknowledgment(alert_id, note)
            
            # Send confirmation
            await self.send_json({
                'type': 'alert_acknowledged',
                'alert_id': alert_id,
                'acknowledged_by': self.user_id,
                'note': note
            })
            
            # Broadcast to company group
            await self.channel_layer.group_send(
                self.company_group,
                {
                    'type': 'alert_acknowledged_broadcast',
                    'alert_id': alert_id,
                    'acknowledged_by': self.user_id,
                    'user_name': await self.get_user_display_name(),
                    'note': note
                }
            )
            
        except Exception as e:
            logger.error(f"Error acknowledging alert: {str(e)}")
            await self.send_error("Failed to acknowledge alert")

    async def handle_get_thresholds(self, data: Dict[str, Any]):
        """
        Handle request for compliance threshold status.
        """
        try:
            # Get threshold status
            monitoring_service = await self.get_monitoring_service()
            threshold_data = await database_sync_to_async(
                monitoring_service.get_compliance_threshold_status
            )()
            
            await self.send_json({
                'type': 'compliance_thresholds',
                'data': threshold_data
            })
            
        except Exception as e:
            logger.error(f"Error getting compliance thresholds: {str(e)}")
            await self.send_error("Failed to get compliance thresholds")

    async def handle_subscribe_updates(self, data: Dict[str, Any]):
        """
        Handle subscription to real-time compliance updates.
        """
        try:
            update_types = data.get('update_types', ['all'])
            
            # Store subscription preferences (could be in Redis for persistence)
            self.subscribed_updates = set(update_types)
            
            await self.send_json({
                'type': 'subscription_confirmed',
                'update_types': list(self.subscribed_updates)
            })
            
        except Exception as e:
            logger.error(f"Error subscribing to updates: {str(e)}")
            await self.send_error("Failed to subscribe to updates")

    async def handle_unsubscribe_updates(self, data: Dict[str, Any]):
        """
        Handle unsubscription from real-time compliance updates.
        """
        try:
            update_types = data.get('update_types', [])
            
            if hasattr(self, 'subscribed_updates'):
                for update_type in update_types:
                    self.subscribed_updates.discard(update_type)
            
            await self.send_json({
                'type': 'unsubscription_confirmed',
                'update_types': update_types
            })
            
        except Exception as e:
            logger.error(f"Error unsubscribing from updates: {str(e)}")
            await self.send_error("Failed to unsubscribe from updates")

    # WebSocket message handlers for group sends
    async def compliance_alert_new(self, event):
        """Send new compliance alert to WebSocket"""
        await self.send_json({
            'type': 'new_compliance_alert',
            'alert': event['alert']
        })

    async def compliance_status_update(self, event):
        """Send compliance status update to WebSocket"""
        if self._should_send_update('status'):
            await self.send_json({
                'type': 'compliance_status_update',
                'data': event['data']
            })

    async def compliance_threshold_breach(self, event):
        """Send compliance threshold breach to WebSocket"""
        await self.send_json({
            'type': 'compliance_threshold_breach',
            'breach': event['breach']
        })

    async def alert_acknowledged_broadcast(self, event):
        """Send alert acknowledgment broadcast to WebSocket"""
        # Don't send to the user who acknowledged
        if event.get('acknowledged_by') != self.user_id:
            await self.send_json({
                'type': 'alert_acknowledged',
                'alert_id': event['alert_id'],
                'acknowledged_by': event['acknowledged_by'],
                'user_name': event['user_name'],
                'note': event.get('note', '')
            })

    async def compliance_violation_detected(self, event):
        """Send compliance violation detection to WebSocket"""
        await self.send_json({
            'type': 'compliance_violation_detected',
            'violation': event['violation']
        })

    async def remediation_overdue(self, event):
        """Send remediation overdue notification to WebSocket"""
        await self.send_json({
            'type': 'remediation_overdue',
            'remediation': event['remediation']
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

    def _should_send_update(self, update_type: str) -> bool:
        """Check if user is subscribed to this type of update"""
        if not hasattr(self, 'subscribed_updates'):
            return True  # Send all updates by default
        
        return 'all' in self.subscribed_updates or update_type in self.subscribed_updates

    # Database operations
    @database_sync_to_async
    def check_compliance_permissions(self) -> bool:
        """Check if user has permission for compliance monitoring"""
        try:
            # Check if user has appropriate role
            user_role = getattr(self.user, 'role', 'VIEWER')
            allowed_roles = ['ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'SUPERVISOR']
            
            return user_role in allowed_roles
        except Exception as e:
            logger.error(f"Error checking compliance permissions: {str(e)}")
            return False

    @database_sync_to_async
    def get_monitoring_service(self):
        """Get compliance monitoring service for user's company"""
        if not hasattr(self.user, 'company') or not self.user.company:
            raise PermissionDenied("User must be associated with a company")
        return ComplianceMonitoringService(self.user.company)

    @database_sync_to_async
    def get_initial_compliance_data(self):
        """Get initial compliance data for connection"""
        try:
            monitoring_service = ComplianceMonitoringService(self.user.company)
            
            # Get basic status and alerts
            status_data = monitoring_service.get_compliance_status(7)  # Last 7 days
            alerts = monitoring_service.get_real_time_alerts()
            threshold_status = monitoring_service.get_compliance_threshold_status()
            
            return {
                'compliance_score': status_data.get('overall_compliance_score', 0),
                'active_alerts': len([a for a in alerts if a.get('requires_immediate_attention')]),
                'critical_alerts': len([a for a in alerts if a.get('level') == 'CRITICAL']),
                'threshold_breaches': len(threshold_status.get('threshold_breaches', [])),
                'last_updated': status_data.get('last_updated')
            }
        except Exception as e:
            logger.error(f"Error getting initial compliance data: {str(e)}")
            return {}

    @database_sync_to_async
    def log_alert_acknowledgment(self, alert_id: str, note: str):
        """Log alert acknowledgment to audit trail"""
        try:
            from .models import AuditLog, AuditActionType
            from django.utils import timezone
            
            AuditLog.log_action(
                action_type=AuditActionType.UPDATE,
                description=f"Compliance alert acknowledged: {alert_id}",
                user=self.user,
                metadata={
                    'alert_id': alert_id,
                    'acknowledgment_note': note,
                    'acknowledged_via': 'websocket',
                    'acknowledged_at': timezone.now().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Error logging alert acknowledgment: {str(e)}")

    @database_sync_to_async
    def get_user_display_name(self) -> str:
        """Get user display name"""
        try:
            return self.user.get_full_name() or self.user.username
        except Exception:
            return 'Unknown User'


class ComplianceAlertService:
    """
    Service for sending real-time compliance alerts via WebSocket
    """
    
    @staticmethod
    async def send_new_alert(company_id: str, alert_data: Dict[str, Any]):
        """Send new compliance alert to all connected users in company"""
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            await channel_layer.group_send(
                f"compliance_company_{company_id}",
                {
                    'type': 'compliance_alert_new',
                    'alert': alert_data
                }
            )
    
    @staticmethod
    async def send_status_update(company_id: str, status_data: Dict[str, Any]):
        """Send compliance status update to all connected users in company"""
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            await channel_layer.group_send(
                f"compliance_company_{company_id}",
                {
                    'type': 'compliance_status_update',
                    'data': status_data
                }
            )
    
    @staticmethod
    async def send_threshold_breach(company_id: str, breach_data: Dict[str, Any]):
        """Send threshold breach notification to all connected users in company"""
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            await channel_layer.group_send(
                f"compliance_company_{company_id}",
                {
                    'type': 'compliance_threshold_breach',
                    'breach': breach_data
                }
            )
    
    @staticmethod
    async def send_violation_detected(company_id: str, violation_data: Dict[str, Any]):
        """Send compliance violation detection to all connected users in company"""
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            await channel_layer.group_send(
                f"compliance_company_{company_id}",
                {
                    'type': 'compliance_violation_detected',
                    'violation': violation_data
                }
            )
    
    @staticmethod
    async def send_remediation_overdue(company_id: str, remediation_data: Dict[str, Any]):
        """Send remediation overdue notification to all connected users in company"""
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            await channel_layer.group_send(
                f"compliance_company_{company_id}",
                {
                    'type': 'remediation_overdue',
                    'remediation': remediation_data
                }
            )
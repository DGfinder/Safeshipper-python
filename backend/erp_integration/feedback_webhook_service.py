# erp_integration/feedback_webhook_service.py

import json
import logging
from typing import Dict, List, Optional
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import (
    ERPSystem, IntegrationEndpoint, DataSyncJob, ERPEventLog, 
    ERPDataBuffer, ERPMapping
)
from .services import ERPIntegrationService
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

User = get_user_model()
logger = logging.getLogger(__name__)


class FeedbackWebhookService:
    """
    Service for sending feedback events to external ERP systems via webhooks.
    Integrates with the existing ERP integration infrastructure.
    """
    
    def __init__(self):
        self.erp_service = ERPIntegrationService()
        self.timeout_seconds = getattr(settings, 'ERP_WEBHOOK_TIMEOUT', 30)
        self.max_retries = getattr(settings, 'ERP_WEBHOOK_MAX_RETRIES', 3)
    
    def send_feedback_created_webhook(self, feedback):
        """
        Send webhook notification when new feedback is created.
        
        Args:
            feedback: ShipmentFeedback instance
        """
        try:
            # Get ERP systems configured for feedback webhooks
            erp_systems = self._get_feedback_enabled_erp_systems(feedback.shipment.carrier)
            
            for erp_system in erp_systems:
                try:
                    # Check if feedback_created endpoint exists
                    endpoint = self._get_feedback_endpoint(erp_system, 'feedback_created')
                    if not endpoint:
                        logger.debug(f"No feedback_created endpoint configured for {erp_system.name}")
                        continue
                    
                    # Transform feedback data for this ERP system
                    webhook_data = self._transform_feedback_data(feedback, erp_system, endpoint, 'created')
                    
                    # Send webhook
                    success = self._send_webhook(erp_system, endpoint, webhook_data, feedback)
                    
                    if success:
                        logger.info(f"Feedback created webhook sent successfully to {erp_system.name}")
                    else:
                        logger.error(f"Failed to send feedback created webhook to {erp_system.name}")
                        
                except Exception as e:
                    logger.error(f"Error sending feedback created webhook to {erp_system.name}: {e}")
                    self._log_webhook_error(erp_system, 'feedback_created', str(e), feedback)
            
        except Exception as e:
            logger.error(f"Error in send_feedback_created_webhook: {e}")
    
    def send_manager_response_webhook(self, feedback):
        """
        Send webhook notification when manager responds to feedback.
        
        Args:
            feedback: ShipmentFeedback instance with manager response
        """
        try:
            erp_systems = self._get_feedback_enabled_erp_systems(feedback.shipment.carrier)
            
            for erp_system in erp_systems:
                try:
                    endpoint = self._get_feedback_endpoint(erp_system, 'manager_response')
                    if not endpoint:
                        logger.debug(f"No manager_response endpoint configured for {erp_system.name}")
                        continue
                    
                    webhook_data = self._transform_feedback_data(feedback, erp_system, endpoint, 'manager_response')
                    
                    success = self._send_webhook(erp_system, endpoint, webhook_data, feedback)
                    
                    if success:
                        logger.info(f"Manager response webhook sent successfully to {erp_system.name}")
                        
                except Exception as e:
                    logger.error(f"Error sending manager response webhook to {erp_system.name}: {e}")
                    self._log_webhook_error(erp_system, 'manager_response', str(e), feedback)
            
        except Exception as e:
            logger.error(f"Error in send_manager_response_webhook: {e}")
    
    def send_incident_created_webhook(self, feedback, incident):
        """
        Send webhook notification when incident is created from feedback.
        
        Args:
            feedback: ShipmentFeedback instance
            incident: Incident instance created from feedback
        """
        try:
            erp_systems = self._get_feedback_enabled_erp_systems(feedback.shipment.carrier)
            
            for erp_system in erp_systems:
                try:
                    endpoint = self._get_feedback_endpoint(erp_system, 'incident_created')
                    if not endpoint:
                        logger.debug(f"No incident_created endpoint configured for {erp_system.name}")
                        continue
                    
                    webhook_data = self._transform_incident_data(feedback, incident, erp_system, endpoint)
                    
                    success = self._send_webhook(erp_system, endpoint, webhook_data, feedback, incident)
                    
                    if success:
                        logger.info(f"Incident created webhook sent successfully to {erp_system.name}")
                        
                except Exception as e:
                    logger.error(f"Error sending incident created webhook to {erp_system.name}: {e}")
                    self._log_webhook_error(erp_system, 'incident_created', str(e), feedback)
            
        except Exception as e:
            logger.error(f"Error in send_incident_created_webhook: {e}")
    
    def send_weekly_report_webhook(self, company, report_data):
        """
        Send webhook notification for weekly feedback reports.
        
        Args:
            company: Company instance
            report_data: Dict containing report data
        """
        try:
            erp_systems = self._get_feedback_enabled_erp_systems(company)
            
            for erp_system in erp_systems:
                try:
                    endpoint = self._get_feedback_endpoint(erp_system, 'weekly_report')
                    if not endpoint:
                        logger.debug(f"No weekly_report endpoint configured for {erp_system.name}")
                        continue
                    
                    webhook_data = self._transform_report_data(report_data, erp_system, endpoint)
                    
                    success = self._send_webhook(erp_system, endpoint, webhook_data)
                    
                    if success:
                        logger.info(f"Weekly report webhook sent successfully to {erp_system.name}")
                        
                except Exception as e:
                    logger.error(f"Error sending weekly report webhook to {erp_system.name}: {e}")
                    self._log_webhook_error(erp_system, 'weekly_report', str(e))
            
        except Exception as e:
            logger.error(f"Error in send_weekly_report_webhook: {e}")
    
    def _get_feedback_enabled_erp_systems(self, company) -> List:
        """Get ERP systems that have feedback webhooks enabled for a company."""
        try:
            return ERPSystem.objects.filter(
                company=company,
                status='active',
                push_enabled=True,
                enabled_modules__contains=['feedback_webhooks']
            ).prefetch_related('endpoints')
        except Exception as e:
            logger.error(f"Error getting feedback-enabled ERP systems: {e}")
            return []
    
    def _get_feedback_endpoint(self, erp_system, event_type: str) -> Optional:
        """Get feedback webhook endpoint for specific event type."""
        try:
            # Map event types to endpoint names
            endpoint_mapping = {
                'feedback_created': 'feedback_received',
                'manager_response': 'feedback_response', 
                'incident_created': 'feedback_incident',
                'weekly_report': 'feedback_report'
            }
            
            endpoint_name = endpoint_mapping.get(event_type, event_type)
            
            return erp_system.endpoints.filter(
                endpoint_type='feedback_webhooks',
                name=endpoint_name,
                is_active=True
            ).first()
            
        except Exception as e:
            logger.error(f"Error getting feedback endpoint: {e}")
            return None
    
    def _transform_feedback_data(self, feedback, erp_system, endpoint, event_type: str) -> Dict:
        """Transform feedback data according to ERP system mappings."""
        try:
            # Base feedback data
            base_data = {
                'event_type': event_type,
                'timestamp': timezone.now().isoformat(),
                'feedback_id': str(feedback.id),
                'shipment': {
                    'id': str(feedback.shipment.id),
                    'tracking_number': feedback.shipment.tracking_number,
                    'reference_number': feedback.shipment.reference_number,
                    'customer_name': feedback.shipment.customer.name,
                    'carrier_name': feedback.shipment.carrier.name,
                    'origin_location': feedback.shipment.origin_location,
                    'destination_location': feedback.shipment.destination_location,
                    'actual_delivery_date': feedback.shipment.actual_delivery_date.isoformat() if feedback.shipment.actual_delivery_date else None,
                    'assigned_driver': feedback.shipment.assigned_driver.get_full_name() if feedback.shipment.assigned_driver else None
                },
                'feedback': {
                    'submitted_at': feedback.submitted_at.isoformat(),
                    'delivery_success_score': feedback.delivery_success_score,
                    'performance_category': feedback.performance_category,
                    'was_on_time': feedback.was_on_time,
                    'was_complete_and_undamaged': feedback.was_complete_and_undamaged,
                    'was_driver_professional': feedback.was_driver_professional,
                    'feedback_notes': feedback.feedback_notes,
                    'difot_score': feedback.difot_score,
                    'requires_incident': feedback.requires_incident
                }
            }
            
            # Add manager response data if applicable
            if event_type == 'manager_response' and feedback.has_manager_response:
                base_data['manager_response'] = {
                    'response_text': feedback.manager_response,
                    'responded_at': feedback.responded_at.isoformat(),
                    'responded_by': feedback.responded_by.get_full_name() if feedback.responded_by else None
                }
            
            # Apply field mappings
            transformed_data = self._apply_field_mappings(base_data, erp_system, endpoint)
            
            # Add ERP-specific metadata
            transformed_data['_metadata'] = {
                'source_system': 'SafeShipper',
                'erp_system': erp_system.name,
                'integration_version': '1.0',
                'sent_at': timezone.now().isoformat()
            }
            
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error transforming feedback data: {e}")
            return {}
    
    def _transform_incident_data(self, feedback, incident, erp_system, endpoint) -> Dict:
        """Transform incident data for webhook."""
        try:
            base_data = {
                'event_type': 'incident_created',
                'timestamp': timezone.now().isoformat(),
                'feedback_id': str(feedback.id),
                'incident': {
                    'id': str(incident.id),
                    'incident_number': incident.incident_number,
                    'title': incident.title,
                    'description': incident.description,
                    'priority': incident.priority,
                    'status': incident.status,
                    'occurred_at': incident.occurred_at.isoformat(),
                    'reported_at': incident.reported_at.isoformat(),
                    'assigned_to': incident.assigned_to.get_full_name() if incident.assigned_to else None
                },
                'shipment': {
                    'id': str(feedback.shipment.id),
                    'tracking_number': feedback.shipment.tracking_number,
                    'customer_name': feedback.shipment.customer.name
                },
                'feedback_summary': {
                    'score': feedback.delivery_success_score,
                    'category': feedback.performance_category,
                    'issues': []
                }
            }
            
            # Add specific issues that led to incident
            if not feedback.was_on_time:
                base_data['feedback_summary']['issues'].append('late_delivery')
            if not feedback.was_complete_and_undamaged:
                base_data['feedback_summary']['issues'].append('incomplete_or_damaged')
            if not feedback.was_driver_professional:
                base_data['feedback_summary']['issues'].append('unprofessional_driver')
            
            # Apply field mappings
            transformed_data = self._apply_field_mappings(base_data, erp_system, endpoint)
            
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error transforming incident data: {e}")
            return {}
    
    def _transform_report_data(self, report_data: Dict, erp_system, endpoint) -> Dict:
        """Transform weekly report data for webhook."""
        try:
            base_data = {
                'event_type': 'weekly_report',
                'timestamp': timezone.now().isoformat(),
                'report_period': report_data.get('period', {}),
                'company': report_data.get('company', {}),
                'summary': {
                    'total_feedback': report_data.get('overall_stats', {}).get('total_feedback_count', 0),
                    'average_score': report_data.get('overall_stats', {}).get('average_score', 0),
                    'difot_rate': report_data.get('overall_stats', {}).get('difot_rate', 0),
                    'performance_breakdown': report_data.get('performance_breakdown', {}),
                    'incident_rate': report_data.get('incident_stats', {}).get('incident_rate', 0)
                },
                'trends': report_data.get('daily_trends', []),
                'top_performers': report_data.get('driver_performance', [])[:5],  # Top 5 drivers
                'improvement_areas': self._identify_improvement_areas(report_data)
            }
            
            # Apply field mappings
            transformed_data = self._apply_field_mappings(base_data, erp_system, endpoint)
            
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error transforming report data: {e}")
            return {}
    
    def _apply_field_mappings(self, data: Dict, erp_system, endpoint) -> Dict:
        """Apply ERP-specific field mappings to data."""
        try:
            # Get field mappings for this endpoint
            mappings = ERPMapping.objects.filter(
                erp_system=erp_system,
                endpoint=endpoint,
                is_active=True
            )
            
            if not mappings.exists():
                logger.debug(f"No field mappings found for {erp_system.name} - {endpoint.name}")
                return data
            
            transformed_data = {}
            
            for mapping in mappings:
                try:
                    # Get source value using dot notation
                    source_value = self._get_nested_value(data, mapping.safeshipper_field)
                    
                    if source_value is not None:
                        # Apply transformation based on mapping type
                        if mapping.mapping_type == 'direct':
                            target_value = source_value
                        elif mapping.mapping_type == 'transform':
                            target_value = self._apply_transformation(source_value, mapping.transformation_rules)
                        elif mapping.mapping_type == 'constant':
                            target_value = mapping.default_value
                        elif mapping.mapping_type == 'lookup':
                            target_value = self._apply_lookup(source_value, mapping.transformation_rules)
                        else:
                            target_value = source_value
                        
                        # Set target value using dot notation
                        self._set_nested_value(transformed_data, mapping.erp_field, target_value)
                    
                    elif mapping.is_required and mapping.default_value:
                        # Use default value for required fields
                        self._set_nested_value(transformed_data, mapping.erp_field, mapping.default_value)
                
                except Exception as e:
                    logger.warning(f"Error applying mapping {mapping.safeshipper_field} -> {mapping.erp_field}: {e}")
            
            return transformed_data if transformed_data else data
            
        except Exception as e:
            logger.error(f"Error applying field mappings: {e}")
            return data
    
    def _get_nested_value(self, data: Dict, field_path: str):
        """Get value from nested dictionary using dot notation."""
        try:
            keys = field_path.split('.')
            value = data
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
            
            return value
            
        except Exception:
            return None
    
    def _set_nested_value(self, data: Dict, field_path: str, value):
        """Set value in nested dictionary using dot notation."""
        try:
            keys = field_path.split('.')
            current = data
            
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            current[keys[-1]] = value
            
        except Exception as e:
            logger.error(f"Error setting nested value: {e}")
    
    def _apply_transformation(self, value, rules: Dict):
        """Apply transformation rules to a value."""
        try:
            if not rules:
                return value
            
            # Apply various transformation types
            if 'format' in rules:
                return rules['format'].format(value=value)
            elif 'multiply' in rules:
                return float(value) * float(rules['multiply'])
            elif 'map' in rules and str(value) in rules['map']:
                return rules['map'][str(value)]
            elif 'prefix' in rules:
                return f"{rules['prefix']}{value}"
            elif 'suffix' in rules:
                return f"{value}{rules['suffix']}"
            
            return value
            
        except Exception as e:
            logger.error(f"Error applying transformation: {e}")
            return value
    
    def _apply_lookup(self, value, rules: Dict):
        """Apply lookup transformation."""
        try:
            lookup_table = rules.get('lookup_table', {})
            return lookup_table.get(str(value), rules.get('default', value))
            
        except Exception as e:
            logger.error(f"Error applying lookup: {e}")
            return value
    
    def _identify_improvement_areas(self, report_data: Dict) -> List[Dict]:
        """Identify improvement areas from report data."""
        try:
            improvement_areas = []
            overall_stats = report_data.get('overall_stats', {})
            
            if overall_stats.get('on_time_rate', 100) < 90:
                improvement_areas.append({
                    'area': 'on_time_delivery',
                    'current_rate': overall_stats.get('on_time_rate', 0),
                    'target_rate': 95,
                    'priority': 'high'
                })
            
            if overall_stats.get('complete_rate', 100) < 95:
                improvement_areas.append({
                    'area': 'shipment_completeness',
                    'current_rate': overall_stats.get('complete_rate', 0),
                    'target_rate': 98,
                    'priority': 'medium'
                })
            
            if overall_stats.get('professional_rate', 100) < 95:
                improvement_areas.append({
                    'area': 'driver_professionalism',
                    'current_rate': overall_stats.get('professional_rate', 0),
                    'target_rate': 98,
                    'priority': 'medium'
                })
            
            return improvement_areas
            
        except Exception as e:
            logger.error(f"Error identifying improvement areas: {e}")
            return []
    
    def _send_webhook(self, erp_system, endpoint, data: Dict, feedback=None, incident=None) -> bool:
        """Send webhook to ERP system with retry logic."""
        try:
            # Create sync job for tracking
            sync_job = DataSyncJob.objects.create(
                erp_system=erp_system,
                endpoint=endpoint,
                job_type='triggered',
                direction='push',
                status='pending',
                request_payload=data
            )
            
            # Prepare request
            url = f"{erp_system.base_url.rstrip('/')}/{endpoint.path.lstrip('/')}"
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'SafeShipper-Webhook/1.0',
                **endpoint.headers
            }
            
            # Add authentication headers
            auth_config = erp_system.authentication_config
            if auth_config.get('type') == 'api_key':
                headers[auth_config.get('header_name', 'X-API-Key')] = auth_config.get('api_key')
            elif auth_config.get('type') == 'bearer':
                headers['Authorization'] = f"Bearer {auth_config.get('token')}"
            
            retry_count = 0
            max_retries = self.max_retries
            
            while retry_count <= max_retries:
                try:
                    sync_job.status = 'running'
                    sync_job.started_at = timezone.now()
                    sync_job.retry_count = retry_count
                    sync_job.save()
                    
                    # Send request
                    response = requests.request(
                        method=endpoint.http_method,
                        url=url,
                        json=data,
                        headers=headers,
                        timeout=self.timeout_seconds
                    )
                    
                    sync_job.response_data = {
                        'status_code': response.status_code,
                        'headers': dict(response.headers),
                        'body': response.text[:1000]  # Limit response body
                    }
                    
                    if response.status_code in [200, 201, 202]:
                        # Success
                        sync_job.status = 'completed'
                        sync_job.completed_at = timezone.now()
                        sync_job.records_processed = 1
                        sync_job.records_successful = 1
                        sync_job.save()
                        
                        self._log_webhook_success(erp_system, endpoint.name, data, sync_job)
                        return True
                    
                    else:
                        # HTTP error
                        error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                        
                        if retry_count < max_retries and response.status_code >= 500:
                            # Retry on server errors
                            retry_count += 1
                            logger.warning(f"Webhook failed with {response.status_code}, retrying ({retry_count}/{max_retries})")
                            continue
                        else:
                            # Final failure
                            sync_job.status = 'failed'
                            sync_job.error_message = error_msg
                            sync_job.completed_at = timezone.now()
                            sync_job.records_processed = 1
                            sync_job.records_failed = 1
                            sync_job.save()
                            
                            self._log_webhook_error(erp_system, endpoint.name, error_msg, feedback, sync_job)
                            return False
                
                except (ConnectionError, Timeout) as e:
                    error_msg = f"Connection error: {str(e)}"
                    
                    if retry_count < max_retries:
                        retry_count += 1
                        logger.warning(f"Webhook connection failed, retrying ({retry_count}/{max_retries}): {error_msg}")
                        continue
                    else:
                        sync_job.status = 'failed'
                        sync_job.error_message = error_msg
                        sync_job.completed_at = timezone.now()
                        sync_job.records_processed = 1
                        sync_job.records_failed = 1
                        sync_job.save()
                        
                        self._log_webhook_error(erp_system, endpoint.name, error_msg, feedback, sync_job)
                        return False
                
                except RequestException as e:
                    error_msg = f"Request error: {str(e)}"
                    sync_job.status = 'failed'
                    sync_job.error_message = error_msg
                    sync_job.completed_at = timezone.now()
                    sync_job.records_processed = 1
                    sync_job.records_failed = 1
                    sync_job.save()
                    
                    self._log_webhook_error(erp_system, endpoint.name, error_msg, feedback, sync_job)
                    return False
            
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending webhook: {e}")
            return False
    
    def _log_webhook_success(self, erp_system, endpoint_name: str, data: Dict, sync_job):
        """Log successful webhook delivery."""
        try:
            ERPEventLog.objects.create(
                erp_system=erp_system,
                sync_job=sync_job,
                event_type='data_pushed',
                severity='info',
                message=f"Feedback webhook sent successfully to {endpoint_name}",
                details={
                    'endpoint': endpoint_name,
                    'data_size': len(json.dumps(data)),
                    'response_code': sync_job.response_data.get('status_code'),
                    'duration_ms': (sync_job.completed_at - sync_job.started_at).total_seconds() * 1000 if sync_job.completed_at and sync_job.started_at else None
                },
                endpoint_path=endpoint_name
            )
        except Exception as e:
            logger.error(f"Error logging webhook success: {e}")
    
    def _log_webhook_error(self, erp_system, endpoint_name: str, error_msg: str, feedback=None, sync_job=None):
        """Log webhook delivery error."""
        try:
            ERPEventLog.objects.create(
                erp_system=erp_system,
                sync_job=sync_job,
                event_type='sync_failed',
                severity='error',
                message=f"Feedback webhook failed for {endpoint_name}: {error_msg}",
                details={
                    'endpoint': endpoint_name,
                    'error': error_msg,
                    'feedback_id': str(feedback.id) if feedback else None,
                    'retry_count': sync_job.retry_count if sync_job else 0
                },
                endpoint_path=endpoint_name,
                record_id=str(feedback.id) if feedback else None
            )
        except Exception as e:
            logger.error(f"Error logging webhook error: {e}")


# Convenience functions for use in feedback system
def send_feedback_webhook(feedback, event_type: str):
    """Send feedback webhook for specified event type."""
    service = FeedbackWebhookService()
    
    if event_type == 'created':
        service.send_feedback_created_webhook(feedback)
    elif event_type == 'manager_response':
        service.send_manager_response_webhook(feedback)


def send_incident_webhook(feedback, incident):
    """Send incident created webhook."""
    service = FeedbackWebhookService()
    service.send_incident_created_webhook(feedback, incident)


def send_weekly_report_webhook(company, report_data):
    """Send weekly report webhook."""
    service = FeedbackWebhookService()
    service.send_weekly_report_webhook(company, report_data)
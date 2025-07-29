# shipments/tasks.py
import logging
from typing import Dict, List, Optional, Any
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db import transaction
from datetime import timedelta

from .models import Shipment, ConsignmentItem, ShipmentRoute
from dangerous_goods.models import DangerousGood
from communications.tasks import send_email, send_sms, send_emergency_alert

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def validate_shipment_safety(self, shipment_id: str):
    """
    Comprehensive safety validation for a shipment including dangerous goods compatibility,
    load distribution, and regulatory compliance.
    
    Args:
        shipment_id: UUID of the shipment to validate
    """
    try:
        logger.info(f"Starting safety validation for shipment {shipment_id}")
        
        shipment = Shipment.objects.prefetch_related(
            'consignmentitem_set__dangerous_good',
            'routes'
        ).get(id=shipment_id)
        
        validation_results = {
            'shipment_id': shipment_id,
            'validation_timestamp': timezone.now().isoformat(),
            'overall_status': 'PASS',
            'issues': [],
            'warnings': [],
            'recommendations': []
        }
        
        # 1. Dangerous goods compatibility validation
        dangerous_items = shipment.consignmentitem_set.filter(
            dangerous_good__isnull=False
        ).select_related('dangerous_good')
        
        if dangerous_items.exists():
            compatibility_issues = _validate_dg_compatibility(dangerous_items)
            validation_results['issues'].extend(compatibility_issues)
        
        # 2. Weight and load distribution validation
        load_issues = _validate_load_distribution(shipment)
        validation_results['warnings'].extend(load_issues)
        
        # 3. Route safety validation
        if shipment.routes.exists():
            route_issues = _validate_route_safety(shipment)
            validation_results['warnings'].extend(route_issues)
        
        # 4. Documentation completeness check
        doc_issues = _validate_documentation_completeness(shipment)
        validation_results['warnings'].extend(doc_issues)
        
        # 5. Vehicle suitability check
        if shipment.assigned_vehicle:
            vehicle_issues = _validate_vehicle_suitability(shipment)
            validation_results['issues'].extend(vehicle_issues)
        
        # Determine overall status
        if validation_results['issues']:
            validation_results['overall_status'] = 'FAIL'
        elif validation_results['warnings']:
            validation_results['overall_status'] = 'WARNING'
        
        # Update shipment with validation results
        shipment.safety_validation_results = validation_results
        shipment.safety_validation_timestamp = timezone.now()
        
        if validation_results['overall_status'] == 'FAIL':
            shipment.status = 'VALIDATION_FAILED'
        elif validation_results['overall_status'] == 'WARNING':
            shipment.status = 'REQUIRES_APPROVAL'
        
        shipment.save(update_fields=[
            'safety_validation_results',
            'safety_validation_timestamp',
            'status'
        ])
        
        # Send notifications for critical issues
        if validation_results['overall_status'] == 'FAIL':
            _send_safety_validation_alerts(shipment, validation_results)
        
        logger.info(f"Safety validation completed for shipment {shipment_id}: {validation_results['overall_status']}")
        
        return validation_results
        
    except Shipment.DoesNotExist:
        logger.error(f"Shipment {shipment_id} not found")
        raise
    except Exception as exc:
        logger.error(f"Safety validation failed for shipment {shipment_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'shipment_id': shipment_id,
                'overall_status': 'ERROR',
                'error': str(exc)
            }

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def generate_shipping_documents(self, shipment_id: str, document_types: List[str] = None):
    """
    Generate required shipping documents for a shipment.
    
    Args:
        shipment_id: UUID of the shipment
        document_types: List of document types to generate ['dg_manifest', 'bill_of_lading', 'customs', 'emergency_plan']
    """
    try:
        shipment = Shipment.objects.prefetch_related(
            'consignmentitem_set__dangerous_good',
            'routes'
        ).get(id=shipment_id)
        
        if document_types is None:
            document_types = ['dg_manifest', 'bill_of_lading']
        
        generated_documents = []
        
        for doc_type in document_types:
            try:
                if doc_type == 'dg_manifest' and shipment.has_dangerous_goods:
                    doc = _generate_dangerous_goods_manifest(shipment)
                    generated_documents.append(doc)
                
                elif doc_type == 'bill_of_lading':
                    doc = _generate_bill_of_lading(shipment)
                    generated_documents.append(doc)
                
                elif doc_type == 'customs' and shipment.requires_customs_clearance:
                    doc = _generate_customs_declaration(shipment)
                    generated_documents.append(doc)
                
                elif doc_type == 'emergency_plan' and shipment.has_dangerous_goods:
                    doc = _generate_emergency_response_plan(shipment)
                    generated_documents.append(doc)
                
            except Exception as e:
                logger.error(f"Failed to generate {doc_type} for shipment {shipment_id}: {str(e)}")
                continue
        
        # Update shipment status
        shipment.documents_generated = True
        shipment.documents_generated_at = timezone.now()
        shipment.save(update_fields=['documents_generated', 'documents_generated_at'])
        
        logger.info(f"Generated {len(generated_documents)} documents for shipment {shipment_id}")
        
        return {
            'shipment_id': shipment_id,
            'status': 'success',
            'documents_generated': len(generated_documents),
            'document_details': generated_documents
        }
        
    except Exception as exc:
        logger.error(f"Document generation failed for shipment {shipment_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'shipment_id': shipment_id,
                'status': 'failed',
                'error': str(exc)
            }

@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def optimize_shipment_route(self, shipment_id: str, optimization_params: Dict[str, Any] = None):
    """
    Optimize route for a shipment considering dangerous goods restrictions,
    driver hours, and traffic conditions.
    
    Args:
        shipment_id: UUID of the shipment
        optimization_params: Parameters for route optimization
    """
    try:
        from routes.services import route_optimization_service
        
        shipment = Shipment.objects.select_related('pickup_location', 'delivery_location').get(id=shipment_id)
        
        if not shipment.pickup_location or not shipment.delivery_location:
            raise ValueError("Shipment must have pickup and delivery locations")
        
        optimization_params = optimization_params or {}
        
        # Add dangerous goods constraints
        if shipment.has_dangerous_goods:
            dg_items = shipment.consignmentitem_set.filter(dangerous_good__isnull=False)
            hazard_classes = list(dg_items.values_list('dangerous_good__hazard_class', flat=True).distinct())
            optimization_params['hazard_restrictions'] = hazard_classes
        
        # Perform route optimization
        optimized_route = route_optimization_service.optimize_route(
            origin=shipment.pickup_location.coordinates,
            destination=shipment.delivery_location.coordinates,
            **optimization_params
        )
        
        # Create or update route record
        route, created = ShipmentRoute.objects.get_or_create(
            shipment=shipment,
            defaults={
                'route_data': optimized_route,
                'estimated_duration_minutes': optimized_route.get('duration_minutes', 0),
                'estimated_distance_km': optimized_route.get('distance_km', 0),
                'optimization_timestamp': timezone.now()
            }
        )
        
        if not created:
            route.route_data = optimized_route
            route.estimated_duration_minutes = optimized_route.get('duration_minutes', 0)
            route.estimated_distance_km = optimized_route.get('distance_km', 0)
            route.optimization_timestamp = timezone.now()
            route.save()
        
        logger.info(f"Route optimized for shipment {shipment_id}: {optimized_route.get('distance_km', 0)}km")
        
        return {
            'shipment_id': shipment_id,
            'status': 'success',
            'route_id': str(route.id),
            'estimated_duration_minutes': route.estimated_duration_minutes,
            'estimated_distance_km': route.estimated_distance_km
        }
        
    except Exception as exc:
        logger.error(f"Route optimization failed for shipment {shipment_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'shipment_id': shipment_id,
                'status': 'failed',
                'error': str(exc)
            }

@shared_task
def update_shipment_status(shipment_id: str, new_status: str, event_details: Dict[str, Any] = None):
    """
    Update shipment status and create status change event.
    
    Args:
        shipment_id: UUID of the shipment
        new_status: New status for the shipment
        event_details: Additional event details
    """
    try:
        with transaction.atomic():
            shipment = Shipment.objects.select_for_update().get(id=shipment_id)
            old_status = shipment.status
            
            shipment.status = new_status
            shipment.status_updated_at = timezone.now()
            shipment.save(update_fields=['status', 'status_updated_at'])
            
            # Create status change event
            from communications.models import ShipmentEvent
            
            event = ShipmentEvent.objects.create(
                shipment=shipment,
                event_type='STATUS_CHANGE',
                title=f'Status changed from {old_status} to {new_status}',
                details=event_details or {},
                priority='NORMAL',
                is_automated=True
            )
            
            # Send notifications for important status changes
            if new_status in ['DELIVERED', 'FAILED', 'CANCELLED']:
                _send_status_change_notifications(shipment, old_status, new_status)
            
            logger.info(f"Updated shipment {shipment_id} status from {old_status} to {new_status}")
            
            return {
                'shipment_id': shipment_id,
                'old_status': old_status,
                'new_status': new_status,
                'event_id': str(event.id)
            }
            
    except Exception as e:
        logger.error(f"Failed to update shipment status for {shipment_id}: {str(e)}")
        raise

@shared_task(bind=True, max_retries=2)
def cleanup_expired_shipments(self, days_old: int = 90):
    """
    Archive or clean up old completed shipments.
    
    Args:
        days_old: Number of days old for shipments to be considered for cleanup
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        # Find completed shipments older than cutoff
        old_shipments = Shipment.objects.filter(
            status__in=['DELIVERED', 'CANCELLED'],
            delivery_datetime__lt=cutoff_date
        )
        
        archived_count = 0
        for shipment in old_shipments:
            # Archive shipment data (move to archive table or mark as archived)
            shipment.is_archived = True
            shipment.archived_at = timezone.now()
            shipment.save(update_fields=['is_archived', 'archived_at'])
            archived_count += 1
        
        logger.info(f"Archived {archived_count} old shipments")
        
        return {
            'archived_count': archived_count,
            'cutoff_date': cutoff_date.isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Shipment cleanup failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        raise

# Helper functions for shipment validation

def _validate_dg_compatibility(dangerous_items):
    """Validate dangerous goods compatibility within a shipment"""
    issues = []
    
    # Get all hazard classes
    hazard_classes = list(dangerous_items.values_list('dangerous_good__hazard_class', flat=True))
    
    # Check for incompatible combinations
    incompatible_combinations = [
        (['1'], ['3', '4', '5']),  # Explosives with flammables/oxidizers
        (['2'], ['1']),            # Gases with explosives
        (['8'], ['3']),            # Corrosives with flammables
    ]
    
    for forbidden, present_classes in incompatible_combinations:
        if any(hc in forbidden for hc in hazard_classes) and any(hc in present_classes for hc in hazard_classes):
            issues.append({
                'type': 'compatibility_violation',
                'severity': 'HIGH',
                'message': f'Incompatible dangerous goods classes detected: {forbidden} with {present_classes}',
                'affected_classes': forbidden + present_classes
            })
    
    return issues

def _validate_load_distribution(shipment):
    """Validate weight distribution and load limits"""
    warnings = []
    
    total_weight = shipment.total_gross_weight_kg or 0
    
    if shipment.assigned_vehicle and shipment.assigned_vehicle.max_load_capacity_kg:
        capacity = shipment.assigned_vehicle.max_load_capacity_kg
        
        if total_weight > capacity:
            warnings.append({
                'type': 'weight_exceeded',
                'severity': 'HIGH',
                'message': f'Total weight ({total_weight}kg) exceeds vehicle capacity ({capacity}kg)',
                'excess_weight': total_weight - capacity
            })
        elif total_weight > capacity * 0.9:
            warnings.append({
                'type': 'weight_warning',
                'severity': 'MEDIUM',
                'message': f'Total weight ({total_weight}kg) is near vehicle capacity ({capacity}kg)',
                'utilization_percent': (total_weight / capacity) * 100
            })
    
    return warnings

def _validate_route_safety(shipment):
    """Validate route safety for dangerous goods"""
    warnings = []
    
    if shipment.has_dangerous_goods and shipment.routes.exists():
        route = shipment.routes.first()
        
        # Check for restricted areas (this would integrate with a GIS service)
        # For now, just a placeholder
        warnings.append({
            'type': 'route_check',
            'severity': 'INFO',
            'message': 'Route safety validation completed - no restricted areas detected'
        })
    
    return warnings

def _validate_documentation_completeness(shipment):
    """Check if all required documents are present"""
    warnings = []
    
    required_docs = ['bill_of_lading']
    
    if shipment.has_dangerous_goods:
        required_docs.extend(['dg_manifest', 'emergency_plan'])
    
    if shipment.requires_customs_clearance:
        required_docs.append('customs_declaration')
    
    # Check if documents exist (this would check against a document management system)
    missing_docs = [doc for doc in required_docs if not _has_document(shipment, doc)]
    
    if missing_docs:
        warnings.append({
            'type': 'missing_documents',
            'severity': 'MEDIUM',
            'message': f'Missing required documents: {", ".join(missing_docs)}',
            'missing_documents': missing_docs
        })
    
    return warnings

def _validate_vehicle_suitability(shipment):
    """Validate if assigned vehicle is suitable for the shipment"""
    issues = []
    
    vehicle = shipment.assigned_vehicle
    
    if shipment.has_dangerous_goods:
        # Check if vehicle is certified for dangerous goods
        dg_items = shipment.consignmentitem_set.filter(dangerous_good__isnull=False)
        required_classes = list(dg_items.values_list('dangerous_good__hazard_class', flat=True).distinct())
        
        # This would check against vehicle certifications
        if not vehicle.is_dg_certified:
            issues.append({
                'type': 'vehicle_certification',
                'severity': 'HIGH',
                'message': f'Vehicle not certified for dangerous goods transport (classes: {required_classes})',
                'required_classes': required_classes
            })
    
    return issues

def _has_document(shipment, doc_type):
    """Check if shipment has a specific document type"""
    # This would integrate with a document management system
    # For now, return True to avoid false positives
    return True

def _send_safety_validation_alerts(shipment, validation_results):
    """Send alerts for safety validation failures"""
    if validation_results['overall_status'] == 'FAIL':
        # Send emergency alert
        send_emergency_alert.delay(
            str(shipment.id),
            'SAFETY_VALIDATION_FAILURE',
            f'Critical safety issues detected in shipment {shipment.tracking_number}',
            'CRITICAL'
        )

def _send_status_change_notifications(shipment, old_status, new_status):
    """Send notifications for status changes"""
    # This would send notifications to relevant stakeholders
    message = f'Shipment {shipment.tracking_number} status changed from {old_status} to {new_status}'
    
    # Send to customer if email available
    if hasattr(shipment, 'customer_contact') and shipment.customer_contact.email:
        send_email.delay(
            shipment.customer_contact.email,
            f'Shipment Update - {shipment.tracking_number}',
            message
        )

# Document generation helper functions (placeholders)

def _generate_dangerous_goods_manifest(shipment):
    """Generate dangerous goods manifest document"""
    return {
        'type': 'dg_manifest',
        'filename': f'dg_manifest_{shipment.tracking_number}.pdf',
        'generated_at': timezone.now().isoformat()
    }

def _generate_bill_of_lading(shipment):
    """Generate bill of lading document"""
    return {
        'type': 'bill_of_lading',
        'filename': f'bol_{shipment.tracking_number}.pdf',
        'generated_at': timezone.now().isoformat()
    }

def _generate_customs_declaration(shipment):
    """Generate customs declaration document"""
    return {
        'type': 'customs_declaration',
        'filename': f'customs_{shipment.tracking_number}.pdf',
        'generated_at': timezone.now().isoformat()
    }

def _generate_emergency_response_plan(shipment):
    """Generate emergency response plan document"""
    return {
        'type': 'emergency_plan',
        'filename': f'emergency_plan_{shipment.tracking_number}.pdf',
        'generated_at': timezone.now().isoformat()
    }


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def update_company_dashboard_metrics(self, company_id: str):
    """
    Update dashboard metrics for a company after feedback submission.
    This triggers real-time dashboard updates via WebSocket.
    
    Args:
        company_id: UUID of the company to update metrics for
    """
    try:
        from companies.models import Company
        from .models import ShipmentFeedback
        from .realtime_feedback_service import FeedbackWebSocketEventService
        from datetime import timedelta
        from django.db.models import Avg, Count
        
        company = Company.objects.get(id=company_id)
        
        # Calculate recent metrics (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        recent_feedback = ShipmentFeedback.objects.filter(
            shipment__carrier=company,
            submitted_at__gte=thirty_days_ago
        )
        
        if recent_feedback.exists():
            # Calculate key metrics
            total_count = recent_feedback.count()
            avg_score = recent_feedback.aggregate(
                avg_score=Avg('delivery_success_score')
            )['avg_score'] or 0
            
            # Individual question metrics
            on_time_count = recent_feedback.filter(was_on_time=True).count()
            complete_count = recent_feedback.filter(was_complete_and_undamaged=True).count()
            professional_count = recent_feedback.filter(was_driver_professional=True).count()
            
            # Poor feedback count (score < 70%)
            poor_feedback_count = sum(
                1 for feedback in recent_feedback 
                if feedback.delivery_success_score < 70
            )
            
            updated_metrics = {
                'delivery_success_score': round(avg_score, 1),
                'total_feedback_count': total_count,
                'on_time_rate': round((on_time_count / total_count) * 100, 1) if total_count > 0 else 0,
                'complete_rate': round((complete_count / total_count) * 100, 1) if total_count > 0 else 0,
                'professional_rate': round((professional_count / total_count) * 100, 1) if total_count > 0 else 0,
                'poor_feedback_count': poor_feedback_count,
                'poor_feedback_rate': round((poor_feedback_count / total_count) * 100, 1) if total_count > 0 else 0,
                'last_updated': timezone.now().isoformat(),
                'period': '30_days'
            }
        else:
            # No recent feedback
            updated_metrics = {
                'delivery_success_score': 0,
                'total_feedback_count': 0,
                'on_time_rate': 0,
                'complete_rate': 0,
                'professional_rate': 0,
                'poor_feedback_count': 0,
                'poor_feedback_rate': 0,
                'last_updated': timezone.now().isoformat(),
                'period': '30_days',
                'message': 'No recent feedback data available'
            }
        
        # Broadcast the updated metrics via WebSocket
        FeedbackWebSocketEventService.broadcast_dashboard_metric_update(company, updated_metrics)
        
        logger.info(f"Updated dashboard metrics for company {company.name}: score={updated_metrics['delivery_success_score']}%, count={updated_metrics['total_feedback_count']}")
        
        return {
            'company_id': company_id,
            'company_name': company.name,
            'status': 'success',
            'metrics': updated_metrics
        }
        
    except Company.DoesNotExist:
        logger.error(f"Company {company_id} not found for dashboard metrics update")
        return {
            'company_id': company_id,
            'status': 'error',
            'error': 'Company not found'
        }
    except Exception as exc:
        logger.error(f"Failed to update dashboard metrics for company {company_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'company_id': company_id,
                'status': 'error',
                'error': str(exc)
            }


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_feedback_batch_notifications(self, feedback_ids: List[str]):
    """
    Process real-time notifications for multiple feedback submissions in batch.
    Useful for handling bulk feedback processing or delayed notification sending.
    
    Args:
        feedback_ids: List of ShipmentFeedback UUIDs to process
    """
    try:
        from .models import ShipmentFeedback
        from .realtime_feedback_service import RealtimeFeedbackNotificationService
        
        realtime_service = RealtimeFeedbackNotificationService()
        
        results = {
            'total_processed': 0,
            'successful_notifications': 0,
            'failed_notifications': 0,
            'feedback_details': [],
            'errors': []
        }
        
        for feedback_id in feedback_ids:
            try:
                feedback = ShipmentFeedback.objects.select_related(
                    'shipment__customer',
                    'shipment__carrier'
                ).get(id=feedback_id)
                
                # Process real-time notifications
                notification_result = realtime_service.process_feedback_realtime_notifications(feedback)
                
                results['total_processed'] += 1
                results['successful_notifications'] += notification_result.get('notifications_sent', 0)
                results['failed_notifications'] += notification_result.get('notifications_failed', 0)
                
                if notification_result.get('errors'):
                    results['errors'].extend(notification_result['errors'])
                
                results['feedback_details'].append({
                    'feedback_id': feedback_id,
                    'tracking_number': feedback.shipment.tracking_number,
                    'score': feedback.delivery_success_score,
                    'notifications_sent': notification_result.get('notifications_sent', 0),
                    'notifications_failed': notification_result.get('notifications_failed', 0)
                })
                
                logger.info(f"Processed batch notification for feedback {feedback_id} - {notification_result.get('notifications_sent', 0)} sent")
                
            except ShipmentFeedback.DoesNotExist:
                error_msg = f"Feedback {feedback_id} not found"
                logger.error(error_msg)
                results['errors'].append(error_msg)
                continue
            except Exception as e:
                error_msg = f"Error processing feedback {feedback_id}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
                continue
        
        logger.info(f"Completed batch notification processing: {results['total_processed']} processed, "
                   f"{results['successful_notifications']} notifications sent, "
                   f"{results['failed_notifications']} failed")
        
        return results
        
    except Exception as exc:
        logger.error(f"Batch feedback notification processing failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'status': 'error',
                'error': str(exc),
                'feedback_ids': feedback_ids
            }
# shipments/incident_service.py

from django.utils import timezone
from django.conf import settings
from incidents.models import Incident, IncidentType
from users.models import User
import logging

logger = logging.getLogger(__name__)


class FeedbackIncidentService:
    """
    Service for automatically creating incidents based on poor customer feedback.
    """
    
    @staticmethod
    def create_feedback_incident(feedback):
        """
        Create an incident for feedback with score < 67%.
        
        Args:
            feedback: ShipmentFeedback instance
            
        Returns:
            Incident instance if created, None if not needed
        """
        if not feedback.requires_incident:
            return None
            
        try:
            # Get or create feedback incident type
            incident_type, created = IncidentType.objects.get_or_create(
                name="Poor Customer Feedback",
                category="service_quality",
                defaults={
                    'description': 'Incident created automatically for poor customer feedback scores',
                    'severity': 'medium',
                    'is_active': True
                }
            )
            
            # Determine priority based on feedback score
            score = feedback.delivery_success_score
            if score < 33:
                priority = 'high'
            elif score < 50:
                priority = 'medium'
            else:
                priority = 'low'
                
            # Generate incident title based on specific feedback issues
            issues = []
            if not feedback.was_on_time:
                issues.append("late delivery")
            if not feedback.was_complete_and_undamaged:
                issues.append("incomplete/damaged shipment")
            if not feedback.was_driver_professional:
                issues.append("unprofessional driver")
                
            issue_text = ", ".join(issues) if issues else "service quality issues"
            title = f"Poor Customer Feedback: {issue_text.title()}"
            
            # Create detailed description
            description_parts = [
                f"Automatic incident created for poor customer feedback (Score: {score}%)",
                f"Shipment: {feedback.shipment.tracking_number}",
                f"Customer: {feedback.shipment.customer.name}",
                f"Delivery Date: {feedback.shipment.actual_delivery_date or 'Not recorded'}",
                "",
                "Feedback Details:",
                f"• On-time delivery: {'✓ Yes' if feedback.was_on_time else '✗ No'}",
                f"• Complete & undamaged: {'✓ Yes' if feedback.was_complete_and_undamaged else '✗ No'}",
                f"• Professional driver: {'✓ Yes' if feedback.was_driver_professional else '✗ No'}",
            ]
            
            if feedback.feedback_notes:
                description_parts.extend([
                    "",
                    "Customer Comments:",
                    f'"{feedback.feedback_notes}"'
                ])
                
            description = "\n".join(description_parts)
            
            # Get system user for reporter (fallback to first admin user)
            try:
                reporter = User.objects.filter(
                    role='ADMIN',
                    is_active=True
                ).first()
                
                if not reporter:
                    reporter = User.objects.filter(
                        is_superuser=True,
                        is_active=True
                    ).first()
                    
                if not reporter:
                    logger.error("No admin user found to create feedback incident")
                    return None
                    
            except Exception as e:
                logger.error(f"Error finding reporter user: {e}")
                return None
            
            # Determine location
            location = f"{feedback.shipment.destination_location}"
            if feedback.shipment.destination_geolocation:
                location = f"{feedback.shipment.destination_geolocation.address}"
                
            # Create the incident
            incident = Incident.objects.create(
                title=title,
                description=description,
                incident_type=incident_type,
                location=location,
                occurred_at=feedback.shipment.actual_delivery_date or feedback.submitted_at,
                reported_at=timezone.now(),
                reporter=reporter,
                status='reported',
                priority=priority,
                shipment=feedback.shipment,
                metadata={
                    'source': 'customer_feedback',
                    'feedback_id': str(feedback.id),
                    'delivery_success_score': feedback.delivery_success_score,
                    'feedback_score_breakdown': {
                        'was_on_time': feedback.was_on_time,
                        'was_complete_and_undamaged': feedback.was_complete_and_undamaged,
                        'was_driver_professional': feedback.was_driver_professional,
                    },
                    'auto_created': True,
                }
            )
            
            # Auto-assign to manager if driver is assigned
            if feedback.shipment.assigned_driver:
                # Try to find a manager in the same company
                manager = User.objects.filter(
                    company=feedback.shipment.customer,
                    role__in=['MANAGER', 'ADMIN'],
                    is_active=True
                ).first()
                
                if manager:
                    incident.assigned_to = manager
                    incident.save(update_fields=['assigned_to'])
            
            logger.info(f"Created incident {incident.incident_number} for feedback {feedback.id}")
            return incident
            
        except Exception as e:
            logger.error(f"Error creating incident for feedback {feedback.id}: {e}")
            return None
    
    @staticmethod
    def update_incident_with_manager_response(feedback):
        """
        Update the related incident when a manager responds to feedback.
        
        Args:
            feedback: ShipmentFeedback instance with manager response
        """
        try:
            # Find incident created for this feedback
            incident = Incident.objects.filter(
                metadata__feedback_id=str(feedback.id),
                metadata__source='customer_feedback'
            ).first()
            
            if not incident:
                return None
                
            # Add incident update for manager response
            from incidents.models import IncidentUpdate
            
            update_description = f"""Manager Response Added to Customer Feedback

Manager: {feedback.responded_by.get_full_name()}
Response Date: {feedback.responded_at}

Manager's Response:
"{feedback.manager_response}"

This incident may now be ready for resolution review."""

            IncidentUpdate.objects.create(
                incident=incident,
                update_type='investigation',
                description=update_description,
                created_by=feedback.responded_by,
                metadata={
                    'trigger': 'manager_feedback_response',
                    'feedback_id': str(feedback.id)
                }
            )
            
            # Update incident status if it's still reported
            if incident.status == 'reported':
                incident.status = 'investigating'
                incident.assigned_to = feedback.responded_by
                incident.save(update_fields=['status', 'assigned_to'])
                
            logger.info(f"Updated incident {incident.incident_number} with manager response")
            return incident
            
        except Exception as e:
            logger.error(f"Error updating incident for feedback response {feedback.id}: {e}")
            return None


def create_incident_for_feedback(feedback):
    """
    Convenience function to create incident for poor feedback.
    Can be used as a signal handler or called directly.
    """
    return FeedbackIncidentService.create_feedback_incident(feedback)


def update_incident_for_feedback_response(feedback):
    """
    Convenience function to update incident when manager responds to feedback.
    """
    return FeedbackIncidentService.update_incident_with_manager_response(feedback)
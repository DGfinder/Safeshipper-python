# shipments/data_retention_service.py

from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import ShipmentFeedback
from datetime import datetime, timedelta
import logging
from typing import Dict, List
import hashlib
import uuid

User = get_user_model()
logger = logging.getLogger(__name__)


class FeedbackDataRetentionService:
    """
    Service for managing feedback data retention, anonymization, and archival
    according to SafeShipper's 24-month data retention policy.
    """
    
    def __init__(self):
        # Default retention periods (can be overridden by settings)
        self.retention_period_months = getattr(settings, 'FEEDBACK_RETENTION_MONTHS', 24)
        self.anonymization_period_months = getattr(settings, 'FEEDBACK_ANONYMIZATION_MONTHS', 18)
        self.warning_period_days = getattr(settings, 'FEEDBACK_RETENTION_WARNING_DAYS', 30)
        
    def get_retention_cutoff_date(self) -> datetime:
        """Get the cutoff date for data retention (24 months ago)."""
        return timezone.now() - timedelta(days=self.retention_period_months * 30)
    
    def get_anonymization_cutoff_date(self) -> datetime:
        """Get the cutoff date for data anonymization (18 months ago)."""
        return timezone.now() - timedelta(days=self.anonymization_period_months * 30)
    
    def get_warning_cutoff_date(self) -> datetime:
        """Get the cutoff date for retention warnings (23 months ago)."""
        cutoff = self.get_retention_cutoff_date()
        return cutoff + timedelta(days=self.warning_period_days)
    
    def identify_feedback_for_deletion(self) -> List[Dict]:
        """
        Identify feedback records that are eligible for deletion.
        
        Returns:
            List of dictionaries containing feedback info for deletion
        """
        try:
            cutoff_date = self.get_retention_cutoff_date()
            
            feedback_to_delete = ShipmentFeedback.objects.filter(
                submitted_at__lt=cutoff_date
            ).select_related(
                'shipment__carrier',
                'shipment__customer',
                'responded_by'
            )
            
            deletion_candidates = []
            for feedback in feedback_to_delete:
                deletion_candidates.append({
                    'feedback_id': feedback.id,
                    'shipment_id': feedback.shipment.id,
                    'tracking_number': feedback.shipment.tracking_number,
                    'carrier_name': feedback.shipment.carrier.name,
                    'customer_name': feedback.shipment.customer.name,
                    'submitted_at': feedback.submitted_at,
                    'score': feedback.delivery_success_score,
                    'has_manager_response': bool(feedback.manager_response),
                    'age_days': (timezone.now() - feedback.submitted_at).days
                })
            
            logger.info(f"Identified {len(deletion_candidates)} feedback records for deletion")
            return deletion_candidates
            
        except Exception as e:
            logger.error(f"Error identifying feedback for deletion: {e}")
            return []
    
    def identify_feedback_for_anonymization(self) -> List[Dict]:
        """
        Identify feedback records that are eligible for anonymization.
        
        Returns:
            List of dictionaries containing feedback info for anonymization
        """
        try:
            cutoff_date = self.get_anonymization_cutoff_date()
            retention_cutoff = self.get_retention_cutoff_date()
            
            # Get feedback older than anonymization cutoff but newer than deletion cutoff
            feedback_to_anonymize = ShipmentFeedback.objects.filter(
                submitted_at__lt=cutoff_date,
                submitted_at__gte=retention_cutoff,
                feedback_notes__isnull=False  # Only anonymize records with PII
            ).exclude(
                feedback_notes__exact=''
            ).select_related(
                'shipment__carrier',
                'shipment__customer'
            )
            
            # Exclude already anonymized records
            feedback_to_anonymize = feedback_to_anonymize.exclude(
                feedback_notes__startswith='[ANONYMIZED'
            )
            
            anonymization_candidates = []
            for feedback in feedback_to_anonymize:
                anonymization_candidates.append({
                    'feedback_id': feedback.id,
                    'shipment_id': feedback.shipment.id,
                    'tracking_number': feedback.shipment.tracking_number,
                    'carrier_name': feedback.shipment.carrier.name,
                    'customer_name': feedback.shipment.customer.name,
                    'submitted_at': feedback.submitted_at,
                    'age_days': (timezone.now() - feedback.submitted_at).days,
                    'has_notes': bool(feedback.feedback_notes),
                    'has_manager_response': bool(feedback.manager_response)
                })
            
            logger.info(f"Identified {len(anonymization_candidates)} feedback records for anonymization")
            return anonymization_candidates
            
        except Exception as e:
            logger.error(f"Error identifying feedback for anonymization: {e}")
            return []
    
    def identify_feedback_approaching_retention(self) -> List[Dict]:
        """
        Identify feedback records approaching retention cutoff (within warning period).
        
        Returns:
            List of dictionaries containing feedback info approaching deletion
        """
        try:
            warning_cutoff = self.get_warning_cutoff_date()
            retention_cutoff = self.get_retention_cutoff_date()
            
            feedback_approaching_deletion = ShipmentFeedback.objects.filter(
                submitted_at__lt=warning_cutoff,
                submitted_at__gte=retention_cutoff
            ).select_related(
                'shipment__carrier',
                'shipment__customer'
            )
            
            warning_candidates = []
            for feedback in feedback_approaching_deletion:
                days_until_deletion = (feedback.submitted_at - retention_cutoff).days
                
                warning_candidates.append({
                    'feedback_id': feedback.id,
                    'shipment_id': feedback.shipment.id,
                    'tracking_number': feedback.shipment.tracking_number,
                    'carrier_name': feedback.shipment.carrier.name,
                    'customer_name': feedback.shipment.customer.name,
                    'submitted_at': feedback.submitted_at,
                    'days_until_deletion': days_until_deletion,
                    'score': feedback.delivery_success_score
                })
            
            logger.info(f"Identified {len(warning_candidates)} feedback records approaching retention cutoff")
            return warning_candidates
            
        except Exception as e:
            logger.error(f"Error identifying feedback approaching retention: {e}")
            return []
    
    @transaction.atomic
    def anonymize_feedback_batch(self, feedback_ids: List[str], batch_size: int = 50) -> Dict:
        """
        Anonymize a batch of feedback records by removing PII.
        
        Args:
            feedback_ids: List of feedback IDs to anonymize
            batch_size: Number of records to process per batch
            
        Returns:
            Dictionary with anonymization results
        """
        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            # Process in batches to avoid memory issues
            for i in range(0, len(feedback_ids), batch_size):
                batch_ids = feedback_ids[i:i + batch_size]
                
                feedback_batch = ShipmentFeedback.objects.filter(
                    id__in=batch_ids
                ).select_for_update()
                
                for feedback in feedback_batch:
                    try:
                        results['processed'] += 1
                        
                        # Create anonymization hash for consistency
                        anon_hash = self._generate_anonymization_hash(feedback.id)
                        
                        # Anonymize feedback notes
                        if feedback.feedback_notes:
                            feedback.feedback_notes = f"[ANONYMIZED-{anon_hash[:8]}] Personal information removed per data retention policy. Original feedback length: {len(feedback.feedback_notes)} characters."
                        
                        # Anonymize manager response if it contains PII
                        if feedback.manager_response:
                            feedback.manager_response = f"[ANONYMIZED-{anon_hash[:8]}] Manager response anonymized per data retention policy. Original response length: {len(feedback.manager_response)} characters."
                        
                        # Add anonymization metadata
                        feedback.anonymized_at = timezone.now()
                        feedback.anonymization_hash = anon_hash
                        
                        feedback.save(update_fields=[
                            'feedback_notes', 'manager_response', 
                            'anonymized_at', 'anonymization_hash'
                        ])
                        
                        results['successful'] += 1
                        
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append({
                            'feedback_id': str(feedback.id),
                            'error': str(e)
                        })
                        logger.error(f"Failed to anonymize feedback {feedback.id}: {e}")
            
            logger.info(f"Anonymization batch completed: {results['successful']} successful, {results['failed']} failed")
            return results
            
        except Exception as e:
            logger.error(f"Error in anonymize_feedback_batch: {e}")
            results['errors'].append({'batch_error': str(e)})
            return results
    
    @transaction.atomic
    def delete_feedback_batch(self, feedback_ids: List[str], batch_size: int = 25) -> Dict:
        """
        Permanently delete a batch of feedback records past retention period.
        
        Args:
            feedback_ids: List of feedback IDs to delete
            batch_size: Number of records to process per batch
            
        Returns:
            Dictionary with deletion results
        """
        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'archived_data': [],
            'errors': []
        }
        
        try:
            # Process in smaller batches for deletion
            for i in range(0, len(feedback_ids), batch_size):
                batch_ids = feedback_ids[i:i + batch_size]
                
                feedback_batch = ShipmentFeedback.objects.filter(
                    id__in=batch_ids
                ).select_related('shipment__carrier')
                
                for feedback in feedback_batch:
                    try:
                        results['processed'] += 1
                        
                        # Archive critical metadata before deletion
                        archived_data = {
                            'feedback_id': str(feedback.id),
                            'tracking_number': feedback.shipment.tracking_number,
                            'carrier_id': str(feedback.shipment.carrier.id),
                            'submitted_at': feedback.submitted_at.isoformat(),
                            'delivery_success_score': feedback.delivery_success_score,
                            'was_on_time': feedback.was_on_time,
                            'was_complete_and_undamaged': feedback.was_complete_and_undamaged,
                            'was_driver_professional': feedback.was_driver_professional,
                            'had_manager_response': bool(feedback.manager_response),
                            'deleted_at': timezone.now().isoformat(),
                            'retention_policy_version': '1.0'
                        }
                        results['archived_data'].append(archived_data)
                        
                        # Perform deletion
                        feedback.delete()
                        results['successful'] += 1
                        
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append({
                            'feedback_id': str(feedback.id),
                            'error': str(e)
                        })
                        logger.error(f"Failed to delete feedback {feedback.id}: {e}")
            
            logger.info(f"Deletion batch completed: {results['successful']} successful, {results['failed']} failed")
            return results
            
        except Exception as e:
            logger.error(f"Error in delete_feedback_batch: {e}")
            results['errors'].append({'batch_error': str(e)})
            return results
    
    def run_data_retention_process(self, dry_run: bool = True) -> Dict:
        """
        Run the complete data retention process including anonymization and deletion.
        
        Args:
            dry_run: If True, only identify records without making changes
            
        Returns:
            Dictionary with process results
        """
        try:
            results = {
                'started_at': timezone.now().isoformat(),
                'dry_run': dry_run,
                'anonymization': {'identified': 0, 'processed': 0, 'successful': 0, 'failed': 0},
                'deletion': {'identified': 0, 'processed': 0, 'successful': 0, 'failed': 0},
                'warnings': {'identified': 0},
                'errors': []
            }
            
            # Step 1: Identify records for anonymization
            anonymization_candidates = self.identify_feedback_for_anonymization()
            results['anonymization']['identified'] = len(anonymization_candidates)
            
            # Step 2: Identify records for deletion
            deletion_candidates = self.identify_feedback_for_deletion()
            results['deletion']['identified'] = len(deletion_candidates)
            
            # Step 3: Identify records approaching retention
            warning_candidates = self.identify_feedback_approaching_retention()
            results['warnings']['identified'] = len(warning_candidates)
            
            if not dry_run:
                # Step 4: Perform anonymization
                if anonymization_candidates:
                    anonymization_ids = [candidate['feedback_id'] for candidate in anonymization_candidates]
                    anon_results = self.anonymize_feedback_batch(anonymization_ids)
                    results['anonymization'].update({
                        'processed': anon_results['processed'],
                        'successful': anon_results['successful'],
                        'failed': anon_results['failed']
                    })
                    if anon_results['errors']:
                        results['errors'].extend(anon_results['errors'])
                
                # Step 5: Perform deletion
                if deletion_candidates:
                    deletion_ids = [candidate['feedback_id'] for candidate in deletion_candidates]
                    deletion_results = self.delete_feedback_batch(deletion_ids)
                    results['deletion'].update({
                        'processed': deletion_results['processed'],
                        'successful': deletion_results['successful'],
                        'failed': deletion_results['failed']
                    })
                    if deletion_results['errors']:
                        results['errors'].extend(deletion_results['errors'])
                    
                    # Store archived data (could be sent to long-term storage)
                    if deletion_results['archived_data']:
                        self._store_archived_data(deletion_results['archived_data'])
            
            results['completed_at'] = timezone.now().isoformat()
            
            # Log summary
            logger.info(f"Data retention process completed - Anonymization: {results['anonymization']['identified']} identified, Deletion: {results['deletion']['identified']} identified, Warnings: {results['warnings']['identified']} identified")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in run_data_retention_process: {e}")
            return {
                'error': str(e),
                'started_at': timezone.now().isoformat(),
                'failed': True
            }
    
    def _generate_anonymization_hash(self, feedback_id: uuid.UUID) -> str:
        """Generate consistent anonymization hash for feedback record."""
        hash_input = f"{feedback_id}{settings.SECRET_KEY}{self.retention_period_months}"
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    def _store_archived_data(self, archived_data: List[Dict]):
        """Store archived data for compliance purposes (placeholder for external storage)."""
        try:
            # This could integrate with AWS S3, Azure Blob Storage, or other long-term storage
            # For now, log the archived data structure
            logger.info(f"Archived {len(archived_data)} feedback records for compliance")
            
            # Example: Save to JSON file or send to external storage service
            # import json
            # with open(f"feedback_archive_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json", 'w') as f:
            #     json.dump(archived_data, f, indent=2)
            
        except Exception as e:
            logger.error(f"Error storing archived data: {e}")
    
    def get_retention_policy_status(self) -> Dict:
        """
        Get current status of data retention policy compliance.
        
        Returns:
            Dictionary with retention policy status
        """
        try:
            now = timezone.now()
            total_feedback = ShipmentFeedback.objects.count()
            
            # Count by age categories
            retention_cutoff = self.get_retention_cutoff_date()
            anonymization_cutoff = self.get_anonymization_cutoff_date()
            warning_cutoff = self.get_warning_cutoff_date()
            
            overdue_for_deletion = ShipmentFeedback.objects.filter(
                submitted_at__lt=retention_cutoff
            ).count()
            
            due_for_anonymization = ShipmentFeedback.objects.filter(
                submitted_at__lt=anonymization_cutoff,
                submitted_at__gte=retention_cutoff
            ).exclude(
                feedback_notes__startswith='[ANONYMIZED'
            ).count()
            
            approaching_retention = ShipmentFeedback.objects.filter(
                submitted_at__lt=warning_cutoff,
                submitted_at__gte=retention_cutoff
            ).count()
            
            already_anonymized = ShipmentFeedback.objects.filter(
                feedback_notes__startswith='[ANONYMIZED'
            ).count()
            
            return {
                'policy_version': '1.0',
                'retention_period_months': self.retention_period_months,
                'anonymization_period_months': self.anonymization_period_months,
                'total_feedback_records': total_feedback,
                'overdue_for_deletion': overdue_for_deletion,
                'due_for_anonymization': due_for_anonymization,
                'approaching_retention': approaching_retention,
                'already_anonymized': already_anonymized,
                'compliance_percentage': round(
                    ((total_feedback - overdue_for_deletion - due_for_anonymization) / total_feedback * 100) 
                    if total_feedback > 0 else 100, 2
                ),
                'last_checked': now.isoformat(),
                'next_retention_cutoff': retention_cutoff.isoformat(),
                'next_anonymization_cutoff': anonymization_cutoff.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting retention policy status: {e}")
            return {'error': str(e)}


# Convenience functions for management commands and Celery tasks
def run_data_retention_process(dry_run: bool = True):
    """Run data retention process - convenience function for scheduled tasks."""
    service = FeedbackDataRetentionService()
    return service.run_data_retention_process(dry_run=dry_run)


def get_retention_status():
    """Get retention policy status - convenience function."""
    service = FeedbackDataRetentionService()
    return service.get_retention_policy_status()
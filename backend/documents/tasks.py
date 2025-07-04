# documents/tasks.py
import logging
import time
from datetime import timezone, datetime
from celery import shared_task
from django.utils import timezone as django_timezone
from django.core.exceptions import ObjectDoesNotExist

from .models import Document, DocumentStatus
from .services import analyze_manifest

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_manifest_validation(self, document_id):
    """
    Asynchronous task to process and validate a manifest document.
    
    Args:
        document_id: UUID string of the Document to process
        
    Returns:
        dict: Processing results summary
    """
    start_time = time.time()
    
    try:
        logger.info(f"Starting manifest validation for document {document_id}")
        
        # Get the document
        try:
            document = Document.objects.get(id=document_id)
        except ObjectDoesNotExist:
            error_msg = f"Document {document_id} not found"
            logger.error(error_msg)
            raise Exception(error_msg)
        
        # Update status to processing
        document.status = DocumentStatus.PROCESSING
        document.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Updated document {document_id} status to PROCESSING")
        
        # Validate that we have a PDF file
        if not document.file:
            raise Exception("No file attached to document")
        
        if not document.is_pdf():
            raise Exception(f"File is not a PDF: {document.get_file_extension()}")
        
        # Call the analysis service
        try:
            analysis_results = analyze_manifest(document)
        except Exception as e:
            logger.error(f"Analysis failed for document {document_id}: {str(e)}")
            raise Exception(f"Manifest analysis failed: {str(e)}")
        
        # Determine final status based on results
        potential_dgs = analysis_results.get('potential_dangerous_goods', [])
        
        if potential_dgs:
            final_status = DocumentStatus.VALIDATED_WITH_ERRORS
            status_message = f"Found {len(potential_dgs)} potential dangerous goods requiring confirmation"
        else:
            final_status = DocumentStatus.VALIDATED_OK
            status_message = "No dangerous goods found in manifest"
        
        # Add processing metadata
        processing_time = time.time() - start_time
        analysis_results['metadata'] = analysis_results.get('metadata', {})
        analysis_results['metadata'].update({
            'processing_time_seconds': round(processing_time, 2),
            'processed_at': django_timezone.now().isoformat(),
            'task_id': self.request.id,
            'worker_id': self.request.hostname,
            'status_message': status_message
        })
        
        # Update document with results
        document.status = final_status
        document.validation_results = analysis_results
        document.save(update_fields=['status', 'validation_results', 'updated_at'])
        
        logger.info(
            f"Completed manifest validation for document {document_id} "
            f"in {processing_time:.2f}s. Status: {final_status}, "
            f"Found {len(potential_dgs)} potential DGs"
        )
        
        return {
            'document_id': document_id,
            'status': final_status,
            'processing_time': processing_time,
            'potential_dangerous_goods_count': len(potential_dgs),
            'message': status_message
        }
        
    except Exception as exc:
        processing_time = time.time() - start_time
        
        logger.error(
            f"Error processing document {document_id} after {processing_time:.2f}s: {str(exc)}"
        )
        
        # Update document status to failed
        try:
            document = Document.objects.get(id=document_id)
            document.status = DocumentStatus.PROCESSING_FAILED
            document.validation_results = {
                'error': str(exc),
                'failed_at': django_timezone.now().isoformat(),
                'processing_time_seconds': round(processing_time, 2),
                'task_id': self.request.id,
                'retry_count': self.request.retries
            }
            document.save(update_fields=['status', 'validation_results', 'updated_at'])
        except Exception as save_error:
            logger.error(f"Failed to update document status after error: {str(save_error)}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            # Calculate retry delay (exponential backoff)
            retry_delay = 60 * (2 ** self.request.retries)  # 1min, 2min, 4min
            
            logger.info(
                f"Retrying document {document_id} processing in {retry_delay} seconds "
                f"(attempt {self.request.retries + 1}/{self.max_retries})"
            )
            
            raise self.retry(countdown=retry_delay, exc=exc)
        else:
            logger.error(
                f"Max retries exceeded for document {document_id}. "
                f"Processing permanently failed: {str(exc)}"
            )
            
            # Final failure - no more retries
            raise Exception(f"Processing failed after {self.max_retries} retries: {str(exc)}")

@shared_task
def cleanup_old_processing_documents():
    """
    Cleanup task to handle documents stuck in processing state.
    Should be run periodically (e.g., every hour) to catch any documents
    that got stuck due to worker failures.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    # Find documents that have been processing for more than 30 minutes
    cutoff_time = timezone.now() - timedelta(minutes=30)
    
    stuck_documents = Document.objects.filter(
        status__in=[DocumentStatus.QUEUED, DocumentStatus.PROCESSING],
        updated_at__lt=cutoff_time
    )
    
    count = 0
    for document in stuck_documents:
        logger.warning(f"Found stuck document {document.id}, marking as failed")
        
        document.status = DocumentStatus.PROCESSING_FAILED
        document.validation_results = {
            'error': 'Processing timeout - document was stuck',
            'failed_at': timezone.now().isoformat(),
            'cleanup_reason': 'automatic_timeout_cleanup'
        }
        document.save(update_fields=['status', 'validation_results', 'updated_at'])
        count += 1
    
    if count > 0:
        logger.info(f"Cleaned up {count} stuck documents")
    
    return {
        'cleaned_up_count': count,
        'cutoff_time': cutoff_time.isoformat()
    }

@shared_task
def reprocess_failed_document(document_id):
    """
    Task to reprocess a failed document.
    
    Args:
        document_id: UUID string of the Document to reprocess
    """
    logger.info(f"Reprocessing failed document {document_id}")
    
    try:
        document = Document.objects.get(id=document_id)
        
        if document.status != DocumentStatus.PROCESSING_FAILED:
            raise Exception(f"Document {document_id} is not in PROCESSING_FAILED status")
        
        # Reset status and clear previous error results
        document.status = DocumentStatus.QUEUED
        if document.validation_results:
            # Keep the error history but mark as reprocessing
            document.validation_results['reprocessing_started_at'] = django_timezone.now().isoformat()
        
        document.save(update_fields=['status', 'validation_results', 'updated_at'])
        
        # Start processing again
        return process_manifest_validation.delay(document_id)
        
    except ObjectDoesNotExist:
        error_msg = f"Document {document_id} not found for reprocessing"
        logger.error(error_msg)
        raise Exception(error_msg)
    except Exception as e:
        logger.error(f"Failed to start reprocessing for document {document_id}: {str(e)}")
        raise
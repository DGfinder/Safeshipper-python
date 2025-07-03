from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils.translation import gettext_lazy as _
from documents.models import Document
from .services import run_manifest_validation

logger = get_task_logger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
    rate_limit='10/m'  # Max 10 tasks per minute
)
def process_manifest_validation(self, document_id: str):
    """
    Celery task to process and validate a DG manifest.
    
    Args:
        document_id: UUID of the Document to process
        
    The task will:
    1. Update document status to PROCESSING
    2. Extract text from PDF
    3. Identify DG items
    4. Validate compatibility
    5. Update document with results
    """
    try:
        # Get the document
        document = Document.objects.get(
            id=document_id,
            document_type=Document.DocumentType.DG_MANIFEST
        )
        
        # Update status
        document.status = Document.DocumentStatus.PROCESSING
        document.save(update_fields=['status'])
        
        # Run validation
        validation_results = run_manifest_validation(document)
        
        # Update document with results
        document.validation_results = validation_results
        document.status = (
            Document.DocumentStatus.VALIDATED_OK
            if not validation_results.get('validation_errors')
            else Document.DocumentStatus.VALIDATED_WITH_ERRORS
        )
        document.save(update_fields=['status', 'validation_results'])
        
        logger.info(
            _("Manifest validation completed for document %(doc_id)s"),
            {'doc_id': document_id}
        )
        
    except Document.DoesNotExist:
        logger.error(
            _("Document %(doc_id)s not found"),
            {'doc_id': document_id}
        )
        raise
    
    except Exception as exc:
        logger.error(
            _("Error processing manifest %(doc_id)s: %(error)s"),
            {
                'doc_id': document_id,
                'error': str(exc)
            }
        )
        
        # Update document status
        try:
            document.status = Document.DocumentStatus.PROCESSING_FAILED
            document.validation_results = {
                'error': str(exc),
                'validation_errors': [
                    _("Processing failed: {error}").format(error=str(exc))
                ]
            }
            document.save(update_fields=['status', 'validation_results'])
        except Exception as save_error:
            logger.error(
                _("Failed to update document status: %(error)s"),
                {'error': str(save_error)}
            )
        
        # Retry the task
        raise self.retry(exc=exc) 
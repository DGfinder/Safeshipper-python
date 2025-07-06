from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils.translation import gettext_lazy as _
from documents.models import Document
from .services import run_manifest_validation, create_manifest_from_document, run_enhanced_manifest_analysis
from .models import ManifestType

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
        
        # Create manifest record if it doesn't exist
        if not hasattr(document, 'manifest'):
            create_manifest_from_document(document, ManifestType.DG_MANIFEST)
        
        # Run enhanced analysis
        enhanced_results = run_enhanced_manifest_analysis(document)
        
        # Update document with results (maintaining backward compatibility)
        legacy_validation_results = run_manifest_validation(document)
        document.validation_results = legacy_validation_results
        
        # Determine status based on whether dangerous goods were found and if there are errors
        has_dgs = enhanced_results.get('total_potential_dgs', 0) > 0
        has_errors = bool(legacy_validation_results.get('validation_errors'))
        
        if has_errors:
            document.status = Document.DocumentStatus.PROCESSING_FAILED
        elif has_dgs:
            document.status = Document.DocumentStatus.VALIDATED_WITH_ERRORS  # Requires user confirmation
        else:
            document.status = Document.DocumentStatus.VALIDATED_OK
        
        document.save(update_fields=['status', 'validation_results'])
        
        logger.info(
            _("Enhanced manifest validation completed for document %(doc_id)s. Found %(dg_count)s potential dangerous goods."),
            {'doc_id': document_id, 'dg_count': enhanced_results.get('total_potential_dgs', 0)}
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
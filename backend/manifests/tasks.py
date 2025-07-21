from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils.translation import gettext_lazy as _
from django.core.cache import cache
from django.utils import timezone
import json
from typing import Dict, Any, Optional
from documents.models import Document
from .services import run_manifest_validation, create_manifest_from_document, run_enhanced_manifest_analysis
from .models import ManifestType
from .ocr_service import ocr_service
from dangerous_goods.services import find_dgs_by_text_search

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


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=120,  # 2 minutes
    rate_limit='5/m',  # Max 5 OCR tasks per minute
    time_limit=300  # 5 minute timeout
)
def process_manifest_with_enhanced_ocr(self, document_id: str, use_ocr: bool = True, engines: Optional[list] = None):
    """
    Enhanced Celery task for processing manifests with advanced OCR capabilities.
    
    Args:
        document_id: UUID of the Document to process
        use_ocr: Whether to use OCR for text extraction
        engines: List of OCR engines to use ['tesseract', 'aws', 'google']
        
    Returns:
        Dict with processing results including OCR confidence and detected dangerous goods
    """
    processing_start = timezone.now()
    task_id = self.request.id
    
    # Set task status in cache for real-time updates
    cache_key = f"manifest_processing:{document_id}"
    cache.set(cache_key, {
        'status': 'processing',
        'stage': 'initializing',
        'progress': 0,
        'task_id': task_id,
        'started_at': processing_start.isoformat()
    }, timeout=3600)
    
    try:
        # Get the document
        document = Document.objects.get(id=document_id)
        
        # Update status
        document.status = Document.DocumentStatus.PROCESSING
        document.save(update_fields=['status'])
        
        # Stage 1: Text Extraction (OCR or direct)
        cache.set(cache_key, {
            'status': 'processing',
            'stage': 'text_extraction',
            'progress': 20,
            'task_id': task_id
        }, timeout=3600)
        
        extracted_text = ""
        ocr_confidence = 0.0
        processing_method = "direct"
        
        if use_ocr:
            logger.info(f"Starting OCR processing for document {document_id}")
            ocr_result = ocr_service.extract_text_with_ocr(
                document.file.path,
                engines=engines or ['tesseract']
            )
            
            # Combine text from all pages
            extracted_text = "\n".join([page.text for page in ocr_result.pages])
            ocr_confidence = ocr_result.total_confidence
            processing_method = f"ocr_{'+'.join(ocr_result.engines_used)}"
            
            logger.info(f"OCR completed with confidence: {ocr_confidence:.2f}")
        else:
            # Use existing direct PDF text extraction
            from .services import extract_text_from_pdf
            extracted_text = extract_text_from_pdf(document)
            ocr_confidence = 1.0  # Direct extraction assumed 100% accurate
            processing_method = "direct_pdf"
        
        # Stage 2: Dangerous Goods Detection
        cache.set(cache_key, {
            'status': 'processing',
            'stage': 'dg_detection',
            'progress': 50,
            'task_id': task_id
        }, timeout=3600)
        
        logger.info(f"Starting dangerous goods detection for document {document_id}")
        dangerous_goods_matches = find_dgs_by_text_search(extracted_text)
        
        # Stage 3: Enhanced Analysis
        cache.set(cache_key, {
            'status': 'processing', 
            'stage': 'analysis',
            'progress': 75,
            'task_id': task_id
        }, timeout=3600)
        
        # Create manifest record if it doesn't exist
        if not hasattr(document, 'manifest'):
            create_manifest_from_document(document, ManifestType.DG_MANIFEST)
        
        # Run enhanced analysis with the extracted text
        enhanced_results = run_enhanced_manifest_analysis(document)
        
        # Stage 4: Finalization
        cache.set(cache_key, {
            'status': 'processing',
            'stage': 'finalizing', 
            'progress': 90,
            'task_id': task_id
        }, timeout=3600)
        
        # Compile comprehensive results
        processing_time = (timezone.now() - processing_start).total_seconds()
        
        comprehensive_results = {
            'processing_method': processing_method,
            'ocr_confidence': ocr_confidence,
            'text_length': len(extracted_text),
            'dangerous_goods_detected': len(dangerous_goods_matches),
            'dangerous_goods_matches': [
                {
                    'dangerous_good': {
                        'id': str(match['dangerous_good'].id),
                        'un_number': match['dangerous_good'].un_number,
                        'proper_shipping_name': match['dangerous_good'].proper_shipping_name,
                        'hazard_class': match['dangerous_good'].hazard_class,
                        'packing_group': match['dangerous_good'].packing_group
                    },
                    'matched_term': match['matched_term'],
                    'confidence': match['confidence'],
                    'match_type': match['match_type']
                }
                for match in dangerous_goods_matches
            ],
            'enhanced_results': enhanced_results,
            'processing_time': processing_time,
            'timestamp': timezone.now().isoformat()
        }
        
        # Update document with comprehensive results
        document.validation_results = comprehensive_results
        
        # Determine final status
        has_dgs = len(dangerous_goods_matches) > 0
        high_confidence = ocr_confidence >= 0.8
        
        if has_dgs and high_confidence:
            document.status = Document.DocumentStatus.VALIDATED_WITH_ERRORS  # Requires confirmation
        elif has_dgs:
            document.status = Document.DocumentStatus.AWAITING_CONFIRMATION  # Low confidence, needs review
        else:
            document.status = Document.DocumentStatus.VALIDATED_OK
        
        document.save(update_fields=['status', 'validation_results'])
        
        # Update cache with completion
        cache.set(cache_key, {
            'status': 'completed',
            'stage': 'complete',
            'progress': 100,
            'task_id': task_id,
            'results': {
                'dangerous_goods_count': len(dangerous_goods_matches),
                'ocr_confidence': ocr_confidence,
                'processing_time': processing_time
            }
        }, timeout=3600)
        
        logger.info(
            f"Enhanced manifest processing completed for document {document_id}. "
            f"Found {len(dangerous_goods_matches)} dangerous goods with {ocr_confidence:.2f} OCR confidence"
        )
        
        return comprehensive_results
        
    except Document.DoesNotExist:
        error_msg = f"Document {document_id} not found"
        logger.error(error_msg)
        cache.set(cache_key, {
            'status': 'failed',
            'error': error_msg,
            'task_id': task_id
        }, timeout=3600)
        raise
        
    except Exception as exc:
        error_msg = f"Error processing manifest {document_id}: {str(exc)}"
        logger.error(error_msg)
        
        # Update cache with error
        cache.set(cache_key, {
            'status': 'failed',
            'error': error_msg,
            'task_id': task_id
        }, timeout=3600)
        
        # Update document status
        try:
            document = Document.objects.get(id=document_id)
            document.status = Document.DocumentStatus.PROCESSING_FAILED
            document.validation_results = {
                'error': str(exc),
                'processing_method': 'failed',
                'timestamp': timezone.now().isoformat()
            }
            document.save(update_fields=['status', 'validation_results'])
        except Exception as save_error:
            logger.error(f"Failed to update document status: {save_error}")
        
        # Retry the task
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=1,
    rate_limit='20/m'  # Allow more frequent batch processing checks
)
def batch_process_manifests(self, document_ids: list, processing_options: Optional[Dict] = None):
    """
    Process multiple manifests in batch with queue management
    
    Args:
        document_ids: List of document IDs to process
        processing_options: Dict with options like use_ocr, engines, etc.
    """
    options = processing_options or {}
    batch_id = f"batch_{timezone.now().strftime('%Y%m%d_%H%M%S')}_{self.request.id[:8]}"
    
    # Initialize batch tracking
    batch_cache_key = f"batch_processing:{batch_id}"
    cache.set(batch_cache_key, {
        'total_documents': len(document_ids),
        'completed': 0,
        'failed': 0,
        'in_progress': 0,
        'status': 'started',
        'started_at': timezone.now().isoformat()
    }, timeout=7200)  # 2 hours
    
    try:
        logger.info(f"Starting batch processing of {len(document_ids)} documents")
        
        # Queue individual processing tasks
        task_results = []
        for doc_id in document_ids:
            # Use the enhanced processing task
            task = process_manifest_with_enhanced_ocr.delay(
                doc_id,
                use_ocr=options.get('use_ocr', True),
                engines=options.get('engines', ['tesseract'])
            )
            task_results.append({'document_id': doc_id, 'task_id': task.id})
        
        # Update batch status
        cache.set(batch_cache_key, {
            'total_documents': len(document_ids),
            'completed': 0,
            'failed': 0,
            'in_progress': len(document_ids),
            'status': 'processing',
            'tasks': task_results,
            'started_at': timezone.now().isoformat()
        }, timeout=7200)
        
        logger.info(f"Queued {len(task_results)} processing tasks for batch {batch_id}")
        
        return {
            'batch_id': batch_id,
            'queued_tasks': len(task_results),
            'task_details': task_results
        }
        
    except Exception as exc:
        logger.error(f"Batch processing failed: {exc}")
        cache.set(batch_cache_key, {
            'total_documents': len(document_ids),
            'status': 'failed',
            'error': str(exc),
            'started_at': timezone.now().isoformat()
        }, timeout=7200)
        raise


@shared_task(
    bind=True,
    rate_limit='10/m'
)
def get_processing_status(self, document_id: str):
    """
    Get real-time processing status for a document
    
    Args:
        document_id: Document ID to check status for
        
    Returns:
        Dict with current processing status, progress, and results
    """
    cache_key = f"manifest_processing:{document_id}"
    cached_status = cache.get(cache_key)
    
    if cached_status:
        return cached_status
    
    # Check document status in database as fallback
    try:
        document = Document.objects.get(id=document_id)
        return {
            'status': 'completed' if document.status in [
                Document.DocumentStatus.VALIDATED_OK,
                Document.DocumentStatus.VALIDATED_WITH_ERRORS,
                Document.DocumentStatus.AWAITING_CONFIRMATION
            ] else 'unknown',
            'document_status': document.status,
            'results': document.validation_results or {}
        }
    except Document.DoesNotExist:
        return {'status': 'not_found', 'error': 'Document not found'} 
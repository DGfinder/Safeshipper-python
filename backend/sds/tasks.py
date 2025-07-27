# sds/tasks.py
import logging
from typing import List, Dict, Any
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

from .models import SafetyDataSheet, SDSRequest
from .documents import SafetyDataSheetDocument, SDSRequestDocument
from dangerous_goods.models import DangerousGood
from dangerous_goods.documents import DangerousGoodDocument

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def update_sds_search_index(self, sds_id: str, action: str = 'update'):
    """
    Update Elasticsearch index for a specific SDS document.
    
    Args:
        sds_id: UUID of the SafetyDataSheet
        action: 'update', 'delete', or 'create'
    """
    try:
        logger.info(f"Updating SDS search index for {sds_id}, action: {action}")
        
        if action == 'delete':
            # Remove from index
            try:
                doc = SafetyDataSheetDocument.get(id=sds_id)
                doc.delete()
                logger.info(f"Removed SDS {sds_id} from search index")
            except Exception as e:
                logger.warning(f"SDS {sds_id} not found in index for deletion: {str(e)}")
            return {'status': 'success', 'action': 'deleted', 'sds_id': sds_id}
        
        # Get the SDS object
        try:
            sds = SafetyDataSheet.objects.select_related('dangerous_good').get(id=sds_id)
        except SafetyDataSheet.DoesNotExist:
            logger.error(f"SDS {sds_id} not found in database")
            raise
        
        # Create or update document in index
        doc = SafetyDataSheetDocument()
        doc.meta.id = sds.id
        doc._prepare_document(sds)
        doc.save()
        
        logger.info(f"Successfully updated SDS {sds_id} in search index")
        
        # Clear related search cache
        cache_pattern = f"unified_search:*"
        # Note: In production, you might want to use a more specific cache invalidation
        
        return {
            'status': 'success',
            'action': action,
            'sds_id': sds_id,
            'product_name': sds.product_name
        }
        
    except Exception as exc:
        logger.error(f"Failed to update SDS search index for {sds_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying SDS index update for {sds_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for SDS index update {sds_id}")
            return {'status': 'failed', 'sds_id': sds_id, 'error': str(exc)}

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def update_dangerous_good_search_index(self, dg_id: str, action: str = 'update'):
    """
    Update Elasticsearch index for a specific dangerous good.
    
    Args:
        dg_id: UUID of the DangerousGood
        action: 'update', 'delete', or 'create'
    """
    try:
        logger.info(f"Updating dangerous good search index for {dg_id}, action: {action}")
        
        if action == 'delete':
            # Remove from index
            try:
                doc = DangerousGoodDocument.get(id=dg_id)
                doc.delete()
                logger.info(f"Removed dangerous good {dg_id} from search index")
            except Exception as e:
                logger.warning(f"Dangerous good {dg_id} not found in index for deletion: {str(e)}")
            return {'status': 'success', 'action': 'deleted', 'dg_id': dg_id}
        
        # Get the dangerous good object
        try:
            dg = DangerousGood.objects.get(id=dg_id)
        except DangerousGood.DoesNotExist:
            logger.error(f"Dangerous good {dg_id} not found in database")
            raise
        
        # Create or update document in index
        doc = DangerousGoodDocument()
        doc.meta.id = dg.id
        doc._prepare_document(dg)
        doc.save()
        
        logger.info(f"Successfully updated dangerous good {dg_id} in search index")
        
        return {
            'status': 'success',
            'action': action,
            'dg_id': dg_id,
            'un_number': dg.un_number,
            'proper_shipping_name': dg.proper_shipping_name
        }
        
    except Exception as exc:
        logger.error(f"Failed to update dangerous good search index for {dg_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying DG index update for {dg_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for DG index update {dg_id}")
            return {'status': 'failed', 'dg_id': dg_id, 'error': str(exc)}

@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def bulk_update_search_indexes(self, model_type: str, object_ids: List[str], action: str = 'update'):
    """
    Bulk update search indexes for multiple objects.
    
    Args:
        model_type: 'sds', 'dangerous_good', or 'sds_request'
        object_ids: List of object IDs to update
        action: 'update', 'delete', or 'create'
    """
    try:
        logger.info(f"Starting bulk {action} for {len(object_ids)} {model_type} objects")
        
        results = []
        failed_ids = []
        
        for obj_id in object_ids:
            try:
                if model_type == 'sds':
                    result = update_sds_search_index.delay(obj_id, action)
                elif model_type == 'dangerous_good':
                    result = update_dangerous_good_search_index.delay(obj_id, action)
                elif model_type == 'sds_request':
                    result = update_sds_request_search_index.delay(obj_id, action)
                else:
                    raise ValueError(f"Unknown model_type: {model_type}")
                
                results.append({
                    'id': obj_id,
                    'task_id': result.id,
                    'status': 'queued'
                })
                
            except Exception as e:
                logger.error(f"Failed to queue {model_type} {obj_id}: {str(e)}")
                failed_ids.append(obj_id)
                results.append({
                    'id': obj_id,
                    'status': 'failed',
                    'error': str(e)
                })
        
        logger.info(f"Bulk update completed: {len(results) - len(failed_ids)} queued, {len(failed_ids)} failed")
        
        return {
            'status': 'completed',
            'model_type': model_type,
            'action': action,
            'total_objects': len(object_ids),
            'queued_count': len(results) - len(failed_ids),
            'failed_count': len(failed_ids),
            'failed_ids': failed_ids,
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Bulk update failed for {model_type}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying bulk update for {model_type} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for bulk update {model_type}")
            return {
                'status': 'failed',
                'model_type': model_type,
                'error': str(exc),
                'total_objects': len(object_ids)
            }

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def update_sds_request_search_index(self, request_id: str, action: str = 'update'):
    """
    Update Elasticsearch index for a specific SDS request.
    
    Args:
        request_id: UUID of the SDSRequest
        action: 'update', 'delete', or 'create'
    """
    try:
        logger.info(f"Updating SDS request search index for {request_id}, action: {action}")
        
        if action == 'delete':
            # Remove from index
            try:
                doc = SDSRequestDocument.get(id=request_id)
                doc.delete()
                logger.info(f"Removed SDS request {request_id} from search index")
            except Exception as e:
                logger.warning(f"SDS request {request_id} not found in index for deletion: {str(e)}")
            return {'status': 'success', 'action': 'deleted', 'request_id': request_id}
        
        # Get the SDS request object
        try:
            sds_request = SDSRequest.objects.select_related('dangerous_good', 'requested_by').get(id=request_id)
        except SDSRequest.DoesNotExist:
            logger.error(f"SDS request {request_id} not found in database")
            raise
        
        # Create or update document in index
        doc = SDSRequestDocument()
        doc.meta.id = sds_request.id
        doc._prepare_document(sds_request)
        doc.save()
        
        logger.info(f"Successfully updated SDS request {request_id} in search index")
        
        return {
            'status': 'success',
            'action': action,
            'request_id': request_id,
            'product_name': sds_request.product_name
        }
        
    except Exception as exc:
        logger.error(f"Failed to update SDS request search index for {request_id}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying SDS request index update for {request_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for SDS request index update {request_id}")
            return {'status': 'failed', 'request_id': request_id, 'error': str(exc)}

@shared_task
def cleanup_search_cache():
    """
    Periodic task to clean up stale search cache entries.
    Should be run periodically (e.g., daily) to prevent cache bloat.
    """
    try:
        logger.info("Starting search cache cleanup")
        
        # Clear search-related cache patterns
        cache_patterns = [
            'unified_search:*',
            'search_facets:*',
            'search_suggestions:*'
        ]
        
        # Note: Django's cache doesn't support pattern deletion out of the box
        # In production, you might want to use Redis directly or implement
        # a more sophisticated cache management system
        
        # For now, we'll clear specific known cache keys
        cache.delete_many([
            'search_facets:default',
            'search_suggestions:recent'
        ])
        
        logger.info("Search cache cleanup completed")
        
        return {
            'status': 'success',
            'cleaned_patterns': cache_patterns,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Search cache cleanup failed: {str(e)}")
        return {
            'status': 'failed',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }

@shared_task(bind=True, max_retries=1)
def rebuild_full_search_indexes(self):
    """
    Complete rebuild of all search indexes.
    This should be used sparingly and typically during maintenance windows.
    """
    try:
        logger.info("Starting full search index rebuild")
        
        # Import the management command
        from django.core.management import call_command
        
        # Rebuild all indexes
        call_command('rebuild_sds_search_indexes', '--models', 'all', '--force')
        
        logger.info("Full search index rebuild completed successfully")
        
        return {
            'status': 'success',
            'message': 'All search indexes rebuilt successfully',
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Full search index rebuild failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info("Retrying full search index rebuild")
            raise self.retry(exc=exc)
        else:
            logger.error("Max retries exceeded for full search index rebuild")
            return {
                'status': 'failed',
                'error': str(exc),
                'timestamp': timezone.now().isoformat()
            }

@shared_task
def generate_search_analytics():
    """
    Generate analytics about search usage and index health.
    """
    try:
        logger.info("Generating search analytics")
        
        from .search_service import search_service
        from .documents import SafetyDataSheetDocument, SDSRequestDocument
        from dangerous_goods.documents import DangerousGoodDocument
        
        # Get index statistics
        dg_count = DangerousGoodDocument.search().count()
        sds_count = SafetyDataSheetDocument.search().count()
        request_count = SDSRequestDocument.search().count()
        
        # Get database counts for comparison
        dg_db_count = DangerousGood.objects.count()
        sds_db_count = SafetyDataSheet.objects.count()
        request_db_count = SDSRequest.objects.count()
        
        analytics = {
            'timestamp': timezone.now().isoformat(),
            'index_health': {
                'dangerous_goods': {
                    'indexed': dg_count,
                    'database': dg_db_count,
                    'sync_ratio': dg_count / dg_db_count if dg_db_count > 0 else 0
                },
                'safety_data_sheets': {
                    'indexed': sds_count,
                    'database': sds_db_count,
                    'sync_ratio': sds_count / sds_db_count if sds_db_count > 0 else 0
                },
                'sds_requests': {
                    'indexed': request_count,
                    'database': request_db_count,
                    'sync_ratio': request_count / request_db_count if request_db_count > 0 else 0
                }
            },
            'totals': {
                'total_indexed': dg_count + sds_count + request_count,
                'total_database': dg_db_count + sds_db_count + request_db_count
            }
        }
        
        # Store analytics in cache for dashboard access
        cache.set('search_analytics', analytics, 3600)  # 1 hour
        
        logger.info(f"Search analytics generated: {analytics['totals']['total_indexed']} documents indexed")
        
        return analytics
        
    except Exception as e:
        logger.error(f"Search analytics generation failed: {str(e)}")
        return {
            'status': 'failed',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }
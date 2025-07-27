# safeshipper_core/storage_tasks.py
import logging
from typing import Dict, List, Any
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import os

from .storage import storage_service, document_storage_service
from .storage_backends import DocumentTypeStorageConfig

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def cleanup_expired_files(self, document_type: str = None, force_cleanup: bool = False):
    """
    Clean up expired files based on document type retention policies.
    
    Args:
        document_type: Specific document type to clean up (optional)
        force_cleanup: Force cleanup regardless of retention period
    """
    try:
        logger.info(f"Starting file cleanup for document type: {document_type or 'all'}")
        
        cleanup_results = {
            'total_files_deleted': 0,
            'total_space_freed': 0,
            'cleanup_details': {},
            'errors': []
        }
        
        # Get document types to process
        if document_type:
            document_types = [document_type]
        else:
            document_types = list(DocumentTypeStorageConfig.STORAGE_CONFIGS.keys())
        
        for doc_type in document_types:
            try:
                config = DocumentTypeStorageConfig.get_config(doc_type)
                folder = config['folder']
                retention_days = config['retention_days']
                
                # Skip cleanup if force_cleanup is False and retention period is not met
                if not force_cleanup and retention_days <= 0:
                    logger.info(f"Skipping cleanup for {doc_type} - indefinite retention")
                    continue
                
                # Perform cleanup for this document type
                cleanup_result = storage_service.cleanup_orphaned_files(
                    folder=folder,
                    older_than_days=retention_days if not force_cleanup else 0
                )
                
                if cleanup_result['success']:
                    deleted_count = cleanup_result['deleted_count']
                    cleanup_results['cleanup_details'][doc_type] = {
                        'deleted_files': deleted_count,
                        'folder': folder,
                        'retention_days': retention_days,
                        'files': cleanup_result['deleted_files']
                    }
                    cleanup_results['total_files_deleted'] += deleted_count
                    
                    logger.info(f"Cleaned up {deleted_count} files for {doc_type}")
                else:
                    cleanup_results['errors'].append(f"Cleanup failed for {doc_type}: {cleanup_result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                error_msg = f"Error cleaning up {doc_type}: {str(e)}"
                logger.error(error_msg)
                cleanup_results['errors'].append(error_msg)
                continue
        
        # Calculate total space freed (approximation)
        # This would need to be implemented based on file size tracking
        cleanup_results['total_space_freed'] = cleanup_results['total_files_deleted'] * 1024 * 1024  # Estimate 1MB per file
        
        logger.info(f"File cleanup completed. Deleted {cleanup_results['total_files_deleted']} files")
        
        return cleanup_results
        
    except Exception as exc:
        logger.error(f"File cleanup task failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'success': False,
                'error': str(exc),
                'total_files_deleted': 0
            }

@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def backup_files_to_secondary_storage(self, folder: str, backup_location: str = 'backup'):
    """
    Backup files to secondary storage location for disaster recovery.
    
    Args:
        folder: Source folder to backup
        backup_location: Destination backup location
    """
    try:
        logger.info(f"Starting backup of folder {folder} to {backup_location}")
        
        backup_results = {
            'folder': folder,
            'backup_location': backup_location,
            'files_backed_up': 0,
            'files_skipped': 0,
            'errors': [],
            'backup_timestamp': timezone.now().isoformat()
        }
        
        # List files in source folder
        file_listing = storage_service.list_files(folder)
        
        if not file_listing['success']:
            raise Exception(f"Failed to list files in {folder}: {file_listing.get('error', 'Unknown error')}")
        
        files = file_listing['files']
        
        for file_info in files:
            source_path = file_info['file_path']
            backup_path = f"{backup_location}/{source_path}"
            
            try:
                # Download source file
                download_result = storage_service.download_file(source_path)
                
                if not download_result['success']:
                    backup_results['errors'].append(f"Failed to download {source_path}: {download_result.get('error', 'Unknown error')}")
                    backup_results['files_skipped'] += 1
                    continue
                
                # Check if backup already exists and is current
                if storage_service.storage.default_storage.exists(backup_path):
                    # Compare modification times or file hashes
                    try:
                        backup_modified = storage_service.storage.default_storage.get_modified_time(backup_path)
                        source_modified = file_info['modified_time']
                        
                        if backup_modified >= source_modified:
                            backup_results['files_skipped'] += 1
                            continue  # Backup is current, skip
                    except Exception:
                        pass  # If we can't compare, proceed with backup
                
                # Upload to backup location
                from io import BytesIO
                backup_file = BytesIO(download_result['content'])
                
                upload_result = storage_service.upload_file(
                    file_obj=backup_file,
                    filename=file_info['filename'],
                    folder=f"{backup_location}/{folder}",
                    validate_file=False  # Skip validation for backup
                )
                
                if upload_result['success']:
                    backup_results['files_backed_up'] += 1
                    logger.debug(f"Backed up {source_path} to {backup_path}")
                else:
                    backup_results['errors'].append(f"Failed to backup {source_path}: {upload_result.get('error', 'Unknown error')}")
                    backup_results['files_skipped'] += 1
                
            except Exception as e:
                error_msg = f"Error backing up {source_path}: {str(e)}"
                logger.error(error_msg)
                backup_results['errors'].append(error_msg)
                backup_results['files_skipped'] += 1
                continue
        
        logger.info(f"Backup completed. Backed up {backup_results['files_backed_up']} files, skipped {backup_results['files_skipped']}")
        
        return backup_results
        
    except Exception as exc:
        logger.error(f"Backup task failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'success': False,
                'error': str(exc),
                'files_backed_up': 0
            }

@shared_task(bind=True, max_retries=3)
def verify_file_integrity(self, file_paths: List[str] = None, folder: str = None):
    """
    Verify file integrity by checking hashes and accessibility.
    
    Args:
        file_paths: Specific file paths to verify (optional)
        folder: Folder to verify all files in (optional)
    """
    try:
        logger.info("Starting file integrity verification")
        
        verification_results = {
            'total_files_checked': 0,
            'files_verified': 0,
            'files_corrupted': 0,
            'files_missing': 0,
            'corrupted_files': [],
            'missing_files': [],
            'errors': []
        }
        
        # Get list of files to verify
        files_to_verify = []
        
        if file_paths:
            files_to_verify = file_paths
        elif folder:
            file_listing = storage_service.list_files(folder)
            if file_listing['success']:
                files_to_verify = [f['file_path'] for f in file_listing['files']]
            else:
                raise Exception(f"Failed to list files in {folder}")
        else:
            # Default to verifying all document folders
            for doc_type, config in DocumentTypeStorageConfig.STORAGE_CONFIGS.items():
                folder_listing = storage_service.list_files(config['folder'])
                if folder_listing['success']:
                    files_to_verify.extend([f['file_path'] for f in folder_listing['files']])
        
        verification_results['total_files_checked'] = len(files_to_verify)
        
        for file_path in files_to_verify:
            try:
                # Check if file exists
                if not storage_service.storage.default_storage.exists(file_path):
                    verification_results['missing_files'].append(file_path)
                    verification_results['files_missing'] += 1
                    continue
                
                # Try to read file to verify accessibility
                download_result = storage_service.download_file(file_path)
                
                if not download_result['success']:
                    verification_results['corrupted_files'].append({
                        'file_path': file_path,
                        'error': download_result.get('error', 'Failed to read file')
                    })
                    verification_results['files_corrupted'] += 1
                    continue
                
                # Verify file size matches storage metadata
                actual_size = len(download_result['content'])
                expected_size = download_result['file_size']
                
                if actual_size != expected_size:
                    verification_results['corrupted_files'].append({
                        'file_path': file_path,
                        'error': f'Size mismatch: expected {expected_size}, got {actual_size}'
                    })
                    verification_results['files_corrupted'] += 1
                    continue
                
                # File verification passed
                verification_results['files_verified'] += 1
                
            except Exception as e:
                error_msg = f"Error verifying {file_path}: {str(e)}"
                logger.error(error_msg)
                verification_results['errors'].append(error_msg)
                verification_results['files_corrupted'] += 1
                continue
        
        # Log results
        logger.info(f"File integrity verification completed. "
                   f"Verified: {verification_results['files_verified']}, "
                   f"Corrupted: {verification_results['files_corrupted']}, "
                   f"Missing: {verification_results['files_missing']}")
        
        # Send alerts for corrupted or missing files
        if verification_results['files_corrupted'] > 0 or verification_results['files_missing'] > 0:
            _send_integrity_alerts(verification_results)
        
        return verification_results
        
    except Exception as exc:
        logger.error(f"File integrity verification failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'success': False,
                'error': str(exc),
                'total_files_checked': 0
            }

@shared_task
def generate_storage_usage_report(include_details: bool = False):
    """
    Generate comprehensive storage usage report.
    
    Args:
        include_details: Whether to include detailed file listings
    """
    try:
        logger.info("Generating storage usage report")
        
        report = {
            'report_timestamp': timezone.now().isoformat(),
            'storage_backend': storage_service.storage_backend,
            'overall_stats': {},
            'document_type_stats': {},
            'recommendations': []
        }
        
        # Get overall storage statistics
        overall_stats = storage_service.get_storage_stats()
        report['overall_stats'] = overall_stats
        
        # Get statistics for each document type
        total_files_by_type = 0
        total_size_by_type = 0
        
        for doc_type, config in DocumentTypeStorageConfig.STORAGE_CONFIGS.items():
            folder = config['folder']
            
            try:
                file_listing = storage_service.list_files(folder)
                
                if file_listing['success']:
                    files = file_listing['files']
                    file_count = len(files)
                    total_size = sum(f.get('file_size', 0) for f in files)
                    
                    type_stats = {
                        'folder': folder,
                        'file_count': file_count,
                        'total_size_bytes': total_size,
                        'total_size_mb': round(total_size / (1024 * 1024), 2),
                        'retention_days': config['retention_days'],
                        'encryption_required': config['encryption_required']
                    }
                    
                    if include_details:
                        type_stats['files'] = files
                    
                    report['document_type_stats'][doc_type] = type_stats
                    
                    total_files_by_type += file_count
                    total_size_by_type += total_size
                    
            except Exception as e:
                logger.error(f"Error getting stats for {doc_type}: {str(e)}")
                report['document_type_stats'][doc_type] = {
                    'error': str(e),
                    'folder': folder
                }
        
        # Add aggregated statistics
        report['aggregated_stats'] = {
            'total_files_by_type': total_files_by_type,
            'total_size_by_type_bytes': total_size_by_type,
            'total_size_by_type_mb': round(total_size_by_type / (1024 * 1024), 2)
        }
        
        # Generate recommendations
        recommendations = _generate_storage_recommendations(report)
        report['recommendations'] = recommendations
        
        logger.info(f"Storage usage report generated with {total_files_by_type} files totaling {round(total_size_by_type / (1024 * 1024), 2)}MB")
        
        return report
        
    except Exception as e:
        logger.error(f"Storage usage report generation failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'report_timestamp': timezone.now().isoformat()
        }

@shared_task(bind=True, max_retries=2)
def migrate_files_between_storage_backends(self, source_folder: str, target_backend: str):
    """
    Migrate files from current storage backend to a different backend.
    
    Args:
        source_folder: Folder to migrate files from
        target_backend: Target storage backend ('s3', 'minio', 'local')
    """
    try:
        logger.info(f"Starting file migration from {source_folder} to {target_backend}")
        
        migration_results = {
            'source_folder': source_folder,
            'target_backend': target_backend,
            'files_migrated': 0,
            'files_failed': 0,
            'migration_errors': [],
            'migration_timestamp': timezone.now().isoformat()
        }
        
        # This would implement the actual migration logic
        # For now, just return a placeholder result
        migration_results['status'] = 'not_implemented'
        migration_results['message'] = 'File migration between backends is not yet implemented'
        
        logger.warning("File migration between storage backends is not yet implemented")
        
        return migration_results
        
    except Exception as exc:
        logger.error(f"File migration failed: {str(exc)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return {
                'success': False,
                'error': str(exc),
                'files_migrated': 0
            }

# Helper functions

def _send_integrity_alerts(verification_results):
    """Send alerts for file integrity issues"""
    from communications.tasks import send_emergency_alert
    
    corrupted_count = verification_results['files_corrupted']
    missing_count = verification_results['files_missing']
    
    if corrupted_count > 0 or missing_count > 0:
        alert_message = f"File integrity issues detected: {corrupted_count} corrupted files, {missing_count} missing files"
        
        send_emergency_alert.delay(
            'system',
            'FILE_INTEGRITY_FAILURE',
            alert_message,
            'HIGH'
        )

def _generate_storage_recommendations(report):
    """Generate storage optimization recommendations based on usage report"""
    recommendations = []
    
    # Check for large temporary folders
    temp_stats = report['document_type_stats'].get('temporary', {})
    if temp_stats.get('total_size_mb', 0) > 1000:  # More than 1GB in temp
        recommendations.append({
            'type': 'cleanup',
            'priority': 'medium',
            'message': f"Temporary files folder is large ({temp_stats['total_size_mb']}MB). Consider running cleanup.",
            'action': 'Run cleanup_expired_files task for temporary files'
        })
    
    # Check for old files that could be archived
    for doc_type, stats in report['document_type_stats'].items():
        if isinstance(stats, dict) and 'file_count' in stats:
            if stats['file_count'] > 10000:  # More than 10k files
                recommendations.append({
                    'type': 'archival',
                    'priority': 'low',
                    'message': f"{doc_type} has {stats['file_count']} files. Consider archiving older files.",
                    'action': f'Set up archival policy for {doc_type}'
                })
    
    # Check overall storage usage
    overall_stats = report['overall_stats']
    if overall_stats.get('total_size_mb', 0) > 50000:  # More than 50GB
        recommendations.append({
            'type': 'capacity',
            'priority': 'high',
            'message': f"Storage usage is high ({overall_stats['total_size_mb']}MB). Monitor capacity.",
            'action': 'Consider expanding storage capacity or implementing data lifecycle policies'
        })
    
    return recommendations
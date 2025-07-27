# safeshipper_core/storage.py
import os
import logging
import mimetypes
from typing import Optional, Dict, Any, List, IO
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from pathlib import Path
import hashlib
import uuid

logger = logging.getLogger(__name__)

class SafeShipperStorageService:
    """
    Unified storage service for SafeShipper that handles file uploads,
    management, and retrieval across S3, MinIO, and local storage.
    """
    
    def __init__(self):
        self.storage_backend = getattr(settings, 'DEFAULT_FILE_STORAGE', 'django.core.files.storage.FileSystemStorage')
        self.use_s3 = 's3' in self.storage_backend.lower()
        self.use_minio = self._check_minio_config()
        
    def _check_minio_config(self) -> bool:
        """Check if MinIO configuration is available"""
        return bool(
            getattr(settings, 'MINIO_ENDPOINT', None) and
            getattr(settings, 'MINIO_ACCESS_KEY', None) and
            getattr(settings, 'MINIO_SECRET_KEY', None)
        )
    
    def upload_file(
        self,
        file_obj: IO,
        filename: str,
        folder: str = '',
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        validate_file: bool = True
    ) -> Dict[str, Any]:
        """
        Upload a file to the configured storage backend.
        
        Args:
            file_obj: File object to upload
            filename: Name of the file
            folder: Folder/prefix for the file
            content_type: MIME type of the file
            metadata: Additional metadata to store with the file
            validate_file: Whether to validate the file before upload
            
        Returns:
            Dict with upload results including file path, URL, and metadata
        """
        try:
            # Generate unique filename to prevent conflicts
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            
            # Construct full path
            if folder:
                full_path = f"{folder.strip('/')}/{unique_filename}"
            else:
                full_path = unique_filename
            
            # Validate file if requested
            if validate_file:
                validation_result = self.validate_file(file_obj, filename)
                if not validation_result['valid']:
                    return {
                        'success': False,
                        'error': f"File validation failed: {validation_result['error']}",
                        'validation_result': validation_result
                    }
            
            # Reset file position
            file_obj.seek(0)
            
            # Determine content type
            if not content_type:
                content_type, _ = mimetypes.guess_type(filename)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            # Calculate file hash for integrity
            file_content = file_obj.read()
            file_hash = hashlib.sha256(file_content).hexdigest()
            file_size = len(file_content)
            
            # Create Django file object
            django_file = ContentFile(file_content, name=unique_filename)
            
            # Upload to storage
            stored_path = default_storage.save(full_path, django_file)
            
            # Get file URL
            try:
                file_url = default_storage.url(stored_path)
            except Exception:
                file_url = None  # Some storage backends don't support URL generation
            
            # Prepare result metadata
            upload_metadata = {
                'original_filename': filename,
                'stored_filename': unique_filename,
                'stored_path': stored_path,
                'content_type': content_type,
                'file_size': file_size,
                'file_hash': file_hash,
                'upload_timestamp': timezone.now().isoformat(),
                'folder': folder,
                'storage_backend': self.storage_backend
            }
            
            # Add custom metadata
            if metadata:
                upload_metadata.update(metadata)
            
            logger.info(f"Successfully uploaded file {filename} as {stored_path}")
            
            return {
                'success': True,
                'file_path': stored_path,
                'file_url': file_url,
                'unique_filename': unique_filename,
                'original_filename': filename,
                'metadata': upload_metadata
            }
            
        except Exception as e:
            logger.error(f"File upload failed for {filename}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'filename': filename
            }
    
    def download_file(self, file_path: str) -> Dict[str, Any]:
        """
        Download a file from storage.
        
        Args:
            file_path: Path to the file in storage
            
        Returns:
            Dict with file content and metadata
        """
        try:
            if not default_storage.exists(file_path):
                return {
                    'success': False,
                    'error': 'File not found',
                    'file_path': file_path
                }
            
            # Get file content
            with default_storage.open(file_path, 'rb') as f:
                file_content = f.read()
            
            # Get file metadata
            file_size = default_storage.size(file_path)
            modified_time = default_storage.get_modified_time(file_path)
            
            # Determine content type
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            return {
                'success': True,
                'content': file_content,
                'file_path': file_path,
                'file_size': file_size,
                'content_type': content_type,
                'modified_time': modified_time
            }
            
        except Exception as e:
            logger.error(f"File download failed for {file_path}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def delete_file(self, file_path: str) -> Dict[str, Any]:
        """
        Delete a file from storage.
        
        Args:
            file_path: Path to the file in storage
            
        Returns:
            Dict with deletion result
        """
        try:
            if not default_storage.exists(file_path):
                return {
                    'success': False,
                    'error': 'File not found',
                    'file_path': file_path
                }
            
            default_storage.delete(file_path)
            
            logger.info(f"Successfully deleted file {file_path}")
            
            return {
                'success': True,
                'file_path': file_path,
                'deleted_at': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"File deletion failed for {file_path}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def list_files(self, folder: str = '', limit: int = 100) -> Dict[str, Any]:
        """
        List files in a folder.
        
        Args:
            folder: Folder to list files from
            limit: Maximum number of files to return
            
        Returns:
            Dict with file listing
        """
        try:
            # List directories and files
            directories, files = default_storage.listdir(folder)
            
            file_list = []
            for filename in files[:limit]:
                file_path = os.path.join(folder, filename) if folder else filename
                
                try:
                    file_size = default_storage.size(file_path)
                    modified_time = default_storage.get_modified_time(file_path)
                    
                    file_info = {
                        'filename': filename,
                        'file_path': file_path,
                        'file_size': file_size,
                        'modified_time': modified_time.isoformat(),
                        'content_type': mimetypes.guess_type(filename)[0] or 'application/octet-stream'
                    }
                    
                    # Try to get URL if possible
                    try:
                        file_info['url'] = default_storage.url(file_path)
                    except Exception:
                        file_info['url'] = None
                    
                    file_list.append(file_info)
                    
                except Exception as e:
                    logger.warning(f"Could not get info for file {filename}: {str(e)}")
                    continue
            
            return {
                'success': True,
                'folder': folder,
                'files': file_list,
                'directories': directories,
                'total_files': len(file_list)
            }
            
        except Exception as e:
            logger.error(f"File listing failed for folder {folder}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'folder': folder
            }
    
    def get_file_url(self, file_path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Get a URL for accessing a file.
        
        Args:
            file_path: Path to the file in storage
            expires_in: URL expiration time in seconds (for signed URLs)
            
        Returns:
            File URL or None if not available
        """
        try:
            if not default_storage.exists(file_path):
                return None
            
            # For S3 and similar backends, this will generate signed URLs
            url = default_storage.url(file_path)
            return url
            
        except Exception as e:
            logger.error(f"URL generation failed for {file_path}: {str(e)}")
            return None
    
    def validate_file(self, file_obj: IO, filename: str) -> Dict[str, Any]:
        """
        Validate file before upload.
        
        Args:
            file_obj: File object to validate
            filename: Original filename
            
        Returns:
            Dict with validation results
        """
        validation_result = {
            'valid': True,
            'error': None,
            'warnings': [],
            'file_info': {}
        }
        
        try:
            # Get file size
            file_obj.seek(0, 2)  # Seek to end
            file_size = file_obj.tell()
            file_obj.seek(0)  # Reset to beginning
            
            validation_result['file_info']['size'] = file_size
            validation_result['file_info']['filename'] = filename
            
            # Check file size limits
            max_file_size = getattr(settings, 'MAX_FILE_UPLOAD_SIZE', 100 * 1024 * 1024)  # 100MB default
            if file_size > max_file_size:
                validation_result['valid'] = False
                validation_result['error'] = f'File size ({file_size} bytes) exceeds maximum allowed size ({max_file_size} bytes)'
                return validation_result
            
            # Check file extension
            file_extension = Path(filename).suffix.lower()
            allowed_extensions = getattr(settings, 'ALLOWED_FILE_EXTENSIONS', [
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif',
                '.txt', '.csv', '.zip', '.tar', '.gz'
            ])
            
            if allowed_extensions and file_extension not in allowed_extensions:
                validation_result['valid'] = False
                validation_result['error'] = f'File extension {file_extension} is not allowed'
                return validation_result
            
            # Basic content validation for known file types
            if file_extension in ['.pdf']:
                file_obj.seek(0)
                header = file_obj.read(4)
                if not header.startswith(b'%PDF'):
                    validation_result['warnings'].append('File does not appear to be a valid PDF')
            
            elif file_extension in ['.jpg', '.jpeg']:
                file_obj.seek(0)
                header = file_obj.read(2)
                if header != b'\xff\xd8':
                    validation_result['warnings'].append('File does not appear to be a valid JPEG')
            
            elif file_extension in ['.png']:
                file_obj.seek(0)
                header = file_obj.read(8)
                if header != b'\x89PNG\r\n\x1a\n':
                    validation_result['warnings'].append('File does not appear to be a valid PNG')
            
            # Reset file position
            file_obj.seek(0)
            
            return validation_result
            
        except Exception as e:
            logger.error(f"File validation failed for {filename}: {str(e)}")
            validation_result['valid'] = False
            validation_result['error'] = f'Validation error: {str(e)}'
            return validation_result
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage usage statistics.
        
        Returns:
            Dict with storage statistics
        """
        stats = {
            'storage_backend': self.storage_backend,
            'timestamp': timezone.now().isoformat()
        }
        
        try:
            # For local storage, we can calculate directory sizes
            if 'FileSystemStorage' in self.storage_backend:
                media_root = getattr(settings, 'MEDIA_ROOT', '')
                if media_root and os.path.exists(media_root):
                    total_size = 0
                    file_count = 0
                    
                    for root, dirs, files in os.walk(media_root):
                        for file in files:
                            file_path = os.path.join(root, file)
                            try:
                                total_size += os.path.getsize(file_path)
                                file_count += 1
                            except OSError:
                                continue
                    
                    stats.update({
                        'total_size_bytes': total_size,
                        'total_files': file_count,
                        'total_size_mb': round(total_size / (1024 * 1024), 2)
                    })
            else:
                # For cloud storage, we'd need to use specific APIs
                stats['note'] = 'Storage stats not available for this backend'
            
        except Exception as e:
            logger.error(f"Storage stats calculation failed: {str(e)}")
            stats['error'] = str(e)
        
        return stats
    
    def cleanup_orphaned_files(self, folder: str = '', older_than_days: int = 30) -> Dict[str, Any]:
        """
        Clean up orphaned files that are no longer referenced.
        
        Args:
            folder: Folder to clean up
            older_than_days: Only delete files older than this many days
            
        Returns:
            Dict with cleanup results
        """
        try:
            from datetime import timedelta
            cutoff_date = timezone.now() - timedelta(days=older_than_days)
            
            deleted_files = []
            errors = []
            
            # List files in the folder
            try:
                _, files = default_storage.listdir(folder)
            except Exception:
                files = []
            
            for filename in files:
                file_path = os.path.join(folder, filename) if folder else filename
                
                try:
                    # Check file age
                    modified_time = default_storage.get_modified_time(file_path)
                    if modified_time > cutoff_date:
                        continue  # File is not old enough
                    
                    # Check if file is referenced in the database
                    # This would need to be implemented based on your file reference tracking
                    is_referenced = self._check_file_references(file_path)
                    
                    if not is_referenced:
                        default_storage.delete(file_path)
                        deleted_files.append(file_path)
                        logger.info(f"Deleted orphaned file: {file_path}")
                    
                except Exception as e:
                    errors.append(f"Error processing {file_path}: {str(e)}")
                    continue
            
            return {
                'success': True,
                'folder': folder,
                'deleted_files': deleted_files,
                'deleted_count': len(deleted_files),
                'errors': errors,
                'cutoff_date': cutoff_date.isoformat()
            }
            
        except Exception as e:
            logger.error(f"File cleanup failed for folder {folder}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'folder': folder
            }
    
    def _check_file_references(self, file_path: str) -> bool:
        """
        Check if a file is referenced in the database.
        This is a placeholder - implement based on your file reference tracking.
        
        Args:
            file_path: Path to check for references
            
        Returns:
            True if file is referenced, False otherwise
        """
        # This would check models that store file references
        # For example: Document, SafetyDataSheet, VehicleMaintenanceRecord, etc.
        
        # Placeholder implementation - always return True to be safe
        return True


# Global storage service instance
storage_service = SafeShipperStorageService()


class DocumentStorageService:
    """
    Specialized storage service for document management with version control,
    metadata handling, and document-specific features.
    """
    
    def __init__(self):
        self.storage = storage_service
    
    def upload_document(
        self,
        file_obj: IO,
        filename: str,
        document_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        version: str = '1.0'
    ) -> Dict[str, Any]:
        """
        Upload a document with specialized handling.
        
        Args:
            file_obj: Document file to upload
            filename: Original filename
            document_type: Type of document (manifest, sds, certificate, etc.)
            metadata: Document metadata
            version: Document version
            
        Returns:
            Upload result with document-specific information
        """
        # Create document-specific folder structure
        folder = f"documents/{document_type}/{timezone.now().strftime('%Y/%m')}"
        
        # Add document-specific metadata
        doc_metadata = {
            'document_type': document_type,
            'version': version,
            'upload_source': 'api',
            **(metadata or {})
        }
        
        # Validate document type-specific requirements
        validation_result = self._validate_document_type(file_obj, filename, document_type)
        if not validation_result['valid']:
            return {
                'success': False,
                'error': f"Document validation failed: {validation_result['error']}",
                'validation_result': validation_result
            }
        
        # Upload with document-specific handling
        result = self.storage.upload_file(
            file_obj=file_obj,
            filename=filename,
            folder=folder,
            metadata=doc_metadata,
            validate_file=True
        )
        
        if result['success']:
            # Add document-specific information
            result['document_type'] = document_type
            result['version'] = version
            result['folder_structure'] = folder
        
        return result
    
    def _validate_document_type(self, file_obj: IO, filename: str, document_type: str) -> Dict[str, Any]:
        """
        Validate document based on its type.
        
        Args:
            file_obj: File to validate
            filename: Original filename
            document_type: Type of document
            
        Returns:
            Validation result
        """
        validation_result = {
            'valid': True,
            'error': None,
            'warnings': []
        }
        
        file_extension = Path(filename).suffix.lower()
        
        # Document type-specific validation
        if document_type == 'dg_manifest':
            if file_extension not in ['.pdf']:
                validation_result['valid'] = False
                validation_result['error'] = 'Dangerous goods manifests must be PDF files'
        
        elif document_type == 'sds':
            if file_extension not in ['.pdf']:
                validation_result['valid'] = False
                validation_result['error'] = 'Safety Data Sheets must be PDF files'
        
        elif document_type == 'certificate':
            if file_extension not in ['.pdf', '.jpg', '.jpeg', '.png']:
                validation_result['valid'] = False
                validation_result['error'] = 'Certificates must be PDF or image files'
        
        return validation_result


# Global document storage service instance
document_storage_service = DocumentStorageService()
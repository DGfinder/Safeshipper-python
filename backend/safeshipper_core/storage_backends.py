# safeshipper_core/storage_backends.py
"""
Custom storage backends for SafeShipper supporting S3, MinIO, and local storage
with fallback capabilities and enhanced security.
"""

import os
import logging
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage
from django.utils.deconstruct import deconstructible
from django.utils import timezone

logger = logging.getLogger(__name__)

@deconstructible
class SafeShipperS3Storage(S3Boto3Storage):
    """
    Custom S3 storage backend with SafeShipper-specific configurations
    and enhanced security features.
    """
    
    def __init__(self, **settings):
        # Default SafeShipper S3 settings
        default_settings = {
            'bucket_name': getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'safeshipper-documents'),
            'region_name': getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
            'default_acl': 'private',  # Always private for SafeShipper documents
            'querystring_auth': True,  # Use signed URLs
            'file_overwrite': False,   # Prevent accidental overwrites
            'custom_domain': getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None),
            'object_parameters': {
                'ServerSideEncryption': 'AES256',  # Encrypt at rest
                'Metadata': {
                    'uploaded-by': 'safeshipper-platform',
                    'encryption': 'server-side'
                }
            }
        }
        
        # Merge with provided settings
        default_settings.update(settings)
        super().__init__(**default_settings)
    
    def _save(self, name, content):
        """Override save to add SafeShipper-specific metadata"""
        # Add upload timestamp and source metadata
        if hasattr(self, 'object_parameters'):
            self.object_parameters.setdefault('Metadata', {})
            self.object_parameters['Metadata'].update({
                'upload-timestamp': str(timezone.now().timestamp()),
                'content-type': getattr(content, 'content_type', 'application/octet-stream')
            })
        
        return super()._save(name, content)
    
    def url(self, name, parameters=None, expire=3600, http_method=None):
        """Generate secure URLs with configurable expiration"""
        # Use shorter expiration for sensitive documents
        if 'manifest' in name.lower() or 'sds' in name.lower():
            expire = min(expire, 1800)  # Max 30 minutes for sensitive docs
        
        return super().url(name, parameters, expire, http_method)


@deconstructible 
class SafeShipperMinIOStorage(S3Boto3Storage):
    """
    MinIO storage backend for on-premise or private cloud deployment
    with S3-compatible API.
    """
    
    def __init__(self, **settings):
        # MinIO-specific settings
        minio_settings = {
            'access_key': getattr(settings, 'MINIO_ACCESS_KEY', ''),
            'secret_key': getattr(settings, 'MINIO_SECRET_KEY', ''),
            'bucket_name': getattr(settings, 'MINIO_BUCKET_NAME', 'safeshipper'),
            'endpoint_url': getattr(settings, 'MINIO_ENDPOINT', 'http://localhost:9000'),
            'region_name': getattr(settings, 'MINIO_REGION', 'us-east-1'),
            'default_acl': None,  # MinIO doesn't support ACLs by default
            'querystring_auth': True,
            'file_overwrite': False,
            'use_ssl': getattr(settings, 'MINIO_USE_SSL', False),
            'object_parameters': {
                'Metadata': {
                    'uploaded-by': 'safeshipper-platform',
                    'storage-backend': 'minio'
                }
            }
        }
        
        # Merge with provided settings
        minio_settings.update(settings)
        super().__init__(**minio_settings)
        
        logger.info(f"Initialized MinIO storage with endpoint: {minio_settings['endpoint_url']}")


@deconstructible
class SafeShipperLocalStorage(FileSystemStorage):
    """
    Enhanced local file storage with SafeShipper-specific features
    including security checks and metadata handling.
    """
    
    def __init__(self, location=None, base_url=None, file_permissions_mode=None, directory_permissions_mode=None):
        # Default to secure permissions
        if file_permissions_mode is None:
            file_permissions_mode = 0o644
        if directory_permissions_mode is None:
            directory_permissions_mode = 0o755
            
        # Use SafeShipper-specific media root
        if location is None:
            location = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
        
        super().__init__(
            location=location,
            base_url=base_url,
            file_permissions_mode=file_permissions_mode,
            directory_permissions_mode=directory_permissions_mode
        )
        
        # Ensure the media directory exists and has proper permissions
        self._ensure_media_directory()
    
    def _ensure_media_directory(self):
        """Ensure media directory exists with proper permissions"""
        try:
            if not os.path.exists(self.location):
                os.makedirs(self.location, mode=self.directory_permissions_mode)
                logger.info(f"Created media directory: {self.location}")
            
            # Create subdirectories for different document types
            subdirs = [
                'documents/manifests',
                'documents/sds',
                'documents/certificates',
                'documents/reports',
                'temp',
                'cache'
            ]
            
            for subdir in subdirs:
                subdir_path = os.path.join(self.location, subdir)
                if not os.path.exists(subdir_path):
                    os.makedirs(subdir_path, mode=self.directory_permissions_mode)
                    
        except Exception as e:
            logger.error(f"Failed to create media directories: {str(e)}")
    
    def _save(self, name, content):
        """Override save to add security checks and metadata"""
        # Prevent directory traversal attacks
        if '..' in name or name.startswith('/'):
            raise ValueError("Invalid file path detected")
        
        # Log file uploads for audit purposes
        logger.info(f"Saving file to local storage: {name}")
        
        return super()._save(name, content)
    
    def delete(self, name):
        """Override delete to log deletions for audit purposes"""
        logger.info(f"Deleting file from local storage: {name}")
        return super().delete(name)


class StorageBackendSelector:
    """
    Intelligent storage backend selector that chooses the appropriate
    storage backend based on configuration and availability.
    """
    
    @staticmethod
    def get_storage_backend():
        """
        Select and return the appropriate storage backend based on configuration.
        
        Returns:
            Storage backend class
        """
        # Check for S3 configuration
        if (hasattr(settings, 'AWS_ACCESS_KEY_ID') and 
            hasattr(settings, 'AWS_SECRET_ACCESS_KEY') and 
            hasattr(settings, 'AWS_STORAGE_BUCKET_NAME') and
            settings.AWS_ACCESS_KEY_ID and 
            settings.AWS_SECRET_ACCESS_KEY and 
            settings.AWS_STORAGE_BUCKET_NAME):
            
            logger.info("Using S3 storage backend")
            return SafeShipperS3Storage
        
        # Check for MinIO configuration
        elif (hasattr(settings, 'MINIO_ACCESS_KEY') and 
              hasattr(settings, 'MINIO_SECRET_KEY') and 
              hasattr(settings, 'MINIO_ENDPOINT') and
              settings.MINIO_ACCESS_KEY and 
              settings.MINIO_SECRET_KEY and 
              settings.MINIO_ENDPOINT):
            
            logger.info("Using MinIO storage backend")
            return SafeShipperMinIOStorage
        
        # Fallback to local storage
        else:
            logger.info("Using local file storage backend")
            return SafeShipperLocalStorage
    
    @staticmethod
    def get_configured_storage():
        """
        Get a configured instance of the selected storage backend.
        
        Returns:
            Configured storage backend instance
        """
        backend_class = StorageBackendSelector.get_storage_backend()
        return backend_class()


# Storage backend configuration for different file types
class DocumentTypeStorageConfig:
    """
    Configuration for different document types with specific storage requirements.
    """
    
    STORAGE_CONFIGS = {
        'dangerous_goods_manifest': {
            'folder': 'documents/manifests',
            'retention_days': 2555,  # 7 years for regulatory compliance
            'encryption_required': True,
            'access_logging': True,
            'allowed_extensions': ['.pdf'],
            'max_file_size': 50 * 1024 * 1024  # 50MB
        },
        'safety_data_sheet': {
            'folder': 'documents/sds',
            'retention_days': 2555,  # 7 years for regulatory compliance
            'encryption_required': True,
            'access_logging': True,
            'allowed_extensions': ['.pdf'],
            'max_file_size': 20 * 1024 * 1024  # 20MB
        },
        'vehicle_certificate': {
            'folder': 'documents/certificates',
            'retention_days': 1825,  # 5 years
            'encryption_required': True,
            'access_logging': True,
            'allowed_extensions': ['.pdf', '.jpg', '.jpeg', '.png'],
            'max_file_size': 10 * 1024 * 1024  # 10MB
        },
        'training_certificate': {
            'folder': 'documents/training',
            'retention_days': 1825,  # 5 years
            'encryption_required': True,
            'access_logging': True,
            'allowed_extensions': ['.pdf', '.jpg', '.jpeg', '.png'],
            'max_file_size': 10 * 1024 * 1024  # 10MB
        },
        'incident_report': {
            'folder': 'documents/incidents',
            'retention_days': 3650,  # 10 years for legal compliance
            'encryption_required': True,
            'access_logging': True,
            'allowed_extensions': ['.pdf', '.doc', '.docx'],
            'max_file_size': 50 * 1024 * 1024  # 50MB
        },
        'analytics_report': {
            'folder': 'reports/analytics',
            'retention_days': 365,  # 1 year
            'encryption_required': False,
            'access_logging': False,
            'allowed_extensions': ['.pdf', '.xlsx', '.csv'],
            'max_file_size': 100 * 1024 * 1024  # 100MB
        },
        'temporary': {
            'folder': 'temp',
            'retention_days': 7,  # 1 week
            'encryption_required': False,
            'access_logging': False,
            'allowed_extensions': None,  # Allow all
            'max_file_size': 200 * 1024 * 1024  # 200MB
        }
    }
    
    @classmethod
    def get_config(cls, document_type: str) -> dict:
        """
        Get storage configuration for a specific document type.
        
        Args:
            document_type: Type of document
            
        Returns:
            Storage configuration dictionary
        """
        return cls.STORAGE_CONFIGS.get(document_type, cls.STORAGE_CONFIGS['temporary'])
    
    @classmethod
    def get_folder_for_type(cls, document_type: str) -> str:
        """
        Get storage folder for a specific document type.
        
        Args:
            document_type: Type of document
            
        Returns:
            Folder path for the document type
        """
        config = cls.get_config(document_type)
        return config['folder']
    
    @classmethod
    def get_retention_period(cls, document_type: str) -> int:
        """
        Get retention period in days for a specific document type.
        
        Args:
            document_type: Type of document
            
        Returns:
            Retention period in days
        """
        config = cls.get_config(document_type)
        return config['retention_days']


# Initialize storage backend based on configuration
def get_default_storage():
    """Get the default configured storage backend"""
    return StorageBackendSelector.get_configured_storage()
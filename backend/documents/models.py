import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator
from shipments.models import Shipment  # Re-enabled after shipments app re-enabled
from django.contrib.auth import get_user_model
import mimetypes
import os

User = get_user_model()

class DocumentType(models.TextChoices):
    DG_MANIFEST = 'DG_MANIFEST', _('Dangerous Goods Manifest')
    DG_DECLARATION = 'DG_DECLARATION', _('Dangerous Goods Declaration')
    PACKING_LIST = 'PACKING_LIST', _('Packing List')
    COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE', _('Commercial Invoice')
    CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION', _('Customs Declaration')
    OTHER = 'OTHER', _('Other')

class DocumentStatus(models.TextChoices):
    UPLOADED = 'UPLOADED', _('Uploaded')
    QUEUED = 'QUEUED', _('Queued for Processing')
    PROCESSING = 'PROCESSING', _('Processing')
    VALIDATED_OK = 'VALIDATED_OK', _('Validated Successfully')
    VALIDATED_WITH_ERRORS = 'VALIDATED_WITH_ERRORS', _('Validated with Errors')
    PROCESSING_FAILED = 'PROCESSING_FAILED', _('Processing Failed')

class Document(models.Model):
    """
    Model for storing and tracking documents, including DG manifests.
    """
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.CharField(
        _("Document Type"),
        max_length=50,
        choices=DocumentType.choices,
        db_index=True
    )
    status = models.CharField(
        _("Status"),
        max_length=50,
        choices=DocumentStatus.choices,
        default=DocumentStatus.UPLOADED,
        db_index=True
    )
    
    # File information
    file = models.FileField(
        _("File"),
        upload_to='documents/%Y/%m/%d/',
        validators=[
            FileExtensionValidator(
                allowed_extensions=['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
            )
        ]
    )
    original_filename = models.CharField(
        _("Original Filename"),
        max_length=255
    )
    mime_type = models.CharField(
        _("MIME Type"),
        max_length=100
    )
    file_size = models.PositiveIntegerField(
        _("File Size (bytes)")
    )
    
    # Relationships
    # Re-enabled after shipments app re-enabled
    shipment = models.ForeignKey(
        'shipments.Shipment',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_("Shipment"),
        null=True,
        blank=True
    )
    uploaded_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        related_name='uploaded_documents',
        verbose_name=_("Uploaded By"),
        null=True
    )
    
    # Validation results
    validation_results = models.JSONField(
        _("Validation Results"),
        null=True,
        blank=True,
        help_text=_("Results from document validation/processing")
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Document")
        verbose_name_plural = _("Documents")
        indexes = [
            models.Index(fields=['document_type', 'status']),
            # models.Index(fields=['shipment', 'document_type']),  # Temporarily disabled - shipments app disabled
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.original_filename}"
    
    def clean(self):
        """
        Validate document data.
        """
        # Temporarily disabled - shipments app disabled
        # if self.document_type == self.DocumentType.DG_MANIFEST and not self.shipment:
        #     raise models.ValidationError(
        #         _("DG Manifest must be associated with a shipment")
        #     )
    
    @property
    def is_processing(self) -> bool:
        """
        Check if the document is currently being processed.
        """
        return self.status in [
            self.DocumentStatus.QUEUED,
            self.DocumentStatus.PROCESSING
        ]
    
    @property
    def is_validated(self) -> bool:
        """
        Check if the document has been validated.
        """
        return self.status in [
            self.DocumentStatus.VALIDATED_OK,
            self.DocumentStatus.VALIDATED_WITH_ERRORS
        ]
    
    @property
    def validation_errors(self) -> list:
        """
        Get list of validation errors if any.
        """
        if not self.validation_results:
            return []
        
        return self.validation_results.get('validation_errors', [])
    
    @property
    def validation_warnings(self) -> list:
        """
        Get list of validation warnings if any.
        """
        if not self.validation_results:
            return []
        
        return self.validation_results.get('warnings', [])
    
    def save(self, *args, **kwargs):
        if not self.original_filename and self.file:
            self.original_filename = os.path.basename(self.file.name)
        
        if not self.mime_type and self.file:
            self.mime_type = mimetypes.guess_type(self.file.name)[0] or 'application/octet-stream'
        
        if not self.file_size and self.file:
            self.file_size = self.file.size
        
        super().save(*args, **kwargs)
    
    def get_file_extension(self):
        """Returns the lowercase file extension without the dot"""
        return os.path.splitext(self.original_filename)[1].lower().lstrip('.')
    
    def is_pdf(self):
        """Returns True if the document is a PDF"""
        return self.get_file_extension() == 'pdf'


class EnhancedDocument(Document):
    """
    Enhanced document model with additional fields for file upload system
    """
    # Additional file information
    title = models.CharField(
        _("Title"),
        max_length=255,
        blank=True,
        help_text=_("Display title for the document")
    )
    description = models.TextField(
        _("Description"),
        blank=True,
        help_text=_("Detailed description of the document")
    )
    file_path = models.CharField(
        _("File Path"),
        max_length=500,
        blank=True,
        help_text=_("Storage path for the file")
    )
    file_hash = models.CharField(
        _("File Hash"),
        max_length=64,
        blank=True,
        help_text=_("SHA256 hash of the file content")
    )
    content_type = models.CharField(
        _("Content Type"),
        max_length=100,
        blank=True,
        help_text=_("MIME type of the file")
    )
    
    # Storage and access control
    storage_backend = models.CharField(
        _("Storage Backend"),
        max_length=50,
        default='local',
        help_text=_("Storage backend used (s3, minio, local)")
    )
    is_public = models.BooleanField(
        _("Is Public"),
        default=False,
        help_text=_("Whether file is publicly accessible")
    )
    thumbnail_path = models.CharField(
        _("Thumbnail Path"),
        max_length=500,
        blank=True,
        help_text=_("Path to generated thumbnail")
    )
    
    # Metadata and tags
    tags = models.JSONField(
        _("Tags"),
        default=list,
        blank=True,
        help_text=_("List of tags for categorization")
    )
    metadata = models.JSONField(
        _("Metadata"),
        default=dict,
        blank=True,
        help_text=_("Additional file metadata")
    )
    
    class Meta:
        verbose_name = _("Enhanced Document")
        verbose_name_plural = _("Enhanced Documents")
        indexes = [
            models.Index(fields=['document_type', 'status']),
            models.Index(fields=['is_public', 'created_at']),
            models.Index(fields=['storage_backend', 'document_type']),
        ]
        ordering = ['-created_at']


class DocumentUpload(models.Model):
    """
    Model for tracking file upload progress and status
    """
    class UploadStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        COMPLETED = 'COMPLETED', _('Completed')
        FAILED = 'FAILED', _('Failed')
        CANCELLED = 'CANCELLED', _('Cancelled')
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='upload_records',
        verbose_name=_("Document"),
        null=True,
        blank=True
    )
    
    # Upload information
    original_filename = models.CharField(
        _("Original Filename"),
        max_length=255
    )
    upload_status = models.CharField(
        _("Upload Status"),
        max_length=20,
        choices=UploadStatus.choices,
        default=UploadStatus.PENDING,
        db_index=True
    )
    
    # Progress tracking
    progress_percent = models.PositiveIntegerField(
        _("Progress Percentage"),
        default=0,
        help_text=_("Upload progress as percentage (0-100)")
    )
    bytes_uploaded = models.PositiveBigIntegerField(
        _("Bytes Uploaded"),
        default=0,
        help_text=_("Number of bytes uploaded so far")
    )
    total_bytes = models.PositiveBigIntegerField(
        _("Total Bytes"),
        default=0,
        help_text=_("Total file size in bytes")
    )
    
    # Storage information
    storage_backend = models.CharField(
        _("Storage Backend"),
        max_length=50,
        blank=True,
        help_text=_("Storage backend used for upload")
    )
    temporary_path = models.CharField(
        _("Temporary Path"),
        max_length=500,
        blank=True,
        help_text=_("Temporary storage path during upload")
    )
    
    # Error handling
    error_message = models.TextField(
        _("Error Message"),
        blank=True,
        help_text=_("Error message if upload failed")
    )
    retry_count = models.PositiveIntegerField(
        _("Retry Count"),
        default=0,
        help_text=_("Number of retry attempts")
    )
    
    # User and timing
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='upload_records',
        verbose_name=_("Uploaded By")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        _("Completed At"),
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = _("Document Upload")
        verbose_name_plural = _("Document Uploads")
        indexes = [
            models.Index(fields=['upload_status', 'created_at']),
            models.Index(fields=['uploaded_by', 'upload_status']),
            models.Index(fields=['storage_backend', 'upload_status']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.original_filename} - {self.get_upload_status_display()}"
    
    @property
    def is_complete(self) -> bool:
        """Check if upload is complete"""
        return self.upload_status == self.UploadStatus.COMPLETED
    
    @property
    def is_failed(self) -> bool:
        """Check if upload failed"""
        return self.upload_status == self.UploadStatus.FAILED
    
    @property
    def can_retry(self) -> bool:
        """Check if upload can be retried"""
        return self.is_failed and self.retry_count < 3
    
    def mark_completed(self):
        """Mark upload as completed"""
        from django.utils import timezone
        self.upload_status = self.UploadStatus.COMPLETED
        self.progress_percent = 100
        self.completed_at = timezone.now()
        self.save(update_fields=['upload_status', 'progress_percent', 'completed_at', 'updated_at'])
    
    def mark_failed(self, error_message: str):
        """Mark upload as failed with error message"""
        from django.utils import timezone
        self.upload_status = self.UploadStatus.FAILED
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=['upload_status', 'error_message', 'completed_at', 'updated_at'])
    
    def update_progress(self, bytes_uploaded: int, total_bytes: int = None):
        """Update upload progress"""
        self.bytes_uploaded = bytes_uploaded
        if total_bytes:
            self.total_bytes = total_bytes
        
        if self.total_bytes > 0:
            self.progress_percent = min(100, int((self.bytes_uploaded / self.total_bytes) * 100))
        
        self.save(update_fields=['bytes_uploaded', 'total_bytes', 'progress_percent', 'updated_at'])

# settings.py example:
# For local development:
# MEDIA_URL = '/media/'
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
# DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
#
# For production (uncomment and configure):
# DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
# AWS_ACCESS_KEY_ID = 'your-access-key'
# AWS_SECRET_ACCESS_KEY = 'your-secret-key'
# AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
# AWS_S3_REGION_NAME = 'ap-southeast-2'

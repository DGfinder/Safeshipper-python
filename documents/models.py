import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator
from shipments.models import Shipment
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
            models.Index(fields=['shipment', 'document_type']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.original_filename}"
    
    def clean(self):
        """
        Validate document data.
        """
        if self.document_type == self.DocumentType.DG_MANIFEST and not self.shipment:
            raise models.ValidationError(
                _("DG Manifest must be associated with a shipment")
            )
    
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

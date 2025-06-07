import uuid
from django.db import models
from shipments.models import Shipment

class Document(models.Model):
    class DocumentType(models.TextChoices):
        MANIFEST = 'MANIFEST', 'Manifest'
        SDS = 'SDS', 'Safety Data Sheet'
        INVOICE = 'INVOICE', 'Invoice'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=16, choices=DocumentType.choices)
    file = models.FileField(upload_to='documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_document_type_display()} for Shipment {self.shipment_id}"

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

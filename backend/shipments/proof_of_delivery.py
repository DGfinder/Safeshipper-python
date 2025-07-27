# shipments/proof_of_delivery.py
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class ProofOfDelivery(models.Model):
    """
    Model for storing proof of delivery information including signature and photos
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.OneToOneField(
        'Shipment',
        on_delete=models.CASCADE,
        related_name='proof_of_delivery'
    )
    
    # Delivery details
    delivered_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='delivered_shipments'
    )
    delivered_at = models.DateTimeField(auto_now_add=True)
    
    # Recipient information
    recipient_name = models.CharField(max_length=255)
    recipient_signature_url = models.URLField(max_length=500)  # Base64 or cloud storage URL
    
    # Notes and additional info
    delivery_notes = models.TextField(blank=True)
    delivery_location = models.CharField(max_length=255, blank=True)  # GPS coordinates or address
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-delivered_at']
        verbose_name = _("Proof of Delivery")
        verbose_name_plural = _("Proofs of Delivery")

    def __str__(self):
        return f"POD for {self.shipment.tracking_number}"

    @property
    def photo_count(self):
        """Count of delivery photos"""
        return self.photos.count()


class ProofOfDeliveryPhoto(models.Model):
    """
    Photos captured during delivery as proof
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proof_of_delivery = models.ForeignKey(
        ProofOfDelivery,
        on_delete=models.CASCADE,
        related_name='photos'
    )
    
    # File storage
    image_url = models.URLField(max_length=500)  # Cloud storage URL
    thumbnail_url = models.URLField(max_length=500, blank=True)
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Size in bytes
    
    # Metadata
    caption = models.CharField(max_length=255, blank=True)
    taken_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['taken_at']

    def __str__(self):
        return f"POD Photo for {self.proof_of_delivery.shipment.tracking_number}"

    @property
    def file_size_mb(self):
        """File size in megabytes"""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return None
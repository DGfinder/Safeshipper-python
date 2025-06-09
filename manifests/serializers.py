from rest_framework import serializers
from django.core.validators import FileExtensionValidator
import uuid
from documents.models import Document, DocumentStatus
from documents.serializers import DocumentSerializer
from shipments.models import Shipment


class ManifestsSerializer(serializers.Serializer):
    pass

class ManifestUploadSerializer(serializers.Serializer):
    """
    Serializer for DG manifest file uploads.
    """
    file = serializers.FileField(
        help_text="The manifest file (PDF format)"
    )
    shipment_id = serializers.UUIDField(
        help_text="UUID of the associated shipment"
    )
    
    def validate_file(self, value):
        """
        Validate the uploaded file.
        """
        # Check file type
        if not value.content_type == 'application/pdf':
            raise serializers.ValidationError(
                "Only PDF files are accepted"
            )
        
        # Check file size (e.g., max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                "File size must be less than 10MB"
            )
        
        return value
    
    def validate_shipment_id(self, value):
        """
        Validate that the shipment exists.
        """
        try:
            Shipment.objects.get(id=value)
        except Shipment.DoesNotExist:
            raise serializers.ValidationError(
                "Shipment not found"
            )
        return value

class ManifestValidationSerializer(serializers.ModelSerializer):
    """
    Serializer for manifest validation results.
    """
    status_display = serializers.SerializerMethodField()
    validation_summary = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "status",
            "status_display",
            "validation_results",
            "validation_summary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_status_display(self, obj):
        """
        Get human-readable status.
        """
        return obj.get_status_display()

    def get_validation_summary(self, obj):
        """
        Get a summary of validation results.
        """
        if not obj.validation_results:
            return None
        
        results = obj.validation_results
        return {
            "total_dgs_identified": results.get("total_dgs_identified", 0),
            "total_unmatched": results.get("total_unmatched", 0),
            "total_compatibility_issues": results.get("total_compatibility_issues", 0),
            "has_errors": results.get("has_errors", False),
            "error_message": results.get("error") if results.get("has_errors") else None,
        }

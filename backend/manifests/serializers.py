from rest_framework import serializers
from django.core.validators import FileExtensionValidator
import uuid
from documents.models import Document, DocumentStatus
from documents.serializers import DocumentSerializer
from shipments.models import Shipment
from .models import Manifest, ManifestDangerousGoodMatch, ManifestType, ManifestStatus
from dangerous_goods.serializers import DangerousGoodSerializer


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

class ManifestDangerousGoodMatchSerializer(serializers.ModelSerializer):
    """
    Serializer for dangerous goods matches found in manifests.
    """
    dangerous_good = DangerousGoodSerializer(read_only=True)
    match_type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ManifestDangerousGoodMatch
        fields = [
            'id',
            'dangerous_good',
            'found_text',
            'match_type',
            'match_type_display',
            'confidence_score',
            'page_number',
            'position_data',
            'is_confirmed',
            'confirmed_by',
            'confirmed_at',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'dangerous_good',
            'found_text',
            'match_type',
            'confidence_score',
            'page_number',
            'position_data',
            'confirmed_by',
            'confirmed_at',
            'created_at'
        ]
    
    def get_match_type_display(self, obj):
        return dict(obj._meta.get_field('match_type').choices).get(obj.match_type, obj.match_type)

class ManifestSerializer(serializers.ModelSerializer):
    """
    Serializer for Manifest model.
    """
    document = DocumentSerializer(read_only=True)
    dg_matches = ManifestDangerousGoodMatchSerializer(many=True, read_only=True)
    manifest_type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    confirmed_dg_count = serializers.SerializerMethodField()
    total_dg_matches = serializers.SerializerMethodField()
    
    class Meta:
        model = Manifest
        fields = [
            'id',
            'document',
            'shipment',
            'manifest_type',
            'manifest_type_display',
            'status',
            'status_display',
            'processed_by',
            'confirmed_by',
            'analysis_results',
            'confirmed_dangerous_goods',
            'analysis_started_at',
            'analysis_completed_at',
            'confirmed_at',
            'finalized_at',
            'created_at',
            'updated_at',
            'dg_matches',
            'confirmed_dg_count',
            'total_dg_matches'
        ]
        read_only_fields = [
            'id',
            'document',
            'analysis_results',
            'analysis_started_at',
            'analysis_completed_at',
            'confirmed_at',
            'finalized_at',
            'created_at',
            'updated_at',
            'dg_matches'
        ]
    
    def get_manifest_type_display(self, obj):
        return obj.get_manifest_type_display()
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def get_confirmed_dg_count(self, obj):
        return obj.dg_matches.filter(is_confirmed=True).count()
    
    def get_total_dg_matches(self, obj):
        return obj.dg_matches.count()

class ManifestConfirmationSerializer(serializers.Serializer):
    """
    Serializer for confirming dangerous goods in a manifest.
    """
    confirmed_un_numbers = serializers.ListField(
        child=serializers.CharField(max_length=10),
        help_text="List of UN numbers to confirm"
    )
    
    def validate_confirmed_un_numbers(self, value):
        """
        Validate UN numbers format.
        """
        for un_number in value:
            if not un_number.startswith('UN') or len(un_number) != 6:
                raise serializers.ValidationError(
                    f"Invalid UN number format: {un_number}. Expected format: UN1234"
                )
        return value

class ManifestFinalizationSerializer(serializers.Serializer):
    """
    Serializer for finalizing a manifest with dangerous goods data.
    """
    confirmed_dangerous_goods = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of confirmed dangerous goods with quantities and weights"
    )
    
    def validate_confirmed_dangerous_goods(self, value):
        """
        Validate the confirmed dangerous goods data.
        """
        required_fields = ['un_number', 'description', 'quantity', 'weight_kg']
        
        for i, dg_data in enumerate(value):
            missing_fields = [field for field in required_fields if field not in dg_data]
            if missing_fields:
                raise serializers.ValidationError(
                    f"Item {i + 1}: Missing required fields: {missing_fields}"
                )
            
            # Validate UN number format
            un_number = dg_data.get('un_number', '')
            if not un_number.startswith('UN') or len(un_number) != 6:
                raise serializers.ValidationError(
                    f"Item {i + 1}: Invalid UN number format: {un_number}"
                )
            
            # Validate quantity is positive integer
            try:
                quantity = int(dg_data['quantity'])
                if quantity <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Item {i + 1}: Quantity must be a positive integer"
                )
            
            # Validate weight is positive number
            try:
                weight = float(dg_data['weight_kg'])
                if weight <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Item {i + 1}: Weight must be a positive number"
                )
        
        return value

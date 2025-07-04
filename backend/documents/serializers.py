# documents/serializers.py
import uuid
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Document, DocumentType, DocumentStatus
from shipments.models import Shipment

class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model with full details"""
    
    file_url = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()
    shipment_tracking_number = serializers.CharField(source='shipment.tracking_number', read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id', 'document_type', 'status', 'file', 'file_url', 'original_filename',
            'file_extension', 'mime_type', 'file_size', 'shipment', 'shipment_tracking_number',
            'uploaded_by', 'uploaded_by_username', 'validation_results',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'uploaded_by']
    
    def get_file_url(self, obj):
        """Get the URL for accessing the file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_file_extension(self, obj):
        """Get the file extension"""
        return obj.get_file_extension()

class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for uploading manifest documents"""
    
    file = serializers.FileField(
        help_text="PDF manifest file to upload"
    )
    shipment_id = serializers.UUIDField(
        help_text="UUID of the shipment this manifest belongs to"
    )
    document_type = serializers.ChoiceField(
        choices=DocumentType.choices,
        default=DocumentType.DG_MANIFEST,
        help_text="Type of document being uploaded"
    )
    
    def validate_file(self, value):
        """Validate the uploaded file"""
        # Check file size (limit to 50MB)
        max_size = 50 * 1024 * 1024  # 50MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size ({value.size} bytes) exceeds maximum allowed size (50MB)"
            )
        
        # Check file extension
        allowed_extensions = ['pdf']
        file_extension = value.name.split('.')[-1].lower()
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"File extension '{file_extension}' not allowed. Allowed: {allowed_extensions}"
            )
        
        # Check MIME type
        if hasattr(value, 'content_type'):
            allowed_mime_types = ['application/pdf']
            if value.content_type not in allowed_mime_types:
                raise serializers.ValidationError(
                    f"MIME type '{value.content_type}' not allowed. Expected PDF."
                )
        
        return value
    
    def validate_shipment_id(self, value):
        """Validate that the shipment exists and is accessible"""
        try:
            shipment = Shipment.objects.get(id=value)
        except Shipment.DoesNotExist:
            raise serializers.ValidationError("Shipment not found")
        
        # Additional validation can be added here
        return value

class DocumentStatusSerializer(serializers.ModelSerializer):
    """Simplified serializer for checking document status"""
    
    is_processing = serializers.BooleanField(read_only=True)
    is_validated = serializers.BooleanField(read_only=True)
    validation_errors_count = serializers.SerializerMethodField()
    validation_warnings_count = serializers.SerializerMethodField()
    potential_dg_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'status', 'is_processing', 'is_validated',
            'validation_errors_count', 'validation_warnings_count',
            'potential_dg_count', 'updated_at'
        ]
    
    def get_validation_errors_count(self, obj):
        """Get count of validation errors"""
        return len(obj.validation_errors)
    
    def get_validation_warnings_count(self, obj):
        """Get count of validation warnings"""
        return len(obj.validation_warnings)
    
    def get_potential_dg_count(self, obj):
        """Get count of potential dangerous goods found"""
        if not obj.validation_results:
            return 0
        return len(obj.validation_results.get('potential_dangerous_goods', []))

class DangerousGoodConfirmationSerializer(serializers.Serializer):
    """Serializer for confirming dangerous goods found in manifest"""
    
    un_number = serializers.CharField(
        max_length=10,
        help_text="UN number of the dangerous good (e.g., UN1090)"
    )
    description = serializers.CharField(
        max_length=255,
        help_text="Description/proper shipping name"
    )
    quantity = serializers.IntegerField(
        min_value=1,
        help_text="Quantity of this dangerous good"
    )
    weight_kg = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0,
        help_text="Total weight in kilograms"
    )
    found_text = serializers.CharField(
        max_length=500,
        required=False,
        help_text="Original text from manifest where this was found"
    )
    confidence_score = serializers.FloatField(
        min_value=0.0,
        max_value=1.0,
        required=False,
        help_text="Confidence score of the match (0.0-1.0)"
    )
    page_number = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text="Page number in the PDF where this was found"
    )
    
    def validate_un_number(self, value):
        """Validate UN number format"""
        # Basic validation for UN number format
        if not value.upper().startswith('UN'):
            raise serializers.ValidationError("UN number must start with 'UN'")
        
        # Check if it's a valid format (UN followed by 4 digits)
        number_part = value[2:]
        if not number_part.isdigit() or len(number_part) != 4:
            raise serializers.ValidationError("UN number must be in format 'UN####' (e.g., UN1090)")
        
        return value.upper()

class ManifestValidationResultSerializer(serializers.Serializer):
    """Serializer for returning manifest validation results"""
    
    document_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=DocumentStatus.choices)
    potential_dangerous_goods = DangerousGoodConfirmationSerializer(many=True)
    unmatched_text = serializers.ListField(
        child=serializers.CharField(),
        help_text="Text lines that couldn't be matched to dangerous goods"
    )
    processing_metadata = serializers.DictField(
        help_text="Metadata about the processing (pages, processing time, etc.)"
    )
    validation_errors = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    validation_warnings = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
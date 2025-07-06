from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import SafetyDataSheet, SDSRequest, SDSAccessLog, SDSStatus, SDSLanguage
from dangerous_goods.models import DangerousGood
from documents.models import Document
from users.serializers import UserBasicSerializer

class DangerousGoodBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for dangerous goods reference"""
    class Meta:
        model = DangerousGood
        fields = ['id', 'un_number', 'proper_shipping_name', 'hazard_class', 'packing_group']
        read_only_fields = fields

class DocumentBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for document reference"""
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = ['id', 'original_filename', 'file_size', 'mime_type', 'file_url', 'created_at']
        read_only_fields = fields
    
    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

class SafetyDataSheetSerializer(serializers.ModelSerializer):
    """Comprehensive SDS serializer for API responses"""
    dangerous_good = DangerousGoodBasicSerializer(read_only=True)
    document = DocumentBasicSerializer(read_only=True)
    created_by = UserBasicSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    days_until_expiration = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SafetyDataSheet
        fields = [
            'id', 'dangerous_good', 'product_name', 'manufacturer', 'manufacturer_code',
            'document', 'version', 'revision_date', 'supersedes_version', 'status', 'status_display',
            'expiration_date', 'language', 'language_display', 'country_code', 'regulatory_standard',
            'emergency_contacts', 'flash_point_celsius', 'auto_ignition_temp_celsius',
            'physical_state', 'color', 'odor', 'hazard_statements', 'precautionary_statements',
            'first_aid_measures', 'fire_fighting_measures', 'spill_cleanup_procedures',
            'storage_requirements', 'handling_precautions', 'disposal_methods',
            'created_by', 'created_at', 'updated_at', 'is_expired', 'is_current', 'days_until_expiration'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

class SafetyDataSheetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new SDS records"""
    dangerous_good_id = serializers.UUIDField(write_only=True)
    document_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = SafetyDataSheet
        fields = [
            'dangerous_good_id', 'document_id', 'product_name', 'manufacturer', 'manufacturer_code',
            'version', 'revision_date', 'supersedes_version', 'status', 'expiration_date',
            'language', 'country_code', 'regulatory_standard', 'emergency_contacts',
            'flash_point_celsius', 'auto_ignition_temp_celsius', 'physical_state', 'color', 'odor',
            'hazard_statements', 'precautionary_statements', 'first_aid_measures',
            'fire_fighting_measures', 'spill_cleanup_procedures', 'storage_requirements',
            'handling_precautions', 'disposal_methods'
        ]
    
    def validate_dangerous_good_id(self, value):
        """Validate dangerous good exists"""
        try:
            DangerousGood.objects.get(id=value)
            return value
        except DangerousGood.DoesNotExist:
            raise serializers.ValidationError(_("Dangerous good not found"))
    
    def validate_document_id(self, value):
        """Validate document exists and is appropriate type"""
        try:
            document = Document.objects.get(id=value)
            # Check if document is appropriate for SDS
            if document.document_type not in ['SDS', 'SAFETY_DOCUMENT']:
                raise serializers.ValidationError(_("Document must be an SDS or safety document"))
            return value
        except Document.DoesNotExist:
            raise serializers.ValidationError(_("Document not found"))
    
    def create(self, validated_data):
        dangerous_good_id = validated_data.pop('dangerous_good_id')
        document_id = validated_data.pop('document_id')
        
        dangerous_good = DangerousGood.objects.get(id=dangerous_good_id)
        document = Document.objects.get(id=document_id)
        
        sds = SafetyDataSheet.objects.create(
            dangerous_good=dangerous_good,
            document=document,
            created_by=self.context['request'].user,
            **validated_data
        )
        return sds

class SafetyDataSheetListSerializer(serializers.ModelSerializer):
    """Minimal serializer for SDS list views"""
    dangerous_good = DangerousGoodBasicSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiration = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SafetyDataSheet
        fields = [
            'id', 'dangerous_good', 'product_name', 'manufacturer', 'version',
            'revision_date', 'status', 'status_display', 'expiration_date',
            'language', 'language_display', 'country_code', 'is_expired',
            'days_until_expiration', 'created_at'
        ]

class SDSLookupSerializer(serializers.Serializer):
    """Serializer for quick SDS lookup by dangerous good"""
    dangerous_good_id = serializers.UUIDField(help_text=_("Dangerous good UUID"))
    language = serializers.ChoiceField(choices=SDSLanguage.choices, default=SDSLanguage.EN, help_text=_("Preferred language"))
    country_code = serializers.CharField(max_length=2, required=False, help_text=_("Country code for regulatory compliance"))
    
    def validate_dangerous_good_id(self, value):
        """Validate dangerous good exists"""
        try:
            DangerousGood.objects.get(id=value)
            return value
        except DangerousGood.DoesNotExist:
            raise serializers.ValidationError(_("Dangerous good not found"))

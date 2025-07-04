# inspections/serializers.py
from rest_framework import serializers
from .models import Inspection, InspectionItem, InspectionPhoto, InspectionTemplate, InspectionTemplateItem


class InspectionPhotoSerializer(serializers.ModelSerializer):
    """Serializer for inspection photos"""
    
    class Meta:
        model = InspectionPhoto
        fields = [
            'id', 'image_url', 'thumbnail_url', 'file_name', 
            'file_size', 'file_size_mb', 'caption', 'taken_at'
        ]
        read_only_fields = ['id', 'file_size_mb', 'taken_at']


class InspectionItemSerializer(serializers.ModelSerializer):
    """Serializer for inspection items"""
    photos = InspectionPhotoSerializer(many=True, read_only=True)
    has_photos = serializers.ReadOnlyField()
    
    class Meta:
        model = InspectionItem
        fields = [
            'id', 'description', 'category', 'is_mandatory', 'result', 
            'notes', 'corrective_action', 'checked_at', 'photos', 'has_photos'
        ]
        read_only_fields = ['id']


class InspectionSerializer(serializers.ModelSerializer):
    """Serializer for inspections"""
    items = InspectionItemSerializer(many=True, read_only=True)
    inspector_name = serializers.CharField(source='inspector.get_full_name', read_only=True)
    inspector_email = serializers.CharField(source='inspector.email', read_only=True)
    shipment_tracking_number = serializers.CharField(source='shipment.tracking_number', read_only=True)
    
    # Computed fields
    duration_minutes = serializers.ReadOnlyField()
    passed_items_count = serializers.ReadOnlyField()
    failed_items_count = serializers.ReadOnlyField()
    total_photos_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Inspection
        fields = [
            'id', 'shipment', 'shipment_tracking_number', 'inspector', 
            'inspector_name', 'inspector_email', 'inspection_type', 'status',
            'started_at', 'completed_at', 'overall_result', 'notes',
            'duration_minutes', 'passed_items_count', 'failed_items_count',
            'total_photos_count', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'started_at', 'created_at', 'updated_at']


class InspectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new inspections"""
    items_data = serializers.ListField(write_only=True, required=False)
    
    class Meta:
        model = Inspection
        fields = ['shipment', 'inspection_type', 'notes', 'items_data']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items_data', [])
        inspection = Inspection.objects.create(
            inspector=self.context['request'].user,
            **validated_data
        )
        
        # Create inspection items
        for item_data in items_data:
            InspectionItem.objects.create(
                inspection=inspection,
                **item_data
            )
        
        return inspection


class InspectionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating inspection results"""
    items = InspectionItemSerializer(many=True, required=False)
    
    class Meta:
        model = Inspection
        fields = ['status', 'overall_result', 'notes', 'completed_at', 'items']
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Update inspection
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update inspection items
        for item_data in items_data:
            item_id = item_data.get('id')
            if item_id:
                try:
                    item = instance.items.get(id=item_id)
                    for attr, value in item_data.items():
                        if attr != 'id':
                            setattr(item, attr, value)
                    item.save()
                except InspectionItem.DoesNotExist:
                    pass
        
        return instance


class InspectionTemplateItemSerializer(serializers.ModelSerializer):
    """Serializer for inspection template items"""
    
    class Meta:
        model = InspectionTemplateItem
        fields = [
            'id', 'description', 'category', 'is_mandatory', 
            'order', 'help_text'
        ]


class InspectionTemplateSerializer(serializers.ModelSerializer):
    """Serializer for inspection templates"""
    template_items = InspectionTemplateItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = InspectionTemplate
        fields = [
            'id', 'name', 'inspection_type', 'description', 
            'is_active', 'template_items'
        ]
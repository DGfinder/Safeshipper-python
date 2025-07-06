# inspections/serializers.py
from rest_framework import serializers
from .models import Inspection, InspectionItem, InspectionPhoto, InspectionTemplate, InspectionTemplateItem


class InspectionPhotoSerializer(serializers.ModelSerializer):
    """Serializer for inspection photos"""
    image_file = serializers.ImageField(write_only=True, required=False)
    
    class Meta:
        model = InspectionPhoto
        fields = [
            'id', 'image_url', 'thumbnail_url', 'file_name', 
            'file_size', 'file_size_mb', 'caption', 'taken_at',
            'image_file'
        ]
        read_only_fields = ['id', 'file_size_mb', 'taken_at', 'image_url', 'thumbnail_url']
    
    def create(self, validated_data):
        """Handle image file upload and generate URLs"""
        image_file = validated_data.pop('image_file', None)
        
        if image_file:
            # For now, we'll store the file using Django's default storage
            # In production, this would upload to S3 and generate the URL
            validated_data['file_name'] = image_file.name
            validated_data['file_size'] = image_file.size
            # Placeholder URL - in production this would be the S3 URL
            validated_data['image_url'] = f"/media/inspections/{image_file.name}"
            
        return super().create(validated_data)


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


class InspectionItemUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating inspection items with photo uploads"""
    photos_data = serializers.ListField(
        child=serializers.DictField(), 
        write_only=True, 
        required=False
    )
    photos = InspectionPhotoSerializer(many=True, read_only=True)
    
    class Meta:
        model = InspectionItem
        fields = [
            'id', 'description', 'category', 'is_mandatory', 'result', 
            'notes', 'corrective_action', 'checked_at', 'photos', 'photos_data'
        ]
        read_only_fields = ['id', 'description', 'category', 'is_mandatory']
    
    def update(self, instance, validated_data):
        photos_data = validated_data.pop('photos_data', [])
        
        # Update the inspection item
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Create photos if provided
        for photo_data in photos_data:
            photo_data['inspection_item'] = instance
            if 'uploaded_by' not in photo_data and hasattr(self.context.get('request'), 'user'):
                photo_data['uploaded_by'] = self.context['request'].user
            InspectionPhoto.objects.create(**photo_data)
        
        return instance


class InspectionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating inspection results"""
    items = InspectionItemUpdateSerializer(many=True, required=False)
    
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
                    serializer = InspectionItemUpdateSerializer(
                        item, 
                        data=item_data, 
                        context=self.context,
                        partial=True
                    )
                    if serializer.is_valid():
                        serializer.save()
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
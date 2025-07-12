# shipments/serializers.py
from rest_framework import serializers
from django.db import transaction
from .models import Shipment, ConsignmentItem, ShipmentStatus, ProofOfDelivery, ProofOfDeliveryPhoto
from dangerous_goods.models import DangerousGood

class ConsignmentItemSerializer(serializers.ModelSerializer):
    dangerous_good_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ConsignmentItem
        fields = [
            'id',
            'description',
            'quantity',
            'weight_kg',
            'length_cm',
            'width_cm',
            'height_cm',
            'is_dangerous_good',
            'dangerous_good_entry',
            'dangerous_good_details',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'dangerous_good_details']

    def get_dangerous_good_details(self, obj):
        """Get dangerous good details if this item is a DG"""
        if obj.is_dangerous_good and obj.dangerous_good_entry:
            return {
                'un_number': obj.dangerous_good_entry.un_number,
                'proper_shipping_name': obj.dangerous_good_entry.proper_shipping_name,
                'hazard_class': obj.dangerous_good_entry.hazard_class,
                'packing_group': obj.dangerous_good_entry.packing_group,
            }
        return None

    def validate_weight_kg(self, value):
        if value is not None and value > 5000:
            raise serializers.ValidationError("Weight per item must not exceed 5000 kg.")
        if value is not None and value < 0:
            raise serializers.ValidationError("Weight must be a positive value.")
        return value
    
    def validate(self, data):
        """Object-level validation for dangerous goods fields."""
        is_dg = data.get('is_dangerous_good', getattr(self.instance, 'is_dangerous_good', False))
        
        if is_dg and not data.get('dangerous_good_entry', getattr(self.instance, 'dangerous_good_entry', None)):
            raise serializers.ValidationError({
                "dangerous_good_entry": "A Dangerous Good entry must be selected for dangerous goods."
            })
        
        return data

class ProofOfDeliveryPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProofOfDeliveryPhoto
        fields = [
            'id',
            'image_url',
            'thumbnail_url',
            'file_name',
            'file_size',
            'caption',
            'taken_at',
            'file_size_mb'
        ]

class ProofOfDeliverySerializer(serializers.ModelSerializer):
    photos = ProofOfDeliveryPhotoSerializer(many=True, read_only=True)
    delivered_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ProofOfDelivery
        fields = [
            'id',
            'delivered_by',
            'delivered_by_name',
            'delivered_at',
            'recipient_name',
            'recipient_signature_url',
            'delivery_notes',
            'delivery_location',
            'photos',
            'photo_count',
            'created_at',
            'updated_at'
        ]
    
    def get_delivered_by_name(self, obj):
        if obj.delivered_by:
            return f"{obj.delivered_by.first_name} {obj.delivered_by.last_name}".strip()
        return None

class ShipmentSerializer(serializers.ModelSerializer):
    items = ConsignmentItemSerializer(many=True, required=False)
    status = serializers.ChoiceField(choices=ShipmentStatus.choices, required=False)
    customer_name = serializers.SerializerMethodField()
    carrier_name = serializers.SerializerMethodField()
    freight_type_name = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    total_weight = serializers.SerializerMethodField()
    proof_of_delivery = ProofOfDeliverySerializer(read_only=True)
    has_proof_of_delivery = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            'id',
            'tracking_number',
            'reference_number',
            'customer',
            'customer_name',
            'carrier',
            'carrier_name',
            'origin_location',
            'destination_location',
            'freight_type',
            'freight_type_name',
            'status',
            'contract_type',
            'pricing_basis',
            'dead_weight_kg',
            'volumetric_weight_m3',
            'chargeable_weight_kg',
            'estimated_pickup_date',
            'actual_pickup_date',
            'estimated_delivery_date',
            'actual_delivery_date',
            'instructions',
            'total_items',
            'total_weight',
            'proof_of_delivery',
            'has_proof_of_delivery',
            'created_at',
            'updated_at',
            'items',
        ]
        read_only_fields = [
            'id', 'tracking_number', 'created_at', 'updated_at',
            'customer_name', 'carrier_name', 'freight_type_name',
            'total_items', 'total_weight', 'proof_of_delivery', 'has_proof_of_delivery'
        ]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_carrier_name(self, obj):
        return obj.carrier.name if obj.carrier else None

    def get_freight_type_name(self, obj):
        return obj.freight_type.name if obj.freight_type else None

    def get_total_items(self, obj):
        return obj.items.count()

    def get_total_weight(self, obj):
        return sum(
            (item.weight_kg or 0) * item.quantity 
            for item in obj.items.all()
        )

    def get_has_proof_of_delivery(self, obj):
        """Check if this shipment has proof of delivery"""
        return hasattr(obj, 'proof_of_delivery') and obj.proof_of_delivery is not None

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Create shipment (tracking number auto-generated by model)
        shipment = Shipment.objects.create(**validated_data)
        
        # Create items
        for item_data in items_data:
            item_data.pop('shipment', None)  # Remove if accidentally included
            ConsignmentItem.objects.create(shipment=shipment, **item_data)
        
        return shipment

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update shipment fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Handle nested item updates
        if items_data is not None:
            # Delete existing items and recreate (simpler approach)
            # For production, consider more sophisticated matching by ID
            instance.items.all().delete()
            for item_data in items_data:
                item_data.pop('shipment', None)
                ConsignmentItem.objects.create(shipment=instance, **item_data)
        
        return instance

class ShipmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    customer_name = serializers.SerializerMethodField()
    carrier_name = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    has_dangerous_goods = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            'id',
            'tracking_number',
            'reference_number',
            'customer_name',
            'carrier_name',
            'origin_location',
            'destination_location',
            'status',
            'total_items',
            'has_dangerous_goods',
            'estimated_pickup_date',
            'estimated_delivery_date',
            'created_at',
        ]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None

    def get_carrier_name(self, obj):
        return obj.carrier.name if obj.carrier else None

    def get_total_items(self, obj):
        return obj.items.count()

    def get_has_dangerous_goods(self, obj):
        return obj.items.filter(is_dangerous_good=True).exists()


class ProofOfDeliveryPhotoSerializer(serializers.ModelSerializer):
    """Serializer for proof of delivery photos"""
    image_file = serializers.ImageField(write_only=True, required=False)
    file_size_mb = serializers.ReadOnlyField()
    
    class Meta:
        model = ProofOfDeliveryPhoto
        fields = [
            'id', 'image_url', 'thumbnail_url', 'file_name',
            'file_size', 'file_size_mb', 'caption', 'taken_at', 'image_file'
        ]
        read_only_fields = ['id', 'taken_at', 'image_url', 'thumbnail_url']
    
    def create(self, validated_data):
        """Handle image file upload and generate URLs"""
        image_file = validated_data.pop('image_file', None)
        
        if image_file:
            validated_data['file_name'] = image_file.name
            validated_data['file_size'] = image_file.size
            # Placeholder URL - in production this would be the S3 URL
            validated_data['image_url'] = f"/media/pod_photos/{image_file.name}"
            
        return super().create(validated_data)


class ProofOfDeliverySerializer(serializers.ModelSerializer):
    """Serializer for proof of delivery"""
    photos = ProofOfDeliveryPhotoSerializer(many=True, read_only=True)
    delivered_by_name = serializers.CharField(source='delivered_by.get_full_name', read_only=True)
    photo_count = serializers.ReadOnlyField()
    
    class Meta:
        model = ProofOfDelivery
        fields = [
            'id', 'shipment', 'delivered_by', 'delivered_by_name', 'delivered_at',
            'recipient_name', 'recipient_signature_url', 'delivery_notes',
            'delivery_location', 'photos', 'photo_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'delivered_at', 'created_at', 'updated_at']


class ProofOfDeliveryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating proof of delivery with signature and photos"""
    photos_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    signature_file = serializers.CharField(write_only=True, required=True)  # Base64 encoded signature
    
    class Meta:
        model = ProofOfDelivery
        fields = [
            'shipment', 'recipient_name', 'delivery_notes',
            'delivery_location', 'signature_file', 'photos_data'
        ]
    
    def create(self, validated_data):
        photos_data = validated_data.pop('photos_data', [])
        signature_file = validated_data.pop('signature_file')
        
        # Set the delivered_by from request context
        validated_data['delivered_by'] = self.context['request'].user
        
        # Handle signature - in production this would upload to S3
        validated_data['recipient_signature_url'] = f"data:image/png;base64,{signature_file}"
        
        # Create the POD
        pod = ProofOfDelivery.objects.create(**validated_data)
        
        # Create photos
        for photo_data in photos_data:
            photo_data['proof_of_delivery'] = pod
            ProofOfDeliveryPhoto.objects.create(**photo_data)
        
        return pod

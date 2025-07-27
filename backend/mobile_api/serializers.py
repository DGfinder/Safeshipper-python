from rest_framework import serializers
from shipments.models import Shipment
from dangerous_goods.models import DangerousGood
from vehicles.models import Vehicle
from users.models import User


class MobileShipmentSerializer(serializers.ModelSerializer):
    """Optimized shipment serializer for mobile apps"""
    
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    carrier_name = serializers.CharField(source='carrier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Shipment
        fields = [
            'id', 'tracking_number', 'reference_number', 'status', 'status_display',
            'customer_name', 'carrier_name', 'origin_location', 'destination_location',
            'estimated_pickup_date', 'estimated_delivery_date', 'created_at'
        ]


class MobileDangerousGoodSerializer(serializers.ModelSerializer):
    """Optimized dangerous goods serializer for mobile"""
    
    class Meta:
        model = DangerousGood
        fields = [
            'id', 'un_number', 'proper_shipping_name', 'hazard_class',
            'packing_group', 'is_forbidden'
        ]


class MobileDriverSerializer(serializers.ModelSerializer):
    """Driver information for mobile apps"""
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone']


class LocationUpdateSerializer(serializers.Serializer):
    """Location update from mobile devices"""
    
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    accuracy = serializers.FloatField(required=False)
    heading = serializers.FloatField(required=False)
    speed = serializers.FloatField(required=False)
    timestamp = serializers.DateTimeField()


class ProofOfDeliverySerializer(serializers.Serializer):
    """Proof of delivery submission"""
    
    shipment_id = serializers.UUIDField()
    recipient_name = serializers.CharField(max_length=200)
    signature_image = serializers.ImageField()
    delivery_notes = serializers.CharField(required=False, allow_blank=True)
    delivery_photos = serializers.ListField(
        child=serializers.ImageField(),
        required=False
    )
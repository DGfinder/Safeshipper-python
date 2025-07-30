# shipments/serializers.py
from rest_framework import serializers
from django.db import transaction
from .models import Shipment, ConsignmentItem, ShipmentStatus, ShipmentFeedback
from .proof_of_delivery import ProofOfDelivery, ProofOfDeliveryPhoto
from dangerous_goods.models import DangerousGood  # Re-enabled after dangerous_goods app re-enabled
from shared.validation_service import SafeShipperValidationMixin

class ConsignmentItemSerializer(SafeShipperValidationMixin, serializers.ModelSerializer):
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
            'dangerous_good_entry',  # Re-enabled after dangerous_goods app re-enabled
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
        # Use enhanced weight validation with dangerous goods limits
        return super().validate_weight_kg(value) if value is not None else value
    
    def validate_quantity(self, value):
        """Validate quantity using enhanced validation"""
        return super().validate_quantity(value)
    
    def validate_description(self, value):
        """Validate item description"""
        return self.validate_text_content(value, max_length=500)
    
    def validate(self, data):
        """Object-level validation for dangerous goods fields."""
        is_dg = data.get('is_dangerous_good', getattr(self.instance, 'is_dangerous_good', False))
        
        # Re-enabled after dangerous_goods app re-enabled
        if is_dg and not data.get('dangerous_good_entry', getattr(self.instance, 'dangerous_good_entry', None)):
            raise serializers.ValidationError({
                "dangerous_good_entry": "A Dangerous Good entry must be selected for dangerous goods."
            })
        
        return data
    
    def validate_tracking_number(self, value):
        """Validate tracking number format"""
        return super().validate_tracking_number(value) if value else value
    
    def validate_reference_number(self, value):
        """Validate reference number"""
        return self.validate_text_content(value, max_length=100) if value else value
    
    def validate_instructions(self, value):
        """Validate shipment instructions"""
        return self.validate_text_content(value, max_length=2000, allow_html=True) if value else value

# class ProofOfDeliveryPhotoSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = ProofOfDeliveryPhoto
#         fields = [
#             'id',
#             'image_url',
#             'thumbnail_url',
#             'file_name',
#             'file_size',
#             'caption',
#             'taken_at',
#             'file_size_mb'
#         ]

# class ProofOfDeliverySerializer(serializers.ModelSerializer):
#     photos = ProofOfDeliveryPhotoSerializer(many=True, read_only=True)
#     delivered_by_name = serializers.SerializerMethodField()
#     
#     class Meta:
#         model = ProofOfDelivery
#         fields = [
#             'id',
#             'delivered_by',
#             'delivered_by_name',
#             'delivered_at',
#             'recipient_name',
#             'recipient_signature_url',
#             'delivery_notes',
#             'delivery_location',
#             'photos',
#             'photo_count',
#             'created_at',
#             'updated_at'
#         ]
#     
#     def get_delivered_by_name(self, obj):
#         if obj.delivered_by:
#             return f"{obj.delivered_by.first_name} {obj.delivered_by.last_name}".strip()
#         return None

class ShipmentSerializer(SafeShipperValidationMixin, serializers.ModelSerializer):
    items = ConsignmentItemSerializer(many=True, required=False)
    status = serializers.ChoiceField(choices=ShipmentStatus.choices, required=False)
    customer_name = serializers.SerializerMethodField()
    carrier_name = serializers.SerializerMethodField()
    freight_type_name = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    total_weight = serializers.SerializerMethodField()
    # proof_of_delivery = ProofOfDeliverySerializer(read_only=True)
    # has_proof_of_delivery = serializers.SerializerMethodField()

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
            # 'proof_of_delivery',
            # 'has_proof_of_delivery',
            'created_at',
            'updated_at',
            'items',
        ]
        read_only_fields = [
            'id', 'tracking_number', 'created_at', 'updated_at',
            'customer_name', 'carrier_name', 'freight_type_name',
            'total_items', 'total_weight'  # , 'proof_of_delivery', 'has_proof_of_delivery'
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

    # def get_has_proof_of_delivery(self, obj):
    #     """Check if this shipment has proof of delivery"""
    #     return hasattr(obj, 'proof_of_delivery') and obj.proof_of_delivery is not None

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
    """Enhanced serializer for proof of delivery photos with metadata"""
    image_file = serializers.ImageField(write_only=True, required=False)
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = ProofOfDeliveryPhoto
        fields = [
            'id', 'image_url', 'thumbnail_url', 'file_name',
            'file_size', 'file_size_mb', 'caption', 'taken_at', 'image_file'
        ]
        read_only_fields = ['id', 'taken_at', 'image_url', 'thumbnail_url']
    
    def get_file_size_mb(self, obj):
        """Return file size in MB"""
        return obj.file_size_mb
    
    def create(self, validated_data):
        """Handle image file upload and generate URLs"""
        image_file = validated_data.pop('image_file', None)
        
        if image_file:
            validated_data['file_name'] = image_file.name
            validated_data['file_size'] = image_file.size
            # In production this would be the S3 URL
            validated_data['image_url'] = f"/media/pod_photos/{image_file.name}"
            
        return super().create(validated_data)


class ProofOfDeliverySerializer(serializers.ModelSerializer):
    """Enhanced serializer for proof of delivery with shipment details"""
    photos = ProofOfDeliveryPhotoSerializer(many=True, read_only=True)
    delivered_by_name = serializers.CharField(source='delivered_by.get_full_name', read_only=True)
    delivered_by_email = serializers.CharField(source='delivered_by.email', read_only=True)
    photo_count = serializers.SerializerMethodField()
    shipment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ProofOfDelivery
        fields = [
            'id', 'shipment', 'shipment_details', 'delivered_by', 'delivered_by_name', 
            'delivered_by_email', 'delivered_at', 'recipient_name', 'recipient_signature_url', 
            'delivery_notes', 'delivery_location', 'photos', 'photo_count', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'delivered_at', 'created_at', 'updated_at']
    
    def get_photo_count(self, obj):
        """Return the count of photos"""
        return obj.photo_count
    
    def get_shipment_details(self, obj):
        """Return basic shipment information"""
        return {
            'id': str(obj.shipment.id),
            'tracking_number': obj.shipment.tracking_number,
            'customer_name': obj.shipment.customer.name if obj.shipment.customer else None,
            'status': obj.shipment.status,
            'origin_location': obj.shipment.origin_location,
            'destination_location': obj.shipment.destination_location
        }


class ProofOfDeliveryCreateSerializer(serializers.ModelSerializer):
    """Enhanced serializer for creating proof of delivery with comprehensive validation"""
    photos_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="List of photo data objects with image_url, file_name, etc."
    )
    signature_file = serializers.CharField(
        write_only=True, 
        required=True,
        help_text="Base64 encoded signature data"
    )
    
    class Meta:
        model = ProofOfDelivery
        fields = [
            'shipment', 'recipient_name', 'delivery_notes',
            'delivery_location', 'signature_file', 'photos_data'
        ]
    
    def validate_recipient_name(self, value):
        """Validate recipient name"""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError("Recipient name must be at least 2 characters long")
        return value.strip()
    
    def validate_signature_file(self, value):
        """Validate signature data"""
        if not value:
            raise serializers.ValidationError("Signature is required")
        
        # Basic validation for base64 format
        if not (value.startswith('data:image') or len(value) > 100):
            raise serializers.ValidationError("Invalid signature format")
        
        return value
    
    def validate_photos_data(self, value):
        """Validate photos data"""
        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 photos allowed per POD")
        
        for photo in value:
            if not photo.get('image_url'):
                raise serializers.ValidationError("Each photo must have an image_url")
        
        return value
    
    def create(self, validated_data):
        """Create POD using the dedicated service"""
        from .pod_capture_service import PODCaptureService
        
        photos_data = validated_data.pop('photos_data', [])
        signature_file = validated_data.pop('signature_file')
        shipment = validated_data.pop('shipment')
        
        # Prepare POD data for service
        pod_data = {
            'recipient_name': validated_data.get('recipient_name'),
            'delivery_notes': validated_data.get('delivery_notes', ''),
            'delivery_location': validated_data.get('delivery_location', ''),
            'signature_file': signature_file,
            'photos_data': photos_data
        }
        
        # Use the POD capture service
        result = PODCaptureService.submit_proof_of_delivery(
            shipment_id=str(shipment.id),
            driver_user=self.context['request'].user,
            pod_data=pod_data
        )
        
        if not result['success']:
            raise serializers.ValidationError(result['error'])
        
        # Return the created POD
        return ProofOfDelivery.objects.get(id=result['pod_id'])


# ===== FEEDBACK SERIALIZERS =====

class ShipmentFeedbackSerializer(SafeShipperValidationMixin, serializers.ModelSerializer):
    """
    Comprehensive serializer for shipment feedback with manager response functionality.
    """
    delivery_success_score = serializers.ReadOnlyField()
    feedback_summary = serializers.ReadOnlyField(source='get_feedback_summary')
    difot_score = serializers.ReadOnlyField()
    performance_category = serializers.ReadOnlyField()
    has_manager_response = serializers.ReadOnlyField()
    requires_incident = serializers.ReadOnlyField()
    
    # Shipment details for context
    shipment_details = serializers.SerializerMethodField()
    
    # Manager response fields with validation
    responded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ShipmentFeedback
        fields = [
            'id',
            'shipment',
            'shipment_details',
            'was_on_time',
            'was_complete_and_undamaged',
            'was_driver_professional',
            'feedback_notes',
            'delivery_success_score',
            'feedback_summary',
            'difot_score',
            'performance_category',
            'submitted_at',
            'customer_ip',
            'manager_response',
            'responded_at',
            'responded_by',
            'responded_by_name',
            'has_manager_response',
            'requires_incident',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'submitted_at', 'customer_ip', 'delivery_success_score',
            'feedback_summary', 'difot_score', 'performance_category',
            'has_manager_response', 'requires_incident', 'created_at', 'updated_at'
        ]
    
    def get_shipment_details(self, obj):
        """Get essential shipment details for context"""
        return {
            'tracking_number': obj.shipment.tracking_number,
            'customer_name': obj.shipment.customer.name,
            'carrier_name': obj.shipment.carrier.name,
            'status': obj.shipment.status,
            'actual_delivery_date': obj.shipment.actual_delivery_date,
            'assigned_driver': obj.shipment.assigned_driver.get_full_name() if obj.shipment.assigned_driver else None,
        }
    
    def get_responded_by_name(self, obj):
        """Get manager name who responded"""
        return obj.responded_by.get_full_name() if obj.responded_by else None
    
    def validate_manager_response(self, value):
        """Validate manager response using enhanced text validation"""
        if not value:
            return value
        return self.validate_text_content(value, max_length=2000)


class ShipmentFeedbackListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for feedback list views with essential information.
    """
    delivery_success_score = serializers.ReadOnlyField()
    performance_category = serializers.ReadOnlyField()
    has_manager_response = serializers.ReadOnlyField()
    tracking_number = serializers.CharField(source='shipment.tracking_number', read_only=True)
    customer_name = serializers.CharField(source='shipment.customer.name', read_only=True)
    
    class Meta:
        model = ShipmentFeedback
        fields = [
            'id',
            'tracking_number',
            'customer_name',
            'delivery_success_score',
            'performance_category',
            'submitted_at',
            'has_manager_response',
            'responded_at',
        ]


class ManagerResponseSerializer(serializers.Serializer):
    """
    Serializer for adding manager responses to feedback.
    """
    response_text = serializers.CharField(
        min_length=10,
        max_length=2000,
        help_text="Manager's internal response to the feedback"
    )
    
    def validate_response_text(self, value):
        """Validate response text"""
        if not value.strip():
            raise serializers.ValidationError("Response cannot be empty.")
        return value.strip()


class FeedbackAnalyticsSerializer(serializers.Serializer):
    """
    Serializer for feedback analytics data with filtering and aggregation.
    """
    # Time period filters
    period = serializers.ChoiceField(
        choices=[('7d', '7 Days'), ('30d', '30 Days'), ('90d', '90 Days'), ('qtd', 'Quarter to Date')],
        default='30d'
    )
    
    # Filter options
    driver_id = serializers.UUIDField(required=False)
    customer_id = serializers.UUIDField(required=False)
    route_origin = serializers.CharField(max_length=255, required=False)
    route_destination = serializers.CharField(max_length=255, required=False)
    freight_type_id = serializers.UUIDField(required=False)
    
    # Analytics output fields (read-only)
    total_feedback_count = serializers.IntegerField(read_only=True)
    average_delivery_score = serializers.FloatField(read_only=True)
    difot_rate = serializers.FloatField(read_only=True)
    on_time_rate = serializers.FloatField(read_only=True)
    complete_rate = serializers.FloatField(read_only=True)
    professional_rate = serializers.FloatField(read_only=True)
    
    # Performance categories breakdown
    excellent_count = serializers.IntegerField(read_only=True)
    good_count = serializers.IntegerField(read_only=True)
    needs_improvement_count = serializers.IntegerField(read_only=True)
    poor_count = serializers.IntegerField(read_only=True)
    
    # Trend data
    trend_data = serializers.ListField(child=serializers.DictField(), read_only=True)


class DeliverySuccessStatsSerializer(serializers.Serializer):
    """
    Serializer for dashboard delivery success statistics.
    """
    current_period_score = serializers.FloatField()
    previous_period_score = serializers.FloatField()
    score_change = serializers.FloatField()
    trend_direction = serializers.CharField()  # 'up', 'down', 'stable'
    
    total_feedback_count = serializers.IntegerField()
    poor_feedback_count = serializers.IntegerField()
    requires_attention_count = serializers.IntegerField()
    
    # Quick stats
    difot_rate = serializers.FloatField()
    customer_satisfaction_rate = serializers.FloatField()
    
    # Recent activity
    recent_feedback = ShipmentFeedbackListSerializer(many=True, read_only=True)


# Driver Qualification Serializers

class DriverQualificationValidationSerializer(serializers.Serializer):
    """
    Serializer for driver qualification validation results.
    Used for detailed qualification analysis and validation responses.
    """
    validation_type = serializers.CharField(read_only=True)
    driver_id = serializers.UUIDField(read_only=True)
    driver_name = serializers.CharField(read_only=True)
    overall_qualified = serializers.BooleanField(read_only=True)
    qualification_level = serializers.CharField(read_only=True)
    dangerous_goods_classes = serializers.ListField(child=serializers.CharField(), read_only=True)
    compliance_percentage = serializers.FloatField(read_only=True, required=False)
    overall_status = serializers.CharField(read_only=True, required=False)
    critical_issues = serializers.ListField(child=serializers.CharField(), read_only=True)
    warnings = serializers.ListField(child=serializers.CharField(), read_only=True)
    recommendations = serializers.ListField(child=serializers.CharField(), read_only=True)
    validation_details = serializers.DictField(read_only=True)
    
    # Assignment recommendation (added by validate-driver endpoint)
    assignment_recommendation = serializers.DictField(read_only=True, required=False)


class QualifiedDriverSerializer(serializers.Serializer):
    """
    Serializer for qualified driver information.
    Used when listing drivers qualified for a specific shipment.
    """
    driver_id = serializers.UUIDField(read_only=True)
    driver_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True, required=False, allow_null=True)
    overall_qualified = serializers.BooleanField(read_only=True)
    compliance_percentage = serializers.FloatField(read_only=True)
    qualified_classes = serializers.DictField(read_only=True)
    warnings = serializers.ListField(child=serializers.CharField(), read_only=True)
    dangerous_goods_classes = serializers.ListField(child=serializers.CharField(), read_only=True)


class ShipmentQualifiedDriversResponseSerializer(serializers.Serializer):
    """
    Serializer for the qualified drivers API response.
    """
    shipment_id = serializers.UUIDField(read_only=True)
    qualified_drivers = QualifiedDriverSerializer(many=True, read_only=True)
    total_qualified = serializers.IntegerField(read_only=True)
    validation_summary = serializers.DictField(read_only=True)


class DriverValidationRequestSerializer(serializers.Serializer):
    """
    Serializer for driver validation requests.
    """
    driver_id = serializers.UUIDField(required=True)
    
    def validate_driver_id(self, value):
        """Validate that driver exists and has driver role"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=value)
            if hasattr(user, 'role') and user.role != 'DRIVER':
                raise serializers.ValidationError("Selected user is not a driver")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Driver not found")


class DriverAssignmentRequestSerializer(serializers.Serializer):
    """
    Serializer for driver assignment requests with force option.
    """
    driver_id = serializers.UUIDField(required=True)
    force_assignment = serializers.BooleanField(default=False)
    
    def validate_driver_id(self, value):
        """Validate that driver exists and has driver role"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=value)
            if hasattr(user, 'role') and user.role != 'DRIVER':
                raise serializers.ValidationError("Selected user is not a driver")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Driver not found")


class DriverAssignmentResponseSerializer(serializers.Serializer):
    """
    Serializer for driver assignment responses.
    Includes shipment data plus qualification validation results.
    """
    # Shipment fields (subset of ShipmentSerializer)
    id = serializers.UUIDField(read_only=True)
    tracking_number = serializers.CharField(read_only=True)
    reference_number = serializers.CharField(read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True)
    assigned_driver = serializers.SerializerMethodField()
    
    # Qualification validation results
    driver_qualification = DriverQualificationValidationSerializer(read_only=True)
    
    def get_assigned_driver(self, obj):
        """Get assigned driver details"""
        if obj.assigned_driver:
            return {
                'id': obj.assigned_driver.id,
                'name': obj.assigned_driver.get_full_name(),
                'email': obj.assigned_driver.email
            }
        return None

from rest_framework import serializers
from .models import (
    Vehicle, SafetyEquipmentType, VehicleSafetyEquipment,
    SafetyEquipmentInspection, SafetyEquipmentCertification
)
from locations.serializers import GeoLocationSerializer
from companies.serializers import CompanySerializer

class VehicleSerializer(serializers.ModelSerializer):
    assigned_depot_details = GeoLocationSerializer(source='assigned_depot', read_only=True)
    owning_company_details = CompanySerializer(source='owning_company', read_only=True)
    
    class Meta:
        model = Vehicle
        fields = [
            'id',
            'registration_number',
            'vehicle_type',
            'capacity_kg',
            'status',
            'assigned_depot',
            'assigned_depot_details',
            'owning_company',
            'owning_company_details',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'assigned_depot': {'write_only': True},
            'owning_company': {'write_only': True}
        }


class SafetyEquipmentTypeSerializer(serializers.ModelSerializer):
    """Serializer for safety equipment type definitions"""
    
    class Meta:
        model = SafetyEquipmentType
        fields = [
            'id', 'name', 'category', 'description',
            'required_for_adr_classes', 'required_by_vehicle_weight',
            'minimum_capacity', 'certification_standard',
            'has_expiry_date', 'inspection_interval_months',
            'replacement_interval_months', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SafetyEquipmentCertificationSerializer(serializers.ModelSerializer):
    """Serializer for safety equipment certifications"""
    
    class Meta:
        model = SafetyEquipmentCertification
        fields = [
            'id', 'certification_type', 'certificate_number',
            'issuing_authority', 'standard_reference',
            'issue_date', 'expiry_date', 'document_file',
            'notes', 'is_valid', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_valid', 'created_at', 'updated_at']


class SafetyEquipmentInspectionSerializer(serializers.ModelSerializer):
    """Serializer for safety equipment inspections"""
    inspector_name = serializers.CharField(source='inspector.get_full_name', read_only=True)
    
    class Meta:
        model = SafetyEquipmentInspection
        fields = [
            'id', 'inspection_type', 'inspection_date',
            'inspector', 'inspector_name', 'result',
            'findings', 'actions_required', 'next_inspection_due',
            'maintenance_completed', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'inspector_name', 'created_at', 'updated_at']


class VehicleSafetyEquipmentSerializer(serializers.ModelSerializer):
    """Serializer for vehicle safety equipment instances"""
    equipment_type_details = SafetyEquipmentTypeSerializer(source='equipment_type', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    latest_inspection = SafetyEquipmentInspectionSerializer(
        source='inspections.first', read_only=True
    )
    certifications = SafetyEquipmentCertificationSerializer(many=True, read_only=True)
    
    # Computed fields
    is_expired = serializers.ReadOnlyField()
    inspection_overdue = serializers.ReadOnlyField()
    is_compliant = serializers.ReadOnlyField()
    
    class Meta:
        model = VehicleSafetyEquipment
        fields = [
            'id', 'vehicle', 'vehicle_registration', 'equipment_type',
            'equipment_type_details', 'serial_number', 'manufacturer',
            'model', 'capacity', 'installation_date', 'expiry_date',
            'last_inspection_date', 'next_inspection_date', 'status',
            'location_on_vehicle', 'certification_number', 'compliance_notes',
            'latest_inspection', 'certifications', 'is_expired',
            'inspection_overdue', 'is_compliant', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'vehicle_registration', 'equipment_type_details',
            'latest_inspection', 'certifications', 'is_expired',
            'inspection_overdue', 'is_compliant', 'created_at', 'updated_at'
        ]


class VehicleDetailSerializer(VehicleSerializer):
    """Extended vehicle serializer with safety equipment details"""
    safety_equipment = VehicleSafetyEquipmentSerializer(many=True, read_only=True)
    safety_equipment_status = serializers.ReadOnlyField()
    required_fire_extinguisher_capacity = serializers.ReadOnlyField()
    
    class Meta(VehicleSerializer.Meta):
        fields = VehicleSerializer.Meta.fields + [
            'safety_equipment', 'safety_equipment_status',
            'required_fire_extinguisher_capacity'
        ]


class VehicleSafetyComplianceSerializer(serializers.Serializer):
    """Serializer for vehicle safety compliance check results"""
    vehicle_id = serializers.UUIDField()
    vehicle_registration = serializers.CharField()
    adr_classes = serializers.ListField(child=serializers.CharField())
    compliant = serializers.BooleanField()
    issues = serializers.ListField(child=serializers.CharField())
    equipment_summary = serializers.DictField()
    
    def to_representation(self, instance):
        """Custom representation for compliance check results"""
        if isinstance(instance, Vehicle):
            adr_classes = self.context.get('adr_classes', ['ALL_CLASSES'])
            compliance_result = instance.is_compliant_for_dangerous_goods(adr_classes)
            
            # Get equipment summary
            equipment_summary = {}
            for equipment in instance.safety_equipment.filter(status='ACTIVE'):
                category = equipment.equipment_type.category
                if category not in equipment_summary:
                    equipment_summary[category] = []
                equipment_summary[category].append({
                    'name': equipment.equipment_type.name,
                    'capacity': equipment.capacity,
                    'expiry_date': equipment.expiry_date,
                    'compliant': equipment.is_compliant
                })
            
            return {
                'vehicle_id': instance.id,
                'vehicle_registration': instance.registration_number,
                'adr_classes': adr_classes,
                'compliant': compliance_result['compliant'],
                'issues': compliance_result['issues'],
                'equipment_summary': equipment_summary
            }
        return super().to_representation(instance)

from rest_framework import serializers
from .models import Vehicle
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

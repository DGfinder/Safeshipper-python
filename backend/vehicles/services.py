# services.py for vehicles app

from django.db import transaction
from django.db.models import QuerySet
from django.core.exceptions import ObjectDoesNotExist
from typing import Dict, Any, Optional
from django.contrib.auth import get_user_model
from .models import Vehicle
from locations.models import GeoLocation

User = get_user_model()

@transaction.atomic
def create_vehicle(data: Dict[str, Any]) -> Vehicle:
    """
    Creates a new Vehicle instance atomically.
    
    Args:
        data: Dictionary containing vehicle attributes
        
    Returns:
        Vehicle: The newly created vehicle instance
    """
    return Vehicle.objects.create(**data)

@transaction.atomic
def assign_driver_to_vehicle(vehicle: Vehicle, driver: User) -> Vehicle:
    """
    Assigns a driver to a vehicle and updates its status.
    
    Args:
        vehicle: The vehicle to assign the driver to
        driver: The user with DRIVER role to assign
        
    Returns:
        Vehicle: The updated vehicle instance
        
    Raises:
        ValueError: If the user is not a driver or the vehicle is not available
    """
    if not driver.groups.filter(name='DRIVER').exists():
        raise ValueError("User must have DRIVER role")
    
    if vehicle.status != Vehicle.Status.AVAILABLE:
        raise ValueError("Vehicle must be available for assignment")
    
    vehicle.status = Vehicle.Status.IN_USE
    vehicle.save()
    
    # Here you might want to create a VehicleAssignment model to track driver assignments
    # For now, we just update the status
    
    return vehicle

def list_available_vehicles_for_depot(depot: GeoLocation) -> QuerySet[Vehicle]:
    """
    Returns a queryset of available vehicles for a specific depot.
    
    Args:
        depot: The GeoLocation instance representing the depot
        
    Returns:
        QuerySet[Vehicle]: Queryset of available vehicles
    """
    return Vehicle.objects.filter(
        assigned_depot=depot,
        status=Vehicle.Status.AVAILABLE
    ).select_related('owning_company')

def get_vehicle_by_registration(registration: str) -> Optional[Vehicle]:
    """
    Retrieves a vehicle by its registration number (case-insensitive).
    
    Args:
        registration: The vehicle registration number
        
    Returns:
        Optional[Vehicle]: The vehicle instance if found, None otherwise
    """
    try:
        return Vehicle.objects.select_related(
            'assigned_depot', 
            'owning_company'
        ).get(registration_number__iexact=registration)
    except Vehicle.DoesNotExist:
        return None

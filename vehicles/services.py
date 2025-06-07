# services.py for vehicles app

from django.db import transaction
from .models import Vehicle
from locations.models import GeoLocation
from django.core.exceptions import ObjectDoesNotExist
from typing import Dict, Any
from django.db.models import QuerySet

@transaction.atomic
def create_vehicle(data: Dict[str, Any]) -> Vehicle:
    return Vehicle.objects.create(**data)

def get_vehicle_by_registration(registration: str) -> Vehicle:
    return Vehicle.objects.get(registration_number=registration)

def list_available_vehicles_for_depot(depot: GeoLocation) -> QuerySet:
    return Vehicle.objects.filter(assigned_depot=depot)

# shipments/services.py
from django.db import transaction, models # Added models here
# from django.utils import timezone # Not used as models handle timestamps
from .models import Shipment, ConsignmentItem, ShipmentStatus
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.conf import settings # Often useful, though not strictly needed for the fix below if path is known
from typing import TYPE_CHECKING, List, Dict, Optional # Added List, Dict, Optional for better hinting

# This block is for static type checking (Pylance)
if TYPE_CHECKING:
    from users.models import User # Import your concrete User model
    # If users.models is not the correct path to your custom User model, adjust it.
    # This assumes AUTH_USER_MODEL = 'users.User'

# This is for runtime Django logic (e.g., if you were to do User.objects... directly here)
# It's fine to keep, but the type hints in function signatures will refer to the 'User' imported above for TYPE_CHECKING.
RuntimeUser = get_user_model()


@transaction.atomic
def create_shipment_with_items(shipment_data: Dict, items_data: List[Dict], creating_user: Optional['User'] = None) -> Shipment:
    """
    Creates a shipment and its related consignment items atomically.
    'shipment_data' should contain fields for the Shipment model.
    'items_data' should be a list of dictionaries, each for a ConsignmentItem.
    'creating_user' can be passed to set 'assigned_depot' if not provided,
    or for future 'created_by' field.
    """
    
    if 'assigned_depot' not in shipment_data and creating_user and hasattr(creating_user, 'depot') and creating_user.depot:
        shipment_data['assigned_depot'] = creating_user.depot
    
    # Example for created_by field if you add it to Shipment model:
    # if creating_user and creating_user.is_authenticated:
    #     shipment_data['created_by'] = creating_user

    new_shipment = Shipment(**shipment_data)
    new_shipment.save() # Model's save() generates tracking_number

    consignment_items_to_create = []
    for item_data in items_data:
        item = ConsignmentItem(shipment=new_shipment, **item_data)
        try:
            item.full_clean() 
        except DjangoValidationError as e:
            error_detail = e.message_dict if hasattr(e, 'message_dict') else {'__all__': [str(e)]}
            raise DjangoValidationError(
                f"Validation error for item '{item_data.get('description', 'N/A')}': {error_detail}"
            )
        consignment_items_to_create.append(item)
    
    if consignment_items_to_create:
        ConsignmentItem.objects.bulk_create(consignment_items_to_create)
    
    return new_shipment

def get_shipments_for_user(user: 'User') -> models.QuerySet[Shipment]: # Changed to models.QuerySet
    """
    Returns a queryset of shipments scoped to the user.
    Admins/staff see all shipments.
    Other users see shipments assigned to their depot (if they have one).
    """
    if not user.is_authenticated:
        return Shipment.objects.none()

    if user.is_staff or user.is_superuser:
        return Shipment.objects.all() 
    
    user_depot = getattr(user, 'depot', None)

    if user_depot:
        return Shipment.objects.filter(assigned_depot=user_depot)
    
    return Shipment.objects.none()

@transaction.atomic
def update_shipment_details(shipment: Shipment, shipment_data: Dict, updating_user: 'User', items_data: Optional[List[Dict]] = None) -> Shipment: # Reordered parameters
    """
    Updates a shipment and its related consignment items atomically.
    Requires 'updating_user' for permission checks.
    'items_data' is now an optional keyword argument.
    """
    if not updating_user or not updating_user.is_authenticated:
        raise PermissionDenied("Authentication required to update shipment.")

    can_update = False
    if updating_user.is_staff or updating_user.is_superuser:
        can_update = True
    elif hasattr(updating_user, 'depot') and shipment.assigned_depot == updating_user.depot:
        can_update = True
    
    if not can_update:
        raise PermissionDenied("You do not have permission to update this shipment.")

    for attr, value in shipment_data.items():
        if hasattr(Shipment, attr) and attr != 'items': 
            setattr(shipment, attr, value)
    
    shipment.save()

    if items_data is not None: 
        shipment.items.all().delete() 
        new_items_list = []
        for item_data in items_data:
            item = ConsignmentItem(shipment=shipment, **item_data)
            try:
                item.full_clean()
            except DjangoValidationError as e:
                error_detail = e.message_dict if hasattr(e, 'message_dict') else {'__all__': [str(e)]}
                raise DjangoValidationError(
                    f"Validation error for item '{item_data.get('description', 'N/A')}': {error_detail}"
                )
            new_items_list.append(item)
        if new_items_list:
            ConsignmentItem.objects.bulk_create(new_items_list)
        
    return shipment


def update_shipment_status_service(shipment: Shipment, new_status_value: str, updating_user: 'User') -> Shipment:
    """
    Updates the status of a shipment with permission checks.
    'new_status_value' should be a valid key from ShipmentStatus choices.
    """
    if not updating_user or not updating_user.is_authenticated:
        raise PermissionDenied("Authentication required.")

    can_update_status = False
    if updating_user.is_staff or updating_user.is_superuser:
        can_update_status = True
    elif hasattr(updating_user, 'depot') and shipment.assigned_depot == updating_user.depot:
        can_update_status = True 
    
    if not can_update_status:
        raise PermissionDenied("You do not have permission to update this shipment's status.")

    if new_status_value not in ShipmentStatus.values:
        raise DjangoValidationError(f"'{new_status_value}' is not a valid shipment status. Valid choices are: {ShipmentStatus.labels}.")

    shipment.status = new_status_value
    shipment.save(update_fields=['status', 'updated_at']) 
    
    return shipment

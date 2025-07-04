# shipments/services.py
from django.db import transaction, models
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.db.models import Q
from typing import TYPE_CHECKING, List, Dict, Optional

from .models import Shipment, ConsignmentItem, ShipmentStatus

if TYPE_CHECKING:
    from users.models import User

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

def get_shipments_for_user(user: 'User') -> models.QuerySet[Shipment]:
    """
    Returns a queryset of shipments based on user role and permissions.
    Enhanced to support role-based filtering as required by Phase 2.
    """
    if not user.is_authenticated:
        return Shipment.objects.none()

    # ADMIN users see all shipments
    if user.role == 'ADMIN' or user.is_superuser:
        return Shipment.objects.all().select_related('customer', 'carrier', 'freight_type')
    
    # DISPATCHER and COMPLIANCE_OFFICER see shipments from their company
    if user.role in ['DISPATCHER', 'COMPLIANCE_OFFICER']:
        return Shipment.objects.filter(
            Q(customer=user.company) | Q(carrier=user.company)
        ).select_related('customer', 'carrier', 'freight_type')
    
    # DRIVER sees only shipments assigned to vehicles they operate
    if user.role == 'DRIVER':
        return Shipment.objects.filter(
            # Add vehicle assignment logic when Vehicle model is integrated
            # For now, filter by company
            Q(customer=user.company) | Q(carrier=user.company)
        ).select_related('customer', 'carrier', 'freight_type')
    
    # CUSTOMER users see only their own shipments
    if user.role == 'CUSTOMER':
        return Shipment.objects.filter(
            customer=user.company
        ).select_related('customer', 'carrier', 'freight_type')
    
    # Default fallback - no access
    return Shipment.objects.none()

@transaction.atomic
def update_shipment_details(shipment: Shipment, shipment_data: Dict, updating_user: 'User', items_data: Optional[List[Dict]] = None) -> Shipment:
    """
    Updates a shipment and its related consignment items atomically.
    Enhanced with role-based permission checks for Phase 2.
    """
    if not updating_user or not updating_user.is_authenticated:
        raise PermissionDenied("Authentication required to update shipment.")

    # Role-based permission checking
    can_update = _can_user_modify_shipment(updating_user, shipment)
    
    if not can_update:
        raise PermissionDenied("You do not have permission to update this shipment.")

    # Update shipment fields (excluding nested items)
    for attr, value in shipment_data.items():
        if hasattr(Shipment, attr) and attr not in ['items', 'id', 'tracking_number']: 
            setattr(shipment, attr, value)
    
    shipment.save()

    # Handle nested item updates if provided
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


def _can_user_modify_shipment(user: 'User', shipment: Shipment) -> bool:
    """
    Helper function to determine if a user can modify a specific shipment.
    Implements role-based access control for shipment modifications.
    """
    # ADMIN users can modify all shipments
    if user.role == 'ADMIN' or user.is_superuser:
        return True
    
    # DISPATCHER and COMPLIANCE_OFFICER can modify shipments from their company
    if user.role in ['DISPATCHER', 'COMPLIANCE_OFFICER']:
        return (shipment.customer == user.company or 
                shipment.carrier == user.company)
    
    # DRIVER users cannot modify shipment details (read-only access)
    if user.role == 'DRIVER':
        return False
    
    # CUSTOMER users cannot modify shipments after creation
    if user.role == 'CUSTOMER':
        return False
    
    return False


def update_shipment_status_service(shipment: Shipment, new_status_value: str, updating_user: 'User') -> Shipment:
    """
    Updates the status of a shipment with role-based permission checks.
    Enhanced for Phase 2 with proper role-based access control.
    """
    if not updating_user or not updating_user.is_authenticated:
        raise PermissionDenied("Authentication required.")

    # Role-based permission checking for status updates
    can_update_status = _can_user_update_status(updating_user, shipment, new_status_value)
    
    if not can_update_status:
        raise PermissionDenied("You do not have permission to update this shipment's status.")

    # Validate status value
    if new_status_value not in ShipmentStatus.values:
        raise DjangoValidationError(f"'{new_status_value}' is not a valid shipment status. Valid choices are: {ShipmentStatus.labels}.")

    shipment.status = new_status_value
    shipment.save(update_fields=['status', 'updated_at']) 
    
    return shipment


def _can_user_update_status(user: 'User', shipment: Shipment, new_status: str) -> bool:
    """
    Helper function to determine if a user can update a shipment's status.
    Implements role-specific status transition rules.
    """
    # ADMIN users can update any status
    if user.role == 'ADMIN' or user.is_superuser:
        return True
    
    # DISPATCHER can update most statuses for their company's shipments
    if user.role == 'DISPATCHER':
        if shipment.customer == user.company or shipment.carrier == user.company:
            # Dispatchers can handle planning and dispatch-related statuses
            allowed_statuses = [
                ShipmentStatus.PLANNING,
                ShipmentStatus.READY_FOR_DISPATCH,
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.AT_HUB,
                ShipmentStatus.EXCEPTION,
                ShipmentStatus.CANCELLED
            ]
            return new_status in allowed_statuses
        return False
    
    # DRIVER can update transit and delivery statuses
    if user.role == 'DRIVER':
        if shipment.customer == user.company or shipment.carrier == user.company:
            # Drivers can update statuses related to transit and delivery
            allowed_statuses = [
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.OUT_FOR_DELIVERY,
                ShipmentStatus.DELIVERED,
                ShipmentStatus.EXCEPTION
            ]
            return new_status in allowed_statuses
        return False
    
    # COMPLIANCE_OFFICER can update compliance-related statuses
    if user.role == 'COMPLIANCE_OFFICER':
        if shipment.customer == user.company or shipment.carrier == user.company:
            # Compliance officers focus on validation and exception handling
            allowed_statuses = [
                ShipmentStatus.PENDING,
                ShipmentStatus.PLANNING,
                ShipmentStatus.EXCEPTION,
                ShipmentStatus.CANCELLED
            ]
            return new_status in allowed_statuses
        return False
    
    # CUSTOMER users cannot update status (read-only)
    return False


def search_shipments(user: 'User', search_params: Dict) -> models.QuerySet[Shipment]:
    """
    Search and filter shipments based on user permissions and search criteria.
    New function for Phase 2 enhanced search capabilities.
    """
    base_queryset = get_shipments_for_user(user)
    
    # Apply search filters
    queryset = base_queryset
    
    if 'tracking_number' in search_params:
        queryset = queryset.filter(tracking_number__icontains=search_params['tracking_number'])
    
    if 'reference_number' in search_params:
        queryset = queryset.filter(reference_number__icontains=search_params['reference_number'])
    
    if 'status' in search_params:
        if isinstance(search_params['status'], list):
            queryset = queryset.filter(status__in=search_params['status'])
        else:
            queryset = queryset.filter(status=search_params['status'])
    
    if 'customer_id' in search_params:
        queryset = queryset.filter(customer_id=search_params['customer_id'])
    
    if 'carrier_id' in search_params:
        queryset = queryset.filter(carrier_id=search_params['carrier_id'])
    
    if 'has_dangerous_goods' in search_params:
        if search_params['has_dangerous_goods']:
            queryset = queryset.filter(items__is_dangerous_good=True).distinct()
        else:
            queryset = queryset.exclude(items__is_dangerous_good=True).distinct()
    
    if 'date_from' in search_params:
        queryset = queryset.filter(created_at__gte=search_params['date_from'])
    
    if 'date_to' in search_params:
        queryset = queryset.filter(created_at__lte=search_params['date_to'])
    
    return queryset.prefetch_related('items__dangerous_good_entry')

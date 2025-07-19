# dangerous_goods/safety_rules.py
from typing import List, Dict, Optional, Tuple
from django.utils.translation import gettext_lazy as _
from .models import DangerousGood, SegregationGroup

# It's good practice to import your models under TYPE_CHECKING if only used for type hints,
# or directly if used in runtime logic within this module.
# For now, let's assume DangerousGood objects are passed into these functions.
# If you need to query models here, you'd uncomment and use:
# from .models import DangerousGood, SegregationRule, SegregationGroup
# from django.db.models import Q

# Module for dangerous goods safety and compatibility rules

class DGClass:
    """Constants for Dangerous Goods classes and divisions."""
    CLASS_3 = '3'      # Flammable Liquids
    CLASS_4_1 = '4.1'  # Flammable Solids
    CLASS_4_2 = '4.2'  # Spontaneously Combustible
    CLASS_4_3 = '4.3'  # Dangerous When Wet
    CLASS_5_1 = '5.1'  # Oxidizing Substances
    CLASS_6_1 = '6.1'  # Toxic Substances
    CLASS_6_2 = '6.2'  # Infectious Substances
    CLASS_8 = '8'      # Corrosive Substances
    CLASS_9 = '9'      # Miscellaneous

def get_fire_risk_classes() -> List[str]:
    """Get list of DG classes that pose fire risk."""
    return [
        DGClass.CLASS_3,    # Flammable Liquids
        DGClass.CLASS_4_1,  # Flammable Solids
        DGClass.CLASS_4_2,  # Spontaneously Combustible
        DGClass.CLASS_4_3,  # Dangerous When Wet
    ]

def get_oxidizer_classes() -> List[str]:
    """Get list of DG classes that are oxidizers."""
    return [DGClass.CLASS_5_1]  # Oxidizing Substances

def get_food_sensitive_classes() -> List[str]:
    """Get list of DG classes that are incompatible with foodstuffs."""
    return [
        DGClass.CLASS_6_1,  # Toxic Substances
        DGClass.CLASS_6_2,  # Infectious Substances
        DGClass.CLASS_8,    # Corrosive Substances
    ]

def get_all_hazard_classes_for_dg(dangerous_good_instance) -> List[str]:
    """
    Determines all applicable hazard classes for a given DangerousGood instance,
    including its primary class and any subsidiary risks.
    
    :param dangerous_good_instance: An instance of the DangerousGood model.
    :return: A list of unique hazard class strings.
    """
    if not dangerous_good_instance:
        return []
    
    classes = []
    # Ensure the instance has these attributes before accessing
    if hasattr(dangerous_good_instance, 'hazard_class') and dangerous_good_instance.hazard_class:
        classes.append(str(dangerous_good_instance.hazard_class))
    
    if hasattr(dangerous_good_instance, 'subsidiary_risks') and dangerous_good_instance.subsidiary_risks:
        # Assuming subsidiary_risks is a comma-separated string
        subsidiaries = [risk.strip() for risk in dangerous_good_instance.subsidiary_risks.split(',') if risk.strip()]
        classes.extend(subsidiaries)
            
    return list(set(classes)) # Return unique classes

def check_item_fire_risk_conflict_with_oxidizer(
    item: DangerousGood,
    other_items: List[DangerousGood]
) -> Tuple[bool, Optional[str]]:
    """
    Check if a DG item with fire risk is incompatible with oxidizers.
    
    Args:
        item: The DG item to check
        other_items: List of other DG items to check against
        
    Returns:
        Tuple of (is_incompatible, reason)
    """
    # Check if the item is a fire risk
    if item.dg_class not in get_fire_risk_classes():
        return False, None
    
    # Check for oxidizers in other items
    oxidizers = [
        other for other in other_items
        if other.dg_class in get_oxidizer_classes()
    ]
    
    if oxidizers:
        oxidizer_names = ", ".join(ox.un_number for ox in oxidizers)
        return True, _(
            "Incompatible: {item} (Class {cls}) cannot be transported with "
            "oxidizing substances (UN Numbers: {oxidizers})"
        ).format(
            item=item.un_number,
            cls=item.dg_class,
            oxidizers=oxidizer_names
        )
    
    return False, None

def check_item_food_sensitivity_conflict(
    item: DangerousGood,
    other_items: List[DangerousGood]
) -> Tuple[bool, Optional[str]]:
    """
    Check if a DG item is incompatible with foodstuffs.
    
    Args:
        item: The DG item to check
        other_items: List of other DG items to check against
        
    Returns:
        Tuple of (is_incompatible, reason)
    """
    # Check if any other item is in the foodstuffs group
    food_items = [
        other for other in other_items
        if other.segregation_groups.filter(name__icontains='food').exists()
    ]
    
    if not food_items:
        return False, None
    
    # Check if the item is food-sensitive
    if item.dg_class in get_food_sensitive_classes():
        food_item_names = ", ".join(fi.un_number for fi in food_items)
        return True, _(
            "Incompatible: {item} (Class {cls}) cannot be transported with "
            "foodstuffs (UN Numbers: {food_items})"
        ).format(
            item=item.un_number,
            cls=item.dg_class,
            food_items=food_item_names
        )
    
    return False, None

def check_item_water_sensitivity_conflict(
    item: DangerousGood,
    other_items: List[DangerousGood]
) -> Tuple[bool, Optional[str]]:
    """
    Check if a water-sensitive DG item is incompatible with other items.
    
    Args:
        item: The DG item to check
        other_items: List of other DG items to check against
        
    Returns:
        Tuple of (is_incompatible, reason)
    """
    if item.dg_class != DGClass.CLASS_4_3:  # Dangerous When Wet
        return False, None
    
    # Check for items that might contain water or release water
    water_risk_items = [
        other for other in other_items
        if other.dg_class in [DGClass.CLASS_8]  # Corrosive substances
        or other.segregation_groups.filter(name__icontains='water').exists()
    ]
    
    if water_risk_items:
        risk_item_names = ", ".join(wi.un_number for wi in water_risk_items)
        return True, _(
            "Incompatible: {item} (Class 4.3) cannot be transported with "
            "water-sensitive items (UN Numbers: {risk_items})"
        ).format(
            item=item.un_number,
            risk_items=risk_item_names
        )
    
    return False, None

def check_item_toxicity_conflict(
    item: DangerousGood,
    other_items: List[DangerousGood]
) -> Tuple[bool, Optional[str]]:
    """
    Check if a toxic DG item is incompatible with other items.
    
    Args:
        item: The DG item to check
        other_items: List of other DG items to check against
        
    Returns:
        Tuple of (is_incompatible, reason)
    """
    if item.dg_class != DGClass.CLASS_6_1:  # Toxic Substances
        return False, None
    
    # Check for items that might be affected by toxic substances
    sensitive_items = [
        other for other in other_items
        if other.segregation_groups.filter(
            name__in=['Foodstuffs', 'Pharmaceuticals', 'Medical Supplies']
        ).exists()
    ]
    
    if sensitive_items:
        sensitive_item_names = ", ".join(si.un_number for si in sensitive_items)
        return True, _(
            "Incompatible: {item} (Class 6.1) cannot be transported with "
            "sensitive items (UN Numbers: {sensitive_items})"
        ).format(
            item=item.un_number,
            sensitive_items=sensitive_item_names
        )
    
    return False, None

def get_all_compatibility_checks() -> List[callable]:
    """
    Get all compatibility check functions.
    
    Returns:
        List of compatibility check functions
    """
    return [
        check_item_fire_risk_conflict_with_oxidizer,
        check_item_food_sensitivity_conflict,
        check_item_water_sensitivity_conflict,
        check_item_toxicity_conflict,
    ]

def check_item_bulk_incompatibility(dg1, dg2, vehicle_type_or_compartment_details=None) -> bool:
    """
    Checks for incompatibilities when items are transported in bulk.
    This might involve different or stricter rules.
    dg1 and dg2 are DangerousGood model instances.
    vehicle_type_or_compartment_details could provide context about the transport unit.
    Returns True if a bulk incompatibility exists, False otherwise.
    """
    # Placeholder logic:
    # Bulk transport often has specific segregation requirements.
    # This function would consult relevant parts of regulations (IATA, IMDG, ADR)
    # and your SegregationRule model, possibly with rules specific to bulk transport.
    # TODO: Implement specific bulk incompatibility rules for dangerous goods
    return False # Default to no conflict

# You would add more specific rule functions here as needed,
# based on your SegregationRule model and regulatory requirements.
# These functions would then be called by your main check_dg_compatibility service
# in dangerous_goods/services.py

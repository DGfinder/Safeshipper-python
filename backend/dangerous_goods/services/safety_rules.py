# dangerous_goods/safety_rules.py
from typing import Set, Tuple
from .models import DangerousGood, SegregationGroup 
# Assuming User is not directly used here for these specific rules.
# If rules become user-role dependent, User model might be needed.
from shipments.models import ConsignmentItem # To access item-specific flags like is_bulk_item

# These constants define general rule categories.
# More specific rules (e.g., UN to UN, or complex conditions)
# should be managed in the SegregationRule model and database.

OXIDIZER_CLASSES: Set[str] = {'5.1', '5.2'} # Updated to include Class 5.2 (Organic Peroxides)
                                          # as per the rule: "fire risk substances cant travel with 5.1 and 5.2"
                                   
FOOD_SENSITIVE_CLASSES: Set[str] = {'2.3', '6.1', '7', '8'} # Based on user's rule for food incompatibility.
# These are primary classes. The main compatibility service should also consider subsidiary risks.

# Pairs of primary classes that are generally incompatible if both are in bulk.
# This is a simplified set; more granular rules can be in the SegregationRule model.
INCOMPATIBLE_BULK_PAIRS: Set[Tuple[str, str]] = {
    ('2.1', '2.3'), # Flammable Gas vs Toxic Gas (if both bulk)
    ('2.1', '3')    # Flammable Gas vs Flammable Liquid (if both bulk)
}

def get_all_hazard_classes_for_dg(dg: DangerousGood) -> Set[str]:
    """
    Returns a set of all hazard classes for a DangerousGood instance,
    including its primary hazard_class and all listed subsidiary_risks.
    """
    hazard_classes = set()
    if dg.hazard_class:
        hazard_classes.add(dg.hazard_class.strip())
    if dg.subsidiary_risks:
        hazard_classes.update(
            risk.strip() for risk in dg.subsidiary_risks.split(',') if risk.strip()
        )
    return hazard_classes

def check_item_fire_risk_conflict_with_oxidizer(item1: ConsignmentItem, item2: ConsignmentItem) -> bool:
    """
    Checks if one item is a fire risk and the other is an oxidizer (Class 5.1 or 5.2).
    Assumes ConsignmentItem has a ForeignKey 'dangerous_good_master' to DangerousGood model
    and a 'fire_risk_override' boolean field.
    Assumes DangerousGood model has an 'is_fire_risk' boolean field.
    """
    # Ensure we have linked DangerousGood master records to check their properties
    dg1 = getattr(item1, 'dangerous_good_master', None)
    dg2 = getattr(item2, 'dangerous_good_master', None)
    
    if not dg1 or not dg2: # Cannot determine if master DG data is missing for either item
        return False

    # Determine fire risk status for each item, considering overrides on the ConsignmentItem
    item1_is_fire_risk = item1.fire_risk_override if item1.fire_risk_override is not None else dg1.is_fire_risk
    item2_is_fire_risk = item2.fire_risk_override if item2.fire_risk_override is not None else dg2.is_fire_risk

    # Get all applicable hazard classes (primary + subsidiary) for each DG
    dg1_classes = get_all_hazard_classes_for_dg(dg1)
    dg2_classes = get_all_hazard_classes_for_dg(dg2)

    # Check if item1 is a fire risk and item2 is an oxidizer
    if item1_is_fire_risk and bool(OXIDIZER_CLASSES & dg2_classes): # bool() checks if intersection is non-empty
        return True
    # Check if item2 is a fire risk and item1 is an oxidizer
    if item2_is_fire_risk and bool(OXIDIZER_CLASSES & dg1_classes):
        return True
        
    return False

def check_item_food_sensitivity_conflict(item1: ConsignmentItem, item2: ConsignmentItem) -> bool:
    """
    Checks if one item is food-related (belongs to "Foodstuffs" SegregationGroup)
    and the other is a DG from a food-sensitive class.
    Assumes ConsignmentItem has 'dangerous_good_master' ForeignKey.
    """
    try:
        # It's good practice for the calling service to fetch this once if checking multiple pairs.
        # For this standalone rule, we fetch it here. Ensure this group code exists in your DB.
        foodstuffs_group = SegregationGroup.objects.get(code="SGG_FOODSTUFFS") # Example code
    except SegregationGroup.DoesNotExist:
        # If the Foodstuffs group isn't defined, this specific check cannot be performed.
        # The calling service might log this as a configuration issue or handle it.
        return False 

    dg1 = getattr(item1, 'dangerous_good_master', None)
    dg2 = getattr(item2, 'dangerous_good_master', None)

    # This check requires both items to have master DG data to check their groups/classes.
    # If one item is non-DG but is food, that needs a different identification mechanism
    # (e.g., a flag on ConsignmentItem like 'is_foodstuff').
    # For now, this rule assumes food items are identified by being DGs in the "Foodstuffs" group.
    if not dg1 or not dg2:
        return False

    # Check if item1's DG is in Foodstuffs group and item2's DG classes are food-sensitive
    item1_is_food = foodstuffs_group in dg1.segregation_groups.all()
    dg2_classes = get_all_hazard_classes_for_dg(dg2)
    if item1_is_food and bool(FOOD_SENSITIVE_CLASSES & dg2_classes):
        return True

    # Check if item2's DG is in Foodstuffs group and item1's DG classes are food-sensitive
    item2_is_food = foodstuffs_group in dg2.segregation_groups.all()
    dg1_classes = get_all_hazard_classes_for_dg(dg1)
    if item2_is_food and bool(FOOD_SENSITIVE_CLASSES & dg1_classes):
        return True
        
    return False

def check_item_bulk_incompatibility(item1: ConsignmentItem, item2: ConsignmentItem) -> bool:
    """
    Checks for incompatibilities if both items are marked as bulk, based on INCOMPATIBLE_BULK_PAIRS.
    Assumes ConsignmentItem has 'dangerous_good_master' ForeignKey and an 'is_bulk_item' boolean field.
    """
    dg1 = getattr(item1, 'dangerous_good_master', None)
    dg2 = getattr(item2, 'dangerous_good_master', None)

    if not dg1 or not dg2:
        return False

    # This check uses the 'is_bulk_item' flag from the ConsignmentItem model
    if item1.is_bulk_item and item2.is_bulk_item:
        # Using primary hazard class for this specific rule set
        c1_primary = dg1.hazard_class 
        c2_primary = dg2.hazard_class
        
        pair1 = (c1_primary, c2_primary)
        pair2 = (c2_primary, c1_primary) # To check both directions for symmetric rules

        if pair1 in INCOMPATIBLE_BULK_PAIRS or pair2 in INCOMPATIBLE_BULK_PAIRS:
            return True
    return False

# More specific rule functions can be added here as needed, for example:
# def check_class1_explosive_restrictions(item1: ConsignmentItem, item2: ConsignmentItem) -> bool:
#     # Logic for Class 1 explosives based on your rule:
#     # "fire and risk substances travelling with class 1 needs to refer to state and commonwealth explosive legislation."
#     # This function might return True if a conflict requiring special attention exists,
#     # or it could return a specific message/code.
#     dg1 = getattr(item1, 'dangerous_good_master', None)
#     dg2 = getattr(item2, 'dangerous_good_master', None)
#     if not dg1 or not dg2: return False
#
#     dg1_is_class1 = any(c.startswith("1") for c in get_all_hazard_classes_for_dg(dg1))
#     dg2_is_class1 = any(c.startswith("1") for c in get_all_hazard_classes_for_dg(dg2))
#
#     if dg1_is_class1 or dg2_is_class1: # If at least one is Class 1
#         item1_is_fire_risk = item1.fire_risk_override if item1.fire_risk_override is not None else dg1.is_fire_risk
#         item2_is_fire_risk = item2.fire_risk_override if item2.fire_risk_override is not None else dg2.is_fire_risk
#         if item1_is_fire_risk or item2_is_fire_risk: # And the other (or itself if Class 1 can be fire risk) is a fire risk
#             return True # Indicates a situation needing special legislative check
#     return False

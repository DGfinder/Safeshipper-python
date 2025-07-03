"""
Tests for centralized Dangerous Goods compatibility logic.
"""

from django.test import TestCase
from django.utils import timezone
from decimal import Decimal

from .models import DangerousGood, SegregationGroup, SegregationRule
from .services import check_dg_compatibility, check_dg_compatibility_multiple
from .safety_rules import (
    get_fire_risk_classes, get_oxidizer_classes, get_food_sensitive_classes
)
from shipments.models import Shipment, ConsignmentItem
from vehicles.models import Vehicle
from load_plans.models import LoadPlan
from load_plans.services import create_load_plan_for_shipments


class CentralizedDGCompatibilityTestCase(TestCase):
    """Test cases for centralized DG compatibility logic."""
    
    def setUp(self):
        """Set up test data."""
        # Create test segregation groups
        self.fire_group = SegregationGroup.objects.create(
            name="Fire Risk Group",
            code="FIRE",
            description="Items with fire risk"
        )
        
        self.oxidizer_group = SegregationGroup.objects.create(
            name="Oxidizer Group", 
            code="OXID",
            description="Oxidizing substances"
        )
        
        self.food_group = SegregationGroup.objects.create(
            name="Foodstuffs Group",
            code="FOOD",
            description="Food and foodstuffs"
        )
        
        # Create test dangerous goods
        self.flammable_liquid = DangerousGood.objects.create(
            un_number="UN1203",
            proper_shipping_name="Gasoline",
            simplified_name="Gasoline",
            hazard_class="3",
            subsidiary_risks="",
            packing_group="II",
            is_bulk_transport_allowed=True
        )
        self.flammable_liquid.segregation_groups.add(self.fire_group)
        
        self.oxidizer = DangerousGood.objects.create(
            un_number="UN2067",
            proper_shipping_name="Ammonium Nitrate",
            simplified_name="Ammonium Nitrate",
            hazard_class="5.1",
            subsidiary_risks="",
            packing_group="III",
            is_bulk_transport_allowed=True
        )
        self.oxidizer.segregation_groups.add(self.oxidizer_group)
        
        self.toxic_substance = DangerousGood.objects.create(
            un_number="UN2811",
            proper_shipping_name="Toxic Substance",
            simplified_name="Toxic Substance",
            hazard_class="6.1",
            subsidiary_risks="",
            packing_group="II",
            is_bulk_transport_allowed=False
        )
        
        self.food_item = DangerousGood.objects.create(
            un_number="UN1327",
            proper_shipping_name="Foodstuffs",
            simplified_name="Foodstuffs",
            hazard_class="9",
            subsidiary_risks="",
            packing_group="III",
            is_bulk_transport_allowed=True
        )
        self.food_item.segregation_groups.add(self.food_group)
        
        # Create test vehicle
        self.vehicle = Vehicle.objects.create(
            registration_number="TEST123",
            vehicle_type="rigid-truck",
            make="Test",
            model="Truck",
            year=2020,
            payload_capacity=10000,
            pallet_spaces=20
        )
        
        # Create test shipment
        self.shipment = Shipment.objects.create(
            reference_number="SHIP001",
            status="in_transit"
        )
    
    def test_basic_compatibility_check(self):
        """Test basic compatibility check between two DG items."""
        result = check_dg_compatibility(self.flammable_liquid, self.oxidizer)
        
        # Should be incompatible due to fire risk vs oxidizer
        self.assertFalse(result['compatible'])
        self.assertTrue(len(result['reasons']) > 0)
        
        # Check that the reason mentions fire risk and oxidizer
        reasons_text = " ".join(result['reasons']).lower()
        self.assertTrue("fire" in reasons_text or "oxidiz" in reasons_text)
    
    def test_compatible_items(self):
        """Test that compatible items return compatible=True."""
        # Create two compatible items (both class 3)
        compatible_item1 = DangerousGood.objects.create(
            un_number="UN1203",
            proper_shipping_name="Gasoline",
            simplified_name="Gasoline",
            hazard_class="3",
            subsidiary_risks="",
            packing_group="II"
        )
        
        compatible_item2 = DangerousGood.objects.create(
            un_number="UN1170",
            proper_shipping_name="Ethanol",
            simplified_name="Ethanol", 
            hazard_class="3",
            subsidiary_risks="",
            packing_group="II"
        )
        
        result = check_dg_compatibility(compatible_item1, compatible_item2)
        self.assertTrue(result['compatible'])
        self.assertEqual(len(result['reasons']), 0)
    
    def test_multiple_items_compatibility(self):
        """Test compatibility check with multiple DG items."""
        items = [self.flammable_liquid, self.oxidizer, self.toxic_substance]
        result = check_dg_compatibility_multiple(items)
        
        # Should be incompatible due to fire risk vs oxidizer
        self.assertFalse(result['compatible'])
        self.assertTrue(len(result['reasons']) > 0)
    
    def test_food_sensitivity_conflict(self):
        """Test food sensitivity conflict detection."""
        result = check_dg_compatibility(self.toxic_substance, self.food_item)
        
        # Should be incompatible due to toxic substance vs food
        self.assertFalse(result['compatible'])
        self.assertTrue(len(result['reasons']) > 0)
        
        # Check that the reason mentions food sensitivity
        reasons_text = " ".join(result['reasons']).lower()
        self.assertTrue("food" in reasons_text)
    
    def test_single_item_compatibility(self):
        """Test that single item returns compatible=True."""
        result = check_dg_compatibility_multiple([self.flammable_liquid])
        self.assertTrue(result['compatible'])
        self.assertEqual(len(result['reasons']), 0)
    
    def test_empty_list_compatibility(self):
        """Test that empty list returns compatible=True."""
        result = check_dg_compatibility_multiple([])
        self.assertTrue(result['compatible'])
        self.assertEqual(len(result['reasons']), 0)
    
    def test_load_plan_integration(self):
        """Test that load plan creation uses centralized compatibility check."""
        # Create consignment items
        item1 = ConsignmentItem.objects.create(
            shipment=self.shipment,
            description="Flammable Liquid",
            weight_kg=100,
            length_cm=50,
            width_cm=30,
            height_cm=20,
            is_dangerous_good=True,
            dangerous_good_entry=self.flammable_liquid
        )
        
        item2 = ConsignmentItem.objects.create(
            shipment=self.shipment,
            description="Oxidizer",
            weight_kg=50,
            length_cm=40,
            width_cm=25,
            height_cm=15,
            is_dangerous_good=True,
            dangerous_good_entry=self.oxidizer
        )
        
        # Create load plan
        load_plan = create_load_plan_for_shipments(
            self.vehicle, [self.shipment], 'MIXED'
        )
        
        # Should have DG violations due to incompatibility
        self.assertEqual(load_plan.dg_compliance_status, 'VIOLATIONS')
        self.assertTrue(len(load_plan.dg_violations) > 0)
        self.assertTrue(load_plan.contains_dangerous_goods)
        
        # Check that violations mention the incompatibility
        violations_text = " ".join(load_plan.dg_violations).lower()
        self.assertTrue("fire" in violations_text or "oxidiz" in violations_text)
    
    def test_segregation_rules_integration(self):
        """Test that segregation rules are properly applied."""
        # Create a segregation rule
        rule = SegregationRule.objects.create(
            rule_type=SegregationRule.RuleType.CLASS_TO_CLASS,
            primary_hazard_class="3",
            secondary_hazard_class="5.1",
            compatibility_status=SegregationRule.Compatibility.INCOMPATIBLE_PROHIBITED,
            notes="Flammable liquids cannot be transported with oxidizers"
        )
        
        result = check_dg_compatibility(self.flammable_liquid, self.oxidizer)
        
        # Should be incompatible due to the rule
        self.assertFalse(result['compatible'])
        self.assertTrue(len(result['reasons']) > 0)
        
        # Check that the rule's notes are included
        reasons_text = " ".join(result['reasons'])
        self.assertTrue("Flammable liquids cannot be transported with oxidizers" in reasons_text)
    
    def test_safety_rules_integration(self):
        """Test that safety rules from safety_rules.py are applied."""
        # Test fire risk vs oxidizer conflict
        result = check_dg_compatibility(self.flammable_liquid, self.oxidizer)
        
        # Should detect the conflict
        self.assertFalse(result['compatible'])
        
        # Check that fire risk classes are properly identified
        fire_risk_classes = get_fire_risk_classes()
        self.assertIn("3", fire_risk_classes)
        
        # Check that oxidizer classes are properly identified
        oxidizer_classes = get_oxidizer_classes()
        self.assertIn("5.1", oxidizer_classes)
        
        # Check that food sensitive classes are properly identified
        food_sensitive_classes = get_food_sensitive_classes()
        self.assertIn("6.1", food_sensitive_classes) 
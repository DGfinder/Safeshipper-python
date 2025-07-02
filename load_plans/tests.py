from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock

from .services import (
    BinPackingOptimizer, Item3D, Position3D, Container3D, PlacementResult,
    create_load_plan_for_shipments, validate_load_plan_compliance
)
from .models import LoadPlan, LoadPlanItem
from shipments.models import Shipment, ConsignmentItem
from vehicles.models import Vehicle
from users.models import User


class BinPackingOptimizerTests(TestCase):
    """Comprehensive test suite for the 3D bin packing optimizer."""
    
    def setUp(self):
        """Set up test data."""
        # Create a standard test container
        self.container = Container3D(
            length=1000,  # 10m
            width=250,    # 2.5m
            height=300,   # 3m
            max_weight=5000  # 5 tons
        )
        self.optimizer = BinPackingOptimizer(self.container)
    
    def test_simple_placement(self):
        """Test Case 1: Verify that a single item can be placed correctly in an empty container."""
        # Create a simple item
        item = Item3D(
            id="test_item_1",
            length=100,
            width=50,
            height=30,
            weight=100
        )
        
        # Place the item
        success = self.optimizer.place_item(item)
        
        # Assertions
        self.assertTrue(success)
        self.assertEqual(len(self.optimizer.placed_items), 1)
        self.assertEqual(self.optimizer.total_weight, 100)
        self.assertEqual(self.optimizer.total_volume, 100 * 50 * 30)
        
        # Check placement position
        placement = self.optimizer.placed_items[0]
        self.assertEqual(placement.position.x, 0)
        self.assertEqual(placement.position.y, 0)
        self.assertEqual(placement.position.z, 0)
        self.assertEqual(placement.rotation, 0)
        self.assertTrue(placement.fits)
    
    def test_boundary_checks_length_exceeded(self):
        """Test Case 2a: Items cannot be placed if they exceed container length."""
        # Create an item that's too long
        oversized_item = Item3D(
            id="oversized_length",
            length=1100,  # Longer than container (1000)
            width=50,
            height=30,
            weight=100
        )
        
        # Try to place the item
        success = self.optimizer.place_item(oversized_item)
        
        # Should fail
        self.assertFalse(success)
        self.assertEqual(len(self.optimizer.placed_items), 0)
        self.assertEqual(self.optimizer.total_weight, 0)
    
    def test_boundary_checks_width_exceeded(self):
        """Test Case 2b: Items cannot be placed if they exceed container width."""
        # Create an item that's too wide
        oversized_item = Item3D(
            id="oversized_width",
            length=100,
            width=300,  # Wider than container (250)
            height=30,
            weight=100
        )
        
        # Try to place the item
        success = self.optimizer.place_item(oversized_item)
        
        # Should fail
        self.assertFalse(success)
        self.assertEqual(len(self.optimizer.placed_items), 0)
    
    def test_boundary_checks_height_exceeded(self):
        """Test Case 2c: Items cannot be placed if they exceed container height."""
        # Create an item that's too tall
        oversized_item = Item3D(
            id="oversized_height",
            length=100,
            width=50,
            height=350,  # Taller than container (300)
            weight=100
        )
        
        # Try to place the item
        success = self.optimizer.place_item(oversized_item)
        
        # Should fail
        self.assertFalse(success)
        self.assertEqual(len(self.optimizer.placed_items), 0)
    
    def test_boundary_checks_weight_exceeded(self):
        """Test Case 2d: Items cannot be placed if they exceed container weight capacity."""
        # Create an item that's too heavy
        heavy_item = Item3D(
            id="heavy_item",
            length=100,
            width=50,
            height=30,
            weight=6000  # Heavier than container capacity (5000)
        )
        
        # Try to place the item
        success = self.optimizer.place_item(heavy_item)
        
        # Should fail
        self.assertFalse(success)
        self.assertEqual(len(self.optimizer.placed_items), 0)
    
    def test_collision_detection(self):
        """Test Case 3: Verify that the optimizer prevents items from overlapping."""
        # Place first item
        item1 = Item3D(
            id="item_1",
            length=100,
            width=50,
            height=30,
            weight=100
        )
        success1 = self.optimizer.place_item(item1)
        self.assertTrue(success1)
        
        # Try to place second item in overlapping position
        item2 = Item3D(
            id="item_2",
            length=80,
            width=40,
            height=25,
            weight=80
        )
        
        # Manually try to place at overlapping position
        overlapping_position = Position3D(50, 25, 0)  # Overlaps with first item
        can_place = self.optimizer.can_place_item(item2, overlapping_position)
        
        # Should not be able to place
        self.assertFalse(can_place)
        
        # Try normal placement (should find non-overlapping position)
        success2 = self.optimizer.place_item(item2)
        self.assertTrue(success2)
        self.assertEqual(len(self.optimizer.placed_items), 2)
    
    def test_stacking_logic(self):
        """Test Case 4: Validate stacking and support weight logic."""
        # Create a heavy base item
        base_item = Item3D(
            id="base_item",
            length=200,
            width=100,
            height=50,
            weight=500,
            max_stack_weight=1000  # Can support up to 1000kg
        )
        
        # Place base item
        success1 = self.optimizer.place_item(base_item)
        self.assertTrue(success1)
        
        # Create a lighter item to stack on top
        stack_item = Item3D(
            id="stack_item",
            length=100,
            width=50,
            height=30,
            weight=200  # Light enough to stack
        )
        
        # Place stack item
        success2 = self.optimizer.place_item(stack_item)
        self.assertTrue(success2)
        
        # Verify stacking position
        stack_placement = self.optimizer.placed_items[1]
        self.assertEqual(stack_placement.position.z, 50)  # Should be on top of base item
        self.assertEqual(self.optimizer.total_weight, 700)
    
    def test_stacking_weight_limit(self):
        """Test that stacking respects weight limits."""
        # Create a base item with limited stack weight
        base_item = Item3D(
            id="base_item",
            length=200,
            width=100,
            height=50,
            weight=500,
            max_stack_weight=300  # Limited stack weight
        )
        
        # Place base item
        self.optimizer.place_item(base_item)
        
        # Try to place a heavy item on top
        heavy_stack_item = Item3D(
            id="heavy_stack_item",
            length=100,
            width=50,
            height=30,
            weight=400  # Too heavy for base item
        )
        
        # Should not be able to place
        success = self.optimizer.place_item(heavy_stack_item)
        self.assertFalse(success)
    
    def test_rotation_handling(self):
        """Test that rotation is handled correctly."""
        # Create a rectangular item
        item = Item3D(
            id="rectangular_item",
            length=150,  # Longer than width
            width=50,
            height=30,
            weight=100
        )
        
        # Place the item
        success = self.optimizer.place_item(item)
        self.assertTrue(success)
        
        # Check that rotation was considered
        placement = self.optimizer.placed_items[0]
        # Should try both 0° and 90° rotations
        self.assertIn(placement.rotation, [0, 1])
    
    def test_optimization_sequence(self):
        """Test Case 5: Integration test for optimize_loading_sequence."""
        # Create multiple items with different priorities
        items = [
            Item3D(id="item_1", length=100, width=50, height=30, weight=100, delivery_stop=3, value=100),
            Item3D(id="item_2", length=80, width=40, height=25, weight=80, delivery_stop=2, value=80),
            Item3D(id="item_3", length=60, width=30, height=20, weight=60, delivery_stop=1, value=60),
        ]
        
        # Run optimization
        successful_placements, failed_items = self.optimizer.optimize_loading_sequence(items)
        
        # All items should fit
        self.assertEqual(len(successful_placements), 3)
        self.assertEqual(len(failed_items), 0)
        
        # Check total metrics
        self.assertEqual(self.optimizer.total_weight, 240)
        self.assertEqual(self.optimizer.total_volume, 100*50*30 + 80*40*25 + 60*30*20)
    
    def test_position_generation(self):
        """Test that potential positions are generated correctly."""
        # Place an item to create some positions
        item = Item3D(
            id="test_item",
            length=100,
            width=50,
            height=30,
            weight=100
        )
        self.optimizer.place_item(item)
        
        # Generate positions
        positions = self.optimizer._generate_positions()
        
        # Should have multiple potential positions
        self.assertGreater(len(positions), 1)
        
        # Check that positions are sorted (z, x, y)
        for i in range(len(positions) - 1):
            pos1 = positions[i]
            pos2 = positions[i + 1]
            
            # z should be primary sort key
            if pos1.z != pos2.z:
                self.assertLessEqual(pos1.z, pos2.z)
            # x should be secondary sort key
            elif pos1.x != pos2.x:
                self.assertLessEqual(pos1.x, pos2.x)
            # y should be tertiary sort key
            else:
                self.assertLessEqual(pos1.y, pos2.y)
    
    def test_edge_case_empty_container(self):
        """Test edge case: empty container with no items."""
        items = []
        successful_placements, failed_items = self.optimizer.optimize_loading_sequence(items)
        
        self.assertEqual(len(successful_placements), 0)
        self.assertEqual(len(failed_items), 0)
        self.assertEqual(self.optimizer.total_weight, 0)
        self.assertEqual(self.optimizer.total_volume, 0)
    
    def test_edge_case_single_item_fits_exactly(self):
        """Test edge case: item that fits exactly in container."""
        exact_fit_item = Item3D(
            id="exact_fit",
            length=1000,  # Exactly container length
            width=250,    # Exactly container width
            height=300,   # Exactly container height
            weight=5000   # Exactly container weight capacity
        )
        
        success = self.optimizer.place_item(exact_fit_item)
        self.assertTrue(success)
        self.assertEqual(len(self.optimizer.placed_items), 1)
    
    def test_edge_case_item_too_large_for_container(self):
        """Test edge case: item larger than container in all dimensions."""
        oversized_item = Item3D(
            id="oversized",
            length=1200,  # Longer than container
            width=300,    # Wider than container
            height=400,   # Taller than container
            weight=6000   # Heavier than container
        )
        
        success = self.optimizer.place_item(oversized_item)
        self.assertFalse(success)
        self.assertEqual(len(self.optimizer.placed_items), 0)


class LoadPlanIntegrationTests(TestCase):
    """Integration tests for the complete load plan creation process."""
    
    def setUp(self):
        """Set up test data for integration tests."""
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
        
        # Create test consignment items
        self.item1 = ConsignmentItem.objects.create(
            shipment=self.shipment,
            description="Test Item 1",
            weight_kg=100,
            length_cm=50,
            width_cm=30,
            height_cm=20,
            is_dangerous_good=False
        )
        
        self.item2 = ConsignmentItem.objects.create(
            shipment=self.shipment,
            description="Test Item 2",
            weight_kg=150,
            length_cm=60,
            width_cm=40,
            height_cm=25,
            is_dangerous_good=False
        )
    
    def test_create_load_plan_for_shipments(self):
        """Integration test for create_load_plan_for_shipments service."""
        # Create load plan
        load_plan = create_load_plan_for_shipments(
            self.vehicle, [self.shipment], 'MIXED'
        )
        
        # Verify load plan was created
        self.assertIsNotNone(load_plan)
        self.assertEqual(load_plan.vehicle, self.vehicle)
        self.assertEqual(load_plan.optimization_type, 'MIXED')
        self.assertEqual(load_plan.status, LoadPlan.Status.OPTIMIZED)
        
        # Verify load plan items were created
        load_plan_items = LoadPlanItem.objects.filter(load_plan=load_plan)
        self.assertEqual(load_plan_items.count(), 2)
        
        # Verify metrics
        self.assertGreater(load_plan.planned_weight_kg, 0)
        self.assertGreater(load_plan.planned_volume_m3, 0)
        self.assertGreater(load_plan.weight_utilization_pct, 0)
        self.assertGreater(load_plan.volume_utilization_pct, 0)
        self.assertGreater(load_plan.optimization_score, 0)
        
        # Verify optimization metadata
        self.assertIsNotNone(load_plan.optimization_metadata)
        self.assertIn('successful_items', load_plan.optimization_metadata)
        self.assertIn('failed_items', load_plan.optimization_metadata)
        self.assertEqual(load_plan.optimization_metadata['successful_items'], 2)
        self.assertEqual(load_plan.optimization_metadata['failed_items'], 0)
    
    def test_load_plan_with_dangerous_goods(self):
        """Test load plan creation with dangerous goods."""
        # Create a dangerous goods item
        dangerous_item = ConsignmentItem.objects.create(
            shipment=self.shipment,
            description="Dangerous Item",
            weight_kg=50,
            length_cm=40,
            width_cm=25,
            height_cm=15,
            is_dangerous_good=True
        )
        
        # Create load plan
        load_plan = create_load_plan_for_shipments(
            self.vehicle, [self.shipment], 'MIXED'
        )
        
        # Verify dangerous goods handling
        self.assertTrue(load_plan.contains_dangerous_goods)
        self.assertEqual(load_plan.dg_compliance_status, 'COMPLIANT')  # No violations in this case
    
    def test_validate_load_plan_compliance(self):
        """Test load plan compliance validation."""
        # Create a load plan first
        load_plan = create_load_plan_for_shipments(
            self.vehicle, [self.shipment], 'MIXED'
        )
        
        # Validate compliance
        compliance_result = validate_load_plan_compliance(load_plan)
        
        # Verify compliance result structure
        self.assertIn('is_compliant', compliance_result)
        self.assertIn('violations', compliance_result)
        self.assertIn('warnings', compliance_result)
        self.assertIn('total_items', compliance_result)
        self.assertIn('dg_items', compliance_result)
        self.assertIn('weight_distribution', compliance_result)
        
        # Should be compliant with our test data
        self.assertTrue(compliance_result['is_compliant'])
        self.assertEqual(len(compliance_result['violations']), 0)
        self.assertEqual(compliance_result['total_items'], 2)
        self.assertEqual(compliance_result['dg_items'], 0)
    
    def test_load_plan_weight_distribution(self):
        """Test weight distribution analysis."""
        # Create items with different weights to test distribution
        heavy_item = ConsignmentItem.objects.create(
            shipment=self.shipment,
            description="Heavy Item",
            weight_kg=500,
            length_cm=100,
            width_cm=80,
            height_cm=60,
            is_dangerous_good=False
        )
        
        # Create load plan
        load_plan = create_load_plan_for_shipments(
            self.vehicle, [self.shipment], 'MIXED'
        )
        
        # Validate compliance
        compliance_result = validate_load_plan_compliance(load_plan)
        
        # Check weight distribution
        weight_dist = compliance_result['weight_distribution']
        self.assertIn('front_percentage', weight_dist)
        self.assertIn('rear_percentage', weight_dist)
        self.assertAlmostEqual(weight_dist['front_percentage'] + weight_dist['rear_percentage'], 100, places=1)
    
    @patch('load_plans.services.check_dg_compatibility_multiple')
    def test_load_plan_dg_violations(self, mock_dg_check):
        """Test load plan creation with DG violations."""
        # Mock DG compatibility check to return violations
        mock_dg_check.return_value = {
            'compatible': False,
            'reasons': ['Test DG violation']
        }
        
        # Create a dangerous goods item
        dangerous_item = ConsignmentItem.objects.create(
            shipment=self.shipment,
            description="Dangerous Item",
            weight_kg=50,
            length_cm=40,
            width_cm=25,
            height_cm=15,
            is_dangerous_good=True
        )
        
        # Create load plan
        load_plan = create_load_plan_for_shipments(
            self.vehicle, [self.shipment], 'MIXED'
        )
        
        # Verify DG violations are recorded
        self.assertTrue(load_plan.contains_dangerous_goods)
        self.assertEqual(load_plan.dg_compliance_status, 'VIOLATIONS')
        self.assertIn('Test DG violation', load_plan.dg_violations)
    
    def test_load_plan_optimization_algorithms(self):
        """Test different optimization types."""
        optimization_types = ['MIXED', 'WEIGHT', 'VOLUME', 'DISTANCE']
        
        for opt_type in optimization_types:
            with self.subTest(optimization_type=opt_type):
                load_plan = create_load_plan_for_shipments(
                    self.vehicle, [self.shipment], opt_type
                )
                
                self.assertEqual(load_plan.optimization_type, opt_type)
                self.assertEqual(load_plan.status, LoadPlan.Status.OPTIMIZED)
                self.assertIsNotNone(load_plan.optimization_algorithm)

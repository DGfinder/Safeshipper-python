#!/usr/bin/env python3
"""
Standalone test script for BinPackingOptimizer
This allows testing the core logic without Django setup
"""

import sys
import os
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
from unittest import TestCase, main


# Mock the dataclasses that would normally come from load_plans.services
@dataclass
class Item3D:
    """3D item representation for bin packing."""
    id: str
    length: float
    width: float
    height: float
    weight: float
    value: float = 0  # Revenue value
    is_dangerous: bool = False
    segregation_group: str = ""
    delivery_stop: int = 1
    is_stackable: bool = True
    max_stack_weight: float = float('inf')


@dataclass
class Position3D:
    """3D position representation."""
    x: float
    y: float
    z: float


@dataclass
class Container3D:
    """3D container (vehicle cargo space) representation."""
    length: float
    width: float
    height: float
    max_weight: float


@dataclass
class PlacementResult:
    """Result of placing an item in the container."""
    item: Item3D
    position: Position3D
    rotation: int = 0  # 0=no rotation, 1=90°, 2=180°, 3=270°
    fits: bool = True


class BinPackingOptimizer:
    """Advanced 3D bin packing optimizer with multiple algorithms."""
    
    def __init__(self, container: Container3D):
        self.container = container
        self.placed_items: List[PlacementResult] = []
        self.remaining_spaces: List[Dict] = [
            {
                'x': 0, 'y': 0, 'z': 0,
                'length': container.length,
                'width': container.width,
                'height': container.height
            }
        ]
        self.total_weight = 0
        self.total_volume = 0
        
    def can_place_item(self, item: Item3D, position: Position3D, rotation: int = 0) -> bool:
        """Check if item can be placed at given position."""
        # Apply rotation
        if rotation == 1 or rotation == 3:  # 90° or 270°
            item_length, item_width = item.width, item.length
        else:
            item_length, item_width = item.length, item.width
        
        # Check boundaries
        if (position.x < 0 or position.y < 0 or position.z < 0 or
            position.x + item_length > self.container.length or
            position.y + item_width > self.container.width or
            position.z + item.height > self.container.height):
            return False
        
        # Check weight constraint
        if self.total_weight + item.weight > self.container.max_weight:
            return False
        
        # Check collision with existing items
        for placed in self.placed_items:
            if self._items_overlap(
                position, item_length, item_width, item.height,
                placed.position, 
                placed.item.width if placed.rotation % 2 else placed.item.length,
                placed.item.length if placed.rotation % 2 else placed.item.width,
                placed.item.height
            ):
                return False
        
        # Check stacking constraints - only if item is not on the floor
        if position.z > 0:
            support_weight = self._calculate_support_weight(position, item_length, item_width)
            if support_weight < item.weight:
                return False
        
        return True
    
    def _items_overlap(self, pos1: Position3D, l1: float, w1: float, h1: float,
                      pos2: Position3D, l2: float, w2: float, h2: float) -> bool:
        """Check if two 3D items overlap."""
        return not (pos1.x >= pos2.x + l2 or pos2.x >= pos1.x + l1 or
                   pos1.y >= pos2.y + w2 or pos2.y >= pos1.y + w1 or
                   pos1.z >= pos2.z + h2 or pos2.z >= pos1.z + h1)
    
    def _calculate_support_weight(self, position: Position3D, length: float, width: float) -> float:
        """Calculate weight support at given position (sum of max_stack_weight of all items directly below)."""
        support_weight = 0
        for placed in self.placed_items:
            # Only consider items directly below (z + height == position.z) and with surface overlap
            p_length = placed.item.width if placed.rotation % 2 else placed.item.length
            p_width = placed.item.length if placed.rotation % 2 else placed.item.width
            if (abs(placed.position.z + placed.item.height - position.z) < 0.1 and
                not (position.x + length <= placed.position.x or placed.position.x + p_length <= position.x or
                     position.y + width <= placed.position.y or placed.position.y + p_width <= position.y)):
                support_weight += min(placed.item.max_stack_weight, placed.item.weight)
        return support_weight
    
    def find_best_position(self, item: Item3D) -> Optional[PlacementResult]:
        """Find the best position for an item using bottom-left-fill strategy."""
        best_position = None
        best_score = float('inf')
        best_rotation = 0
        
        # Try different rotations
        rotations = [0, 1] if item.length != item.width else [0]
        
        for rotation in rotations:
            # Generate potential positions
            positions = self._generate_positions()
            
            for pos in positions:
                if self.can_place_item(item, pos, rotation):
                    # Calculate score (prefer lower positions, then front-left)
                    score = pos.z * 1000 + pos.x * 100 + pos.y
                    if score < best_score:
                        best_score = score
                        best_position = pos
                        best_rotation = rotation
        
        if best_position:
            return PlacementResult(item, best_position, best_rotation, True)
        return None
    
    def _generate_positions(self) -> List[Position3D]:
        """Generate potential positions based on placed items and container edges."""
        positions = []
        if not self.placed_items:
            positions.append(Position3D(0, 0, 0))  # Only allow origin for first item
        else:
            for placed in self.placed_items:
                p_length = placed.item.width if placed.rotation % 2 else placed.item.length
                p_width = placed.item.length if placed.rotation % 2 else placed.item.width
                # Right edge
                positions.append(Position3D(
                    placed.position.x + p_length, placed.position.y, placed.position.z
                ))
                # Front edge
                positions.append(Position3D(
                    placed.position.x, placed.position.y + p_width, placed.position.z
                ))
                # Top edge (stacking position)
                positions.append(Position3D(
                    placed.position.x, placed.position.y, placed.position.z + placed.item.height
                ))
        # Remove duplicates and sort by z (height) first, then x, then y
        unique_positions = []
        for pos in positions:
            if not any(abs(pos.x - up.x) < 0.1 and abs(pos.y - up.y) < 0.1 and abs(pos.z - up.z) < 0.1 for up in unique_positions):
                unique_positions.append(pos)
        return sorted(unique_positions, key=lambda p: (p.z, p.x, p.y))
    
    def place_item(self, item: Item3D) -> bool:
        """Place an item in the container."""
        placement = self.find_best_position(item)
        if placement:
            self.placed_items.append(placement)
            self.total_weight += item.weight
            self.total_volume += item.length * item.width * item.height
            return True
        return False
    
    def optimize_loading_sequence(self, items: List[Item3D]) -> Tuple[List[PlacementResult], List[Item3D]]:
        """Optimize the loading sequence considering delivery stops."""
        # Sort by delivery stop (reverse order) and value density
        sorted_items = sorted(items, key=lambda i: (-i.delivery_stop, -i.value/(i.length * i.width * i.height)))
        
        successful_placements = []
        failed_items = []
        
        for item in sorted_items:
            if self.place_item(item):
                successful_placements.append(self.placed_items[-1])
            else:
                failed_items.append(item)
        
        return successful_placements, failed_items


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
        oversized_item = Item3D(
            id="oversized_width",
            length=100,
            width=300,  # Wider than container (250)
            height=30,
            weight=100
        )
        # Try to place the item at (0,0,0)
        success = self.optimizer.can_place_item(oversized_item, Position3D(0, 0, 0))
        if success:
            print(f"[DEBUG] Oversized item can be placed at (0,0,0)")
        self.assertFalse(success)
        # Try normal placement
        success = self.optimizer.place_item(oversized_item)
        if success:
            print(f"[DEBUG] Placed item at: {self.optimizer.placed_items[-1].position}")
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
        # Fill the floor so stacking is required
        base_item1 = Item3D(
            id="base_item1",
            length=500,
            width=250,
            height=50,
            weight=500,
            max_stack_weight=1000
        )
        base_item2 = Item3D(
            id="base_item2",
            length=500,
            width=250,
            height=50,
            weight=500,
            max_stack_weight=1000
        )
        self.optimizer.place_item(base_item1)
        self.optimizer.place_item(base_item2)
        # Now only stacking is possible for the next item
        stack_item = Item3D(
            id="stack_item",
            length=500,
            width=250,
            height=30,
            weight=200
        )
        success2 = self.optimizer.place_item(stack_item)
        if success2:
            print(f"[DEBUG] Stack item placed at: {self.optimizer.placed_items[2].position}")
        self.assertTrue(success2)
        stack_placement = self.optimizer.placed_items[2]
        self.assertEqual(stack_placement.position.z, 50)  # Should be on top of base items
        self.assertEqual(self.optimizer.total_weight, 1200)
    
    def test_stacking_weight_limit(self):
        """Test that stacking respects weight limits."""
        # Fill the floor so stacking is required
        base_item1 = Item3D(
            id="base_item1",
            length=500,
            width=250,
            height=50,
            weight=500,
            max_stack_weight=300
        )
        base_item2 = Item3D(
            id="base_item2",
            length=500,
            width=250,
            height=50,
            weight=500,
            max_stack_weight=300
        )
        self.optimizer.place_item(base_item1)
        self.optimizer.place_item(base_item2)
        # Try to place a heavy item on top
        heavy_stack_item = Item3D(
            id="heavy_stack_item",
            length=500,
            width=250,
            height=30,
            weight=700
        )
        stacking_position = Position3D(0, 0, 50)
        can_place = self.optimizer.can_place_item(heavy_stack_item, stacking_position)
        if can_place:
            print(f"[DEBUG] Heavy stack item can be placed at: {stacking_position}")
        self.assertFalse(can_place)
        success = self.optimizer.place_item(heavy_stack_item)
        if success:
            print(f"[DEBUG] Heavy stack item was placed at: {self.optimizer.placed_items[-1].position}")
        self.assertFalse(success)
    
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


if __name__ == '__main__':
    print("Running BinPackingOptimizer standalone tests...")
    main(verbosity=2) 
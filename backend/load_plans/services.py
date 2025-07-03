# services.py for load_plans app

from typing import List, Dict, Tuple, Optional
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import logging
from dataclasses import dataclass
from .models import LoadPlan, LoadPlanItem, LoadingConstraint
from shipments.models import Shipment, ConsignmentItem
from vehicles.models import Vehicle
from dangerous_goods.services import check_dg_compatibility_multiple

logger = logging.getLogger(__name__)

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
        if (position.x + item_length > self.container.length or
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
        
        # Check stacking constraints
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
        """Calculate weight support at given position."""
        support_weight = 0
        for placed in self.placed_items:
            if (placed.position.z + placed.item.height <= position.z and
                self._has_surface_overlap(position, length, width, placed)):
                support_weight += min(placed.item.max_stack_weight, placed.item.weight)
        return support_weight
    
    def _has_surface_overlap(self, pos: Position3D, length: float, width: float, 
                           placed: PlacementResult) -> bool:
        """Check if item surface overlaps with placed item."""
        p_length = placed.item.width if placed.rotation % 2 else placed.item.length
        p_width = placed.item.length if placed.rotation % 2 else placed.item.width
        
        return not (pos.x >= placed.position.x + p_length or
                   placed.position.x >= pos.x + length or
                   pos.y >= placed.position.y + p_width or
                   placed.position.y >= pos.y + width)
    
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
        positions = [Position3D(0, 0, 0)]  # Origin
        
        # Add positions based on placed items
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
            # Top edge
            positions.append(Position3D(
                placed.position.x, placed.position.y, placed.position.z + placed.item.height
            ))
        
        # Remove duplicates and sort
        unique_positions = []
        for pos in positions:
            if not any(abs(pos.x - up.x) < 0.1 and abs(pos.y - up.y) < 0.1 and 
                      abs(pos.z - up.z) < 0.1 for up in unique_positions):
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
    
    def optimize_loading_sequence(self, items: List[Item3D]) -> List[PlacementResult]:
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

def create_load_plan_for_shipments(
    vehicle: Vehicle,
    shipments: List[Shipment],
    optimization_type: str = 'MIXED'
) -> LoadPlan:
    """Create an optimized load plan for multiple shipments."""
    
    with transaction.atomic():
        # Create base load plan
        load_plan = LoadPlan.objects.create(
            vehicle=vehicle,
            name=f"Load Plan {timezone.now().strftime('%Y%m%d_%H%M')}",
            optimization_type=optimization_type,
            max_weight_kg=vehicle.capacity_kg or 10000,  # Default if not set
            max_volume_m3=50,  # Default volume
            cargo_length_cm=1200,  # Default dimensions
            cargo_width_cm=250,
            cargo_height_cm=280,
            status=LoadPlan.Status.OPTIMIZING
        )
        
        # Collect all items
        items_3d = []
        consignment_items = []
        
        for shipment in shipments:
            for item in shipment.items.all():
                # Convert to 3D item
                item_3d = Item3D(
                    id=str(item.id),
                    length=float(item.length_cm or 100),
                    width=float(item.width_cm or 100),
                    height=float(item.height_cm or 100),
                    weight=float(item.weight_kg or 10),
                    value=100,  # Default value, could calculate from pricing
                    is_dangerous=item.is_dangerous_good,
                    segregation_group=item.dangerous_good_entry.segregation_groups.first().code 
                                    if item.dangerous_good_entry and item.dangerous_good_entry.segregation_groups.exists() 
                                    else "",
                    delivery_stop=1,  # Would be calculated from route
                    is_stackable=True,  # Default, could be item property
                    max_stack_weight=1000  # Default
                )
                items_3d.append(item_3d)
                consignment_items.append(item)
        
        # Check DG compatibility
        dg_items = [item for item in consignment_items if item.is_dangerous_good]
        if len(dg_items) > 1:
            dg_objects = [item.dangerous_good_entry for item in dg_items if item.dangerous_good_entry]
            if dg_objects:
                compatibility_result = check_dg_compatibility_multiple(dg_objects)
                if not compatibility_result['compatible']:
                    load_plan.dg_compliance_status = 'VIOLATIONS'
                    load_plan.dg_violations = compatibility_result['reasons']
                    load_plan.contains_dangerous_goods = True
        
        # Run optimization
        container = Container3D(
            length=load_plan.cargo_length_cm,
            width=load_plan.cargo_width_cm,
            height=load_plan.cargo_height_cm,
            max_weight=load_plan.max_weight_kg
        )
        
        optimizer = BinPackingOptimizer(container)
        successful_placements, failed_items = optimizer.optimize_loading_sequence(items_3d)
        
        # Create load plan items
        for i, placement in enumerate(successful_placements):
            consignment_item = next(ci for ci in consignment_items if str(ci.id) == placement.item.id)
            
            LoadPlanItem.objects.create(
                load_plan=load_plan,
                consignment_item=consignment_item,
                position_x_cm=placement.position.x,
                position_y_cm=placement.position.y,
                position_z_cm=placement.position.z,
                length_cm=placement.item.length,
                width_cm=placement.item.width,
                height_cm=placement.item.height,
                weight_kg=placement.item.weight,
                load_sequence=i + 1,
                unload_sequence=i + 1,  # Simplified
                delivery_stop_number=placement.item.delivery_stop,
                delivery_location=consignment_item.shipment.destination_location
            )
        
        # Update load plan metrics
        load_plan.planned_weight_kg = optimizer.total_weight
        load_plan.planned_volume_m3 = optimizer.total_volume / 1000000  # Convert cm³ to m³
        load_plan.weight_utilization_pct = (optimizer.total_weight / load_plan.max_weight_kg) * 100
        load_plan.volume_utilization_pct = (load_plan.planned_volume_m3 / load_plan.max_volume_m3) * 100
        
        # Calculate optimization score
        utilization_score = (load_plan.weight_utilization_pct + load_plan.volume_utilization_pct) / 2
        compliance_score = 100 if load_plan.dg_compliance_status == 'COMPLIANT' else 70
        load_plan.optimization_score = (utilization_score * 0.7) + (compliance_score * 0.3)
        
        load_plan.optimization_algorithm = "3D_BIN_PACKING_BOTTOM_LEFT_FILL"
        load_plan.optimization_metadata = {
            'successful_items': len(successful_placements),
            'failed_items': len(failed_items),
            'failed_item_ids': [item.id for item in failed_items],
            'total_items': len(items_3d),
            'utilization_efficiency': utilization_score
        }
        
        load_plan.status = LoadPlan.Status.OPTIMIZED
        load_plan.optimized_at = timezone.now()
        load_plan.save()
        
        return load_plan

def validate_load_plan_compliance(load_plan: LoadPlan) -> Dict:
    """Validate load plan for dangerous goods and other compliance requirements."""
    violations = []
    warnings = []
    
    # Check dangerous goods segregation
    dg_items = load_plan.items.filter(
        consignment_item__is_dangerous_good=True
    ).select_related('consignment_item__dangerous_good_entry')
    
    for item1 in dg_items:
        for item2 in dg_items:
            if item1.id >= item2.id:  # Avoid duplicate checks
                continue
                
            # Calculate distance between items
            distance = ((item1.position_x_cm - item2.position_x_cm) ** 2 +
                       (item1.position_y_cm - item2.position_y_cm) ** 2 +
                       (item1.position_z_cm - item2.position_z_cm) ** 2) ** 0.5
            
            # Check minimum distance requirements
            min_distance = max(item1.min_distance_from_dg_cm, item2.min_distance_from_dg_cm)
            if distance < min_distance:
                violations.append(
                    f"DG items {item1.consignment_item.dangerous_good_entry.un_number} "
                    f"and {item2.consignment_item.dangerous_good_entry.un_number} "
                    f"are {distance:.1f}cm apart, minimum required: {min_distance}cm"
                )
    
    # Check weight distribution
    total_weight = sum(item.weight_kg for item in load_plan.items.all())
    front_weight = sum(
        item.weight_kg for item in load_plan.items.all()
        if item.position_x_cm < load_plan.cargo_length_cm / 2
    )
    
    front_weight_pct = (front_weight / total_weight) * 100 if total_weight > 0 else 0
    if front_weight_pct > 60:
        warnings.append(f"Front-heavy load: {front_weight_pct:.1f}% of weight in front half")
    elif front_weight_pct < 40:
        warnings.append(f"Rear-heavy load: {100-front_weight_pct:.1f}% of weight in rear half")
    
    # Update load plan compliance status
    if violations:
        load_plan.dg_compliance_status = 'VIOLATIONS'
        load_plan.dg_violations = violations
    else:
        load_plan.dg_compliance_status = 'COMPLIANT'
        load_plan.dg_violations = []
    
    load_plan.save()
    
    return {
        'is_compliant': len(violations) == 0,
        'violations': violations,
        'warnings': warnings,
        'total_items': load_plan.items.count(),
        'dg_items': dg_items.count(),
        'weight_distribution': {
            'front_percentage': front_weight_pct,
            'rear_percentage': 100 - front_weight_pct
        }
    }

def optimize_multi_vehicle_loading(
    shipments: List[Shipment],
    available_vehicles: List[Vehicle]
) -> List[LoadPlan]:
    """Optimize loading across multiple vehicles for maximum efficiency."""
    
    load_plans = []
    remaining_shipments = shipments.copy()
    
    # Sort vehicles by capacity (largest first)
    sorted_vehicles = sorted(available_vehicles, 
                           key=lambda v: v.capacity_kg or 0, reverse=True)
    
    for vehicle in sorted_vehicles:
        if not remaining_shipments:
            break
            
        # Select shipments that fit in this vehicle
        vehicle_shipments = []
        vehicle_weight = 0
        max_weight = vehicle.capacity_kg or 10000
        
        for shipment in remaining_shipments[:]:
            shipment_weight = sum(
                item.weight_kg or 10 for item in shipment.items.all()
            )
            
            if vehicle_weight + shipment_weight <= max_weight:
                vehicle_shipments.append(shipment)
                vehicle_weight += shipment_weight
                remaining_shipments.remove(shipment)
        
        if vehicle_shipments:
            load_plan = create_load_plan_for_shipments(
                vehicle, vehicle_shipments, 'MIXED'
            )
            load_plans.append(load_plan)
    
    return load_plans

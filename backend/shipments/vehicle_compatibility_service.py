# shipments/vehicle_compatibility_service.py

from typing import Dict, List, Optional, Tuple
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
import logging

from .models import Shipment, ConsignmentItem
from vehicles.models import Vehicle, VehicleSafetyEquipment, SafetyEquipmentType
from dangerous_goods.models import DangerousGood
from dangerous_goods.services import check_list_compatibility

logger = logging.getLogger(__name__)


class VehicleDGCompatibilityService:
    """
    Enhanced vehicle-to-dangerous goods compatibility validation service
    for comprehensive shipment creation and assignment validation.
    """

    @classmethod
    def validate_vehicle_for_shipment(cls, vehicle: Vehicle, shipment: Shipment, 
                                    strict_mode: bool = True) -> Dict:
        """
        Comprehensive validation of vehicle compatibility for a specific shipment.
        
        Args:
            vehicle: Vehicle to validate
            shipment: Shipment to validate against
            strict_mode: If True, treat warnings as failures
            
        Returns:
            Dict with validation results including compatibility status, issues, and recommendations
        """
        validation_result = {
            'vehicle_id': str(vehicle.id),
            'vehicle_registration': vehicle.registration_number,
            'shipment_id': str(shipment.id),
            'shipment_tracking': shipment.tracking_number,
            'validated_at': timezone.now().isoformat(),
            'is_compatible': True,
            'compatibility_level': 'FULL',
            'validation_type': 'GENERAL',
            'critical_issues': [],
            'warnings': [],
            'recommendations': [],
            'required_equipment': [],
            'missing_equipment': [],
            'expired_equipment': [],
            'equipment_status': {},
            'dangerous_goods_analysis': {},
            'capacity_analysis': {},
            'segregation_requirements': []
        }
        
        try:
            # Analyze dangerous goods in shipment
            dangerous_items = shipment.items.filter(is_dangerous_good=True)
            
            if dangerous_items.exists():
                validation_result['validation_type'] = 'DANGEROUS_GOODS'
                dg_analysis = cls._analyze_dangerous_goods(dangerous_items)
                validation_result['dangerous_goods_analysis'] = dg_analysis
                
                # Validate DG compatibility within shipment
                compatibility_check = cls._validate_dg_internal_compatibility(dg_analysis['un_numbers'])
                if not compatibility_check['is_compatible']:
                    validation_result['is_compatible'] = False
                    validation_result['critical_issues'].extend(compatibility_check['issues'])
                
                # Validate vehicle safety equipment for DG classes
                equipment_validation = cls._validate_vehicle_safety_equipment(
                    vehicle, dg_analysis['adr_classes']
                )
                validation_result.update(equipment_validation)
                
                # Validate vehicle capacity for dangerous goods
                capacity_validation = cls._validate_vehicle_capacity(
                    vehicle, dangerous_items, dg_analysis
                )
                validation_result['capacity_analysis'] = capacity_validation
                
                if not capacity_validation['sufficient_capacity']:
                    validation_result['warnings'].append(
                        f"Vehicle capacity ({vehicle.capacity_kg or 'Unknown'}kg) "
                        f"may be insufficient for total load ({capacity_validation['total_weight_kg']}kg)"
                    )
                
                # Check for specific DG transport restrictions
                restriction_check = cls._check_dg_transport_restrictions(
                    vehicle, dg_analysis['hazard_classes']
                )
                if restriction_check['has_restrictions']:
                    validation_result['critical_issues'].extend(restriction_check['restrictions'])
                    validation_result['is_compatible'] = False
            
            else:
                # Non-dangerous goods shipment
                validation_result['validation_type'] = 'NON_DANGEROUS_GOODS'
                
                # Basic vehicle safety check for general freight
                basic_safety = cls._validate_basic_vehicle_safety(vehicle)
                if not basic_safety['is_safe']:
                    validation_result['warnings'].extend(basic_safety['issues'])
                
                # Basic capacity check
                capacity_check = cls._validate_general_capacity(vehicle, shipment)
                validation_result['capacity_analysis'] = capacity_check
                
                if not capacity_check['sufficient_capacity']:
                    validation_result['warnings'].append(capacity_check['message'])
            
            # Set final compatibility status
            if validation_result['critical_issues']:
                validation_result['is_compatible'] = False
                validation_result['compatibility_level'] = 'INCOMPATIBLE'
            elif validation_result['warnings']:
                if strict_mode:
                    validation_result['is_compatible'] = False
                    validation_result['compatibility_level'] = 'CONDITIONAL'
                else:
                    validation_result['compatibility_level'] = 'COMPATIBLE_WITH_WARNINGS'
            
            # Generate recommendations
            validation_result['recommendations'] = cls._generate_compatibility_recommendations(
                validation_result, vehicle, dangerous_items if 'dangerous_items' in locals() else None
            )
            
        except Exception as e:
            logger.error(f"Error validating vehicle {vehicle.id} for shipment {shipment.id}: {str(e)}")
            validation_result['is_compatible'] = False
            validation_result['critical_issues'].append(f"Validation error: {str(e)}")
        
        return validation_result

    @classmethod
    def get_compatible_vehicles_for_shipment(cls, shipment: Shipment, 
                                           available_vehicles: Optional[models.QuerySet] = None,
                                           include_warnings: bool = True) -> List[Dict]:
        """
        Get all vehicles that are compatible with a specific shipment.
        
        Args:
            shipment: Shipment to find compatible vehicles for
            available_vehicles: Optional queryset of vehicles to check
            include_warnings: Whether to include vehicles with warnings
            
        Returns:
            List of compatible vehicles with their validation details
        """
        if available_vehicles is None:
            available_vehicles = Vehicle.objects.filter(
                status__in=['AVAILABLE', 'MAINTENANCE']
            ).select_related('owning_company').prefetch_related(
                'safety_equipment__equipment_type'
            )
        
        compatible_vehicles = []
        
        for vehicle in available_vehicles:
            validation_result = cls.validate_vehicle_for_shipment(
                vehicle, shipment, strict_mode=False
            )
            
            # Include vehicle if compatible or has only warnings (if enabled)
            if validation_result['is_compatible'] or (
                include_warnings and 
                validation_result['compatibility_level'] == 'COMPATIBLE_WITH_WARNINGS'
            ):
                vehicle_info = {
                    'vehicle_id': str(vehicle.id),
                    'registration_number': vehicle.registration_number,
                    'vehicle_type': vehicle.vehicle_type,
                    'capacity_kg': vehicle.capacity_kg,
                    'status': vehicle.status,
                    'owning_company': vehicle.owning_company.name if vehicle.owning_company else None,
                    'compatibility_score': cls._calculate_compatibility_score(validation_result),
                    'validation_summary': validation_result,
                    'can_assign': validation_result['is_compatible'],
                    'has_warnings': bool(validation_result['warnings']),
                    'warnings_count': len(validation_result['warnings']),
                    'critical_issues_count': len(validation_result['critical_issues'])
                }
                
                compatible_vehicles.append(vehicle_info)
        
        # Sort by compatibility score (highest first)
        return sorted(compatible_vehicles, key=lambda x: x['compatibility_score'], reverse=True)

    @classmethod
    def validate_shipment_before_creation(cls, shipment_data: Dict, items_data: List[Dict]) -> Dict:
        """
        Validate a shipment before creation to identify potential issues.
        
        Args:
            shipment_data: Shipment data dictionary
            items_data: List of item data dictionaries
            
        Returns:
            Dict with validation results and warnings
        """
        validation_result = {
            'can_create': True,
            'validation_type': 'PRE_CREATION',
            'critical_issues': [],
            'warnings': [],
            'dangerous_goods_issues': [],
            'capacity_warnings': [],
            'equipment_requirements': [],
            'recommended_vehicles': [],
            'validated_at': timezone.now().isoformat()
        }
        
        try:
            # Identify dangerous goods items
            dangerous_items = [item for item in items_data if item.get('is_dangerous_good', False)]
            
            if dangerous_items:
                # Validate dangerous goods compatibility
                un_numbers = []
                for item in dangerous_items:
                    if item.get('dangerous_good_entry'):
                        try:
                            dg = DangerousGood.objects.get(id=item['dangerous_good_entry'])
                            un_numbers.append(dg.un_number)
                        except DangerousGood.DoesNotExist:
                            validation_result['critical_issues'].append(
                                f"Invalid dangerous good reference in item: {item.get('description', 'Unknown')}"
                            )
                
                if un_numbers:
                    # Check internal DG compatibility
                    compatibility = cls._validate_dg_internal_compatibility(un_numbers)
                    if not compatibility['is_compatible']:
                        validation_result['can_create'] = False
                        validation_result['dangerous_goods_issues'].extend(compatibility['issues'])
                    
                    # Determine required equipment
                    equipment_requirements = cls._determine_required_equipment(un_numbers)
                    validation_result['equipment_requirements'] = equipment_requirements
                    
                    # Find vehicles that could handle this shipment
                    temp_shipment = cls._create_temp_shipment(shipment_data, items_data)
                    if temp_shipment:
                        compatible_vehicles = cls.get_compatible_vehicles_for_shipment(
                            temp_shipment, include_warnings=True
                        )
                        validation_result['recommended_vehicles'] = compatible_vehicles[:5]  # Top 5
                        
                        if not compatible_vehicles:
                            validation_result['warnings'].append(
                                "No vehicles currently meet all requirements for this shipment"
                            )
            
            # Calculate total weight and volume
            total_weight = sum(
                float(item.get('weight_kg', 0)) * int(item.get('quantity', 1)) 
                for item in items_data
            )
            
            if total_weight > 0:
                validation_result['capacity_warnings'] = cls._analyze_capacity_requirements(
                    total_weight, dangerous_items
                )
            
        except Exception as e:
            logger.error(f"Error in pre-creation validation: {str(e)}")
            validation_result['critical_issues'].append(f"Validation error: {str(e)}")
            validation_result['can_create'] = False
        
        return validation_result

    @classmethod
    def _analyze_dangerous_goods(cls, dangerous_items: models.QuerySet) -> Dict:
        """Analyze dangerous goods in a shipment to determine requirements."""
        analysis = {
            'total_items': dangerous_items.count(),
            'un_numbers': [],
            'hazard_classes': set(),
            'adr_classes': set(),
            'packing_groups': set(),
            'total_weight_kg': 0,
            'total_volume_l': 0,
            'highest_risk_class': None,
            'requires_segregation': False,
            'limited_quantities': 0,
            'excepted_quantities': 0
        }
        
        for item in dangerous_items:
            if item.dangerous_good_entry:
                dg = item.dangerous_good_entry
                analysis['un_numbers'].append(dg.un_number)
                analysis['hazard_classes'].add(dg.hazard_class)
                
                # Map hazard class to ADR class
                adr_class = cls._map_hazard_class_to_adr(dg.hazard_class)
                if adr_class:
                    analysis['adr_classes'].add(adr_class)
                
                if dg.packing_group:
                    analysis['packing_groups'].add(dg.packing_group)
            
            # Calculate totals
            if item.weight_kg and item.quantity:
                analysis['total_weight_kg'] += float(item.weight_kg) * item.quantity
            
            if item.volume_l and item.quantity:
                analysis['total_volume_l'] += float(item.volume_l) * item.quantity
            
            # Count special quantity types
            if hasattr(item, 'dg_quantity_type'):
                if item.dg_quantity_type == 'LIMITED_QUANTITY':
                    analysis['limited_quantities'] += 1
                elif item.dg_quantity_type == 'EXCEPTED_QUANTITY':
                    analysis['excepted_quantities'] += 1
        
        # Convert sets to lists for JSON serialization
        analysis['hazard_classes'] = list(analysis['hazard_classes'])
        analysis['adr_classes'] = list(analysis['adr_classes'])
        analysis['packing_groups'] = list(analysis['packing_groups'])
        
        # Determine highest risk class (simplified)
        risk_priority = {
            '1': 10, '1.1': 10, '1.2': 9, '1.3': 8, '1.4': 7, '1.5': 6, '1.6': 5,
            '2.1': 9, '2.2': 6, '2.3': 10,
            '3': 8, '4.1': 7, '4.2': 8, '4.3': 9,
            '5.1': 8, '5.2': 9, '6.1': 9, '6.2': 10,
            '7': 10, '8': 8, '9': 5
        }
        
        if analysis['hazard_classes']:
            analysis['highest_risk_class'] = max(
                analysis['hazard_classes'],
                key=lambda x: risk_priority.get(x, 1)
            )
        
        return analysis

    @classmethod
    def _validate_vehicle_safety_equipment(cls, vehicle: Vehicle, adr_classes: List[str]) -> Dict:
        """Validate vehicle safety equipment for specific ADR classes."""
        equipment_validation = {
            'equipment_compliant': True,
            'required_equipment': [],
            'missing_equipment': [],
            'expired_equipment': [],
            'equipment_status': {},
            'compliance_percentage': 0
        }
        
        # Get required equipment types for ADR classes
        required_types = SafetyEquipmentType.objects.filter(
            models.Q(required_for_adr_classes__overlap=adr_classes) |
            models.Q(required_for_adr_classes__contains=['ALL_CLASSES']),
            is_active=True
        )
        
        total_required = required_types.count()
        compliant_count = 0
        
        for equipment_type in required_types:
            equipment_validation['required_equipment'].append({
                'type_id': str(equipment_type.id),
                'name': equipment_type.name,
                'category': equipment_type.category,
                'standard': equipment_type.certification_standard
            })
            
            # Check if vehicle has this equipment
            vehicle_equipment = vehicle.safety_equipment.filter(
                equipment_type=equipment_type,
                status='ACTIVE'
            ).first()
            
            if not vehicle_equipment:
                equipment_validation['missing_equipment'].append(equipment_type.name)
                equipment_validation['equipment_status'][equipment_type.name] = {
                    'status': 'MISSING',
                    'issue': 'Required equipment not installed'
                }
                equipment_validation['equipment_compliant'] = False
            else:
                # Check compliance status
                if vehicle_equipment.is_expired:
                    equipment_validation['expired_equipment'].append({
                        'name': equipment_type.name,
                        'expiry_date': vehicle_equipment.expiry_date.isoformat() if vehicle_equipment.expiry_date else None,
                        'serial_number': vehicle_equipment.serial_number
                    })
                    equipment_validation['equipment_status'][equipment_type.name] = {
                        'status': 'EXPIRED',
                        'issue': f'Equipment expired on {vehicle_equipment.expiry_date}' if vehicle_equipment.expiry_date else 'Equipment expired'
                    }
                    equipment_validation['equipment_compliant'] = False
                elif vehicle_equipment.inspection_overdue:
                    equipment_validation['equipment_status'][equipment_type.name] = {
                        'status': 'INSPECTION_OVERDUE',
                        'issue': f'Inspection overdue since {vehicle_equipment.next_inspection_date}' if vehicle_equipment.next_inspection_date else 'Inspection overdue'
                    }
                    equipment_validation['equipment_compliant'] = False
                else:
                    equipment_validation['equipment_status'][equipment_type.name] = {
                        'status': 'COMPLIANT',
                        'serial_number': vehicle_equipment.serial_number,
                        'expiry_date': vehicle_equipment.expiry_date.isoformat() if vehicle_equipment.expiry_date else None
                    }
                    compliant_count += 1
        
        # Calculate compliance percentage
        if total_required > 0:
            equipment_validation['compliance_percentage'] = (compliant_count / total_required) * 100
        else:
            equipment_validation['compliance_percentage'] = 100
        
        return equipment_validation

    @classmethod
    def _validate_dg_internal_compatibility(cls, un_numbers: List[str]) -> Dict:
        """Validate dangerous goods compatibility within the shipment."""
        if not un_numbers or len(un_numbers) <= 1:
            return {
                'is_compatible': True,
                'issues': [],
                'segregation_requirements': []
            }
        
        try:
            compatibility_result = check_list_compatibility(un_numbers)
            return {
                'is_compatible': compatibility_result.get('is_compatible', True),
                'issues': compatibility_result.get('conflicts', []),
                'segregation_requirements': compatibility_result.get('segregation_requirements', [])
            }
        except Exception as e:
            logger.error(f"Error checking DG compatibility: {str(e)}")
            return {
                'is_compatible': True,  # Assume compatible if check fails
                'issues': [f"Compatibility check failed: {str(e)}"],
                'segregation_requirements': []
            }

    @classmethod
    def _validate_vehicle_capacity(cls, vehicle: Vehicle, dangerous_items: models.QuerySet, 
                                 dg_analysis: Dict) -> Dict:
        """Validate vehicle capacity for dangerous goods load."""
        capacity_analysis = {
            'vehicle_capacity_kg': vehicle.capacity_kg,
            'total_weight_kg': dg_analysis['total_weight_kg'],
            'total_volume_l': dg_analysis['total_volume_l'],
            'sufficient_capacity': True,
            'capacity_utilization': 0,
            'warnings': []
        }
        
        if vehicle.capacity_kg and dg_analysis['total_weight_kg']:
            capacity_analysis['capacity_utilization'] = (
                dg_analysis['total_weight_kg'] / vehicle.capacity_kg
            ) * 100
            
            if capacity_analysis['capacity_utilization'] > 100:
                capacity_analysis['sufficient_capacity'] = False
                capacity_analysis['warnings'].append(
                    f"Load exceeds vehicle capacity by {capacity_analysis['capacity_utilization'] - 100:.1f}%"
                )
            elif capacity_analysis['capacity_utilization'] > 90:
                capacity_analysis['warnings'].append(
                    f"High capacity utilization: {capacity_analysis['capacity_utilization']:.1f}%"
                )
        
        return capacity_analysis

    @classmethod
    def _check_dg_transport_restrictions(cls, vehicle: Vehicle, hazard_classes: List[str]) -> Dict:
        """Check for specific dangerous goods transport restrictions."""
        restrictions = {
            'has_restrictions': False,
            'restrictions': []
        }
        
        # Example restrictions (customize based on business rules)
        if 'CLASS_1' in hazard_classes:  # Explosives
            if vehicle.vehicle_type not in ['SEMI', 'RIGID']:
                restrictions['has_restrictions'] = True
                restrictions['restrictions'].append(
                    "Class 1 explosives require semi-trailer or rigid truck"
                )
        
        if 'CLASS_7' in hazard_classes:  # Radioactive
            # Check for special radioactive transport authorization
            restrictions['has_restrictions'] = True
            restrictions['restrictions'].append(
                "Class 7 radioactive materials require special authorization"
            )
        
        return restrictions

    @classmethod
    def _validate_basic_vehicle_safety(cls, vehicle: Vehicle) -> Dict:
        """Basic safety validation for non-dangerous goods."""
        safety_status = vehicle.safety_equipment_status
        return {
            'is_safe': safety_status['compliant'],
            'issues': [safety_status['message']] if not safety_status['compliant'] else []
        }

    @classmethod
    def _validate_general_capacity(cls, vehicle: Vehicle, shipment: Shipment) -> Dict:
        """Validate vehicle capacity for general freight."""
        total_weight = sum(
            (item.weight_kg or 0) * item.quantity 
            for item in shipment.items.all()
        )
        
        capacity_check = {
            'total_weight_kg': float(total_weight),
            'vehicle_capacity_kg': vehicle.capacity_kg,
            'sufficient_capacity': True,
            'message': ''
        }
        
        if vehicle.capacity_kg and total_weight:
            if total_weight > vehicle.capacity_kg:
                capacity_check['sufficient_capacity'] = False
                capacity_check['message'] = (
                    f"Total weight ({total_weight}kg) exceeds vehicle capacity "
                    f"({vehicle.capacity_kg}kg)"
                )
        
        return capacity_check

    @classmethod
    def _generate_compatibility_recommendations(cls, validation_result: Dict, 
                                              vehicle: Vehicle, dangerous_items: Optional[models.QuerySet]) -> List[str]:
        """Generate recommendations based on validation results."""
        recommendations = []
        
        if validation_result['missing_equipment']:
            recommendations.append(
                f"Install missing safety equipment: {', '.join(validation_result['missing_equipment'])}"
            )
        
        if validation_result['expired_equipment']:
            expired_names = [eq['name'] for eq in validation_result['expired_equipment']]
            recommendations.append(
                f"Replace expired equipment: {', '.join(expired_names)}"
            )
        
        if validation_result['warnings']:
            if any('capacity' in warning.lower() for warning in validation_result['warnings']):
                recommendations.append("Consider using a larger capacity vehicle")
        
        if dangerous_items and dangerous_items.exists():
            recommendations.append("Ensure driver has appropriate dangerous goods training")
            recommendations.append("Verify emergency response procedures are in place")
        
        return recommendations

    @classmethod
    def _calculate_compatibility_score(cls, validation_result: Dict) -> float:
        """Calculate a compatibility score (0-100) based on validation results."""
        base_score = 100.0
        
        # Deduct for critical issues
        base_score -= len(validation_result['critical_issues']) * 25
        
        # Deduct for warnings
        base_score -= len(validation_result['warnings']) * 5
        
        # Deduct for missing equipment
        base_score -= len(validation_result.get('missing_equipment', [])) * 10
        
        # Deduct for expired equipment
        base_score -= len(validation_result.get('expired_equipment', [])) * 15
        
        # Add bonus for equipment compliance
        if 'compliance_percentage' in validation_result:
            compliance_bonus = validation_result['compliance_percentage'] * 0.2
            base_score += compliance_bonus
        
        return max(0.0, min(100.0, base_score))

    @classmethod
    def _map_hazard_class_to_adr(cls, hazard_class: str) -> Optional[str]:
        """Map hazard class to ADR class designation."""
        mapping = {
            '1': 'CLASS_1', '1.1': 'CLASS_1', '1.2': 'CLASS_1', '1.3': 'CLASS_1',
            '1.4': 'CLASS_1', '1.5': 'CLASS_1', '1.6': 'CLASS_1',
            '2.1': 'CLASS_2', '2.2': 'CLASS_2', '2.3': 'CLASS_2',
            '3': 'CLASS_3',
            '4.1': 'CLASS_4_1', '4.2': 'CLASS_4_2', '4.3': 'CLASS_4_3',
            '5.1': 'CLASS_5_1', '5.2': 'CLASS_5_2',
            '6.1': 'CLASS_6_1', '6.2': 'CLASS_6_2',
            '7': 'CLASS_7',
            '8': 'CLASS_8',
            '9': 'CLASS_9'
        }
        return mapping.get(hazard_class)

    @classmethod
    def _determine_required_equipment(cls, un_numbers: List[str]) -> List[Dict]:
        """Determine required safety equipment for given UN numbers."""
        # This would normally query a comprehensive requirements database
        # For now, return basic requirements
        return [
            {
                'equipment_type': 'Fire Extinguisher',
                'minimum_capacity': '2kg',
                'standard': 'AS/NZS 1841.1',
                'reason': 'Required for all dangerous goods transport'
            },
            {
                'equipment_type': 'First Aid Kit',
                'standard': 'AS/NZS 1841.14',
                'reason': 'Required for all dangerous goods transport'
            }
        ]

    @classmethod
    def _create_temp_shipment(cls, shipment_data: Dict, items_data: List[Dict]) -> Optional[Shipment]:
        """Create a temporary shipment object for validation (not saved to DB)."""
        try:
            # Create temporary shipment without saving
            temp_shipment = Shipment(**{
                k: v for k, v in shipment_data.items() 
                if k in [f.name for f in Shipment._meta.get_fields()]
            })
            
            # Don't save to database, just return for validation
            return temp_shipment
        except Exception as e:
            logger.error(f"Error creating temp shipment: {str(e)}")
            return None

    @classmethod
    def _analyze_capacity_requirements(cls, total_weight: float, dangerous_items: List[Dict]) -> List[str]:
        """Analyze capacity requirements and generate warnings."""
        warnings = []
        
        if total_weight > 5000:  # 5 tons
            warnings.append(f"Heavy load ({total_weight}kg) requires heavy vehicle capacity")
        
        if dangerous_items:
            warnings.append("Dangerous goods require certified vehicle and equipment")
        
        return warnings
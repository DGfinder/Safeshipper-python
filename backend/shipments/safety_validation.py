"""
Shipment safety validation services that integrate vehicle safety equipment compliance
with dangerous goods transport requirements.
"""

from typing import Dict, List, Optional, Tuple
from django.db import models
from django.utils import timezone
from .models import Shipment, ConsignmentItem
from vehicles.models import Vehicle
from vehicles.safety_services import ADRComplianceValidator
from dangerous_goods.services import check_list_compatibility  # Re-enabled after dangerous_goods app re-enabled


class ShipmentSafetyValidator:
    """Validates shipment safety compliance including vehicle equipment and DG compatibility"""
    
    @classmethod
    def validate_shipment_safety_compliance(cls, shipment: Shipment, 
                                          vehicle: Optional[Vehicle] = None) -> Dict:
        """
        Comprehensive safety validation for a shipment including:
        - Vehicle safety equipment compliance
        - Dangerous goods compatibility
        - ADR requirements alignment
        """
        validation_result = {
            'shipment_id': shipment.id,
            'tracking_number': shipment.tracking_number,
            'validated_at': timezone.now(),
            'overall_compliant': True,
            'critical_issues': [],
            'warnings': [],
            'vehicle_compliance': None,
            'dangerous_goods_compliance': None,
            'recommendations': []
        }
        
        # Get dangerous goods from shipment
        dangerous_items = shipment.items.filter(is_dangerous_good=True)
        adr_classes = []
        
        if dangerous_items.exists():
            # Extract ADR classes from dangerous goods
            for item in dangerous_items:
                if item.dangerous_good_entry and item.dangerous_good_entry.hazard_class:
                    hazard_class = item.dangerous_good_entry.hazard_class
                    adr_class = cls._map_hazard_class_to_adr(hazard_class)
                    if adr_class and adr_class not in adr_classes:
                        adr_classes.append(adr_class)
            
            # Validate dangerous goods compatibility
            dg_validation = cls._validate_dangerous_goods_compatibility(shipment, dangerous_items)
            validation_result['dangerous_goods_compatibility'] = dg_validation
            
            if not dg_validation['compatible']:
                validation_result['overall_compliant'] = False
                validation_result['critical_issues'].extend(dg_validation['issues'])
        
        # If no specific ADR classes found, use general requirements
        if not adr_classes:
            adr_classes = ['ALL_CLASSES']
        
        # Validate vehicle compliance if vehicle is specified
        if vehicle:
            vehicle_validation = cls._validate_vehicle_compliance(vehicle, adr_classes)
            validation_result['vehicle_compliance'] = vehicle_validation
            
            if not vehicle_validation['compliant']:
                validation_result['overall_compliant'] = False
                validation_result['critical_issues'].extend(vehicle_validation['critical_issues'])
                validation_result['warnings'].extend(vehicle_validation['warnings'])
        else:
            validation_result['warnings'].append("No vehicle assigned - cannot validate safety equipment compliance")
        
        # Generate recommendations
        validation_result['recommendations'] = cls._generate_recommendations(
            validation_result, adr_classes, vehicle
        )
        
        return validation_result
    
    @classmethod
    def validate_vehicle_assignment(cls, shipment: Shipment, vehicle: Vehicle) -> Dict:
        """Validate if a vehicle can be assigned to a shipment based on safety compliance"""
        dangerous_items = shipment.items.filter(is_dangerous_good=True)
        
        if not dangerous_items.exists():
            # No dangerous goods - basic vehicle safety check
            vehicle_status = vehicle.safety_equipment_status
            return {
                'can_assign': vehicle_status['compliant'],
                'reason': vehicle_status['message'] if not vehicle_status['compliant'] else 'Vehicle is compliant for general freight',
                'vehicle_compliance': vehicle_status,
                'requirements_met': vehicle_status['compliant']
            }
        
        # Extract ADR classes for dangerous goods validation
        adr_classes = []
        un_numbers = []
        
        for item in dangerous_items:
            if item.dangerous_good_entry:
                un_numbers.append(item.dangerous_good_entry.un_number)
                hazard_class = item.dangerous_good_entry.hazard_class
                adr_class = cls._map_hazard_class_to_adr(hazard_class)
                if adr_class and adr_class not in adr_classes:
                    adr_classes.append(adr_class)
        
        if not adr_classes:
            adr_classes = ['ALL_CLASSES']
        
        # Validate vehicle compliance for specific ADR classes
        compliance_result = ADRComplianceValidator.validate_comprehensive_compliance(
            vehicle, adr_classes
        )
        
        # Check dangerous goods compatibility - re-enabled
        dg_compatibility = check_list_compatibility(un_numbers)
        
        can_assign = compliance_result['compliant'] and dg_compatibility.get('is_compatible', True)
        
        issues = []
        if not compliance_result['compliant']:
            issues.extend(compliance_result['issues'])
        if not dg_compatibility.get('is_compatible', True):
            issues.extend(dg_compatibility.get('incompatible_pairs', []))
        
        return {
            'can_assign': can_assign,
            'reason': 'Vehicle meets all safety requirements' if can_assign else f"Safety issues found: {'; '.join(issues[:3])}",
            'vehicle_compliance': compliance_result,
            'dangerous_goods_compatibility': dg_compatibility,
            'requirements_met': can_assign,
            'adr_classes_required': adr_classes
        }
    
    @classmethod
    def get_compliant_vehicles_for_shipment(cls, shipment: Shipment, 
                                          available_vehicles: Optional[models.QuerySet] = None) -> List[Dict]:
        """Get list of vehicles that are compliant for a specific shipment"""
        if available_vehicles is None:
            available_vehicles = Vehicle.objects.filter(status='AVAILABLE')
        
        compliant_vehicles = []
        
        for vehicle in available_vehicles:
            validation_result = cls.validate_vehicle_assignment(shipment, vehicle)
            
            vehicle_info = {
                'vehicle_id': vehicle.id,
                'registration': vehicle.registration_number,
                'vehicle_type': vehicle.vehicle_type,
                'capacity_kg': vehicle.capacity_kg,
                'can_assign': validation_result['can_assign'],
                'compliance_score': cls._calculate_compliance_score(validation_result),
                'validation_summary': validation_result
            }
            
            if validation_result['can_assign']:
                compliant_vehicles.append(vehicle_info)
        
        # Sort by compliance score (highest first)
        return sorted(compliant_vehicles, key=lambda x: x['compliance_score'], reverse=True)
    
    @classmethod
    def _validate_dangerous_goods_compatibility(cls, shipment: Shipment, 
                                              dangerous_items: models.QuerySet) -> Dict:
        """Validate dangerous goods compatibility within the shipment"""
        un_numbers = []
        
        for item in dangerous_items:
            if item.dangerous_good_entry and item.dangerous_good_entry.un_number:
                un_numbers.append(item.dangerous_good_entry.un_number)
        
        if not un_numbers:
            return {
                'compatible': True,
                'issues': [],
                'un_numbers_checked': []
            }
        
        compatibility_result = check_list_compatibility(un_numbers)  # Re-enabled
        
        return {
            'compatible': compatibility_result.get('is_compatible', True),
            'issues': compatibility_result.get('incompatible_pairs', []),
            'un_numbers_checked': un_numbers,
            'segregation_requirements': compatibility_result.get('segregation_requirements', [])
        }
    
    @classmethod
    def _validate_vehicle_compliance(cls, vehicle: Vehicle, adr_classes: List[str]) -> Dict:
        """Validate vehicle safety equipment compliance for specific ADR classes"""
        compliance_result = ADRComplianceValidator.validate_comprehensive_compliance(
            vehicle, adr_classes
        )
        
        critical_issues = []
        warnings = []
        
        for issue in compliance_result['issues']:
            if any(keyword in issue.lower() for keyword in ['missing', 'expired', 'failed']):
                critical_issues.append(issue)
            else:
                warnings.append(issue)
        
        return {
            'compliant': compliance_result['compliant'],
            'critical_issues': critical_issues,
            'warnings': warnings,
            'fire_extinguisher_compliance': compliance_result['fire_extinguisher_compliance'],
            'equipment_compliance': compliance_result['equipment_compliance'],
            'adr_classes': adr_classes,
            'vehicle_registration': vehicle.registration_number
        }
    
    @classmethod
    def _map_hazard_class_to_adr(cls, hazard_class: str) -> Optional[str]:
        """Map hazard class to ADR class designation"""
        hazard_to_adr_mapping = {
            '1': 'CLASS_1',
            '1.1': 'CLASS_1',
            '1.2': 'CLASS_1',
            '1.3': 'CLASS_1',
            '1.4': 'CLASS_1',
            '1.5': 'CLASS_1',
            '1.6': 'CLASS_1',
            '2.1': 'CLASS_2',
            '2.2': 'CLASS_2',
            '2.3': 'CLASS_2',
            '3': 'CLASS_3',
            '4.1': 'CLASS_4_1',
            '4.2': 'CLASS_4_2',
            '4.3': 'CLASS_4_3',
            '5.1': 'CLASS_5_1',
            '5.2': 'CLASS_5_2',
            '6.1': 'CLASS_6_1',
            '6.2': 'CLASS_6_2',
            '7': 'CLASS_7',
            '8': 'CLASS_8',
            '9': 'CLASS_9'
        }
        
        return hazard_to_adr_mapping.get(hazard_class, 'ALL_CLASSES')
    
    @classmethod
    def _calculate_compliance_score(cls, validation_result: Dict) -> float:
        """Calculate a compliance score from 0-100 based on validation results"""
        if not validation_result['can_assign']:
            return 0.0
        
        score = 100.0
        
        vehicle_compliance = validation_result.get('vehicle_compliance', {})
        
        # Deduct points for non-critical issues
        if vehicle_compliance.get('warnings'):
            score -= len(vehicle_compliance['warnings']) * 5
        
        # Bonus for good fire extinguisher compliance
        fire_compliance = vehicle_compliance.get('fire_extinguisher_compliance', {})
        if fire_compliance.get('compliant'):
            current_capacity = fire_compliance.get('current_capacity', 0)
            required_capacity = fire_compliance.get('required_capacity', 0)
            if current_capacity > required_capacity:
                score += min(10, (current_capacity - required_capacity) * 2)
        
        return max(0.0, min(100.0, score))
    
    @classmethod
    def _generate_recommendations(cls, validation_result: Dict, adr_classes: List[str], 
                                vehicle: Optional[Vehicle]) -> List[str]:
        """Generate actionable recommendations based on validation results"""
        recommendations = []
        
        if not validation_result['overall_compliant']:
            recommendations.append("This shipment is not compliant for transport and requires immediate attention")
        
        # Vehicle-specific recommendations
        if vehicle and validation_result.get('vehicle_compliance'):
            vehicle_compliance = validation_result['vehicle_compliance']
            
            if vehicle_compliance.get('critical_issues'):
                recommendations.append(f"Vehicle {vehicle.registration_number} requires safety equipment updates before transport")
            
            # Fire extinguisher recommendations
            fire_compliance = vehicle_compliance.get('fire_extinguisher_compliance', {})
            if not fire_compliance.get('compliant'):
                recommendations.append(f"Update fire extinguisher equipment to meet ADR requirements for vehicle weight category")
        
        # Dangerous goods recommendations
        if validation_result.get('dangerous_goods_compatibility'):
            dg_compliance = validation_result['dangerous_goods_compatibility']
            if not dg_compliance.get('compatible'):
                recommendations.append("Review dangerous goods segregation requirements - some items may not be compatible for joint transport")
        
        # General recommendations
        if 'CLASS_8' in adr_classes:
            recommendations.append("Ensure chemical spill kit and eye wash equipment are available for corrosive materials")
        
        if 'CLASS_3' in adr_classes:
            recommendations.append("Verify fire suppression equipment is adequate for flammable liquids")
        
        if not recommendations:
            recommendations.append("All safety requirements are met - shipment is ready for transport")
        
        return recommendations


class ShipmentPreValidationService:
    """Service for pre-validating shipments before they are created or modified"""
    
    @classmethod
    def validate_shipment_creation(cls, shipment_data: Dict, items_data: List[Dict], 
                                 vehicle_id: Optional[str] = None) -> Dict:
        """Validate shipment data before creation"""
        validation_result = {
            'can_create': True,
            'issues': [],
            'warnings': [],
            'vehicle_compatibility': None
        }
        
        # Basic validation
        if not items_data:
            validation_result['can_create'] = False
            validation_result['issues'].append("Shipment must contain at least one item")
            return validation_result
        
        # Extract dangerous goods information
        dangerous_items = [item for item in items_data if item.get('is_dangerous_good')]
        
        if dangerous_items and vehicle_id:
            try:
                vehicle = Vehicle.objects.get(id=vehicle_id)
                
                # Create temporary objects for validation
                temp_shipment = Shipment(**shipment_data)
                temp_items = []
                
                for item_data in items_data:
                    temp_item = ConsignmentItem(shipment=temp_shipment, **item_data)
                    temp_items.append(temp_item)
                
                # Validate vehicle assignment
                vehicle_validation = ShipmentSafetyValidator.validate_vehicle_assignment(
                    temp_shipment, vehicle
                )
                validation_result['vehicle_compatibility'] = vehicle_validation
                
                if not vehicle_validation['can_assign']:
                    validation_result['can_create'] = False
                    validation_result['issues'].append(
                        f"Vehicle {vehicle.registration_number} is not compliant for this shipment: {vehicle_validation['reason']}"
                    )
                
            except Vehicle.DoesNotExist:
                validation_result['warnings'].append("Specified vehicle not found - cannot validate equipment compliance")
        
        elif dangerous_items and not vehicle_id:
            validation_result['warnings'].append("Dangerous goods shipment should have a vehicle assigned for safety validation")
        
        return validation_result
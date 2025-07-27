"""
Safety equipment services for ADR compliance validation.

This module contains business logic for validating vehicle safety equipment
compliance with ADR 2025 regulations and dangerous goods transport requirements.
"""

from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from .models import (
    Vehicle, SafetyEquipmentType, VehicleSafetyEquipment,
    SafetyEquipmentInspection, SafetyEquipmentCertification
)


class ADRComplianceValidator:
    """Validator for ADR 2025 compliance requirements"""
    
    # ADR 2025 fire extinguisher requirements by vehicle weight
    FIRE_EXTINGUISHER_REQUIREMENTS = {
        'up_to_3_5t': {
            'total_capacity_kg': 4,
            'minimum_units': 2,
            'largest_unit_kg': None,
            'description': 'Two or more fire extinguishers with minimum total capacity of 4kg'
        },
        '3_5_to_7_5t': {
            'total_capacity_kg': 8,
            'minimum_units': 2,
            'largest_unit_kg': 6,
            'description': 'Two or more fire extinguishers with minimum total capacity of 8kg, largest unit minimum 6kg'
        },
        'over_7_5t': {
            'total_capacity_kg': 12,
            'minimum_units': 2,
            'largest_unit_kg': 6,
            'description': 'Two or more fire extinguishers with minimum total capacity of 12kg, largest unit minimum 6kg'
        }
    }
    
    # Standard ADR equipment requirements by hazard class
    STANDARD_EQUIPMENT_REQUIREMENTS = {
        'ALL_CLASSES': [
            'Fire Extinguisher (ABC Type)',
            'First Aid Kit',
            'Emergency Tools (Chocks)',
            'Personal Protective Equipment'
        ],
        'CLASS_1': [
            'Fire Extinguisher (ABC Type)',
            'First Aid Kit',
            'Emergency Tools (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information Cards'
        ],
        'CLASS_2': [
            'Fire Extinguisher (ABC Type)',
            'First Aid Kit',
            'Emergency Tools (Chocks)',
            'Personal Protective Equipment',
            'Gas Detection Equipment'
        ],
        'CLASS_3': [
            'Fire Extinguisher (ABC Type)',
            'First Aid Kit',
            'Emergency Tools (Chocks)',
            'Personal Protective Equipment',
            'Spill Kit'
        ],
        'CLASS_8': [
            'Fire Extinguisher (ABC Type)',
            'First Aid Kit',
            'Emergency Tools (Chocks)',
            'Personal Protective Equipment',
            'Chemical Spill Kit',
            'Eye Wash Equipment'
        ]
    }
    
    @classmethod
    def get_vehicle_weight_category(cls, capacity_kg: Optional[float]) -> str:
        """Determine vehicle weight category for ADR requirements"""
        if not capacity_kg:
            return 'up_to_3_5t'  # Default to lowest category if unknown
        
        capacity_tonnes = capacity_kg / 1000
        
        if capacity_tonnes <= 3.5:
            return 'up_to_3_5t'
        elif capacity_tonnes <= 7.5:
            return '3_5_to_7_5t'
        else:
            return 'over_7_5t'
    
    @classmethod
    def validate_fire_extinguisher_compliance(cls, vehicle: Vehicle) -> Dict:
        """Validate fire extinguisher compliance per ADR 2025"""
        weight_category = cls.get_vehicle_weight_category(vehicle.capacity_kg)
        requirements = cls.FIRE_EXTINGUISHER_REQUIREMENTS[weight_category]
        
        # Get active fire extinguishers
        fire_extinguishers = vehicle.safety_equipment.filter(
            equipment_type__category='FIRE_EXTINGUISHER',
            status='ACTIVE'
        )
        
        issues = []
        total_capacity = 0
        extinguisher_capacities = []
        
        for extinguisher in fire_extinguishers:
            if not extinguisher.is_compliant:
                if extinguisher.is_expired:
                    issues.append(f"Fire extinguisher {extinguisher.serial_number} has expired")
                elif extinguisher.inspection_overdue:
                    issues.append(f"Fire extinguisher {extinguisher.serial_number} inspection overdue")
                continue
            
            # Extract capacity from capacity field (e.g., "2kg", "6kg")
            try:
                capacity_str = extinguisher.capacity.lower().replace('kg', '').strip()
                capacity = float(capacity_str)
                total_capacity += capacity
                extinguisher_capacities.append(capacity)
            except (ValueError, AttributeError):
                issues.append(f"Fire extinguisher {extinguisher.serial_number} has invalid capacity format")
        
        # Check minimum number of units
        if len(extinguisher_capacities) < requirements['minimum_units']:
            issues.append(f"Minimum {requirements['minimum_units']} fire extinguishers required, only {len(extinguisher_capacities)} found")
        
        # Check total capacity
        if total_capacity < requirements['total_capacity_kg']:
            issues.append(f"Total fire extinguisher capacity must be at least {requirements['total_capacity_kg']}kg, currently {total_capacity}kg")
        
        # Check largest unit requirement
        if requirements['largest_unit_kg'] and extinguisher_capacities:
            largest_capacity = max(extinguisher_capacities)
            if largest_capacity < requirements['largest_unit_kg']:
                issues.append(f"Largest fire extinguisher must be at least {requirements['largest_unit_kg']}kg, currently {largest_capacity}kg")
        
        return {
            'compliant': len(issues) == 0,
            'issues': issues,
            'current_capacity': total_capacity,
            'required_capacity': requirements['total_capacity_kg'],
            'unit_count': len(extinguisher_capacities),
            'requirements': requirements
        }
    
    @classmethod
    def validate_equipment_for_adr_classes(cls, vehicle: Vehicle, adr_classes: List[str]) -> Dict:
        """Validate equipment requirements for specific ADR classes"""
        issues = []
        equipment_status = {}
        
        # Combine requirements for all specified ADR classes
        required_equipment = set()
        for adr_class in adr_classes:
            if adr_class in cls.STANDARD_EQUIPMENT_REQUIREMENTS:
                required_equipment.update(cls.STANDARD_EQUIPMENT_REQUIREMENTS[adr_class])
            else:
                # Default to ALL_CLASSES requirements for unknown classes
                required_equipment.update(cls.STANDARD_EQUIPMENT_REQUIREMENTS['ALL_CLASSES'])
        
        # Check each required equipment type
        for equipment_name in required_equipment:
            # Find matching equipment types (case-insensitive partial match)
            matching_types = SafetyEquipmentType.objects.filter(
                Q(name__icontains=equipment_name.split(' ')[0]) |
                Q(description__icontains=equipment_name.split(' ')[0]),
                is_active=True
            )
            
            found_compliant = False
            for equipment_type in matching_types:
                vehicle_equipment = vehicle.safety_equipment.filter(
                    equipment_type=equipment_type,
                    status='ACTIVE'
                ).first()
                
                if vehicle_equipment and vehicle_equipment.is_compliant:
                    found_compliant = True
                    equipment_status[equipment_name] = {
                        'status': 'compliant',
                        'equipment': vehicle_equipment
                    }
                    break
                elif vehicle_equipment:
                    equipment_status[equipment_name] = {
                        'status': 'non_compliant',
                        'equipment': vehicle_equipment,
                        'issue': 'expired' if vehicle_equipment.is_expired else 'inspection_due'
                    }
            
            if not found_compliant:
                if equipment_name not in equipment_status:
                    issues.append(f"Missing required equipment: {equipment_name}")
                    equipment_status[equipment_name] = {
                        'status': 'missing',
                        'equipment': None
                    }
                else:
                    issues.append(f"Non-compliant equipment: {equipment_name}")
        
        return {
            'compliant': len(issues) == 0,
            'issues': issues,
            'equipment_status': equipment_status,
            'required_equipment': list(required_equipment)
        }
    
    @classmethod
    def validate_comprehensive_compliance(cls, vehicle: Vehicle, adr_classes: List[str] = None) -> Dict:
        """Perform comprehensive ADR compliance validation"""
        if adr_classes is None:
            adr_classes = ['ALL_CLASSES']
        
        # Validate fire extinguisher compliance
        fire_extinguisher_result = cls.validate_fire_extinguisher_compliance(vehicle)
        
        # Validate general equipment requirements
        equipment_result = cls.validate_equipment_for_adr_classes(vehicle, adr_classes)
        
        # Combine results
        all_issues = fire_extinguisher_result['issues'] + equipment_result['issues']
        
        return {
            'vehicle_id': vehicle.id,
            'vehicle_registration': vehicle.registration_number,
            'adr_classes': adr_classes,
            'compliant': len(all_issues) == 0,
            'issues': all_issues,
            'fire_extinguisher_compliance': fire_extinguisher_result,
            'equipment_compliance': equipment_result,
            'validation_timestamp': timezone.now()
        }


class SafetyEquipmentService:
    """Service for managing safety equipment lifecycle"""
    
    @staticmethod
    def create_equipment_with_initial_inspection(vehicle: Vehicle, equipment_type: SafetyEquipmentType,
                                               equipment_data: Dict, inspector=None) -> VehicleSafetyEquipment:
        """Create new safety equipment with initial inspection"""
        equipment = VehicleSafetyEquipment.objects.create(
            vehicle=vehicle,
            equipment_type=equipment_type,
            **equipment_data
        )
        
        # Create initial inspection
        if inspector:
            initial_inspection = SafetyEquipmentInspection.objects.create(
                equipment=equipment,
                inspection_type='CERTIFICATION',
                inspection_date=equipment.installation_date,
                inspector=inspector,
                result='PASSED',
                findings='Initial installation inspection',
                next_inspection_due=equipment.installation_date + timedelta(
                    days=equipment_type.inspection_interval_months * 30
                )
            )
            
            # Update equipment with next inspection date
            equipment.next_inspection_date = initial_inspection.next_inspection_due
            equipment.last_inspection_date = initial_inspection.inspection_date
            equipment.save()
        
        return equipment
    
    @staticmethod
    def schedule_upcoming_inspections(days_ahead: int = 30) -> List[Dict]:
        """Get equipment needing inspection in the next N days"""
        cutoff_date = timezone.now().date() + timedelta(days=days_ahead)
        
        equipment_due = VehicleSafetyEquipment.objects.filter(
            status='ACTIVE',
            next_inspection_date__lte=cutoff_date,
            next_inspection_date__gte=timezone.now().date()
        ).select_related('vehicle', 'equipment_type')
        
        inspection_schedule = []
        for equipment in equipment_due:
            inspection_schedule.append({
                'equipment_id': equipment.id,
                'vehicle': equipment.vehicle.registration_number,
                'equipment_type': equipment.equipment_type.name,
                'due_date': equipment.next_inspection_date,
                'days_until_due': (equipment.next_inspection_date - timezone.now().date()).days,
                'location': equipment.location_on_vehicle,
                'priority': 'HIGH' if equipment.next_inspection_date <= timezone.now().date() else 'MEDIUM'
            })
        
        return sorted(inspection_schedule, key=lambda x: x['due_date'])
    
    @staticmethod
    def get_expiring_equipment(days_ahead: int = 30) -> List[Dict]:
        """Get equipment expiring in the next N days"""
        cutoff_date = timezone.now().date() + timedelta(days=days_ahead)
        
        expiring_equipment = VehicleSafetyEquipment.objects.filter(
            status='ACTIVE',
            expiry_date__lte=cutoff_date,
            expiry_date__gte=timezone.now().date()
        ).select_related('vehicle', 'equipment_type')
        
        expiry_schedule = []
        for equipment in expiring_equipment:
            expiry_schedule.append({
                'equipment_id': equipment.id,
                'vehicle': equipment.vehicle.registration_number,
                'equipment_type': equipment.equipment_type.name,
                'expiry_date': equipment.expiry_date,
                'days_until_expiry': (equipment.expiry_date - timezone.now().date()).days,
                'serial_number': equipment.serial_number,
                'priority': 'CRITICAL' if equipment.expiry_date <= timezone.now().date() else 'HIGH'
            })
        
        return sorted(expiry_schedule, key=lambda x: x['expiry_date'])
    
    @staticmethod
    def generate_fleet_compliance_report(company_id: Optional[str] = None) -> Dict:
        """Generate comprehensive fleet safety compliance report"""
        vehicles = Vehicle.objects.all()
        if company_id:
            vehicles = vehicles.filter(owning_company_id=company_id)
        
        report = {
            'total_vehicles': vehicles.count(),
            'compliant_vehicles': 0,
            'non_compliant_vehicles': 0,
            'vehicles_without_equipment': 0,
            'compliance_summary': [],
            'critical_issues': [],
            'upcoming_expirations': SafetyEquipmentService.get_expiring_equipment(30),
            'upcoming_inspections': SafetyEquipmentService.schedule_upcoming_inspections(30),
            'generated_at': timezone.now()
        }
        
        for vehicle in vehicles:
            compliance_result = ADRComplianceValidator.validate_comprehensive_compliance(vehicle)
            
            vehicle_summary = {
                'vehicle_id': vehicle.id,
                'registration': vehicle.registration_number,
                'compliant': compliance_result['compliant'],
                'issue_count': len(compliance_result['issues']),
                'issues': compliance_result['issues']
            }
            
            if compliance_result['compliant']:
                report['compliant_vehicles'] += 1
            else:
                report['non_compliant_vehicles'] += 1
                
                # Add to critical issues if there are major problems
                if any('missing' in issue.lower() or 'expired' in issue.lower() 
                       for issue in compliance_result['issues']):
                    report['critical_issues'].append(vehicle_summary)
            
            # Check if vehicle has no equipment at all
            if not vehicle.safety_equipment.filter(status='ACTIVE').exists():
                report['vehicles_without_equipment'] += 1
            
            report['compliance_summary'].append(vehicle_summary)
        
        return report


def seed_standard_equipment_types():
    """Seed the database with standard ADR safety equipment types"""
    standard_equipment = [
        {
            'name': 'Fire Extinguisher (ABC Type)',
            'category': 'FIRE_EXTINGUISHER',
            'description': 'Multi-purpose fire extinguisher suitable for Class A, B, and C fires',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': True,
            'minimum_capacity': '2kg',
            'certification_standard': 'EN 3',
            'has_expiry_date': True,
            'inspection_interval_months': 12
        },
        {
            'name': 'First Aid Kit (Vehicle)',
            'category': 'FIRST_AID_KIT',
            'description': 'Comprehensive first aid kit for vehicle emergencies',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': False,
            'certification_standard': 'AS/NZS 2294',
            'has_expiry_date': True,
            'inspection_interval_months': 6
        },
        {
            'name': 'Chemical Spill Kit',
            'category': 'SPILL_KIT',
            'description': 'Chemical spill containment and cleanup kit',
            'required_for_adr_classes': ['CLASS_3', 'CLASS_8'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': True,
            'inspection_interval_months': 12
        },
        {
            'name': 'Emergency Chocks',
            'category': 'TOOLS',
            'description': 'Wheel chocks for emergency vehicle immobilization',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': False,
            'inspection_interval_months': 12
        },
        {
            'name': 'Personal Protective Equipment Set',
            'category': 'PROTECTIVE_EQUIPMENT',
            'description': 'Complete PPE set including safety vest, gloves, and safety glasses',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': True,
            'inspection_interval_months': 6
        }
    ]
    
    created_count = 0
    for equipment_data in standard_equipment:
        equipment_type, created = SafetyEquipmentType.objects.get_or_create(
            name=equipment_data['name'],
            defaults=equipment_data
        )
        if created:
            created_count += 1
    
    return created_count
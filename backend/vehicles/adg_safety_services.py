# vehicles/adg_safety_services.py

"""
ADG (Australian Dangerous Goods) safety equipment services for compliance validation.

This module contains business logic for validating vehicle safety equipment
compliance with ADG Code 7.9 regulations and Australian dangerous goods transport requirements.
Converts the existing ADR-based system to Australian standards.
"""

from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from .models import (
    Vehicle, SafetyEquipmentType, VehicleSafetyEquipment,
    SafetyEquipmentInspection, SafetyEquipmentCertification
)


class ADGComplianceValidator:
    """Validator for ADG Code 7.9 compliance requirements"""
    
    # ADG Code 7.9 Table 12.1 & 12.2 fire extinguisher requirements by vehicle GVM
    FIRE_EXTINGUISHER_REQUIREMENTS = {
        'up_to_3_5t': {
            'total_capacity_kg': 2,
            'minimum_units': 1,
            'largest_unit_kg': None,
            'description': 'Minimum 2kg capacity fire extinguisher suitable for flammable liquids',
            'regulatory_reference': 'ADG Code 7.9 Table 12.1(a)'
        },
        '3_5_to_4_5t': {
            'total_capacity_kg': 4,
            'minimum_units': 1,
            'largest_unit_kg': None,
            'description': 'Minimum 4kg capacity fire extinguisher',
            'regulatory_reference': 'ADG Code 7.9 Table 12.1(b)'
        },
        '4_5_to_12t': {
            'total_capacity_kg': 4,
            'minimum_units': 2,
            'largest_unit_kg': None,
            'description': 'Two fire extinguishers with minimum total capacity of 4kg',
            'regulatory_reference': 'ADG Code 7.9 Table 12.1(c)'
        },
        'over_12t': {
            'total_capacity_kg': 8,
            'minimum_units': 2,
            'largest_unit_kg': 4,
            'description': 'Two fire extinguishers with minimum total capacity of 8kg, largest unit minimum 4kg',
            'regulatory_reference': 'ADG Code 7.9 Table 12.1(d)'
        }
    }
    
    # ADG Code 7.9 Table 12.2 additional equipment requirements by dangerous goods class
    STANDARD_EQUIPMENT_REQUIREMENTS = {
        'ALL_CLASSES': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information'
        ],
        'CLASS_1': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Non-Sparking Tools'
        ],
        'CLASS_2': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Gas Detection Equipment'
        ],
        'CLASS_3': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Spill Absorption Material'
        ],
        'CLASS_4': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Sand for Smothering',
            'Non-Sparking Tools'
        ],
        'CLASS_5': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Spill Absorption Material'
        ],
        'CLASS_6': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Spill Absorption Material',
            'Eye Wash Equipment'
        ],
        'CLASS_7': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Radiation Detection Equipment'
        ],
        'CLASS_8': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information',
            'Acid Spill Kit',
            'Eye Wash Equipment',
            'Chemical-Resistant Clothing'
        ],
        'CLASS_9': [
            'Fire Extinguisher (ABE Type)',
            'First Aid Kit (AS 2675)',
            'Emergency Equipment (Chocks)',
            'Personal Protective Equipment',
            'Emergency Information'
        ]
    }
    
    # ADG-specific vehicle categories based on Gross Vehicle Mass (GVM)
    @classmethod
    def get_vehicle_gvm_category(cls, capacity_kg: Optional[float]) -> str:
        """Determine vehicle GVM category for ADG requirements"""
        if not capacity_kg:
            return 'up_to_3_5t'  # Default to lowest category if unknown
        
        capacity_tonnes = capacity_kg / 1000
        
        if capacity_tonnes <= 3.5:
            return 'up_to_3_5t'
        elif capacity_tonnes <= 4.5:
            return '3_5_to_4_5t'
        elif capacity_tonnes <= 12:
            return '4_5_to_12t'
        else:
            return 'over_12t'
    
    @classmethod
    def validate_fire_extinguisher_compliance(cls, vehicle: Vehicle) -> Dict:
        """Validate fire extinguisher compliance per ADG Code 7.9 Table 12.1"""
        gvm_category = cls.get_vehicle_gvm_category(vehicle.capacity_kg)
        requirements = cls.FIRE_EXTINGUISHER_REQUIREMENTS[gvm_category]
        
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
            
            # Extract capacity from capacity field (e.g., "2kg", "4kg")
            try:
                capacity_str = extinguisher.capacity.lower().replace('kg', '').strip()
                capacity = float(capacity_str)
                total_capacity += capacity
                extinguisher_capacities.append(capacity)
            except (ValueError, AttributeError):
                issues.append(f"Fire extinguisher {extinguisher.serial_number} has invalid capacity format")
        
        # Check minimum number of units
        if len(extinguisher_capacities) < requirements['minimum_units']:
            issues.append(f"Minimum {requirements['minimum_units']} fire extinguisher(s) required per ADG Code 7.9, only {len(extinguisher_capacities)} found")
        
        # Check total capacity
        if total_capacity < requirements['total_capacity_kg']:
            issues.append(f"Total fire extinguisher capacity must be at least {requirements['total_capacity_kg']}kg per ADG Code 7.9, currently {total_capacity}kg")
        
        # Check largest unit requirement (for vehicles over 12t)
        if requirements['largest_unit_kg'] and extinguisher_capacities:
            largest_capacity = max(extinguisher_capacities)
            if largest_capacity < requirements['largest_unit_kg']:
                issues.append(f"Largest fire extinguisher must be at least {requirements['largest_unit_kg']}kg per ADG Code 7.9, currently {largest_capacity}kg")
        
        # ADG-specific requirement: Fire extinguisher must be suitable for flammable liquids
        for extinguisher in fire_extinguishers:
            if extinguisher.is_compliant and 'ABE' not in extinguisher.equipment_type.name:
                issues.append(f"Fire extinguisher {extinguisher.serial_number} must be ABE type per ADG Code 7.9")
        
        return {
            'compliant': len(issues) == 0,
            'issues': issues,
            'current_capacity': total_capacity,
            'required_capacity': requirements['total_capacity_kg'],
            'unit_count': len(extinguisher_capacities),
            'gvm_category': gvm_category,
            'requirements': requirements,
            'regulatory_reference': requirements['regulatory_reference']
        }
    
    @classmethod
    def validate_equipment_for_adg_classes(cls, vehicle: Vehicle, adg_classes: List[str]) -> Dict:
        """Validate equipment requirements for specific ADG dangerous goods classes"""
        issues = []
        equipment_status = {}
        
        # Combine requirements for all specified ADG classes
        required_equipment = set()
        
        # Add base requirements for all dangerous goods
        required_equipment.update(cls.STANDARD_EQUIPMENT_REQUIREMENTS['ALL_CLASSES'])
        
        # Add class-specific requirements
        for adg_class in adg_classes:
            class_key = f'CLASS_{adg_class}' if not adg_class.startswith('CLASS_') else adg_class
            if class_key in cls.STANDARD_EQUIPMENT_REQUIREMENTS:
                required_equipment.update(cls.STANDARD_EQUIPMENT_REQUIREMENTS[class_key])
        
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
                        'equipment': vehicle_equipment,
                        'adg_compliant': cls._check_adg_specific_requirements(equipment_name, vehicle_equipment)
                    }
                    break
                elif vehicle_equipment:
                    equipment_status[equipment_name] = {
                        'status': 'non_compliant',
                        'equipment': vehicle_equipment,
                        'issue': 'expired' if vehicle_equipment.is_expired else 'inspection_due',
                        'adg_compliant': False
                    }
            
            if not found_compliant:
                if equipment_name not in equipment_status:
                    issues.append(f"Missing required ADG equipment: {equipment_name}")
                    equipment_status[equipment_name] = {
                        'status': 'missing',
                        'equipment': None,
                        'adg_compliant': False
                    }
                else:
                    issues.append(f"Non-compliant ADG equipment: {equipment_name}")
        
        return {
            'compliant': len(issues) == 0,
            'issues': issues,
            'equipment_status': equipment_status,
            'required_equipment': list(required_equipment),
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        }
    
    @classmethod
    def _check_adg_specific_requirements(cls, equipment_name: str, equipment: VehicleSafetyEquipment) -> bool:
        """Check ADG-specific requirements for equipment"""
        # ADG-specific checks
        if 'Fire Extinguisher' in equipment_name:
            return 'ABE' in equipment.equipment_type.name
        elif 'First Aid Kit' in equipment_name:
            return 'AS 2675' in equipment.equipment_type.certification_standard or 'AS 2675' in equipment.equipment_type.description
        elif 'Eye Wash' in equipment_name:
            return equipment.equipment_type.certification_standard and ('AS' in equipment.equipment_type.certification_standard or 'ANSI' in equipment.equipment_type.certification_standard)
        
        return True  # Default to compliant for other equipment
    
    @classmethod
    def validate_comprehensive_adg_compliance(cls, vehicle: Vehicle, adg_classes: List[str] = None) -> Dict:
        """Perform comprehensive ADG Code 7.9 compliance validation"""
        if adg_classes is None:
            adg_classes = ['ALL_CLASSES']
        
        # Validate fire extinguisher compliance
        fire_extinguisher_result = cls.validate_fire_extinguisher_compliance(vehicle)
        
        # Validate general equipment requirements
        equipment_result = cls.validate_equipment_for_adg_classes(vehicle, adg_classes)
        
        # ADG-specific additional checks
        additional_checks = cls._perform_adg_specific_checks(vehicle, adg_classes)
        
        # Combine results
        all_issues = (fire_extinguisher_result['issues'] + 
                     equipment_result['issues'] + 
                     additional_checks['issues'])
        
        return {
            'vehicle_id': vehicle.id,
            'vehicle_registration': vehicle.registration_number,
            'adg_classes': adg_classes,
            'compliant': len(all_issues) == 0,
            'issues': all_issues,
            'fire_extinguisher_compliance': fire_extinguisher_result,
            'equipment_compliance': equipment_result,
            'adg_specific_checks': additional_checks,
            'validation_timestamp': timezone.now(),
            'regulatory_framework': 'ADG Code 7.9',
            'compliance_level': cls._determine_compliance_level(all_issues)
        }
    
    @classmethod
    def _perform_adg_specific_checks(cls, vehicle: Vehicle, adg_classes: List[str]) -> Dict:
        """Perform ADG-specific compliance checks beyond standard equipment"""
        issues = []
        checks = {}
        
        # Check for Australian Standards compliance
        first_aid_kits = vehicle.safety_equipment.filter(
            equipment_type__category='FIRST_AID_KIT',
            status='ACTIVE'
        )
        
        if first_aid_kits.exists():
            for kit in first_aid_kits:
                if not ('AS 2675' in kit.equipment_type.certification_standard or 
                       'AS 2675' in kit.equipment_type.description):
                    issues.append(f"First aid kit must comply with AS 2675 (Australian Standard)")
        
        # Check for proper equipment mounting and accessibility
        fire_extinguishers = vehicle.safety_equipment.filter(
            equipment_type__category='FIRE_EXTINGUISHER',
            status='ACTIVE'
        )
        
        for extinguisher in fire_extinguishers:
            if not extinguisher.location_on_vehicle:
                issues.append(f"Fire extinguisher {extinguisher.serial_number} location not specified - must be readily accessible")
        
        # Class-specific ADG checks
        if '3' in adg_classes or 'CLASS_3' in adg_classes:
            spill_kits = vehicle.safety_equipment.filter(
                equipment_type__category='SPILL_KIT',
                status='ACTIVE'
            )
            if not spill_kits.exists():
                issues.append("Class 3 dangerous goods require spill absorption material per ADG Code 7.9")
        
        if '8' in adg_classes or 'CLASS_8' in adg_classes:
            eye_wash = vehicle.safety_equipment.filter(
                equipment_type__name__icontains='Eye Wash',
                status='ACTIVE'
            )
            if not eye_wash.exists():
                issues.append("Class 8 corrosives require eye wash equipment per ADG Code 7.9")
        
        checks = {
            'australian_standards_compliance': len([i for i in issues if 'AS ' in i]) == 0,
            'equipment_accessibility': len([i for i in issues if 'location' in i]) == 0,
            'class_specific_requirements': len([i for i in issues if 'Class' in i]) == 0
        }
        
        return {
            'compliant': len(issues) == 0,
            'issues': issues,
            'checks_performed': checks,
            'regulatory_reference': 'ADG Code 7.9 Chapter 12'
        }
    
    @classmethod
    def _determine_compliance_level(cls, issues: List[str]) -> str:
        """Determine overall compliance level based on issues"""
        if not issues:
            return 'FULLY_COMPLIANT'
        
        critical_keywords = ['missing', 'expired', 'AS 2675', 'ABE type']
        critical_issues = [issue for issue in issues 
                          if any(keyword.lower() in issue.lower() for keyword in critical_keywords)]
        
        if critical_issues:
            return 'NON_COMPLIANT'
        elif len(issues) <= 2:
            return 'MINOR_ISSUES'
        else:
            return 'MAJOR_ISSUES'


class ADGSafetyEquipmentService:
    """Service for managing ADG-compliant safety equipment lifecycle"""
    
    @staticmethod
    def create_adg_compliant_equipment(vehicle: Vehicle, equipment_type: SafetyEquipmentType,
                                      equipment_data: Dict, inspector=None) -> VehicleSafetyEquipment:
        """Create new ADG-compliant safety equipment with initial certification"""
        
        # Ensure ADG compliance requirements are met
        if equipment_type.category == 'FIRE_EXTINGUISHER':
            if 'ABE' not in equipment_type.name:
                raise ValueError("Fire extinguishers must be ABE type for ADG compliance")
        
        equipment = VehicleSafetyEquipment.objects.create(
            vehicle=vehicle,
            equipment_type=equipment_type,
            **equipment_data
        )
        
        # Create initial ADG certification inspection
        if inspector:
            initial_inspection = SafetyEquipmentInspection.objects.create(
                equipment=equipment,
                inspection_type='CERTIFICATION',
                inspection_date=equipment.installation_date,
                inspector=inspector,
                result='PASSED',
                findings=f'Initial ADG Code 7.9 compliance certification - {equipment_type.name}',
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
    def generate_adg_fleet_compliance_report(company_id: Optional[str] = None) -> Dict:
        """Generate comprehensive ADG fleet safety compliance report"""
        vehicles = Vehicle.objects.all()
        if company_id:
            vehicles = vehicles.filter(owning_company_id=company_id)
        
        report = {
            'total_vehicles': vehicles.count(),
            'adg_compliant_vehicles': 0,
            'non_compliant_vehicles': 0,
            'vehicles_without_equipment': 0,
            'compliance_by_level': {
                'FULLY_COMPLIANT': 0,
                'MINOR_ISSUES': 0,
                'MAJOR_ISSUES': 0,
                'NON_COMPLIANT': 0
            },
            'compliance_summary': [],
            'critical_issues': [],
            'australian_standards_compliance': 0,
            'upcoming_adg_inspections': ADGSafetyEquipmentService.get_upcoming_adg_inspections(30),
            'generated_at': timezone.now(),
            'regulatory_framework': 'Australian Dangerous Goods Code 7.9'
        }
        
        for vehicle in vehicles:
            compliance_result = ADGComplianceValidator.validate_comprehensive_adg_compliance(vehicle)
            
            vehicle_summary = {
                'vehicle_id': vehicle.id,
                'registration': vehicle.registration_number,
                'gvm_category': ADGComplianceValidator.get_vehicle_gvm_category(vehicle.capacity_kg),
                'compliant': compliance_result['compliant'],
                'compliance_level': compliance_result['compliance_level'],
                'issue_count': len(compliance_result['issues']),
                'issues': compliance_result['issues'],
                'adg_specific_issues': compliance_result['adg_specific_checks']['issues']
            }
            
            # Count by compliance level
            report['compliance_by_level'][compliance_result['compliance_level']] += 1
            
            if compliance_result['compliant']:
                report['adg_compliant_vehicles'] += 1
            else:
                report['non_compliant_vehicles'] += 1
                
                # Add to critical issues if there are major problems
                if compliance_result['compliance_level'] in ['NON_COMPLIANT', 'MAJOR_ISSUES']:
                    report['critical_issues'].append(vehicle_summary)
            
            # Check if vehicle has no equipment at all
            if not vehicle.safety_equipment.filter(status='ACTIVE').exists():
                report['vehicles_without_equipment'] += 1
            
            # Check Australian Standards compliance
            if compliance_result['adg_specific_checks']['checks_performed']['australian_standards_compliance']:
                report['australian_standards_compliance'] += 1
            
            report['compliance_summary'].append(vehicle_summary)
        
        return report
    
    @staticmethod
    def get_upcoming_adg_inspections(days_ahead: int = 30) -> List[Dict]:
        """Get ADG equipment needing inspection in the next N days"""
        cutoff_date = timezone.now().date() + timedelta(days=days_ahead)
        
        equipment_due = VehicleSafetyEquipment.objects.filter(
            status='ACTIVE',
            next_inspection_date__lte=cutoff_date,
            next_inspection_date__gte=timezone.now().date()
        ).select_related('vehicle', 'equipment_type')
        
        inspection_schedule = []
        for equipment in equipment_due:
            adg_compliance = ADGComplianceValidator._check_adg_specific_requirements(
                equipment.equipment_type.name, equipment
            )
            
            inspection_schedule.append({
                'equipment_id': equipment.id,
                'vehicle': equipment.vehicle.registration_number,
                'equipment_type': equipment.equipment_type.name,
                'due_date': equipment.next_inspection_date,
                'days_until_due': (equipment.next_inspection_date - timezone.now().date()).days,
                'location': equipment.location_on_vehicle,
                'adg_compliant': adg_compliance,
                'priority': 'CRITICAL' if equipment.next_inspection_date <= timezone.now().date() else 'HIGH',
                'regulatory_framework': 'ADG Code 7.9'
            })
        
        return sorted(inspection_schedule, key=lambda x: x['due_date'])


def setup_adg_equipment_types():
    """Set up ADG Code 7.9 compliant safety equipment types"""
    adg_equipment = [
        {
            'name': 'Fire Extinguisher (ABE Type)',
            'category': 'FIRE_EXTINGUISHER',
            'description': 'ABE type fire extinguisher suitable for Class A, B, and E fires per ADG Code 7.9',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': True,
            'minimum_capacity': '2kg',
            'certification_standard': 'AS/NZS 1841.1',
            'has_expiry_date': True,
            'inspection_interval_months': 6,
            'regulatory_reference': 'ADG Code 7.9 Table 12.1'
        },
        {
            'name': 'First Aid Kit (AS 2675)',
            'category': 'FIRST_AID_KIT',
            'description': 'Workplace first aid kit compliant with Australian Standard AS 2675',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': False,
            'certification_standard': 'AS 2675',
            'has_expiry_date': True,
            'inspection_interval_months': 3,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        },
        {
            'name': 'Spill Absorption Material',
            'category': 'SPILL_KIT',
            'description': 'Absorbent material for liquid spill containment',
            'required_for_adr_classes': ['CLASS_3', 'CLASS_5'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': False,
            'inspection_interval_months': 12,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        },
        {
            'name': 'Acid Spill Kit',
            'category': 'SPILL_KIT',
            'description': 'Chemical spill containment kit for corrosive substances',
            'required_for_adr_classes': ['CLASS_8'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': True,
            'inspection_interval_months': 12,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        },
        {
            'name': 'Emergency Chocks',
            'category': 'TOOLS',
            'description': 'Wheel chocks for emergency vehicle immobilization',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': False,
            'inspection_interval_months': 12,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        },
        {
            'name': 'Personal Protective Equipment Set',
            'category': 'PROTECTIVE_EQUIPMENT',
            'description': 'PPE set including safety vest, gloves, and safety glasses per Australian standards',
            'required_for_adr_classes': ['ALL_CLASSES'],
            'required_by_vehicle_weight': False,
            'certification_standard': 'AS/NZS 1337, AS/NZS 2161',
            'has_expiry_date': True,
            'inspection_interval_months': 6,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        },
        {
            'name': 'Eye Wash Equipment',
            'category': 'EMERGENCY_STOP',
            'description': 'Portable eye wash station for chemical splash emergencies',
            'required_for_adr_classes': ['CLASS_6', 'CLASS_8'],
            'required_by_vehicle_weight': False,
            'certification_standard': 'ANSI Z358.1',
            'has_expiry_date': True,
            'inspection_interval_months': 6,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        },
        {
            'name': 'Non-Sparking Tools',
            'category': 'TOOLS',
            'description': 'Non-sparking tools for explosive materials handling',
            'required_for_adr_classes': ['CLASS_1', 'CLASS_4'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': False,
            'inspection_interval_months': 12,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        },
        {
            'name': 'Sand for Smothering',
            'category': 'SPILL_KIT',
            'description': 'Dry sand for smothering spontaneously combustible materials',
            'required_for_adr_classes': ['CLASS_4'],
            'required_by_vehicle_weight': False,
            'has_expiry_date': False,
            'inspection_interval_months': 12,
            'regulatory_reference': 'ADG Code 7.9 Table 12.2'
        }
    ]
    
    created_count = 0
    for equipment_data in adg_equipment:
        equipment_type, created = SafetyEquipmentType.objects.get_or_create(
            name=equipment_data['name'],
            defaults=equipment_data
        )
        if created:
            created_count += 1
    
    return created_count
# shipments/driver_qualification_service.py

import logging
from typing import Dict, List, Optional, Tuple
from django.contrib.auth import get_user_model
from django.utils import timezone

from training.adg_driver_qualifications import DriverQualificationService
from dangerous_goods.models import DangerousGood

logger = logging.getLogger(__name__)

User = get_user_model()


class ShipmentDriverQualificationService:
    """
    Service for validating driver qualifications when assigning drivers to shipments.
    Integrates with the training system to ensure only qualified drivers are assigned.
    """
    
    @staticmethod
    def validate_driver_for_shipment(driver: User, shipment) -> Dict:
        """
        Comprehensive validation of driver qualifications for a specific shipment.
        
        Args:
            driver: User object with role='DRIVER'
            shipment: Shipment object with dangerous goods items
            
        Returns:
            Dict containing validation results, qualifications, and recommendations
        """
        
        # Extract dangerous goods classes from shipment
        dangerous_goods_classes = ShipmentDriverQualificationService._extract_dg_classes_from_shipment(shipment)
        
        # If no dangerous goods, basic validation only
        if not dangerous_goods_classes:
            return ShipmentDriverQualificationService._validate_non_dg_shipment(driver, shipment)
        
        # Full dangerous goods qualification validation
        return ShipmentDriverQualificationService._validate_dg_shipment(driver, shipment, dangerous_goods_classes)
    
    @staticmethod
    def _extract_dg_classes_from_shipment(shipment) -> List[str]:
        """Extract unique dangerous goods classes from shipment items"""
        dangerous_goods_classes = []
        
        for item in shipment.items.filter(is_dangerous_good=True):
            if item.dangerous_good_entry and item.dangerous_good_entry.hazard_class:
                # Extract main hazard class (e.g., "3" from "3.1")
                hazard_class = item.dangerous_good_entry.hazard_class.split('.')[0]
                if hazard_class not in dangerous_goods_classes:
                    dangerous_goods_classes.append(hazard_class)
        
        return dangerous_goods_classes
    
    @staticmethod
    def _validate_non_dg_shipment(driver: User, shipment) -> Dict:
        """Validate driver for non-dangerous goods shipment"""
        
        validation_result = {
            'validation_type': 'NON_DANGEROUS_GOODS',
            'driver_id': driver.id,
            'driver_name': driver.get_full_name(),
            'overall_qualified': True,
            'qualification_level': 'BASIC',
            'dangerous_goods_classes': [],
            'critical_issues': [],
            'warnings': [],
            'recommendations': [],
            'validation_details': {
                'basic_requirements': {
                    'has_valid_license': False,
                    'license_appropriate': False,
                    'no_suspensions': True
                }
            }
        }
        
        try:
            # Check basic driver license requirements
            from training.adg_driver_qualifications import DriverLicense
            
            active_licenses = driver.driver_licenses.filter(
                status__in=[DriverLicense.LicenseStatus.VALID, DriverLicense.LicenseStatus.EXPIRING_SOON]
            )
            
            if active_licenses.exists():
                validation_result['validation_details']['basic_requirements']['has_valid_license'] = True
                
                # Check if license class is appropriate for freight
                freight_licenses = active_licenses.filter(
                    license_class__in=['LR', 'MR', 'HR', 'HC', 'MC']  # Commercial license classes
                )
                
                if freight_licenses.exists():
                    validation_result['validation_details']['basic_requirements']['license_appropriate'] = True
                else:
                    validation_result['warnings'].append(
                        "Driver only has basic license (Class C). Consider upgrading for commercial freight."
                    )
                
                # Check for expiring licenses
                expiring_licenses = active_licenses.filter(
                    status=DriverLicense.LicenseStatus.EXPIRING_SOON
                )
                
                for license in expiring_licenses:
                    validation_result['warnings'].append(
                        f"Driver license {license.license_number} expires on {license.expiry_date}"
                    )
            else:
                validation_result['overall_qualified'] = False
                validation_result['critical_issues'].append("No valid driver license found")
        
        except Exception as e:
            logger.error(f"Error validating non-DG driver {driver.id}: {str(e)}")
            validation_result['warnings'].append("Unable to fully validate driver license status")
        
        return validation_result
    
    @staticmethod
    def _validate_dg_shipment(driver: User, shipment, dangerous_goods_classes: List[str]) -> Dict:
        """Validate driver for dangerous goods shipment using training qualification service"""
        
        try:
            # Use the existing DriverQualificationService for comprehensive validation
            base_validation = DriverQualificationService.validate_driver_for_shipment(
                driver, dangerous_goods_classes
            )
            
            # Enhance with shipment-specific information
            validation_result = {
                'validation_type': 'DANGEROUS_GOODS',
                'driver_id': base_validation['driver_id'],
                'driver_name': base_validation['driver_name'],
                'overall_qualified': base_validation['overall_qualified'],
                'qualification_level': 'DANGEROUS_GOODS' if base_validation['overall_qualified'] else 'INSUFFICIENT',
                'dangerous_goods_classes': dangerous_goods_classes,
                'compliance_percentage': base_validation['compliance_percentage'],
                'overall_status': base_validation['overall_status'],
                'critical_issues': base_validation['critical_issues'],
                'warnings': base_validation['warnings'],
                'recommendations': [],
                'validation_details': {
                    'profile_issues': base_validation['profile_issues'],
                    'class_validations': base_validation['class_validations'],
                    'shipment_items': ShipmentDriverQualificationService._get_shipment_dg_details(shipment)
                }
            }
            
            # Add shipment-specific recommendations
            validation_result['recommendations'] = ShipmentDriverQualificationService._generate_recommendations(
                validation_result, shipment
            )
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating DG driver {driver.id} for shipment {shipment.id}: {str(e)}")
            
            # Return error state
            return {
                'validation_type': 'DANGEROUS_GOODS',
                'driver_id': driver.id,
                'driver_name': driver.get_full_name(),
                'overall_qualified': False,
                'qualification_level': 'VALIDATION_ERROR',
                'dangerous_goods_classes': dangerous_goods_classes,
                'critical_issues': ['Unable to validate driver qualifications due to system error'],
                'warnings': [f'Validation error: {str(e)}'],
                'recommendations': ['Please contact system administrator'],
                'validation_details': {}
            }
    
    @staticmethod
    def _get_shipment_dg_details(shipment) -> List[Dict]:
        """Get detailed dangerous goods information from shipment items"""
        dg_details = []
        
        for item in shipment.items.filter(is_dangerous_good=True):
            if item.dangerous_good_entry:
                dg_details.append({
                    'item_id': item.id,
                    'description': item.description,
                    'un_number': item.dangerous_good_entry.un_number,
                    'proper_shipping_name': item.dangerous_good_entry.proper_shipping_name,
                    'hazard_class': item.dangerous_good_entry.hazard_class,
                    'packing_group': getattr(item.dangerous_good_entry, 'packing_group', None),
                    'quantity': item.quantity,
                    'weight_kg': float(item.weight_kg) if item.weight_kg else None,
                    'volume_l': float(item.volume_l) if item.volume_l else None
                })
        
        return dg_details
    
    @staticmethod
    def _generate_recommendations(validation_result: Dict, shipment) -> List[str]:
        """Generate actionable recommendations based on validation results"""
        recommendations = []
        
        if not validation_result['overall_qualified']:
            recommendations.append("Driver is not qualified for this dangerous goods shipment")
            
            # Specific recommendations based on missing qualifications
            for dg_class, class_validation in validation_result['validation_details']['class_validations'].items():
                if not class_validation['qualified']:
                    recommendations.append(f"Driver needs Class {dg_class} dangerous goods training")
            
            recommendations.append("Consider assigning a qualified driver or providing additional training")
        
        elif validation_result['warnings']:
            # Driver is qualified but has warnings
            recommendations.append("Driver is qualified but requires attention:")
            
            if any('expires' in warning.lower() for warning in validation_result['warnings']):
                recommendations.append("Schedule license/certificate renewal before assignment")
            
            recommendations.append("Monitor compliance status regularly")
        
        else:
            # Driver is fully qualified
            recommendations.append("Driver is fully qualified for this shipment")
            recommendations.append("No additional actions required")
        
        return recommendations
    
    @staticmethod
    def get_qualified_drivers_for_shipment(shipment) -> List[Dict]:
        """
        Get list of all drivers qualified for a specific shipment.
        
        Args:
            shipment: Shipment object
            
        Returns:
            List of qualified drivers with their qualification details
        """
        
        dangerous_goods_classes = ShipmentDriverQualificationService._extract_dg_classes_from_shipment(shipment)
        
        if not dangerous_goods_classes:
            # For non-DG shipments, get all drivers with valid licenses
            return ShipmentDriverQualificationService._get_qualified_non_dg_drivers()
        
        # For DG shipments, use the training service
        try:
            qualified_drivers = DriverQualificationService.get_qualified_drivers_for_classes(
                dangerous_goods_classes
            )
            
            result = []
            for driver_info in qualified_drivers:
                driver_data = {
                    'driver_id': driver_info['driver'].id,
                    'driver_name': driver_info['driver'].get_full_name(),
                    'email': driver_info['driver'].email,
                    'phone': getattr(driver_info['driver'], 'phone', None),
                    'overall_qualified': driver_info['validation_result']['overall_qualified'],
                    'compliance_percentage': driver_info['validation_result']['compliance_percentage'],
                    'qualified_classes': driver_info['validation_result']['class_validations'],
                    'warnings': driver_info['validation_result']['warnings'],
                    'dangerous_goods_classes': dangerous_goods_classes
                }
                result.append(driver_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting qualified drivers for shipment {shipment.id}: {str(e)}")
            return []
    
    @staticmethod
    def _get_qualified_non_dg_drivers() -> List[Dict]:
        """Get drivers qualified for non-dangerous goods shipments"""
        
        try:
            from training.adg_driver_qualifications import DriverLicense
            
            # Get drivers with valid licenses
            drivers_with_licenses = User.objects.filter(
                role='DRIVER',
                is_active=True,
                driver_licenses__status__in=[
                    DriverLicense.LicenseStatus.VALID,
                    DriverLicense.LicenseStatus.EXPIRING_SOON
                ]
            ).distinct()
            
            result = []
            for driver in drivers_with_licenses:
                result.append({
                    'driver_id': driver.id,
                    'driver_name': driver.get_full_name(),
                    'email': driver.email,
                    'phone': getattr(driver, 'phone', None),
                    'overall_qualified': True,
                    'compliance_percentage': 100.0,
                    'qualified_classes': {},
                    'warnings': [],
                    'dangerous_goods_classes': []
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting qualified non-DG drivers: {str(e)}")
            return []
    
    @staticmethod
    def can_driver_be_assigned(driver: User, shipment, strict_mode: bool = True) -> Tuple[bool, List[str]]:
        """
        Quick check if driver can be assigned to shipment.
        
        Args:
            driver: Driver to check
            shipment: Shipment to assign to
            strict_mode: If True, requires full compliance; if False, allows warnings
            
        Returns:
            Tuple of (can_assign: bool, blocking_issues: List[str])
        """
        
        validation_result = ShipmentDriverQualificationService.validate_driver_for_shipment(driver, shipment)
        
        if not validation_result['overall_qualified']:
            return False, validation_result['critical_issues']
        
        if strict_mode and validation_result['warnings']:
            # In strict mode, warnings also block assignment
            return False, validation_result['warnings']
        
        return True, []
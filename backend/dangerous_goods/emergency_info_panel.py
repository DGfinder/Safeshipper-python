# dangerous_goods/emergency_info_panel.py

import json
from typing import Dict, List, Optional
from django.utils import timezone
from django.db import models
from django.utils.translation import gettext_lazy as _

from .models import DangerousGood, DigitalPlacard, PlacardRequirement
from users.models import User


class EmergencyContact(models.Model):
    """
    Emergency contact information for Emergency Information Panels (EIP).
    Stores 24/7 emergency response contacts as required by ADG Code.
    """
    
    class ContactType(models.TextChoices):
        COMPANY_EMERGENCY = 'COMPANY_EMERGENCY', _('Company Emergency Contact')
        CHEMTREC = 'CHEMTREC', _('CHEMTREC (Chemical Transportation Emergency Center)')
        FIRE_RESCUE = 'FIRE_RESCUE', _('Fire & Rescue Service')
        POLICE = 'POLICE', _('Police')
        POISON_CONTROL = 'POISON_CONTROL', _('Poison Control Center')
        TRANSPORT_EMERGENCY = 'TRANSPORT_EMERGENCY', _('Transport Emergency Service')
        REGIONAL_AUTHORITY = 'REGIONAL_AUTHORITY', _('Regional Emergency Authority')
    
    contact_type = models.CharField(
        _("Contact Type"),
        max_length=25,
        choices=ContactType.choices
    )
    
    organization_name = models.CharField(
        _("Organization Name"),
        max_length=200
    )
    
    contact_name = models.CharField(
        _("Contact Person"),
        max_length=200,
        blank=True,
        help_text=_("Specific person or department name")
    )
    
    phone_number = models.CharField(
        _("Phone Number"),
        max_length=50,
        help_text=_("24/7 emergency phone number")
    )
    
    alternative_phone = models.CharField(
        _("Alternative Phone"),
        max_length=50,
        blank=True,
        help_text=_("Backup emergency phone number")
    )
    
    # Geographic coverage
    coverage_area = models.CharField(
        _("Coverage Area"),
        max_length=200,
        blank=True,
        help_text=_("Geographic area this contact covers (e.g., 'Australia', 'NSW', 'Sydney Metro')")
    )
    
    # Specialized capabilities
    hazard_classes_covered = models.JSONField(
        _("Hazard Classes Covered"),
        default=list,
        help_text=_("List of hazard classes this contact specializes in")
    )
    
    # Contact availability
    is_24_7_available = models.BooleanField(
        _("24/7 Available"),
        default=True,
        help_text=_("Available 24 hours, 7 days a week")
    )
    
    # Priority for selection
    priority = models.PositiveIntegerField(
        _("Priority"),
        default=100,
        help_text=_("Priority for automatic selection (lower = higher priority)")
    )
    
    # Additional information
    language_support = models.CharField(
        _("Language Support"),
        max_length=200,
        default="English",
        help_text=_("Languages supported by this emergency contact")
    )
    
    notes = models.TextField(
        _("Notes"),
        blank=True,
        help_text=_("Additional information about this emergency contact")
    )
    
    # Status
    is_active = models.BooleanField(
        _("Is Active"),
        default=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Emergency Contact")
        verbose_name_plural = _("Emergency Contacts")
        ordering = ['priority', 'contact_type', 'organization_name']
        indexes = [
            models.Index(fields=['contact_type', 'is_active']),
            models.Index(fields=['priority', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.organization_name} ({self.get_contact_type_display()}) - {self.phone_number}"
    
    def covers_hazard_class(self, hazard_class: str) -> bool:
        """Check if this contact covers a specific hazard class."""
        if not self.hazard_classes_covered:
            return True  # If no specific classes listed, assume covers all
        return hazard_class in self.hazard_classes_covered


class EmergencyProcedure(models.Model):
    """
    Emergency response procedures for specific dangerous goods or hazard classes.
    Used in Emergency Information Panels to provide immediate response guidance.
    """
    
    class ProcedureType(models.TextChoices):
        IMMEDIATE_ACTION = 'IMMEDIATE_ACTION', _('Immediate Actions')
        FIRE_RESPONSE = 'FIRE_RESPONSE', _('Fire Response')
        SPILL_RESPONSE = 'SPILL_RESPONSE', _('Spill Response')
        EXPOSURE_RESPONSE = 'EXPOSURE_RESPONSE', _('Exposure Response')
        EVACUATION = 'EVACUATION', _('Evacuation Procedures')
        MEDICAL_RESPONSE = 'MEDICAL_RESPONSE', _('Medical Response')
        CONTAINMENT = 'CONTAINMENT', _('Containment Procedures')
    
    # What this procedure applies to
    dangerous_good = models.ForeignKey(
        DangerousGood,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='emergency_procedures',
        help_text=_("Specific dangerous good this procedure applies to")
    )
    
    hazard_class = models.CharField(
        _("Hazard Class"),
        max_length=20,
        blank=True,
        help_text=_("Hazard class this procedure applies to (if not specific to one DG)")
    )
    
    procedure_type = models.CharField(
        _("Procedure Type"),
        max_length=25,
        choices=ProcedureType.choices
    )
    
    # Procedure content
    procedure_title = models.CharField(
        _("Procedure Title"),
        max_length=200
    )
    
    immediate_actions = models.JSONField(
        _("Immediate Actions"),
        default=list,
        help_text=_("List of immediate actions to take")
    )
    
    detailed_steps = models.JSONField(
        _("Detailed Steps"),
        default=list,
        help_text=_("Detailed step-by-step procedures")
    )
    
    ppe_requirements = models.JSONField(
        _("PPE Requirements"),
        default=list,
        help_text=_("Personal protective equipment required")
    )
    
    isolation_distances = models.JSONField(
        _("Isolation Distances"),
        default=dict,
        help_text=_("Isolation and evacuation distances for different scenarios")
    )
    
    # Medical information
    first_aid_measures = models.JSONField(
        _("First Aid Measures"),
        default=list,
        help_text=_("Basic first aid procedures")
    )
    
    # Special precautions
    special_precautions = models.JSONField(
        _("Special Precautions"),
        default=list,
        help_text=_("Special precautions and warnings")
    )
    
    # Regulatory reference
    regulatory_basis = models.CharField(
        _("Regulatory Basis"),
        max_length=200,
        blank=True,
        help_text=_("Reference to Emergency Response Guidebook or other authority")
    )
    
    # Priority and status
    priority = models.PositiveIntegerField(
        _("Priority"),
        default=100,
        help_text=_("Priority for display in EIP (lower = higher priority)")
    )
    
    is_active = models.BooleanField(
        _("Is Active"),
        default=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Emergency Procedure")
        verbose_name_plural = _("Emergency Procedures")
        ordering = ['priority', 'procedure_type']
        indexes = [
            models.Index(fields=['dangerous_good', 'procedure_type']),
            models.Index(fields=['hazard_class', 'procedure_type']),
            models.Index(fields=['priority', 'is_active']),
        ]
    
    def __str__(self):
        target = self.dangerous_good.un_number if self.dangerous_good else f"Class {self.hazard_class}"
        return f"{target} - {self.procedure_title} ({self.get_procedure_type_display()})"


class EIPGenerator:
    """
    Emergency Information Panel (EIP) generator for ADG Code 7.9 compliance.
    Creates comprehensive emergency information based on transported dangerous goods.
    """
    
    def __init__(self):
        pass
    
    def generate_eip_content(self, digital_placard: DigitalPlacard) -> Dict:
        """
        Generate Emergency Information Panel content for a digital placard.
        
        Args:
            digital_placard: DigitalPlacard instance for EIP
            
        Returns:
            Dict containing structured EIP content
        """
        # Get dangerous goods from placard
        dangerous_goods = list(digital_placard.dangerous_goods.all())
        
        if not dangerous_goods:
            return self._generate_empty_eip()
        
        # Generate EIP sections
        eip_content = {
            'placard_id': digital_placard.placard_id,
            'shipment_info': self._get_shipment_info(digital_placard),
            'dangerous_goods_summary': self._get_dg_summary(dangerous_goods),
            'emergency_contacts': self._get_emergency_contacts(dangerous_goods),
            'immediate_procedures': self._get_immediate_procedures(dangerous_goods),
            'hazard_information': self._get_hazard_information(dangerous_goods),
            'isolation_distances': self._get_isolation_distances(dangerous_goods),
            'fire_response': self._get_fire_response_procedures(dangerous_goods),
            'spill_response': self._get_spill_response_procedures(dangerous_goods),
            'medical_response': self._get_medical_response_procedures(dangerous_goods),
            'generated_at': timezone.now().isoformat(),
            'adg_version': '7.9'
        }
        
        return eip_content
    
    def _generate_empty_eip(self) -> Dict:
        """Generate empty EIP for placards without specific dangerous goods."""
        return {
            'dangerous_goods_summary': {'un_numbers': [], 'hazard_classes': []},
            'emergency_contacts': [],
            'immediate_procedures': ['Contact emergency services: 000'],
            'generated_at': timezone.now().isoformat()
        }
    
    def _get_shipment_info(self, digital_placard: DigitalPlacard) -> Dict:
        """Get basic shipment information for EIP header."""
        shipment = digital_placard.placard_requirement.shipment
        return {
            'tracking_number': shipment.tracking_number,
            'carrier': shipment.carrier.name if shipment.carrier else '',
            'origin': shipment.origin_location,
            'destination': shipment.destination_location
        }
    
    def _get_dg_summary(self, dangerous_goods: List[DangerousGood]) -> Dict:
        """Generate summary of dangerous goods for EIP header."""
        un_numbers = [dg.un_number for dg in dangerous_goods]
        hazard_classes = list(set(dg.hazard_class for dg in dangerous_goods))
        
        # Get primary shipping names (truncated for space)
        shipping_names = []
        for dg in dangerous_goods[:3]:  # Limit to first 3 for space
            name = dg.simplified_name or dg.proper_shipping_name
            if len(name) > 30:
                name = name[:27] + "..."
            shipping_names.append(f"{dg.un_number}: {name}")
        
        if len(dangerous_goods) > 3:
            shipping_names.append(f"+ {len(dangerous_goods) - 3} more")
        
        return {
            'un_numbers': un_numbers,
            'hazard_classes': sorted(hazard_classes),
            'shipping_names': shipping_names,
            'total_count': len(dangerous_goods)
        }
    
    def _get_emergency_contacts(self, dangerous_goods: List[DangerousGood]) -> List[Dict]:
        """Get relevant emergency contacts for the dangerous goods."""
        hazard_classes = set(dg.hazard_class for dg in dangerous_goods)
        
        # Get emergency contacts that cover these hazard classes
        contacts = EmergencyContact.objects.filter(
            is_active=True
        ).order_by('priority')
        
        emergency_contacts = []
        
        # Always include general emergency services
        emergency_contacts.append({
            'type': 'Emergency Services',
            'organization': 'Emergency Services',
            'phone': '000',
            'description': 'Fire, Police, Ambulance'
        })
        
        # Add specialized contacts
        for contact in contacts[:3]:  # Limit to top 3 for space
            if any(contact.covers_hazard_class(hc) for hc in hazard_classes):
                emergency_contacts.append({
                    'type': contact.get_contact_type_display(),
                    'organization': contact.organization_name,
                    'phone': contact.phone_number,
                    'description': contact.contact_name or contact.notes[:50] if contact.notes else ''
                })
        
        return emergency_contacts
    
    def _get_immediate_procedures(self, dangerous_goods: List[DangerousGood]) -> List[str]:
        """Get immediate action procedures for the dangerous goods."""
        procedures = set()
        
        # Add general immediate procedures
        procedures.add("STOP - Assess the situation")
        procedures.add("Call emergency services: 000")
        procedures.add("Evacuate area if necessary")
        procedures.add("Prevent ignition sources")
        
        # Get specific procedures for these dangerous goods
        for dg in dangerous_goods:
            dg_procedures = EmergencyProcedure.objects.filter(
                dangerous_good=dg,
                procedure_type=EmergencyProcedure.ProcedureType.IMMEDIATE_ACTION,
                is_active=True
            ).order_by('priority')
            
            for proc in dg_procedures:
                procedures.update(proc.immediate_actions[:2])  # Limit to prevent overcrowding
        
        return list(procedures)[:6]  # Limit to 6 most important
    
    def _get_hazard_information(self, dangerous_goods: List[DangerousGood]) -> Dict:
        """Get consolidated hazard information."""
        hazards = {}
        
        for dg in dangerous_goods:
            hazards[dg.hazard_class] = {
                'class_name': self._get_hazard_class_name(dg.hazard_class),
                'primary_hazard': self._get_primary_hazard_description(dg.hazard_class),
                'subsidiary_risks': dg.subsidiary_risks.split(',') if dg.subsidiary_risks else []
            }
        
        return hazards
    
    def _get_isolation_distances(self, dangerous_goods: List[DangerousGood]) -> Dict:
        """Get isolation and evacuation distances."""
        # Default distances - should be enhanced with specific ERG data
        distances = {
            'initial_isolation': '50m',
            'protective_action': '100m',
            'fire_evacuation': '300m'
        }
        
        # Enhance with specific dangerous goods data
        for dg in dangerous_goods:
            if dg.hazard_class in ['1.1', '1.2', '1.3']:  # Explosives
                distances['fire_evacuation'] = '800m'
                distances['protective_action'] = '500m'
            elif dg.hazard_class == '2.3':  # Toxic gas
                distances['protective_action'] = '300m'
                distances['initial_isolation'] = '100m'
        
        return distances
    
    def _get_fire_response_procedures(self, dangerous_goods: List[DangerousGood]) -> List[str]:
        """Get fire response procedures."""
        procedures = [
            "Call Fire & Rescue: 000",
            "Evacuate area immediately",
            "Cool containers with water from maximum distance"
        ]
        
        # Add class-specific fire procedures
        hazard_classes = set(dg.hazard_class for dg in dangerous_goods)
        
        if '2.1' in hazard_classes:  # Flammable gas
            procedures.extend([
                "Remove ignition sources if safe to do so",
                "Do not extinguish gas fire unless leak can be stopped"
            ])
        
        if '3' in hazard_classes:  # Flammable liquid
            procedures.extend([
                "Use foam, dry chemical, or CO2",
                "Do not use water jet directly on liquid"
            ])
        
        return procedures[:8]  # Limit for space
    
    def _get_spill_response_procedures(self, dangerous_goods: List[DangerousGood]) -> List[str]:
        """Get spill response procedures."""
        procedures = [
            "Stop leak if safe to do so",
            "Remove ignition sources",
            "Evacuate downwind areas"
        ]
        
        # Add specific spill procedures based on physical form and hazard class
        for dg in dangerous_goods:
            if dg.physical_form == 'LIQUID':
                procedures.extend([
                    "Contain spill with absorbent materials",
                    "Prevent entry to waterways"
                ])
            elif dg.physical_form == 'GAS':
                procedures.extend([
                    "Ventilate area",
                    "Monitor gas concentrations"
                ])
        
        return list(set(procedures))[:6]  # Remove duplicates and limit
    
    def _get_medical_response_procedures(self, dangerous_goods: List[DangerousGood]) -> List[str]:
        """Get medical response procedures."""
        procedures = [
            "Call ambulance: 000",
            "Remove person from exposure",
            "Begin first aid as appropriate"
        ]
        
        # Add specific medical procedures
        hazard_classes = set(dg.hazard_class for dg in dangerous_goods)
        
        if '8' in hazard_classes:  # Corrosive
            procedures.extend([
                "Flush affected area with water for 15 minutes",
                "Remove contaminated clothing"
            ])
        
        if '6.1' in hazard_classes:  # Toxic
            procedures.extend([
                "Monitor breathing and pulse",
                "Seek immediate medical attention"
            ])
        
        return procedures[:6]
    
    def _get_hazard_class_name(self, hazard_class: str) -> str:
        """Get descriptive name for hazard class."""
        class_names = {
            '1.1': 'Explosives (Mass Explosion)',
            '1.2': 'Explosives (Projection)',
            '1.3': 'Explosives (Fire)',
            '1.4': 'Explosives (Minor)',
            '1.5': 'Explosives (Insensitive)',
            '1.6': 'Explosives (Extremely Insensitive)',
            '2.1': 'Flammable Gas',
            '2.2': 'Non-Flammable Gas',
            '2.3': 'Toxic Gas',
            '3': 'Flammable Liquid',
            '4.1': 'Flammable Solid',
            '4.2': 'Spontaneously Combustible',
            '4.3': 'Dangerous When Wet',
            '5.1': 'Oxidizing Agent',
            '5.2': 'Organic Peroxide',
            '6.1': 'Toxic Substance',
            '6.2': 'Infectious Substance',
            '7': 'Radioactive Material',
            '8': 'Corrosive Substance',
            '9': 'Miscellaneous Dangerous Goods'
        }
        return class_names.get(hazard_class, f'Class {hazard_class}')
    
    def _get_primary_hazard_description(self, hazard_class: str) -> str:
        """Get primary hazard description."""
        descriptions = {
            '1.1': 'Mass explosion hazard',
            '2.1': 'Fire and explosion hazard',
            '2.3': 'Inhalation hazard',
            '3': 'Fire hazard',
            '4.1': 'Fire hazard',
            '4.2': 'Spontaneous ignition hazard',
            '4.3': 'Fire hazard when wet',
            '5.1': 'Fire intensification hazard',
            '6.1': 'Poisoning hazard',
            '8': 'Corrosion hazard',
            '9': 'Various hazards'
        }
        return descriptions.get(hazard_class, 'Hazardous material')


def setup_default_emergency_contacts():
    """
    Set up default emergency contacts for Australia.
    Should be called as part of setup process.
    """
    
    contacts_data = [
        {
            'contact_type': EmergencyContact.ContactType.FIRE_RESCUE,
            'organization_name': 'Emergency Services Australia',
            'phone_number': '000',
            'coverage_area': 'Australia',
            'priority': 1,
            'is_24_7_available': True
        },
        
        {
            'contact_type': EmergencyContact.ContactType.CHEMTREC,
            'organization_name': 'CHEMTREC Australia',
            'phone_number': '+61 1800 127 406',
            'coverage_area': 'Australia',
            'priority': 10,
            'is_24_7_available': True
        },
        
        {
            'contact_type': EmergencyContact.ContactType.POISON_CONTROL,
            'organization_name': 'Poisons Information Centre',
            'phone_number': '13 11 26',
            'coverage_area': 'Australia',
            'priority': 20,
            'is_24_7_available': True
        }
    ]
    
    for contact_data in contacts_data:
        EmergencyContact.objects.get_or_create(
            contact_type=contact_data['contact_type'],
            organization_name=contact_data['organization_name'],
            defaults=contact_data
        )
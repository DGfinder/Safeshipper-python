# dangerous_goods/transport_documents.py

import json
from typing import Dict, List, Optional, Tuple, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from shipments.models import Shipment
from django.utils import timezone
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .models import DangerousGood
from users.models import User
from companies.models import Company


class TransportDocument(models.Model):
    """
    ADG Code Part 11 compliant transport documents for dangerous goods shipments.
    Automates generation of required shipping documentation.
    """
    
    class DocumentType(models.TextChoices):
        DANGEROUS_GOODS_DECLARATION = 'DG_DECLARATION', _('Dangerous Goods Declaration')
        MULTIMODAL_DANGEROUS_GOODS_FORM = 'MULTIMODAL_DG_FORM', _('Multimodal Dangerous Goods Form')
        TRANSPORT_DOCUMENT = 'TRANSPORT_DOCUMENT', _('Transport Document')
        CONSIGNMENT_NOTE = 'CONSIGNMENT_NOTE', _('Consignment Note')
        PACKING_CERTIFICATE = 'PACKING_CERTIFICATE', _('Dangerous Goods Packing Certificate')
    
    class DocumentStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PENDING_APPROVAL = 'PENDING_APPROVAL', _('Pending Approval')
        APPROVED = 'APPROVED', _('Approved')
        ISSUED = 'ISSUED', _('Issued')
        SUPERSEDED = 'SUPERSEDED', _('Superseded')
        CANCELLED = 'CANCELLED', _('Cancelled')
    
    # Link to shipment
    shipment = models.ForeignKey(
        'shipments.Shipment',
        on_delete=models.CASCADE,
        related_name='transport_documents'
    )
    
    document_type = models.CharField(
        _("Document Type"),
        max_length=25,
        choices=DocumentType.choices
    )
    
    document_number = models.CharField(
        _("Document Number"),
        max_length=100,
        unique=True,
        help_text=_("Unique document identification number")
    )
    
    # Document status and workflow
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT
    )
    
    # ADG Part 11 required information
    consignor_name = models.CharField(
        _("Consignor Name"),
        max_length=200,
        help_text=_("Name of consignor as per ADG Part 11")
    )
    
    consignor_address = models.TextField(
        _("Consignor Address"),
        help_text=_("Full address of consignor")
    )
    
    consignor_phone = models.CharField(
        _("Consignor Telephone"),
        max_length=50,
        help_text=_("Consignor telephone number as required by ADG Part 11")
    )
    
    consignee_name = models.CharField(
        _("Consignee Name"),
        max_length=200,
        help_text=_("Name of consignee")
    )
    
    consignee_address = models.TextField(
        _("Consignee Address"),
        help_text=_("Full address of consignee")
    )
    
    # Transport details
    transport_mode = models.CharField(
        _("Mode of Transport"),
        max_length=50,
        help_text=_("Road, Rail, Multimodal, etc.")
    )
    
    vehicle_registration = models.CharField(
        _("Vehicle Registration"),
        max_length=50,
        blank=True,
        help_text=_("Registration of transport vehicle")
    )
    
    driver_name = models.CharField(
        _("Driver Name"),
        max_length=200,
        blank=True,
        help_text=_("Name of driver")
    )
    
    # Emergency contact information (24-hour telephone advisory service)
    emergency_contact_name = models.CharField(
        _("Emergency Contact Name"),
        max_length=200,
        help_text=_("24-hour emergency contact organization")
    )
    
    emergency_contact_phone = models.CharField(
        _("Emergency Contact Phone"),
        max_length=50,
        help_text=_("24-hour emergency telephone number")
    )
    
    # Document content (JSON for flexibility)
    document_content = models.JSONField(
        _("Document Content"),
        default=dict,
        help_text=_("Structured document content and data")
    )
    
    # Generated files
    pdf_url = models.URLField(
        _("PDF Document URL"),
        blank=True,
        help_text=_("URL to generated PDF document")
    )
    
    xml_url = models.URLField(
        _("XML Document URL"),
        blank=True,
        help_text=_("URL to generated XML document for electronic data interchange")
    )
    
    # Compliance and validation
    adg_compliant = models.BooleanField(
        _("ADG Compliant"),
        default=False,
        help_text=_("Document meets ADG Code Part 11 requirements")
    )
    
    validation_errors = models.JSONField(
        _("Validation Errors"),
        default=list,
        help_text=_("List of validation errors if any")
    )
    
    # Digital signatures and approvals
    consignor_signature_url = models.URLField(
        _("Consignor Signature URL"),
        blank=True,
        help_text=_("Digital signature of consignor")
    )
    
    carrier_signature_url = models.URLField(
        _("Carrier Signature URL"),
        blank=True,
        help_text=_("Digital signature of carrier")
    )
    
    # Dates and times
    document_date = models.DateTimeField(
        _("Document Date"),
        default=timezone.now,
        help_text=_("Date of document preparation")
    )
    
    valid_until = models.DateTimeField(
        _("Valid Until"),
        null=True,
        blank=True,
        help_text=_("Document expiry date if applicable")
    )
    
    # Audit fields
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_transport_documents'
    )
    
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_transport_documents'
    )
    
    approved_at = models.DateTimeField(
        _("Approved At"),
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Transport Document")
        verbose_name_plural = _("Transport Documents")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['document_number']),
            models.Index(fields=['shipment', 'document_type']),
            models.Index(fields=['status', 'document_type']),
        ]
    
    def __str__(self):
        return f"{self.document_number} - {self.get_document_type_display()}"
    
    def save(self, *args, **kwargs):
        if not self.document_number:
            # Generate unique document number
            import uuid
            self.document_number = f"DOC-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4()).upper()[:8]}"
        super().save(*args, **kwargs)


class ADGTransportDocumentGenerator:
    """
    Generates ADG Code Part 11 compliant transport documents.
    Automates creation of dangerous goods declarations and transport documentation.
    """
    
    def __init__(self):
        pass
    
    def generate_dangerous_goods_declaration(self, shipment: 'Shipment', user: User = None) -> TransportDocument:
        """
        Generate a Dangerous Goods Declaration for a shipment.
        
        Args:
            shipment: Shipment object to generate declaration for
            user: User generating the document
            
        Returns:
            TransportDocument instance
        """
        # Create transport document
        transport_doc = TransportDocument.objects.create(
            shipment=shipment,
            document_type=TransportDocument.DocumentType.DANGEROUS_GOODS_DECLARATION,
            created_by=user
        )
        
        # Populate consignor information
        self._populate_consignor_info(transport_doc, shipment)
        
        # Populate consignee information
        self._populate_consignee_info(transport_doc, shipment)
        
        # Populate transport details
        self._populate_transport_details(transport_doc, shipment)
        
        # Populate emergency contact
        self._populate_emergency_contact(transport_doc, shipment)
        
        # Generate document content
        document_content = self._generate_dg_declaration_content(shipment)
        transport_doc.document_content = document_content
        
        # Validate document
        validation_errors = self._validate_document(transport_doc)
        transport_doc.validation_errors = validation_errors
        transport_doc.adg_compliant = len(validation_errors) == 0
        
        transport_doc.save()
        
        # Generate PDF
        self._generate_pdf_document(transport_doc)
        
        return transport_doc
    
    def generate_transport_document(self, shipment: 'Shipment', user: User = None) -> TransportDocument:
        """
        Generate general transport document for dangerous goods shipment.
        """
        transport_doc = TransportDocument.objects.create(
            shipment=shipment,
            document_type=TransportDocument.DocumentType.TRANSPORT_DOCUMENT,
            created_by=user
        )
        
        # Populate all required fields
        self._populate_consignor_info(transport_doc, shipment)
        self._populate_consignee_info(transport_doc, shipment)
        self._populate_transport_details(transport_doc, shipment)
        self._populate_emergency_contact(transport_doc, shipment)
        
        # Generate content specific to transport document
        document_content = self._generate_transport_doc_content(shipment)
        transport_doc.document_content = document_content
        
        # Validate and generate files
        validation_errors = self._validate_document(transport_doc)
        transport_doc.validation_errors = validation_errors
        transport_doc.adg_compliant = len(validation_errors) == 0
        
        transport_doc.save()
        self._generate_pdf_document(transport_doc)
        
        return transport_doc
    
    def _populate_consignor_info(self, transport_doc: TransportDocument, shipment: 'Shipment'):
        """Populate consignor information from shipment data."""
        consignor = shipment.carrier  # Assuming carrier is consignor
        
        if consignor:
            transport_doc.consignor_name = consignor.name
            transport_doc.consignor_address = f"{consignor.address}\n{consignor.city}, {consignor.state} {consignor.postal_code}"
            transport_doc.consignor_phone = consignor.phone or ""
    
    def _populate_consignee_info(self, transport_doc: TransportDocument, shipment: 'Shipment'):
        """Populate consignee information from shipment data."""
        consignee = shipment.customer
        
        if consignee:
            transport_doc.consignee_name = consignee.name
            transport_doc.consignee_address = f"{consignee.address}\n{consignee.city}, {consignee.state} {consignee.postal_code}"
    
    def _populate_transport_details(self, transport_doc: TransportDocument, shipment: 'Shipment'):
        """Populate transport details from shipment data."""
        transport_doc.transport_mode = "Road"  # Default to road transport
        
        if shipment.assigned_vehicle:
            transport_doc.vehicle_registration = getattr(shipment.assigned_vehicle, 'registration_number', '')
        
        if shipment.assigned_driver:
            transport_doc.driver_name = f"{shipment.assigned_driver.first_name} {shipment.assigned_driver.last_name}"
    
    def _populate_emergency_contact(self, transport_doc: TransportDocument, shipment: 'Shipment'):
        """Populate emergency contact information."""
        # Default to general emergency services
        transport_doc.emergency_contact_name = "Emergency Services Australia"
        transport_doc.emergency_contact_phone = "000"
        
        # Future enhancement: Select emergency contact based on specific dangerous goods types
    
    def _generate_dg_declaration_content(self, shipment: 'Shipment') -> Dict:
        """Generate dangerous goods declaration content."""
        dg_items = shipment.items.filter(is_dangerous_good=True)
        
        dg_entries = []
        for item in dg_items:
            if item.dangerous_good_entry:
                dg = item.dangerous_good_entry
                entry = {
                    'un_number': dg.un_number,
                    'proper_shipping_name': dg.proper_shipping_name,
                    'class_division': dg.hazard_class,
                    'subsidiary_risk': dg.subsidiary_risks or '',
                    'packing_group': dg.packing_group or '',
                    'quantity': f"{item.quantity} x {item.weight_kg}kg" if item.weight_kg else str(item.quantity),
                    'package_type': item.get_receptacle_type_display(),
                    'package_count': item.quantity,
                    'net_quantity': item.total_weight_kg,
                    'gross_weight': item.total_weight_kg * 1.1,  # Estimate gross weight
                    'is_marine_pollutant': dg.is_marine_pollutant,
                    'special_provisions': dg.special_provisions or '',
                    'limited_quantity': item.dg_quantity_type == 'LIMITED_QUANTITY'
                }
                dg_entries.append(entry)
        
        return {
            'document_type': 'Dangerous Goods Declaration',
            'shipment_reference': shipment.tracking_number,
            'dangerous_goods_entries': dg_entries,
            'total_packages': sum(item.quantity for item in dg_items),
            'total_net_weight': sum(item.total_weight_kg for item in dg_items),
            'consignor_declaration': 'I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport according to the applicable international and national governmental regulations.',
            'transport_details': {
                'mode': 'Road Transport',
                'departure_date': shipment.estimated_pickup_date.isoformat() if shipment.estimated_pickup_date else None,
                'origin': shipment.origin_location,
                'destination': shipment.destination_location
            }
        }
    
    def _generate_transport_doc_content(self, shipment: 'Shipment') -> Dict:
        """Generate general transport document content."""
        all_items = list(shipment.items.all())
        dg_items = [item for item in all_items if item.is_dangerous_good]
        
        return {
            'document_type': 'Transport Document',
            'shipment_reference': shipment.tracking_number,
            'all_items': [
                {
                    'description': item.description,
                    'quantity': item.quantity,
                    'weight_kg': float(item.weight_kg) if item.weight_kg else 0,
                    'is_dangerous_good': item.is_dangerous_good,
                    'un_number': item.dangerous_good_entry.un_number if item.dangerous_good_entry else None
                }
                for item in all_items
            ],
            'dangerous_goods_summary': {
                'total_dg_items': len(dg_items),
                'placard_required': hasattr(shipment, 'placard_requirement') and 
                                   shipment.placard_requirement.placard_status == 'REQUIRED'
            },
            'transport_instructions': shipment.instructions or '',
            'special_handling_required': len(dg_items) > 0
        }
    
    def _validate_document(self, transport_doc: TransportDocument) -> List[str]:
        """Validate transport document against ADG Part 11 requirements."""
        errors = []
        
        # Required field validation
        if not transport_doc.consignor_name:
            errors.append("Consignor name is required (ADG Part 11)")
        
        if not transport_doc.consignor_phone:
            errors.append("Consignor telephone number is required (ADG Part 11)")
        
        if not transport_doc.emergency_contact_phone:
            errors.append("24-hour telephone advisory service is required (ADG Part 11)")
        
        # Validate dangerous goods entries
        if transport_doc.document_content.get('dangerous_goods_entries'):
            for entry in transport_doc.document_content['dangerous_goods_entries']:
                if not entry.get('un_number'):
                    errors.append(f"UN number required for dangerous goods entry")
                
                if not entry.get('proper_shipping_name'):
                    errors.append(f"Proper shipping name required for {entry.get('un_number', 'unknown')}")
                
                if not entry.get('class_division'):
                    errors.append(f"Class/Division required for {entry.get('un_number', 'unknown')}")
        
        return errors
    
    def _generate_pdf_document(self, transport_doc: TransportDocument):
        """Generate PDF version of transport document."""
        try:
            # This would integrate with a PDF generation library
            # For now, create a placeholder URL
            pdf_filename = f"transport_docs/{transport_doc.document_number}.pdf"
            
            # Production implementation uses reportlab for PDF generation
            # pdf_content = self._create_pdf_content(transport_doc)
            # pdf_path = default_storage.save(pdf_filename, ContentFile(pdf_content))
            # transport_doc.pdf_url = default_storage.url(pdf_path)
            
            # Placeholder implementation
            transport_doc.pdf_url = f"/media/{pdf_filename}"
            transport_doc.save()
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error generating PDF: {str(e)}", exc_info=True)
    
    def approve_document(self, transport_doc: TransportDocument, user: User) -> bool:
        """
        Approve a transport document for issuance.
        
        Args:
            transport_doc: TransportDocument to approve
            user: User approving the document
            
        Returns:
            True if approved successfully, False otherwise
        """
        if not transport_doc.adg_compliant:
            return False
        
        if transport_doc.status != TransportDocument.DocumentStatus.PENDING_APPROVAL:
            return False
        
        transport_doc.status = TransportDocument.DocumentStatus.APPROVED
        transport_doc.approved_by = user
        transport_doc.approved_at = timezone.now()
        transport_doc.save()
        
        return True
    
    def issue_document(self, transport_doc: TransportDocument) -> bool:
        """
        Issue an approved transport document.
        
        Args:
            transport_doc: TransportDocument to issue
            
        Returns:
            True if issued successfully, False otherwise
        """
        if transport_doc.status != TransportDocument.DocumentStatus.APPROVED:
            return False
        
        transport_doc.status = TransportDocument.DocumentStatus.ISSUED
        transport_doc.save()
        
        return True


def get_emergency_contact_for_shipment(shipment: 'Shipment') -> Tuple[str, str]:
    """
    Get appropriate emergency contact for a shipment based on its dangerous goods.
    
    Returns:
        Tuple of (contact_name, phone_number)
    """
    # Default emergency contact
    default_contact = ("Emergency Services Australia", "000")
    
    try:
        from .emergency_info_panel import EmergencyContact
        
        # Get hazard classes in shipment
        dg_items = shipment.items.filter(is_dangerous_good=True)
        if not dg_items.exists():
            return default_contact
        
        hazard_classes = set()
        for item in dg_items:
            if item.dangerous_good_entry:
                hazard_classes.add(item.dangerous_good_entry.hazard_class)
        
        # Find appropriate emergency contact
        contacts = EmergencyContact.objects.filter(
            is_active=True,
            is_24_7_available=True
        ).order_by('priority')
        
        for contact in contacts:
            if any(contact.covers_hazard_class(hc) for hc in hazard_classes):
                return (contact.organization_name, contact.phone_number)
        
        return default_contact
        
    except Exception:
        return default_contact
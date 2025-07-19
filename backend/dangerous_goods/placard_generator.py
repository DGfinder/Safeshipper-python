# dangerous_goods/placard_generator.py

import json
import qrcode
import uuid
from io import BytesIO
from typing import Dict, List, Optional, Tuple
from django.conf import settings
from django.utils import timezone
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .models import (
    PlacardRequirement, 
    DigitalPlacard, 
    PlacardTemplate,
    DangerousGood
)


class ADGPlacardGenerator:
    """
    Generates ADG-compliant digital placards with QR codes for verification.
    Handles creation of Class Diamond placards, Emergency Information Panels,
    and Limited Quantity placards according to ADG Code 7.9 specifications.
    """
    
    def __init__(self):
        self.qr_code_base_url = getattr(settings, 'PLACARD_QR_BASE_URL', 'https://app.safeshipper.com/verify/')
    
    def generate_placards_for_requirement(self, placard_req: PlacardRequirement, user=None) -> List[DigitalPlacard]:
        """
        Generate all required digital placards for a placard requirement.
        
        Args:
            placard_req: PlacardRequirement instance
            user: User generating the placards
            
        Returns:
            List of generated DigitalPlacard instances
        """
        generated_placards = []
        
        # Get dangerous goods from shipment
        dangerous_goods = self._get_dangerous_goods_from_shipment(placard_req.shipment)
        
        # Generate placards for each required type
        for placard_type in placard_req.required_placard_types:
            placard = self._generate_single_placard(
                placard_req=placard_req,
                placard_type=placard_type,
                dangerous_goods=dangerous_goods,
                user=user
            )
            if placard:
                generated_placards.append(placard)
        
        return generated_placards
    
    def _generate_single_placard(self, placard_req: PlacardRequirement, 
                                placard_type: str, dangerous_goods: List[DangerousGood],
                                user=None) -> Optional[DigitalPlacard]:
        """
        Generate a single digital placard of specified type.
        """
        try:
            # Create digital placard record
            digital_placard = DigitalPlacard.objects.create(
                placard_requirement=placard_req,
                placard_type=placard_type,
                generated_by=user
            )
            
            # Add dangerous goods to placard
            if dangerous_goods:
                digital_placard.dangerous_goods.set(dangerous_goods)
            
            # Generate QR code data
            qr_data = self._generate_qr_code_data(digital_placard)
            digital_placard.qr_code_data = json.dumps(qr_data)
            
            # Generate QR code image
            qr_code_url = self._generate_qr_code_image(qr_data, digital_placard.placard_id)
            digital_placard.qr_code_url = qr_code_url
            
            # Generate placard image based on type
            placard_image_url, placard_pdf_url = self._generate_placard_images(
                digital_placard, dangerous_goods
            )
            digital_placard.placard_image_url = placard_image_url
            digital_placard.placard_pdf_url = placard_pdf_url
            
            # Set placement location based on ADG requirements
            digital_placard.placement_location = self._get_placement_requirements(placard_type)
            
            # Set validity period
            digital_placard.valid_until = self._calculate_expiry_date(placard_type)
            
            digital_placard.save()
            
            return digital_placard
            
        except Exception as e:
            # Log error and return None
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error generating placard: {str(e)}", exc_info=True)
            return None
    
    def _get_dangerous_goods_from_shipment(self, shipment) -> List[DangerousGood]:
        """Extract dangerous goods from shipment items."""
        dangerous_goods = []
        
        for item in shipment.items.filter(is_dangerous_good=True):
            if item.dangerous_good_entry:
                dangerous_goods.append(item.dangerous_good_entry)
        
        return dangerous_goods
    
    def _generate_qr_code_data(self, digital_placard: DigitalPlacard) -> Dict:
        """
        Generate data to be encoded in QR code for verification.
        """
        qr_data = {
            'placard_id': digital_placard.placard_id,
            'placard_type': digital_placard.placard_type,
            'shipment_id': str(digital_placard.placard_requirement.shipment.id),
            'tracking_number': digital_placard.placard_requirement.shipment.tracking_number,
            'generated_at': timezone.now().isoformat(),
            'valid_until': digital_placard.valid_until.isoformat() if digital_placard.valid_until else None,
            'verification_url': f"{self.qr_code_base_url}{digital_placard.placard_id}",
            'hazard_classes': digital_placard.get_hazard_classes(),
            'adg_version': '7.9'
        }
        
        return qr_data
    
    def _generate_qr_code_image(self, qr_data: Dict, placard_id: str) -> str:
        """
        Generate QR code image and return URL.
        """
        try:
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            
            # Add verification URL to QR code
            qr.add_data(qr_data['verification_url'])
            qr.make(fit=True)
            
            # Create QR code image
            qr_image = qr.make_image(fill_color="black", back_color="white")
            
            # Save to storage
            buffer = BytesIO()
            qr_image.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Generate filename
            filename = f"qr_codes/{placard_id}_qr.png"
            
            # Save to default storage
            path = default_storage.save(filename, ContentFile(buffer.getvalue()))
            return default_storage.url(path)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error generating QR code: {str(e)}", exc_info=True)
            return ""
    
    def _generate_placard_images(self, digital_placard: DigitalPlacard, 
                               dangerous_goods: List[DangerousGood]) -> Tuple[str, str]:
        """
        Generate placard image and PDF based on type and dangerous goods.
        """
        try:
            # Get template for placard type
            template = self._get_placard_template(digital_placard.placard_type)
            
            if digital_placard.placard_type == PlacardRequirement.PlacardTypeRequired.CLASS_DIAMOND:
                return self._generate_class_diamond_placard(digital_placard, dangerous_goods, template)
            
            elif digital_placard.placard_type == PlacardRequirement.PlacardTypeRequired.EMERGENCY_INFO_PANEL:
                return self._generate_emergency_info_panel(digital_placard, dangerous_goods, template)
            
            elif digital_placard.placard_type == PlacardRequirement.PlacardTypeRequired.LIMITED_QUANTITY:
                return self._generate_limited_quantity_placard(digital_placard, dangerous_goods, template)
            
            elif digital_placard.placard_type == PlacardRequirement.PlacardTypeRequired.MARINE_POLLUTANT:
                return self._generate_marine_pollutant_placard(digital_placard, dangerous_goods, template)
            
            else:
                return "", ""
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error generating placard images: {str(e)}", exc_info=True)
            return "", ""
    
    def _get_placard_template(self, placard_type: str) -> Optional[PlacardTemplate]:
        """Get appropriate template for placard type."""
        try:
            return PlacardTemplate.objects.get(
                template_type=placard_type,
                is_active=True
            )
        except PlacardTemplate.DoesNotExist:
            return None
    
    def _generate_class_diamond_placard(self, digital_placard: DigitalPlacard, 
                                      dangerous_goods: List[DangerousGood],
                                      template: Optional[PlacardTemplate]) -> Tuple[str, str]:
        """
        Generate Class Diamond placard showing hazard classes.
        """
        # Get unique hazard classes
        hazard_classes = list(set(dg.hazard_class for dg in dangerous_goods))
        
        # For now, return placeholder URLs - would integrate with actual image generation
        image_url = f"/media/placards/{digital_placard.placard_id}_diamond.png"
        pdf_url = f"/media/placards/{digital_placard.placard_id}_diamond.pdf"
        
        # Production implementation would include:
        # - SVG/image generation with diamond shape (250mm x 250mm)
        # - Hazard class symbols and numbers
        # - QR code integration in corner
        # - ADG-compliant colors and fonts
        # Current implementation returns placeholder URLs for development
        
        return image_url, pdf_url
    
    def _generate_emergency_info_panel(self, digital_placard: DigitalPlacard,
                                     dangerous_goods: List[DangerousGood],
                                     template: Optional[PlacardTemplate]) -> Tuple[str, str]:
        """
        Generate Emergency Information Panel (EIP).
        """
        # For now, return placeholder URLs
        image_url = f"/media/placards/{digital_placard.placard_id}_eip.png"
        pdf_url = f"/media/placards/{digital_placard.placard_id}_eip.pdf"
        
        # Production implementation would include EIP generation with:
        # - UN numbers of all dangerous goods
        # - Emergency contact information
        # - Hazard symbols
        # - Emergency response instructions
        # - QR code for digital verification
        
        return image_url, pdf_url
    
    def _generate_limited_quantity_placard(self, digital_placard: DigitalPlacard,
                                         dangerous_goods: List[DangerousGood],
                                         template: Optional[PlacardTemplate]) -> Tuple[str, str]:
        """
        Generate Limited Quantity placard.
        """
        image_url = f"/media/placards/{digital_placard.placard_id}_lq.png"
        pdf_url = f"/media/placards/{digital_placard.placard_id}_lq.pdf"
        
        # Production implementation would include LQ placard generation with:
        # - "LQ" marking
        # - Appropriate size and color
        # - QR code for verification
        
        return image_url, pdf_url
    
    def _generate_marine_pollutant_placard(self, digital_placard: DigitalPlacard,
                                         dangerous_goods: List[DangerousGood],
                                         template: Optional[PlacardTemplate]) -> Tuple[str, str]:
        """
        Generate Marine Pollutant placard.
        """
        image_url = f"/media/placards/{digital_placard.placard_id}_mp.png"
        pdf_url = f"/media/placards/{digital_placard.placard_id}_mp.pdf"
        
        # Production implementation would include marine pollutant placard with fish symbol
        
        return image_url, pdf_url
    
    def _get_placement_requirements(self, placard_type: str) -> str:
        """
        Get ADG placement requirements for placard type.
        """
        placement_map = {
            PlacardRequirement.PlacardTypeRequired.CLASS_DIAMOND: "front,rear",
            PlacardRequirement.PlacardTypeRequired.EMERGENCY_INFO_PANEL: "rear,sides",
            PlacardRequirement.PlacardTypeRequired.LIMITED_QUANTITY: "rear",
            PlacardRequirement.PlacardTypeRequired.MARINE_POLLUTANT: "sides",
        }
        
        return placement_map.get(placard_type, "rear")
    
    def _calculate_expiry_date(self, placard_type: str) -> Optional[timezone.datetime]:
        """
        Calculate expiry date for placard based on type and regulations.
        """
        # For most placards, they're valid for the duration of the transport
        # Could be enhanced to set specific expiry periods
        return None


def setup_default_placard_templates():
    """
    Set up default ADG-compliant placard templates.
    Should be called as part of setup process.
    """
    
    templates_data = [
        {
            'template_type': PlacardTemplate.TemplateType.CLASS_DIAMOND,
            'template_name': 'Standard Class Diamond',
            'width_mm': 250,
            'height_mm': 250,
            'border_width_mm': 12.5,
            'design_config': {
                'shape': 'diamond',
                'background_color': 'white',
                'border_color': 'black',
                'text_color': 'black',
                'symbol_size': '60%',
                'class_number_size': '20%',
                'qr_code_size': '15%',
                'qr_code_position': 'bottom-right'
            },
            'regulatory_reference': 'ADG Code 7.9 Chapter 5.3'
        },
        
        {
            'template_type': PlacardTemplate.TemplateType.EMERGENCY_INFO_PANEL,
            'template_name': 'Standard Emergency Information Panel',
            'width_mm': 300,
            'height_mm': 120,
            'border_width_mm': 5,
            'design_config': {
                'background_color': 'orange',
                'text_color': 'black',
                'font_family': 'Arial',
                'font_size_large': '24pt',
                'font_size_medium': '16pt',
                'font_size_small': '12pt',
                'sections': ['un_numbers', 'emergency_contact', 'hazard_symbols']
            },
            'regulatory_reference': 'ADG Code 7.9 Chapter 5.3'
        },
        
        {
            'template_type': PlacardTemplate.TemplateType.LIMITED_QUANTITY,
            'template_name': 'Limited Quantity Placard',
            'width_mm': 100,
            'height_mm': 100,
            'border_width_mm': 5,
            'design_config': {
                'background_color': 'white',
                'border_color': 'red',
                'text_color': 'red',
                'text': 'LQ',
                'font_size': '36pt',
                'font_weight': 'bold'
            },
            'regulatory_reference': 'ADG Code 7.9 Chapter 3.4'
        },
        
        {
            'template_type': PlacardTemplate.TemplateType.MARINE_POLLUTANT,
            'template_name': 'Marine Pollutant Mark',
            'width_mm': 100,
            'height_mm': 100,
            'border_width_mm': 5,
            'design_config': {
                'background_color': 'white',
                'symbol': 'fish_and_tree',
                'symbol_color': 'black',
                'text': 'MARINE POLLUTANT',
                'font_size': '8pt'
            },
            'regulatory_reference': 'ADG Code 7.9 Chapter 5.4'
        }
    ]
    
    for template_data in templates_data:
        PlacardTemplate.objects.get_or_create(
            template_type=template_data['template_type'],
            defaults=template_data
        )
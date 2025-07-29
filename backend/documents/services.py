# documents/services.py
import logging
import re
import time
from typing import Dict, List, Tuple, Optional
from difflib import SequenceMatcher

import fitz  # PyMuPDF
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

from dangerous_goods.models import DangerousGood, DGProductSynonym
from dangerous_goods.services import match_synonym_to_dg, get_dangerous_good_by_un_number, find_dgs_by_text_search
from .pdf_generators import ShipmentReportGenerator, ComplianceCertificateGenerator, ManifestGenerator, PDFGenerator
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML, CSS
from io import BytesIO
import fitz  # PyMuPDF for PDF merging

logger = logging.getLogger(__name__)

class ManifestAnalyzer:
    """
    Service class for analyzing PDF manifest documents to identify dangerous goods.
    """
    
    def __init__(self):
        # Compile regex patterns for efficiency
        self.un_number_pattern = re.compile(r'\bUN\s*(\d{4})\b', re.IGNORECASE)
        self.chemical_indicators = [
            'acid', 'oxide', 'alcohol', 'ether', 'benzene', 'acetone', 'methanol',
            'ethanol', 'gasoline', 'petrol', 'diesel', 'flammable', 'corrosive',
            'toxic', 'poison', 'explosive', 'oxidizer', 'hazardous'
        ]
        self.quantity_pattern = re.compile(r'(\d+)\s*(?:x|×|pieces?|units?|bottles?|containers?|drums?|bags?)', re.IGNORECASE)
        self.weight_pattern = re.compile(r'(\d+(?:\.\d+)?)\s*(?:kg|kgs?|kilograms?|lbs?|pounds?|g|grams?)', re.IGNORECASE)
    
    def extract_text_from_pdf(self, document) -> List[Dict]:
        """
        Extract text from PDF document with page and position information.
        
        Args:
            document: Document model instance
            
        Returns:
            List of dictionaries with text blocks and metadata
        """
        text_blocks = []
        
        try:
            # Open the PDF file
            pdf_path = document.file.path
            pdf_document = fitz.open(pdf_path)
            
            logger.info(f"Extracting text from PDF: {pdf_path} ({pdf_document.page_count} pages)")
            
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                
                # Extract text blocks with position information
                blocks = page.get_text("dict")
                
                for block in blocks.get("blocks", []):
                    if "lines" in block:  # Text block
                        for line in block["lines"]:
                            line_text = ""
                            for span in line.get("spans", []):
                                line_text += span.get("text", "")
                            
                            if line_text.strip():
                                text_blocks.append({
                                    'text': line_text.strip(),
                                    'page': page_num + 1,
                                    'bbox': line.get("bbox", []),
                                    'confidence': 1.0  # PDF text extraction is generally reliable
                                })
            
            pdf_document.close()
            
            logger.info(f"Extracted {len(text_blocks)} text blocks from PDF")
            return text_blocks
            
        except Exception as e:
            logger.error(f"Failed to extract text from PDF {document.id}: {str(e)}")
            raise Exception(f"PDF text extraction failed: {str(e)}")
    
    def analyze_text_with_multi_pass_scanning(self, text_blocks: List[Dict]) -> List[Dict]:
        """
        Analyze text using multi-pass scanning strategy with synonym lookup.
        
        Args:
            text_blocks: List of text blocks from PDF
            
        Returns:
            List of found dangerous goods with enhanced matching
        """
        all_matches = []
        
        # Combine all text for comprehensive analysis
        full_text = " ".join([block['text'] for block in text_blocks])
        
        # Use the new multi-pass scanning service
        search_results = find_dgs_by_text_search(full_text)
        
        logger.info(f"Multi-pass scanning found {len(search_results)} potential dangerous goods")
        
        # Map results back to text blocks with context
        for result in search_results:
            dg = result['dangerous_good']
            matched_term = result['matched_term']
            confidence = result['confidence']
            match_type = result['match_type']
            
            # Find which text block(s) contain this match
            found_in_blocks = []
            for block in text_blocks:
                if matched_term.lower() in block['text'].lower():
                    found_in_blocks.append(block)
            
            # If no exact block match found, use the first block (fallback)
            if not found_in_blocks:
                found_in_blocks = [text_blocks[0]] if text_blocks else []
            
            # Create match entry for each block where the term was found
            for block in found_in_blocks:
                # Extract quantity and weight info from this specific block
                quantities = self.extract_quantities_and_weights(block['text'])
                
                match_entry = {
                    'un_number': dg.un_number,
                    'dangerous_good': dg,
                    'found_text': block['text'],
                    'matched_term': matched_term,
                    'page': block['page'],
                    'bbox': block['bbox'],
                    'confidence': confidence,
                    'match_type': match_type,
                    **quantities
                }
                
                all_matches.append(match_entry)
                
                logger.info(
                    f"Found {match_type} match for {dg.un_number} via '{matched_term}' "
                    f"(confidence: {confidence:.2f}): {block['text'][:100]}..."
                )
        
        # Remove duplicates based on UN number and page
        unique_matches = []
        seen_combinations = set()
        
        for match in all_matches:
            combination_key = (match['un_number'], match['page'])
            if combination_key not in seen_combinations:
                unique_matches.append(match)
                seen_combinations.add(combination_key)
        
        # Sort by confidence score (highest first)
        unique_matches.sort(key=lambda x: x['confidence'], reverse=True)
        
        return unique_matches
    
    def identify_unmatched_text(self, text_blocks: List[Dict], matched_blocks: set) -> List[Dict]:
        """
        Identify text blocks that might contain dangerous goods but weren't matched.
        
        Args:
            text_blocks: List of text blocks from PDF
            matched_blocks: Set of text that was already matched
            
        Returns:
            List of unmatched text blocks with chemical indicators
        """
        unmatched_text = []
        
        for block in text_blocks:
            text = block['text']
            
            # Skip if this text was already matched
            if text in matched_blocks:
                continue
            
            # Check for chemical indicator words
            has_indicators = any(indicator in text.lower() for indicator in self.chemical_indicators)
            
            if has_indicators:
                unmatched_text.append({
                    'text': text,
                    'page': block['page'],
                    'bbox': block['bbox'],
                    'confidence_note': 'Contains chemical indicators but no exact match found'
                })
        
        return unmatched_text
    
    def extract_quantities_and_weights(self, text: str) -> Dict:
        """
        Extract quantity and weight information from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with quantity and weight information
        """
        result = {}
        
        # Find quantities
        quantity_match = self.quantity_pattern.search(text)
        if quantity_match:
            result['quantity'] = int(quantity_match.group(1))
        
        # Find weights
        weight_match = self.weight_pattern.search(text)
        if weight_match:
            weight_value = float(weight_match.group(1))
            weight_unit = weight_match.group().split()[-1].lower()
            
            # Convert to kg
            if weight_unit in ['kg', 'kgs', 'kilogram', 'kilograms']:
                result['weight_kg'] = weight_value
            elif weight_unit in ['g', 'gram', 'grams']:
                result['weight_kg'] = weight_value / 1000
            elif weight_unit in ['lb', 'lbs', 'pound', 'pounds']:
                result['weight_kg'] = weight_value * 0.453592
        
        return result
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two text strings.
        
        Args:
            text1: First text string
            text2: Second text string
            
        Returns:
            Similarity score between 0 and 1
        """
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def format_matches_for_storage(self, matches: List[Dict]) -> List[Dict]:
        """
        Format matches for storage in validation results.
        
        Args:
            matches: List of dangerous goods matches
            
        Returns:
            List of formatted dangerous goods for storage
        """
        formatted_dgs = []
        
        for match in matches:
            dg = match['dangerous_good']
            formatted_dg = {
                'un_number': match['un_number'],
                'proper_shipping_name': dg.proper_shipping_name,
                'hazard_class': dg.hazard_class,
                'packing_group': dg.packing_group,
                'found_text': match['found_text'],
                'matched_term': match.get('matched_term', match['found_text']),
                'page_number': match['page'],
                'confidence_score': match['confidence'],
                'match_type': match['match_type'],
                'quantity': match.get('quantity'),
                'weight_kg': match.get('weight_kg')
            }
            formatted_dgs.append(formatted_dg)
        
        return formatted_dgs


class ConsolidatedReportGenerator(PDFGenerator):
    """
    Generator for consolidated shipment reports that combine multiple document types
    into a single PDF: manifest, compliance certificate, compatibility report, SDS, and EPGs.
    """
    
    def __init__(self):
        super().__init__()
        self.shipment_generator = ShipmentReportGenerator()
        self.manifest_generator = ManifestGenerator()
        self.compliance_generator = ComplianceCertificateGenerator()
    
    def generate_consolidated_report(self, shipment, include_sections: Dict = None) -> bytes:
        """
        Generate consolidated PDF report for a shipment including all critical documents.
        
        Args:
            shipment: Shipment instance
            include_sections: Dict specifying which sections to include
                {
                    'shipment_report': True,
                    'manifest': True,
                    'compliance_certificate': True,
                    'compatibility_report': True,
                    'sds_documents': True,
                    'emergency_procedures': True
                }
        
        Returns:
            PDF content as bytes
        """
        if include_sections is None:
            include_sections = {
                'shipment_report': True,
                'manifest': True,
                'compliance_certificate': True,
                'compatibility_report': True,
                'sds_documents': True,
                'emergency_procedures': True
            }
        
        logger.info(f"Generating consolidated report for shipment {shipment.tracking_number}")
        
        # Prepare consolidated context
        context = self._prepare_consolidated_context(shipment, include_sections)
        
        # Render consolidated HTML template
        html_content = render_to_string('documents/pdf/consolidated_report.html', context)
        
        # Add consolidated-specific CSS
        consolidated_css = self._get_consolidated_css()
        
        # Generate PDF
        pdf_bytes = self.generate_pdf(html_content, consolidated_css)
        
        logger.info(f"Generated consolidated report for shipment {shipment.tracking_number}: {len(pdf_bytes)} bytes")
        
        return pdf_bytes
    
    def _prepare_consolidated_context(self, shipment, include_sections: Dict) -> Dict:
        """Prepare context data for consolidated report"""
        from inspections.models import Inspection
        from emergency_procedures.models import EmergencyProcedure
        
        context = {
            'shipment': shipment,
            'generation_date': timezone.now(),
            'report_title': f'Consolidated Transport Report - {shipment.tracking_number}',
            'include_sections': include_sections,
        }
        
        # Get dangerous goods items
        dangerous_items = shipment.items.filter(is_dangerous_good=True)
        context['dangerous_items'] = dangerous_items
        
        # Shipment Report Section
        if include_sections.get('shipment_report', True):
            context['shipment_data'] = self.shipment_generator._prepare_shipment_context(shipment, True)
        
        # Manifest Section  
        if include_sections.get('manifest', True):
            context['manifest_data'] = self.manifest_generator._prepare_manifest_context(shipment)
        
        # Compliance Certificate Section
        if include_sections.get('compliance_certificate', True):
            context['compliance_data'] = self.compliance_generator._prepare_compliance_context(shipment)
        
        # Compatibility Report Section
        if include_sections.get('compatibility_report', True):
            context['compatibility_data'] = self._prepare_compatibility_context(shipment, dangerous_items)
        
        # SDS Documents Section
        if include_sections.get('sds_documents', True):
            context['sds_data'] = self._prepare_sds_context(dangerous_items)
        
        # Emergency Procedures Section
        if include_sections.get('emergency_procedures', True):
            context['epg_data'] = self._prepare_epg_context(dangerous_items)
        
        return context
    
    def _prepare_compatibility_context(self, shipment, dangerous_items) -> Dict:
        """Prepare compatibility analysis context"""
        compatibility_results = []
        compatibility_status = 'COMPATIBLE'
        issues = []
        warnings = []
        
        # Group dangerous items by hazard class
        hazard_classes = {}
        for item in dangerous_items:
            if item.dangerous_good_entry:
                hazard_class = item.dangerous_good_entry.hazard_class
                if hazard_class not in hazard_classes:
                    hazard_classes[hazard_class] = []
                hazard_classes[hazard_class].append(item)
        
        # Check compatibility between different hazard classes
        incompatible_combinations = {
            ('1', '3'): 'Explosives (Class 1) incompatible with Flammable Liquids (Class 3)',
            ('1', '8'): 'Explosives (Class 1) incompatible with Corrosives (Class 8)',
            ('3', '5.1'): 'Flammable Liquids (Class 3) incompatible with Oxidizers (Class 5.1)',
            ('6.1', '8'): 'Toxic substances (Class 6.1) may be incompatible with Corrosives (Class 8)',
        }
        
        hazard_class_list = list(hazard_classes.keys())
        for i, class1 in enumerate(hazard_class_list):
            for class2 in hazard_class_list[i+1:]:
                combination = tuple(sorted([class1, class2]))
                if combination in incompatible_combinations:
                    compatibility_status = 'INCOMPATIBLE'
                    issues.append(incompatible_combinations[combination])
        
        # Check for segregation requirements
        if len(hazard_classes) > 1:
            warnings.append('Multiple hazard classes present - verify segregation requirements')
        
        return {
            'compatibility_status': compatibility_status,
            'hazard_classes': hazard_classes,
            'issues': issues,
            'warnings': warnings,
            'analysis_date': timezone.now(),
        }
    
    def _prepare_sds_context(self, dangerous_items) -> Dict:
        """Prepare Safety Data Sheets context"""
        sds_data = []
        
        for item in dangerous_items:
            if item.dangerous_good_entry:
                dg = item.dangerous_good_entry
                
                # Check if SDS documents exist for this dangerous good
                sds_documents = item.shipment.documents.filter(
                    document_type='SDS',
                    dangerous_good_entries__un_number=dg.un_number
                ).distinct()
                
                sds_info = {
                    'dangerous_good': dg,
                    'item': item,
                    'sds_available': sds_documents.exists(),
                    'sds_documents': sds_documents,
                    'key_safety_info': {
                        'proper_shipping_name': dg.proper_shipping_name,
                        'hazard_class': dg.hazard_class,
                        'packing_group': dg.packing_group,
                        'special_provisions': dg.special_provisions or 'None specified',
                        'emergency_contact': 'Emergency Response Hotline: 1-800-CHEMTREC',
                    }
                }
                sds_data.append(sds_info)
        
        return {
            'sds_items': sds_data,
            'total_sds_required': len(dangerous_items),
            'sds_available_count': sum(1 for item in sds_data if item['sds_available']),
        }
    
    def _prepare_epg_context(self, dangerous_items) -> Dict:
        """Prepare Emergency Procedure Guidelines context"""
        epg_data = []
        
        for item in dangerous_items:
            if item.dangerous_good_entry:
                dg = item.dangerous_good_entry
                
                # Get emergency procedures for this hazard class
                try:
                    from emergency_procedures.models import EmergencyProcedure
                    procedures = EmergencyProcedure.objects.filter(
                        applicable_hazard_classes__contains=[dg.hazard_class],
                        company=item.shipment.company
                    )
                except Exception:
                    procedures = []
                
                epg_info = {
                    'dangerous_good': dg,
                    'item': item,
                    'procedures': procedures,
                    'general_guidance': self._get_general_emergency_guidance(dg.hazard_class),
                }
                epg_data.append(epg_info)
        
        return {
            'epg_items': epg_data,
            'emergency_contact': '1-800-CHEMTREC (1-800-424-9300)',
            'general_spill_procedures': [
                'Isolate the area and deny entry to unnecessary personnel',
                'Eliminate all ignition sources if safe to do so',
                'Notify emergency services immediately',
                'Begin containment procedures if trained and safe',
                'Evacuate area if vapors are present',
            ],
        }
    
    def _get_general_emergency_guidance(self, hazard_class: str) -> List[str]:
        """Get general emergency guidance based on hazard class"""
        guidance_map = {
            '1': [
                'EXPLOSIVES: Keep at safe distance',
                'Do not use water on burning explosives',
                'Evacuate 500m radius minimum',
                'Contact bomb disposal experts'
            ],
            '2': [
                'GASES: Ventilate area thoroughly',
                'Check for gas leaks with soapy water',
                'Do not smoke or use ignition sources',
                'Use appropriate breathing apparatus'
            ],
            '3': [
                'FLAMMABLE LIQUIDS: Eliminate ignition sources',
                'Use foam or dry chemical extinguisher',
                'Contain spills with absorbent material',
                'Ventilate confined spaces'
            ],
            '4': [
                'FLAMMABLE SOLIDS: Keep dry',
                'Do not use water unless specifically indicated',
                'Use sand or dry chemical extinguisher',
                'Prevent contact with incompatible materials'
            ],
            '5': [
                'OXIDIZERS: Separate from combustible materials',
                'Use large amounts of water for fires',
                'Do not use dry chemical extinguishers',
                'Wash contaminated clothing thoroughly'
            ],
            '6': [
                'TOXIC SUBSTANCES: Use full protective equipment',
                'Provide fresh air immediately',
                'Seek medical attention for any exposure',
                'Decontaminate affected areas thoroughly'
            ],
            '7': [
                'RADIOACTIVE: Minimize exposure time',
                'Maximize distance from source',
                'Contact radiation safety officer immediately',
                'Monitor for contamination'
            ],
            '8': [
                'CORROSIVES: Flush with large amounts of water',
                'Do not neutralize unless trained',
                'Use acid-resistant equipment',
                'Ensure adequate ventilation'
            ],
            '9': [
                'MISCELLANEOUS: Follow specific SDS guidance',
                'Use general hazmat procedures',
                'Consult with technical experts',
                'Monitor environmental conditions'
            ],
        }
        
        return guidance_map.get(hazard_class, [
            'Follow standard hazardous materials procedures',
            'Consult Safety Data Sheet for specific guidance',
            'Contact emergency response professionals',
            'Evacuate area if in doubt about safety'
        ])
    
    def _get_consolidated_css(self) -> str:
        """Get CSS specific to consolidated reports"""
        return """
        .consolidated-header {
            text-align: center;
            background-color: #1e40af;
            color: white;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
        }
        
        .section-divider {
            page-break-before: always;
            border-top: 3px solid #2563eb;
            margin: 40px 0 30px 0;
            padding-top: 20px;
        }
        
        .toc-section {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }
        
        .toc-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #cbd5e1;
        }
        
        .compatibility-warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
        }
        
        .compatibility-error {
            background-color: #fee2e2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 15px 0;
        }
        
        .sds-item {
            border: 1px solid #d1d5db;
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
            background-color: #f9fafb;
        }
        
        .epg-procedure {
            background-color: #fef7f0;
            border: 1px solid #fed7aa;
            padding: 12px;
            margin: 8px 0;
            border-radius: 4px;
        }
        
        .emergency-contact {
            background-color: #dc2626;
            color: white;
            text-align: center;
            padding: 15px;
            font-weight: bold;
            font-size: 14pt;
            margin: 20px 0;
            border-radius: 6px;
        }
        """


def generate_consolidated_report(shipment, include_sections: Dict = None) -> bytes:
    """
    Generate consolidated PDF report for a shipment.
    
    Args:
        shipment: Shipment instance
        include_sections: Dict specifying which sections to include
        
    Returns:
        PDF content as bytes
    """
    generator = ConsolidatedReportGenerator()
    return generator.generate_consolidated_report(shipment, include_sections)


def analyze_manifest(document) -> Dict:
    """
    Main function to analyze a manifest document for dangerous goods.
    
    Args:
        document: Document model instance
        
    Returns:
        Dictionary with analysis results
    """
    start_time = time.time()
    
    logger.info(f"Starting manifest analysis for document {document.id}")
    
    try:
        analyzer = ManifestAnalyzer()
        
        # Extract text from PDF
        text_blocks = analyzer.extract_text_from_pdf(document)
        
        if not text_blocks:
            return {
                'potential_dangerous_goods': [],
                'unmatched_text': [],
                'metadata': {
                    'total_pages': 0,
                    'total_text_blocks': 0,
                    'processing_error': 'No text extracted from PDF'
                }
            }
        
        # Use multi-pass scanning strategy to find dangerous goods
        potential_dgs = analyzer.analyze_text_with_multi_pass_scanning(text_blocks)
        
        # Prepare unmatched text (text blocks that might contain DGs but weren't matched)
        matched_blocks = set()
        for match in potential_dgs:
            matched_blocks.add(match['found_text'])
        
        unmatched_text = analyzer.identify_unmatched_text(text_blocks, matched_blocks)
        
        # Format results for storage
        formatted_dgs = analyzer.format_matches_for_storage(potential_dgs)
        
        processing_time = time.time() - start_time
        
        result = {
            'potential_dangerous_goods': formatted_dgs,
            'unmatched_text': [item['text'] for item in unmatched_text],
            'metadata': {
                'total_pages': max((block['page'] for block in text_blocks), default=0),
                'total_text_blocks': len(text_blocks),
                'total_potential_dgs': len(formatted_dgs),
                'processing_time_seconds': round(processing_time, 2),
                'unmatched_blocks_with_indicators': len(unmatched_text),
                'scanning_strategy': 'multi_pass_with_synonyms'
            }
        }
        
        logger.info(
            f"Completed manifest analysis for document {document.id} in {processing_time:.2f}s. "
            f"Found {len(formatted_dgs)} potential dangerous goods"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Manifest analysis failed for document {document.id}: {str(e)}")
        raise Exception(f"Analysis failed: {str(e)}")

def create_shipment_from_confirmed_dgs(shipment, confirmed_dgs, user):
    """
    Create consignment items from confirmed dangerous goods.
    
    Args:
        shipment: Shipment instance
        confirmed_dgs: List of confirmed dangerous goods from manifest
        user: User confirming the dangerous goods
        
    Returns:
        List of created ConsignmentItem instances
    """
    from shipments.models import ConsignmentItem
    
    created_items = []
    
    logger.info(f"Creating {len(confirmed_dgs)} consignment items for shipment {shipment.id}")
    
    for dg_data in confirmed_dgs:
        try:
            # Get the dangerous good from database
            dangerous_good = get_dangerous_good_by_un_number(dg_data['un_number'])
            
            if not dangerous_good:
                logger.warning(f"UN number {dg_data['un_number']} not found in database")
                continue
            
            # Create consignment item
            item = ConsignmentItem.objects.create(
                shipment=shipment,
                description=dg_data.get('description', dangerous_good.proper_shipping_name),
                quantity=dg_data.get('quantity', 1),
                weight_kg=dg_data.get('weight_kg'),
                is_dangerous_good=True,
                dangerous_good_entry=dangerous_good
            )
            
            created_items.append(item)
            
            logger.info(f"Created consignment item for {dg_data['un_number']}: {item}")
            
        except Exception as e:
            logger.error(f"Failed to create consignment item for {dg_data['un_number']}: {str(e)}")
            continue
    
    # Update shipment status
    if created_items:
        shipment.status = shipment.ShipmentStatus.PLANNING
        shipment.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Updated shipment {shipment.id} status to PLANNING")
    
    return created_items
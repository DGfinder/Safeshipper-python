# AI-Powered SDS Document Upload and Extraction Service
# Enhanced with OpenAI integration for superior data extraction

import re
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

import fitz  # PyMuPDF for PDF processing
import spacy
from dataclasses import dataclass
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone

from .models import SafetyDataSheet, SDSDataSource
from .enhanced_models import EnhancedSafetyDataSheet, SDSQualityCheck
from .openai_service import enhanced_openai_service
from dangerous_goods.models import DangerousGood
from documents.models import Document

logger = logging.getLogger(__name__)

# Load spaCy model for named entity recognition
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None


@dataclass
class ExtractedSDSData:
    """Data structure for extracted SDS information"""
    # Section 1: Product Identification
    product_name: Optional[str] = None
    manufacturer: Optional[str] = None
    manufacturer_code: Optional[str] = None
    supplier: Optional[str] = None
    
    # Section 2: Hazard Identification
    hazard_statements: List[str] = None
    precautionary_statements: List[str] = None
    signal_word: Optional[str] = None
    hazard_symbols: List[str] = None
    
    # Section 3: Composition/Information on Ingredients
    chemical_name: Optional[str] = None
    cas_number: Optional[str] = None
    concentration: Optional[str] = None
    
    # Section 4: First Aid Measures
    first_aid_inhalation: Optional[str] = None
    first_aid_skin: Optional[str] = None
    first_aid_eyes: Optional[str] = None
    first_aid_ingestion: Optional[str] = None
    
    # Section 5: Fire Fighting Measures
    extinguishing_media: Optional[str] = None
    fire_hazards: Optional[str] = None
    fire_fighting_procedures: Optional[str] = None
    
    # Section 6: Accidental Release Measures
    spill_cleanup: Optional[str] = None
    
    # Section 7: Handling and Storage
    handling_precautions: Optional[str] = None
    storage_requirements: Optional[str] = None
    
    # Section 8: Exposure Controls/Personal Protection
    exposure_limits: Optional[str] = None
    engineering_controls: Optional[str] = None
    ppe_requirements: Optional[str] = None
    
    # Section 9: Physical and Chemical Properties
    physical_state: Optional[str] = None
    color: Optional[str] = None
    odor: Optional[str] = None
    ph_value: Optional[float] = None
    ph_range_min: Optional[float] = None
    ph_range_max: Optional[float] = None
    flash_point: Optional[float] = None
    auto_ignition_temp: Optional[float] = None
    
    # Section 10: Stability and Reactivity
    stability: Optional[str] = None
    incompatible_materials: Optional[str] = None
    
    # Section 11: Toxicological Information
    toxicity_data: Optional[str] = None
    
    # Section 12: Ecological Information
    environmental_effects: Optional[str] = None
    
    # Section 13: Disposal Considerations
    disposal_methods: Optional[str] = None
    
    # Section 14: Transport Information
    un_number: Optional[str] = None
    proper_shipping_name: Optional[str] = None
    hazard_class: Optional[str] = None
    packing_group: Optional[str] = None
    
    # Section 15: Regulatory Information
    regulatory_info: Optional[str] = None
    
    # Section 16: Other Information
    version: Optional[str] = None
    revision_date: Optional[datetime] = None
    supersedes_date: Optional[datetime] = None
    
    # Metadata
    extraction_confidence: float = 0.0
    language_detected: str = "EN"
    sds_format: str = "UNKNOWN"
    
    def __post_init__(self):
        if self.hazard_statements is None:
            self.hazard_statements = []
        if self.precautionary_statements is None:
            self.precautionary_statements = []
        if self.hazard_symbols is None:
            self.hazard_symbols = []


class SDSAIExtractor:
    """
    AI-powered SDS document extraction service with comprehensive data extraction capabilities
    """
    
    def __init__(self):
        # SDS section patterns
        self.section_patterns = {
            1: re.compile(r'(?:section\s*1|identification).*?(?:product|identification)', re.IGNORECASE),
            2: re.compile(r'(?:section\s*2|hazard).*?(?:identification|classification)', re.IGNORECASE),
            3: re.compile(r'(?:section\s*3|composition).*?(?:ingredients|information)', re.IGNORECASE),
            4: re.compile(r'(?:section\s*4|first\s*aid)', re.IGNORECASE),
            5: re.compile(r'(?:section\s*5|fire.*?fighting)', re.IGNORECASE),
            6: re.compile(r'(?:section\s*6|accidental.*?release)', re.IGNORECASE),
            7: re.compile(r'(?:section\s*7|handling.*?storage)', re.IGNORECASE),
            8: re.compile(r'(?:section\s*8|exposure.*?control)', re.IGNORECASE),
            9: re.compile(r'(?:section\s*9|physical.*?chemical)', re.IGNORECASE),
            10: re.compile(r'(?:section\s*10|stability.*?reactivity)', re.IGNORECASE),
            11: re.compile(r'(?:section\s*11|toxicological)', re.IGNORECASE),
            12: re.compile(r'(?:section\s*12|ecological)', re.IGNORECASE),
            13: re.compile(r'(?:section\s*13|disposal)', re.IGNORECASE),
            14: re.compile(r'(?:section\s*14|transport)', re.IGNORECASE),
            15: re.compile(r'(?:section\s*15|regulatory)', re.IGNORECASE),
            16: re.compile(r'(?:section\s*16|other)', re.IGNORECASE),
        }
        
        # Extraction patterns for key data
        self.extraction_patterns = {
            'product_name': [
                re.compile(r'product\s*(?:name|identifier)\s*:?\s*(.+?)(?:\n|$)', re.IGNORECASE),
                re.compile(r'trade\s*name\s*:?\s*(.+?)(?:\n|$)', re.IGNORECASE),
                re.compile(r'commercial\s*name\s*:?\s*(.+?)(?:\n|$)', re.IGNORECASE),
            ],
            'manufacturer': [
                re.compile(r'manufacturer\s*:?\s*(.+?)(?:\n|address|phone|email)', re.IGNORECASE),
                re.compile(r'company\s*:?\s*(.+?)(?:\n|address|phone|email)', re.IGNORECASE),
                re.compile(r'supplier\s*:?\s*(.+?)(?:\n|address|phone|email)', re.IGNORECASE),
            ],
            'cas_number': [
                re.compile(r'cas\s*(?:no|number|#)\s*:?\s*(\d{2,7}-\d{2}-\d)', re.IGNORECASE),
                re.compile(r'(\d{2,7}-\d{2}-\d)\s*\(cas\)', re.IGNORECASE),
            ],
            'un_number': [
                re.compile(r'un\s*(?:no|number|#)\s*:?\s*(un\s*)?(\d{4})', re.IGNORECASE),
                re.compile(r'(?:proper\s*shipping\s*name|identification)\s*:?.*?un\s*(\d{4})', re.IGNORECASE),
            ],
            'hazard_class': [
                re.compile(r'(?:hazard\s*)?class\s*:?\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
                re.compile(r'division\s*:?\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
            ],
            'packing_group': [
                re.compile(r'packing\s*group\s*:?\s*(I{1,3})', re.IGNORECASE),
                re.compile(r'packaging\s*group\s*:?\s*(I{1,3})', re.IGNORECASE),
            ],
            'ph_value': [
                re.compile(r'ph\s*(?:value)?\s*:?\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
                re.compile(r'ph\s*(?:range|between)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
            ],
            'flash_point': [
                re.compile(r'flash\s*point\s*:?\s*(\d+(?:\.\d+)?)\s*°?\s*c', re.IGNORECASE),
                re.compile(r'fp\s*:?\s*(\d+(?:\.\d+)?)\s*°?\s*c', re.IGNORECASE),
            ],
            'version': [
                re.compile(r'version\s*:?\s*(\d+(?:\.\d+)*)', re.IGNORECASE),
                re.compile(r'revision\s*(?:no|number)\s*:?\s*(\d+(?:\.\d+)*)', re.IGNORECASE),
            ],
            'revision_date': [
                re.compile(r'revision\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})', re.IGNORECASE),
                re.compile(r'date\s*of\s*issue\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})', re.IGNORECASE),
                re.compile(r'prepared\s*on\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})', re.IGNORECASE),
            ]
        }
        
        # H-codes and P-codes patterns
        self.h_code_pattern = re.compile(r'H(\d{3})', re.IGNORECASE)
        self.p_code_pattern = re.compile(r'P(\d{3})', re.IGNORECASE)
        
        # Physical state patterns
        self.physical_state_patterns = {
            'SOLID': re.compile(r'(?:solid|powder|granules|crystals|pellets)', re.IGNORECASE),
            'LIQUID': re.compile(r'(?:liquid|solution|suspension)', re.IGNORECASE),
            'GAS': re.compile(r'(?:gas|gaseous|vapor|vapour)', re.IGNORECASE),
            'AEROSOL': re.compile(r'(?:aerosol|spray)', re.IGNORECASE),
        }
        
        # Common SDS manufacturers and formats for confidence scoring
        self.known_sds_generators = [
            'chemwatch', '3e', 'velocityehs', 'msds online', 'wercs',
            'chemical safety', 'sds authoring', 'chemsafe'
        ]
        
    def extract_from_pdf(self, pdf_file_path: str, use_openai: bool = True) -> ExtractedSDSData:
        """
        Extract comprehensive SDS data from a PDF file with OpenAI enhancement
        
        Args:
            pdf_file_path: Path to the PDF file
            use_openai: Whether to use OpenAI for enhanced extraction
            
        Returns:
            ExtractedSDSData object with extracted information
        """
        logger.info(f"Starting SDS extraction from: {pdf_file_path}")
        
        try:
            # Extract text from PDF
            text_blocks = self._extract_pdf_text(pdf_file_path)
            full_text = " ".join([block['text'] for block in text_blocks])
            
            # Initialize extraction result
            extracted_data = ExtractedSDSData()
            
            # Detect SDS format and language
            extracted_data.sds_format = self._detect_sds_format(full_text)
            extracted_data.language_detected = self._detect_language(full_text)
            
            # Method 1: Traditional rule-based extraction
            sections = self._parse_sds_sections(text_blocks)
            
            # Extract data from each section using traditional methods
            self._extract_product_identification(sections.get(1, ""), extracted_data)
            self._extract_hazard_identification(sections.get(2, ""), extracted_data)
            self._extract_composition_info(sections.get(3, ""), extracted_data)
            self._extract_first_aid_measures(sections.get(4, ""), extracted_data)
            self._extract_firefighting_measures(sections.get(5, ""), extracted_data)
            self._extract_spill_measures(sections.get(6, ""), extracted_data)
            self._extract_handling_storage(sections.get(7, ""), extracted_data)
            self._extract_exposure_controls(sections.get(8, ""), extracted_data)
            self._extract_physical_properties(sections.get(9, ""), extracted_data)
            self._extract_stability_reactivity(sections.get(10, ""), extracted_data)
            self._extract_toxicological_info(sections.get(11, ""), extracted_data)
            self._extract_ecological_info(sections.get(12, ""), extracted_data)
            self._extract_disposal_info(sections.get(13, ""), extracted_data)
            self._extract_transport_info(sections.get(14, ""), extracted_data)
            self._extract_regulatory_info(sections.get(15, ""), extracted_data)
            self._extract_other_info(sections.get(16, ""), extracted_data)
            
            # Calculate traditional extraction confidence
            traditional_confidence = self._calculate_extraction_confidence(extracted_data, full_text)
            
            # Method 2: OpenAI-enhanced extraction (if enabled and available)
            if use_openai and enhanced_openai_service.client:
                try:
                    logger.info("Enhancing extraction with OpenAI")
                    openai_result = enhanced_openai_service.extract_sds_information(
                        full_text, 
                        use_cache=True
                    )
                    
                    # Merge OpenAI results with traditional extraction
                    if openai_result.get('extracted_data'):
                        self._merge_openai_extraction(extracted_data, openai_result['extracted_data'])
                        
                        # Update confidence based on OpenAI analysis
                        openai_confidence = openai_result.get('confidence', 0.0)
                        extracted_data.extraction_confidence = max(
                            traditional_confidence, 
                            (traditional_confidence + openai_confidence) / 2
                        )
                        
                        logger.info(f"OpenAI enhancement completed. Traditional: {traditional_confidence:.2f}, "
                                  f"OpenAI: {openai_confidence:.2f}, Final: {extracted_data.extraction_confidence:.2f}")
                    else:
                        extracted_data.extraction_confidence = traditional_confidence
                        
                except Exception as e:
                    logger.warning(f"OpenAI enhancement failed, using traditional extraction: {e}")
                    extracted_data.extraction_confidence = traditional_confidence
            else:
                extracted_data.extraction_confidence = traditional_confidence
            
            logger.info(f"SDS extraction completed with confidence: {extracted_data.extraction_confidence:.2f}")
            return extracted_data
            
        except Exception as e:
            logger.error(f"SDS extraction failed: {str(e)}")
            raise Exception(f"SDS extraction failed: {str(e)}")
    
    def _extract_pdf_text(self, pdf_path: str) -> List[Dict]:
        """Extract text blocks from PDF with position information"""
        text_blocks = []
        
        try:
            pdf_document = fitz.open(pdf_path)
            
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
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
                                    'font_size': span.get("size", 12) if line.get("spans") else 12
                                })
            
            pdf_document.close()
            return text_blocks
            
        except Exception as e:
            logger.error(f"PDF text extraction failed: {str(e)}")
            raise
    
    def _parse_sds_sections(self, text_blocks: List[Dict]) -> Dict[int, str]:
        """Parse PDF text into SDS sections (1-16)"""
        sections = {}
        current_section = None
        current_text = []
        
        for block in text_blocks:
            text = block['text']
            
            # Check if this line starts a new section
            for section_num, pattern in self.section_patterns.items():
                if pattern.search(text):
                    # Save previous section
                    if current_section is not None and current_text:
                        sections[current_section] = " ".join(current_text)
                    
                    # Start new section
                    current_section = section_num
                    current_text = [text]
                    break
            else:
                # Add to current section
                if current_section is not None:
                    current_text.append(text)
        
        # Save final section
        if current_section is not None and current_text:
            sections[current_section] = " ".join(current_text)
        
        return sections
    
    def _extract_product_identification(self, section_text: str, data: ExtractedSDSData):
        """Extract product identification from Section 1"""
        # Product name
        for pattern in self.extraction_patterns['product_name']:
            match = pattern.search(section_text)
            if match:
                data.product_name = match.group(1).strip()
                break
        
        # Manufacturer
        for pattern in self.extraction_patterns['manufacturer']:
            match = pattern.search(section_text)
            if match:
                data.manufacturer = match.group(1).strip()
                break
        
        # Manufacturer code
        code_pattern = re.compile(r'(?:product\s*code|item\s*number|part\s*number)\s*:?\s*(.+?)(?:\n|$)', re.IGNORECASE)
        match = code_pattern.search(section_text)
        if match:
            data.manufacturer_code = match.group(1).strip()
    
    def _extract_hazard_identification(self, section_text: str, data: ExtractedSDSData):
        """Extract hazard identification from Section 2"""
        # H-codes
        h_codes = self.h_code_pattern.findall(section_text)
        if h_codes:
            data.hazard_statements = [f"H{code}" for code in h_codes]
        
        # P-codes
        p_codes = self.p_code_pattern.findall(section_text)
        if p_codes:
            data.precautionary_statements = [f"P{code}" for code in p_codes]
        
        # Signal word
        signal_pattern = re.compile(r'signal\s*word\s*:?\s*(danger|warning)', re.IGNORECASE)
        match = signal_pattern.search(section_text)
        if match:
            data.signal_word = match.group(1).upper()
    
    def _extract_composition_info(self, section_text: str, data: ExtractedSDSData):
        """Extract composition information from Section 3"""
        # Chemical name
        chem_pattern = re.compile(r'(?:chemical\s*name|substance)\s*:?\s*(.+?)(?:\n|cas|concentration)', re.IGNORECASE)
        match = chem_pattern.search(section_text)
        if match:
            data.chemical_name = match.group(1).strip()
        
        # CAS number
        for pattern in self.extraction_patterns['cas_number']:
            match = pattern.search(section_text)
            if match:
                data.cas_number = match.group(1) if len(match.groups()) == 1 else match.group(2)
                break
        
        # Concentration
        conc_pattern = re.compile(r'concentration\s*:?\s*(\d+(?:\.\d+)?%?)', re.IGNORECASE)
        match = conc_pattern.search(section_text)
        if match:
            data.concentration = match.group(1)
    
    def _extract_first_aid_measures(self, section_text: str, data: ExtractedSDSData):
        """Extract first aid measures from Section 4"""
        # Extract by exposure route
        routes = {
            'inhalation': 'first_aid_inhalation',
            'skin': 'first_aid_skin',
            'eye': 'first_aid_eyes',
            'ingestion': 'first_aid_ingestion'
        }
        
        for route, field in routes.items():
            pattern = re.compile(f'{route}.*?:(.+?)(?:skin contact|eye contact|ingestion|if swallowed|section|$)', 
                               re.IGNORECASE | re.DOTALL)
            match = pattern.search(section_text)
            if match:
                setattr(data, field, match.group(1).strip()[:500])  # Limit length
    
    def _extract_firefighting_measures(self, section_text: str, data: ExtractedSDSData):
        """Extract firefighting measures from Section 5"""
        # Extinguishing media
        media_pattern = re.compile(r'extinguishing\s*media.*?:(.+?)(?:unsuitable|special|section|$)', 
                                 re.IGNORECASE | re.DOTALL)
        match = media_pattern.search(section_text)
        if match:
            data.extinguishing_media = match.group(1).strip()[:300]
    
    def _extract_spill_measures(self, section_text: str, data: ExtractedSDSData):
        """Extract spill cleanup measures from Section 6"""
        spill_pattern = re.compile(r'(?:cleanup|spill|release).*?:(.+?)(?:section|environmental|$)', 
                                 re.IGNORECASE | re.DOTALL)
        match = spill_pattern.search(section_text)
        if match:
            data.spill_cleanup = match.group(1).strip()[:500]
    
    def _extract_handling_storage(self, section_text: str, data: ExtractedSDSData):
        """Extract handling and storage from Section 7"""
        # Handling precautions
        handling_pattern = re.compile(r'handling.*?:(.+?)(?:storage|section|$)', 
                                    re.IGNORECASE | re.DOTALL)
        match = handling_pattern.search(section_text)
        if match:
            data.handling_precautions = match.group(1).strip()[:400]
        
        # Storage requirements
        storage_pattern = re.compile(r'storage.*?:(.+?)(?:section|incompatible|$)', 
                                   re.IGNORECASE | re.DOTALL)
        match = storage_pattern.search(section_text)
        if match:
            data.storage_requirements = match.group(1).strip()[:400]
    
    def _extract_exposure_controls(self, section_text: str, data: ExtractedSDSData):
        """Extract exposure controls from Section 8"""
        # PPE requirements
        ppe_pattern = re.compile(r'(?:personal\s*protective|ppe).*?:(.+?)(?:section|engineering|$)', 
                               re.IGNORECASE | re.DOTALL)
        match = ppe_pattern.search(section_text)
        if match:
            data.ppe_requirements = match.group(1).strip()[:400]
    
    def _extract_physical_properties(self, section_text: str, data: ExtractedSDSData):
        """Extract physical and chemical properties from Section 9"""
        # Physical state
        for state, pattern in self.physical_state_patterns.items():
            if pattern.search(section_text):
                data.physical_state = state
                break
        
        # Color
        color_pattern = re.compile(r'color.*?:?\s*(.+?)(?:\n|odor|appearance)', re.IGNORECASE)
        match = color_pattern.search(section_text)
        if match:
            data.color = match.group(1).strip()
        
        # Odor
        odor_pattern = re.compile(r'odor.*?:?\s*(.+?)(?:\n|ph|flash)', re.IGNORECASE)
        match = odor_pattern.search(section_text)
        if match:
            data.odor = match.group(1).strip()
        
        # pH value
        for pattern in self.extraction_patterns['ph_value']:
            match = pattern.search(section_text)
            if match:
                if len(match.groups()) == 1:
                    try:
                        data.ph_value = float(match.group(1))
                    except ValueError:
                        pass
                elif len(match.groups()) == 2:
                    try:
                        data.ph_range_min = float(match.group(1))
                        data.ph_range_max = float(match.group(2))
                    except ValueError:
                        pass
                break
        
        # Flash point
        for pattern in self.extraction_patterns['flash_point']:
            match = pattern.search(section_text)
            if match:
                try:
                    data.flash_point = float(match.group(1))
                except ValueError:
                    pass
                break
    
    def _extract_stability_reactivity(self, section_text: str, data: ExtractedSDSData):
        """Extract stability and reactivity from Section 10"""
        incompatible_pattern = re.compile(r'incompatible.*?:(.+?)(?:section|hazardous|$)', 
                                        re.IGNORECASE | re.DOTALL)
        match = incompatible_pattern.search(section_text)
        if match:
            data.incompatible_materials = match.group(1).strip()[:300]
    
    def _extract_toxicological_info(self, section_text: str, data: ExtractedSDSData):
        """Extract toxicological information from Section 11"""
        tox_pattern = re.compile(r'(?:acute|chronic|toxicity).*?:(.+?)(?:section|ecological|$)', 
                               re.IGNORECASE | re.DOTALL)
        match = tox_pattern.search(section_text)
        if match:
            data.toxicity_data = match.group(1).strip()[:500]
    
    def _extract_ecological_info(self, section_text: str, data: ExtractedSDSData):
        """Extract ecological information from Section 12"""
        eco_pattern = re.compile(r'(?:environmental|ecological).*?:(.+?)(?:section|disposal|$)', 
                               re.IGNORECASE | re.DOTALL)
        match = eco_pattern.search(section_text)
        if match:
            data.environmental_effects = match.group(1).strip()[:400]
    
    def _extract_disposal_info(self, section_text: str, data: ExtractedSDSData):
        """Extract disposal information from Section 13"""
        disposal_pattern = re.compile(r'disposal.*?:(.+?)(?:section|transport|$)', 
                                    re.IGNORECASE | re.DOTALL)
        match = disposal_pattern.search(section_text)
        if match:
            data.disposal_methods = match.group(1).strip()[:400]
    
    def _extract_transport_info(self, section_text: str, data: ExtractedSDSData):
        """Extract transport information from Section 14"""
        # UN number
        for pattern in self.extraction_patterns['un_number']:
            match = pattern.search(section_text)
            if match:
                data.un_number = match.group(2) if len(match.groups()) == 2 else match.group(1)
                break
        
        # Proper shipping name
        psn_pattern = re.compile(r'proper\s*shipping\s*name.*?:?\s*(.+?)(?:\n|un\s*class|hazard)', re.IGNORECASE)
        match = psn_pattern.search(section_text)
        if match:
            data.proper_shipping_name = match.group(1).strip()
        
        # Hazard class
        for pattern in self.extraction_patterns['hazard_class']:
            match = pattern.search(section_text)
            if match:
                data.hazard_class = match.group(1)
                break
        
        # Packing group
        for pattern in self.extraction_patterns['packing_group']:
            match = pattern.search(section_text)
            if match:
                data.packing_group = match.group(1)
                break
    
    def _extract_regulatory_info(self, section_text: str, data: ExtractedSDSData):
        """Extract regulatory information from Section 15"""
        reg_pattern = re.compile(r'(?:regulations|regulatory).*?:(.+?)(?:section|other|$)', 
                               re.IGNORECASE | re.DOTALL)
        match = reg_pattern.search(section_text)
        if match:
            data.regulatory_info = match.group(1).strip()[:400]
    
    def _extract_other_info(self, section_text: str, data: ExtractedSDSData):
        """Extract other information from Section 16"""
        # Version
        for pattern in self.extraction_patterns['version']:
            match = pattern.search(section_text)
            if match:
                data.version = match.group(1)
                break
        
        # Revision date
        for pattern in self.extraction_patterns['revision_date']:
            match = pattern.search(section_text)
            if match:
                try:
                    date_str = match.group(1)
                    # Try to parse different date formats
                    for fmt in ['%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%m-%d-%Y', '%d.%m.%Y']:
                        try:
                            data.revision_date = datetime.strptime(date_str, fmt)
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass
                break
    
    def _detect_sds_format(self, text: str) -> str:
        """Detect the SDS format/generator"""
        text_lower = text.lower()
        
        for generator in self.known_sds_generators:
            if generator in text_lower:
                return generator.upper()
        
        # Check for specific format indicators
        if 'ghs' in text_lower:
            return 'GHS'
        elif 'osha' in text_lower:
            return 'OSHA'
        elif 'whmis' in text_lower:
            return 'WHMIS'
        
        return 'UNKNOWN'
    
    def _detect_language(self, text: str) -> str:
        """Detect the language of the SDS document"""
        if nlp is None:
            return 'EN'  # Default to English if spaCy not available
        
        # Sample first 1000 characters for language detection
        sample = text[:1000]
        
        # Simple heuristic - check for common non-English words
        french_indicators = ['sécurité', 'produit', 'fabricant', 'danger']
        spanish_indicators = ['seguridad', 'producto', 'fabricante', 'peligro']
        german_indicators = ['sicherheit', 'produkt', 'hersteller', 'gefahr']
        
        sample_lower = sample.lower()
        
        if any(word in sample_lower for word in french_indicators):
            return 'FR'
        elif any(word in sample_lower for word in spanish_indicators):
            return 'ES'
        elif any(word in sample_lower for word in german_indicators):
            return 'DE'
        
        return 'EN'  # Default to English
    
    def _calculate_extraction_confidence(self, data: ExtractedSDSData, full_text: str) -> float:
        """Calculate overall confidence in the extraction results"""
        confidence_factors = []
        
        # Critical fields present
        critical_fields = [
            data.product_name, data.manufacturer, data.un_number, 
            data.hazard_class, data.proper_shipping_name
        ]
        critical_score = sum(1 for field in critical_fields if field) / len(critical_fields)
        confidence_factors.append(('critical_fields', critical_score, 0.4))
        
        # SDS structure indicators
        section_indicators = ['section 1', 'section 2', 'hazard identification', 'physical properties']
        structure_score = sum(1 for indicator in section_indicators if indicator in full_text.lower()) / len(section_indicators)
        confidence_factors.append(('structure', structure_score, 0.2))
        
        # Data format quality
        format_score = 0.8 if data.sds_format != 'UNKNOWN' else 0.3
        confidence_factors.append(('format', format_score, 0.1))
        
        # Hazard information present
        hazard_score = 0.0
        if data.hazard_statements:
            hazard_score += 0.4
        if data.precautionary_statements:
            hazard_score += 0.3
        if data.signal_word:
            hazard_score += 0.3
        confidence_factors.append(('hazard_info', hazard_score, 0.2))
        
        # Document length indicator (SDS should be substantial)
        length_score = min(1.0, len(full_text) / 5000)  # Normalize to 5000 chars
        confidence_factors.append(('length', length_score, 0.1))
        
        # Calculate weighted average
        total_confidence = sum(score * weight for _, score, weight in confidence_factors)
        
        return round(total_confidence, 3)

    def _merge_openai_extraction(self, traditional_data: ExtractedSDSData, openai_data: Dict[str, Any]):
        """
        Merge OpenAI extraction results with traditional extraction
        OpenAI results take precedence for fields where traditional extraction failed
        """
        try:
            # Product identification
            if not traditional_data.product_name and openai_data.get('product_name'):
                traditional_data.product_name = openai_data['product_name']
            
            if not traditional_data.manufacturer and openai_data.get('manufacturer'):
                traditional_data.manufacturer = openai_data['manufacturer']
            
            if not traditional_data.cas_number and openai_data.get('cas_number'):
                traditional_data.cas_number = openai_data['cas_number']
            
            # Transport information
            if not traditional_data.un_number and openai_data.get('un_number'):
                traditional_data.un_number = openai_data['un_number']
            
            if not traditional_data.proper_shipping_name and openai_data.get('transport_information', {}).get('proper_shipping_name'):
                traditional_data.proper_shipping_name = openai_data['transport_information']['proper_shipping_name']
            
            if not traditional_data.hazard_class and openai_data.get('hazard_class'):
                traditional_data.hazard_class = openai_data['hazard_class']
            
            if not traditional_data.packing_group and openai_data.get('packing_group'):
                traditional_data.packing_group = openai_data['packing_group']
            
            # Physical properties
            if not traditional_data.physical_state and openai_data.get('physical_state'):
                traditional_data.physical_state = openai_data['physical_state']
            
            if not traditional_data.flash_point and openai_data.get('flash_point'):
                try:
                    # Extract numeric value from flash point string
                    flash_point_str = str(openai_data['flash_point'])
                    flash_point_match = re.search(r'(\d+(?:\.\d+)?)', flash_point_str)
                    if flash_point_match:
                        traditional_data.flash_point = float(flash_point_match.group(1))
                except (ValueError, TypeError):
                    pass
            
            # Hazard information
            if not traditional_data.hazard_statements and openai_data.get('hazard_statements'):
                traditional_data.hazard_statements = openai_data['hazard_statements']
            
            if not traditional_data.precautionary_statements and openai_data.get('precautionary_statements'):
                traditional_data.precautionary_statements = openai_data['precautionary_statements']
            
            # First aid measures
            first_aid = openai_data.get('first_aid_measures', {})
            if isinstance(first_aid, dict):
                if not traditional_data.first_aid_inhalation and first_aid.get('inhalation'):
                    traditional_data.first_aid_inhalation = first_aid['inhalation'][:500]
                
                if not traditional_data.first_aid_skin and first_aid.get('skin_contact'):
                    traditional_data.first_aid_skin = first_aid['skin_contact'][:500]
                
                if not traditional_data.first_aid_eyes and first_aid.get('eye_contact'):
                    traditional_data.first_aid_eyes = first_aid['eye_contact'][:500]
                
                if not traditional_data.first_aid_ingestion and first_aid.get('ingestion'):
                    traditional_data.first_aid_ingestion = first_aid['ingestion'][:500]
            
            # Other safety information
            if not traditional_data.extinguishing_media and openai_data.get('fire_fighting_measures'):
                traditional_data.extinguishing_media = str(openai_data['fire_fighting_measures'])[:300]
            
            if not traditional_data.spill_cleanup and openai_data.get('accidental_release_measures'):
                traditional_data.spill_cleanup = str(openai_data['accidental_release_measures'])[:500]
            
            if not traditional_data.handling_precautions and openai_data.get('handling_and_storage'):
                traditional_data.handling_precautions = str(openai_data['handling_and_storage'])[:400]
            
            if not traditional_data.incompatible_materials and openai_data.get('incompatible_materials'):
                if isinstance(openai_data['incompatible_materials'], list):
                    traditional_data.incompatible_materials = ', '.join(openai_data['incompatible_materials'])[:300]
                else:
                    traditional_data.incompatible_materials = str(openai_data['incompatible_materials'])[:300]
            
            logger.info("Successfully merged OpenAI extraction results with traditional extraction")
            
        except Exception as e:
            logger.warning(f"Error merging OpenAI extraction results: {e}")
            # Continue with traditional extraction only


class SDSUploadService:
    """
    Service for handling SDS document uploads with AI extraction
    """
    
    def __init__(self):
        self.extractor = SDSAIExtractor()
    
    def process_sds_upload(self, 
                          file_obj, 
                          uploaded_by: User,
                          dangerous_good_id: Optional[str] = None,
                          source_name: str = "USER_UPLOAD") -> Dict[str, Any]:
        """
        Process an uploaded SDS document with AI extraction
        
        Args:
            file_obj: Uploaded file object
            uploaded_by: User who uploaded the file
            dangerous_good_id: Optional dangerous good to link to
            source_name: Name of the data source
            
        Returns:
            Dictionary with processing results and extracted data
        """
        try:
            # Save uploaded file
            file_path = default_storage.save(
                f'sds_uploads/{file_obj.name}',
                ContentFile(file_obj.read())
            )
            full_file_path = default_storage.path(file_path)
            
            # Extract data using AI
            extracted_data = self.extractor.extract_from_pdf(full_file_path)
            
            # Create Document record
            document = Document.objects.create(
                title=extracted_data.product_name or f"SDS Upload {timezone.now().strftime('%Y%m%d_%H%M%S')}",
                file_type='PDF',
                file_size=file_obj.size,
                uploaded_by=uploaded_by,
                file=file_path
            )
            
            # Find or create data source
            data_source, created = SDSDataSource.objects.get_or_create(
                short_name=source_name,
                defaults={
                    'name': f'{source_name} - User Uploads',
                    'source_type': DataSourceType.USER_UPLOAD,
                    'organization': 'User Community',
                    'status': DataSourceStatus.ACTIVE,
                }
            )
            
            # Try to link to dangerous good
            dangerous_good = None
            if dangerous_good_id:
                try:
                    dangerous_good = DangerousGood.objects.get(id=dangerous_good_id)
                except DangerousGood.DoesNotExist:
                    pass
            
            # Auto-match dangerous good based on UN number
            if not dangerous_good and extracted_data.un_number:
                try:
                    dangerous_good = DangerousGood.objects.filter(
                        un_number=extracted_data.un_number
                    ).first()
                except Exception:
                    pass
            
            if not dangerous_good:
                # Create a basic dangerous good record if none found
                dangerous_good = DangerousGood.objects.create(
                    un_number=extracted_data.un_number or "UNKNOWN",
                    proper_shipping_name=extracted_data.proper_shipping_name or extracted_data.product_name or "Unknown Product",
                    hazard_class=extracted_data.hazard_class or "9",  # Miscellaneous default
                    simplified_name=extracted_data.product_name or "Unknown Product"
                )
            
            # Create Enhanced SDS record
            enhanced_sds = EnhancedSafetyDataSheet.objects.create(
                dangerous_good=dangerous_good,
                product_name=extracted_data.product_name or "Unknown Product",
                manufacturer=extracted_data.manufacturer or "Unknown",
                manufacturer_code=extracted_data.manufacturer_code or "",
                document=document,
                version=extracted_data.version or "1.0",
                revision_date=extracted_data.revision_date or timezone.now().date(),
                language=extracted_data.language_detected,
                country_code="AU",  # Default to Australia
                regulatory_standard="GHS",
                
                # Physical properties
                physical_state=extracted_data.physical_state,
                color=extracted_data.color or "",
                odor=extracted_data.odor or "",
                flash_point_celsius=extracted_data.flash_point,
                auto_ignition_temp_celsius=extracted_data.auto_ignition_temp,
                
                # pH data
                ph_value_min=extracted_data.ph_range_min or extracted_data.ph_value,
                ph_value_max=extracted_data.ph_range_max or extracted_data.ph_value,
                ph_extraction_confidence=extracted_data.extraction_confidence if extracted_data.ph_value else None,
                ph_source='SDS_EXTRACTED' if extracted_data.ph_value else '',
                
                # Safety information
                hazard_statements=extracted_data.hazard_statements,
                precautionary_statements=extracted_data.precautionary_statements,
                first_aid_measures={
                    'inhalation': extracted_data.first_aid_inhalation,
                    'skin': extracted_data.first_aid_skin,
                    'eyes': extracted_data.first_aid_eyes,
                    'ingestion': extracted_data.first_aid_ingestion,
                },
                fire_fighting_measures={
                    'extinguishing_media': extracted_data.extinguishing_media,
                },
                spill_cleanup_procedures=extracted_data.spill_cleanup or "",
                storage_requirements=extracted_data.storage_requirements or "",
                handling_precautions=extracted_data.handling_precautions or "",
                disposal_methods=extracted_data.disposal_methods or "",
                
                # Enhanced fields
                primary_source=data_source,
                data_completeness_score=self._calculate_completeness_score(extracted_data),
                confidence_score=extracted_data.extraction_confidence,
                verification_status='UNVERIFIED',
                created_by=uploaded_by,
            )
            
            # Perform quality checks
            self._perform_quality_checks(enhanced_sds, extracted_data)
            
            # Clean up temporary file if needed
            if default_storage.exists(file_path):
                # Keep the file for now, but could implement cleanup logic here
                pass
            
            return {
                'success': True,
                'sds_id': str(enhanced_sds.id),
                'extraction_confidence': extracted_data.extraction_confidence,
                'data_completeness': enhanced_sds.data_completeness_score,
                'extracted_data': extracted_data,
                'dangerous_good_matched': dangerous_good.id if dangerous_good else None,
                'quality_checks_performed': True,
            }
            
        except Exception as e:
            logger.error(f"SDS upload processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'extraction_confidence': 0.0,
            }
    
    def _calculate_completeness_score(self, data: ExtractedSDSData) -> float:
        """Calculate data completeness score based on extracted fields"""
        total_fields = 30  # Approximate number of key fields
        filled_fields = 0
        
        # Check each important field
        fields_to_check = [
            data.product_name, data.manufacturer, data.cas_number, data.un_number,
            data.hazard_class, data.proper_shipping_name, data.physical_state,
            data.color, data.odor, data.flash_point, data.version, data.revision_date,
            data.signal_word, data.first_aid_inhalation, data.first_aid_skin,
            data.first_aid_eyes, data.handling_precautions, data.storage_requirements,
            data.spill_cleanup, data.disposal_methods, data.extinguishing_media,
            data.ppe_requirements, data.incompatible_materials, data.ph_value,
        ]
        
        # Check lists
        if data.hazard_statements:
            filled_fields += 1
        if data.precautionary_statements:
            filled_fields += 1
        
        # Count non-None fields
        filled_fields += sum(1 for field in fields_to_check if field is not None)
        
        return round(filled_fields / total_fields, 3)
    
    def _perform_quality_checks(self, sds: EnhancedSafetyDataSheet, extracted_data: ExtractedSDSData):
        """Perform automated quality checks on the extracted SDS data"""
        
        # Completeness check
        completeness_score = sds.data_completeness_score
        SDSQualityCheck.objects.create(
            sds=sds,
            check_type='COMPLETENESS',
            check_result='PASSED' if completeness_score > 0.7 else 'WARNING' if completeness_score > 0.4 else 'FAILED',
            score=completeness_score,
            details={
                'completeness_score': completeness_score,
                'missing_critical_fields': self._get_missing_critical_fields(extracted_data)
            },
            automated=True
        )
        
        # Format validation check
        format_valid = extracted_data.sds_format != 'UNKNOWN'
        SDSQualityCheck.objects.create(
            sds=sds,
            check_type='FORMAT',
            check_result='PASSED' if format_valid else 'WARNING',
            score=1.0 if format_valid else 0.5,
            details={
                'detected_format': extracted_data.sds_format,
                'language': extracted_data.language_detected
            },
            automated=True
        )
        
        # Regulatory compliance check (basic)
        regulatory_score = 1.0
        regulatory_issues = []
        
        if not extracted_data.hazard_statements:
            regulatory_score -= 0.3
            regulatory_issues.append("Missing GHS hazard statements")
        
        if not extracted_data.un_number and extracted_data.hazard_class:
            regulatory_score -= 0.2
            regulatory_issues.append("Missing UN number for dangerous good")
        
        SDSQualityCheck.objects.create(
            sds=sds,
            check_type='REGULATORY',
            check_result='PASSED' if regulatory_score > 0.8 else 'WARNING' if regulatory_score > 0.5 else 'FAILED',
            score=max(0.0, regulatory_score),
            details={
                'regulatory_score': regulatory_score,
                'issues': regulatory_issues
            },
            automated=True
        )
    
    def _get_missing_critical_fields(self, data: ExtractedSDSData) -> List[str]:
        """Get list of missing critical fields"""
        missing = []
        
        critical_fields = {
            'product_name': data.product_name,
            'manufacturer': data.manufacturer,
            'hazard_class': data.hazard_class,
            'revision_date': data.revision_date,
            'first_aid_measures': data.first_aid_inhalation or data.first_aid_skin,
            'physical_state': data.physical_state,
        }
        
        for field_name, value in critical_fields.items():
            if not value:
                missing.append(field_name)
        
        return missing


# Utility functions
def process_sds_upload(file_obj, user, dangerous_good_id=None):
    """
    Convenience function for processing SDS uploads
    """
    service = SDSUploadService()
    return service.process_sds_upload(file_obj, user, dangerous_good_id)


def extract_sds_from_path(pdf_path: str) -> ExtractedSDSData:
    """
    Convenience function for extracting SDS data from a file path
    """
    extractor = SDSAIExtractor()
    return extractor.extract_from_pdf(pdf_path)
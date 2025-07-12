# sds/services.py
import logging
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from decimal import Decimal, InvalidOperation

import fitz  # PyMuPDF
from django.utils import timezone

from .models import SafetyDataSheet

logger = logging.getLogger(__name__)

class SDSDocumentProcessor:
    """
    Service class for processing SDS documents to extract pH values 
    specifically for Class 8 (corrosive) dangerous goods.
    """
    
    def __init__(self):
        # pH value extraction patterns
        self.ph_patterns = [
            # Direct pH values: "pH: 1.2", "pH = 3.5", "pH 7.0"
            re.compile(r'pH\s*[:=]?\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
            
            # pH ranges: "pH 2.0-3.5", "pH: 1.2 to 2.8"
            re.compile(r'pH\s*[:=]?\s*(\d+(?:\.\d+)?)\s*[-–to]\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
            
            # pH approximations: "pH ~ 1.5", "pH approximately 2.0"
            re.compile(r'pH\s*(?:~|approximately|about|around)\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
            
            # pH less than/greater than: "pH < 2", "pH > 12"
            re.compile(r'pH\s*([<>])\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
            
            # Specific concentrations: "pH 1.0 (1% solution)", "pH 2.5 at 25°C"
            re.compile(r'pH\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:\([^)]*\)|\sat\s[\d°C\s]+)?', re.IGNORECASE),
            
            # Alternative pH formats: "pH value: 3.2", "The pH is 1.8"
            re.compile(r'pH\s+(?:value|level|is)\s*[:=]?\s*(\d+(?:\.\d+)?)', re.IGNORECASE),
        ]
        
        # Corrosive/acid indicators for Class 8 materials
        self.corrosive_indicators = [
            'corrosive', 'acid', 'acidic', 'strongly acidic', 'highly acidic',
            'alkaline', 'basic', 'caustic', 'strongly alkaline', 'highly alkaline',
            'hydrochloric acid', 'sulfuric acid', 'nitric acid', 'phosphoric acid',
            'sodium hydroxide', 'potassium hydroxide', 'ammonia', 'ammonium hydroxide'
        ]
        
        # pH measurement conditions patterns
        self.conditions_patterns = [
            # Temperature conditions
            re.compile(r'(?:at|@)\s*(\d+)\s*°?\s*C', re.IGNORECASE),
            re.compile(r'(\d+)\s*°?\s*C', re.IGNORECASE),
            
            # Concentration conditions
            re.compile(r'(\d+(?:\.\d+)?)\s*%\s*(?:solution|concentration)', re.IGNORECASE),
            re.compile(r'(?:in|as)\s*(\d+(?:\.\d+)?)\s*%', re.IGNORECASE),
        ]
        
        # Food packaging segregation keywords
        self.food_related_keywords = [
            'food', 'foodstuff', 'edible', 'consumable', 'beverage', 'drinking',
            'food grade', 'food contact', 'food packaging', 'packaging material',
            'container for food', 'food container', 'food additive'
        ]
    
    def extract_text_from_sds_pdf(self, sds: SafetyDataSheet) -> List[Dict]:
        """
        Extract text from SDS PDF document with focus on sections containing pH information.
        
        Args:
            sds: SafetyDataSheet model instance
            
        Returns:
            List of dictionaries with text blocks and metadata
        """
        text_blocks = []
        
        try:
            # Access the PDF through the document relation
            pdf_path = sds.document.file.path
            pdf_document = fitz.open(pdf_path)
            
            logger.info(f"Extracting text from SDS PDF: {sds.product_name} ({pdf_document.page_count} pages)")
            
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
                                    'confidence': 1.0
                                })
            
            pdf_document.close()
            
            logger.info(f"Extracted {len(text_blocks)} text blocks from SDS")
            return text_blocks
            
        except Exception as e:
            logger.error(f"Failed to extract text from SDS PDF {sds.id}: {str(e)}")
            raise Exception(f"SDS text extraction failed: {str(e)}")
    
    def extract_ph_values(self, text_blocks: List[Dict]) -> Dict:
        """
        Extract pH values and related information from SDS text blocks.
        
        Args:
            text_blocks: List of text blocks from PDF
            
        Returns:
            Dictionary containing pH information and confidence scores
        """
        # Combine text for analysis, focusing on relevant sections
        full_text = " ".join([block['text'] for block in text_blocks])
        
        # Focus on sections likely to contain pH information
        relevant_sections = self._identify_relevant_sections(text_blocks)
        section_text = " ".join(relevant_sections)
        
        # If no relevant sections found, use full text
        analysis_text = section_text if section_text.strip() else full_text
        
        ph_data = {
            'ph_value_min': None,
            'ph_value_max': None,
            'ph_measurement_conditions': '',
            'ph_extraction_confidence': 0.0,
            'ph_source': 'SDS_EXTRACTED',
            'extraction_details': []
        }
        
        # Extract pH values using multiple patterns
        matches = []
        for pattern in self.ph_patterns:
            pattern_matches = pattern.finditer(analysis_text)
            for match in pattern_matches:
                matches.append({
                    'match': match,
                    'pattern_type': self._classify_pattern_type(match),
                    'context': self._get_context_around_match(analysis_text, match)
                })
        
        if not matches:
            logger.info("No pH values found in SDS document")
            return ph_data
        
        # Process matches to extract pH values
        ph_values = []
        conditions = []
        
        for match_data in matches:
            match = match_data['match']
            pattern_type = match_data['pattern_type']
            context = match_data['context']
            
            if pattern_type == 'single_value':
                try:
                    ph_value = float(match.group(1))
                    if 0 <= ph_value <= 14:  # Valid pH range
                        ph_values.append(ph_value)
                        ph_data['extraction_details'].append({
                            'value': ph_value,
                            'context': context,
                            'confidence': self._calculate_confidence(context, pattern_type)
                        })
                except (ValueError, IndexError):
                    continue
                    
            elif pattern_type == 'range':
                try:
                    ph_min = float(match.group(1))
                    ph_max = float(match.group(2))
                    if 0 <= ph_min <= 14 and 0 <= ph_max <= 14 and ph_min <= ph_max:
                        ph_data['ph_value_min'] = ph_min
                        ph_data['ph_value_max'] = ph_max
                        ph_data['extraction_details'].append({
                            'range': f"{ph_min}-{ph_max}",
                            'context': context,
                            'confidence': self._calculate_confidence(context, pattern_type)
                        })
                except (ValueError, IndexError):
                    continue
            
            # Extract measurement conditions
            conditions.extend(self._extract_conditions(context))
        
        # Set pH values if not already set from ranges
        if ph_data['ph_value_min'] is None and ph_values:
            if len(ph_values) == 1:
                ph_data['ph_value_min'] = ph_data['ph_value_max'] = ph_values[0]
            else:
                ph_data['ph_value_min'] = min(ph_values)
                ph_data['ph_value_max'] = max(ph_values)
        
        # Set measurement conditions
        if conditions:
            ph_data['ph_measurement_conditions'] = '; '.join(set(conditions))
        
        # Calculate overall confidence
        if ph_data['extraction_details']:
            confidences = [detail.get('confidence', 0) for detail in ph_data['extraction_details']]
            ph_data['ph_extraction_confidence'] = sum(confidences) / len(confidences)
        
        logger.info(f"Extracted pH data: {ph_data}")
        return ph_data
    
    def _identify_relevant_sections(self, text_blocks: List[Dict]) -> List[str]:
        """
        Identify SDS sections likely to contain pH information.
        """
        relevant_text = []
        current_section = ""
        
        # Section headers that commonly contain pH information
        ph_sections = [
            'section 9', 'physical', 'chemical properties', 'physicochemical',
            'section 3', 'composition', 'ingredients',
            'section 2', 'hazard', 'identification'
        ]
        
        for block in text_blocks:
            text = block['text'].lower()
            
            # Check if this is a section header
            if any(section in text for section in ph_sections):
                current_section = "relevant"
            elif text.startswith('section') and not any(section in text for section in ph_sections):
                current_section = "other"
            
            # Include text from relevant sections or text containing pH/corrosive keywords
            if (current_section == "relevant" or 
                'ph' in text or 
                any(indicator in text for indicator in self.corrosive_indicators)):
                relevant_text.append(block['text'])
        
        return relevant_text
    
    def _classify_pattern_type(self, match) -> str:
        """
        Classify the type of pH pattern match.
        """
        match_text = match.group(0).lower()
        
        if '-' in match_text or 'to' in match_text:
            return 'range'
        elif '<' in match_text or '>' in match_text:
            return 'inequality'
        else:
            return 'single_value'
    
    def _get_context_around_match(self, text: str, match, window: int = 100) -> str:
        """
        Get context text around a pH match for confidence calculation.
        """
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        return text[start:end]
    
    def _calculate_confidence(self, context: str, pattern_type: str) -> float:
        """
        Calculate confidence score for pH extraction based on context.
        """
        confidence = 0.5  # Base confidence
        
        context_lower = context.lower()
        
        # Higher confidence for specific contexts
        if any(indicator in context_lower for indicator in ['section 9', 'physical properties']):
            confidence += 0.3
        
        if any(indicator in context_lower for indicator in self.corrosive_indicators):
            confidence += 0.2
        
        # Pattern type confidence
        if pattern_type == 'range':
            confidence += 0.1
        elif pattern_type == 'single_value':
            confidence += 0.05
        
        # Measurement conditions boost confidence
        if any(condition in context_lower for condition in ['°c', 'solution', '%', 'concentration']):
            confidence += 0.1
        
        return min(1.0, confidence)
    
    def _extract_conditions(self, context: str) -> List[str]:
        """
        Extract measurement conditions from context text.
        """
        conditions = []
        
        for pattern in self.conditions_patterns:
            matches = pattern.finditer(context)
            for match in matches:
                conditions.append(match.group(0))
        
        return conditions
    
    def process_sds_for_ph(self, sds: SafetyDataSheet) -> bool:
        """
        Process an SDS document to extract and store pH information.
        Only processes Class 8 (corrosive) materials.
        
        Args:
            sds: SafetyDataSheet instance to process
            
        Returns:
            True if pH data was extracted and saved, False otherwise
        """
        # Only process Class 8 (corrosive) materials
        if not sds.is_corrosive_class_8:
            logger.info(f"Skipping pH extraction for non-Class 8 material: {sds.product_name}")
            return False
        
        try:
            # Extract text from PDF
            text_blocks = self.extract_text_from_sds_pdf(sds)
            
            # Extract pH information
            ph_data = self.extract_ph_values(text_blocks)
            
            # Update SDS model with pH data if found
            if ph_data['ph_value_min'] is not None or ph_data['ph_value_max'] is not None:
                sds.ph_value_min = ph_data['ph_value_min']
                sds.ph_value_max = ph_data['ph_value_max']
                sds.ph_measurement_conditions = ph_data['ph_measurement_conditions']
                sds.ph_extraction_confidence = ph_data['ph_extraction_confidence']
                sds.ph_source = ph_data['ph_source']
                sds.ph_updated_at = timezone.now()
                
                sds.save(update_fields=[
                    'ph_value_min', 'ph_value_max', 'ph_measurement_conditions',
                    'ph_extraction_confidence', 'ph_source', 'ph_updated_at'
                ])
                
                logger.info(f"Successfully extracted pH data for SDS: {sds.product_name}")
                return True
            else:
                logger.info(f"No pH data found in SDS: {sds.product_name}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to process SDS for pH extraction {sds.id}: {str(e)}")
            return False
    
    def check_food_packaging_compatibility(self, sds: SafetyDataSheet) -> Dict:
        """
        Check if a corrosive material is compatible with food/food packaging.
        Applies standard Class 8 segregation rules regardless of pH level.
        
        Args:
            sds: SafetyDataSheet instance
            
        Returns:
            Dictionary with compatibility assessment
        """
        result = {
            'compatible_with_food': False,
            'segregation_required': True,
            'risk_level': 'high',
            'reasons': [],
            'recommendations': []
        }
        
        # Only assess Class 8 materials
        if not sds.is_corrosive_class_8:
            result['reasons'].append('Not a Class 8 corrosive material')
            result['risk_level'] = 'low'
            result['segregation_required'] = False
            return result
        
        # All Class 8 materials require separation from food regardless of pH
        result['reasons'].append('Class 8 corrosive material - requires separation from food per dangerous goods regulations')
        result['risk_level'] = 'high'
        result['recommendations'].extend([
            'Maintain standard Class 8 separation from food and food packaging (3-5 meters)',
            'Follow dangerous goods segregation table requirements',
            'Use appropriate containment measures for corrosive materials',
            'Ensure proper ventilation in storage areas'
        ])
        
        # Add pH-specific notes if available
        if sds.has_ph_data:
            ph_value = sds.ph_value
            if ph_value is not None:
                if ph_value < 2:
                    result['reasons'].append(f'Strongly acidic material (pH {ph_value}) - additional care required for acid-alkali segregation')
                elif ph_value > 12.5:
                    result['reasons'].append(f'Strongly alkaline material (pH {ph_value}) - additional care required for acid-alkali segregation')
                else:
                    result['reasons'].append(f'Corrosive material with pH {ph_value}')
        
        return result


# Utility function for bulk processing
def process_all_class8_sds_for_ph():
    """
    Process all Class 8 SDS documents that don't have pH data yet.
    """
    processor = SDSDocumentProcessor()
    
    # Find all Class 8 SDS without pH data
    class8_sds = SafetyDataSheet.objects.filter(
        dangerous_good__hazard_class='8',
        status='ACTIVE',
        ph_value_min__isnull=True,
        ph_value_max__isnull=True
    )
    
    processed_count = 0
    successful_count = 0
    
    for sds in class8_sds:
        processed_count += 1
        if processor.process_sds_for_ph(sds):
            successful_count += 1
        
        # Log progress every 10 items
        if processed_count % 10 == 0:
            logger.info(f"Processed {processed_count} SDS documents, {successful_count} successful extractions")
    
    logger.info(f"Completed processing {processed_count} Class 8 SDS documents. "
                f"Successfully extracted pH from {successful_count} documents.")
    
    return {
        'processed': processed_count,
        'successful': successful_count,
        'success_rate': successful_count / processed_count if processed_count > 0 else 0
    }
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
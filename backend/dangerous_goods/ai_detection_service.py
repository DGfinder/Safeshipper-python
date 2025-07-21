# Enhanced AI-Powered Dangerous Goods Detection Service
# Leverages existing spaCy infrastructure and DG database

import re
import logging
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass
from decimal import Decimal
import json

import spacy
from spacy.matcher import Matcher, PhraseMatcher
from django.core.cache import cache
from django.db.models import Q
from django.conf import settings

from .models import DangerousGood, DGProductSynonym, SegregationGroup
from .services import match_synonym_to_dg, find_dgs_by_text_search

logger = logging.getLogger(__name__)

# Load spaCy model (reuse from SDS service)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None

@dataclass
class DGDetectionResult:
    """Enhanced dangerous goods detection result"""
    dangerous_good: DangerousGood
    matched_term: str
    confidence: float
    match_type: str  # 'exact', 'fuzzy', 'pattern', 'nlp', 'context'
    context: str  # Surrounding text context
    position: Tuple[int, int]  # Start and end character positions
    extracted_quantity: Optional[str] = None
    extracted_weight: Optional[str] = None
    extracted_packaging: Optional[str] = None
    nlp_entities: List[Dict] = None

@dataclass
class DocumentAnalysisResult:
    """Complete document analysis result"""
    detected_items: List[DGDetectionResult]
    confidence_score: float
    processing_method: List[str]
    extracted_quantities: Dict[str, Any]
    regulatory_flags: List[str]
    quality_metrics: Dict[str, float]

class EnhancedDGDetectionService:
    """
    AI-powered dangerous goods detection service
    Leverages existing SafeShipper infrastructure with advanced NLP
    """
    
    def __init__(self):
        self.cache_timeout = getattr(settings, 'DG_DETECTION_CACHE_TIMEOUT', 1800)  # 30 minutes
        self.confidence_threshold = 0.6
        
        # Initialize matchers
        self.phrase_matcher = None
        self.pattern_matcher = None
        
        if nlp:
            self._initialize_matchers()
        
        # UN number patterns
        self.un_patterns = [
            r'\bUN\s*(\d{4})\b',
            r'\bU\.N\.\s*(\d{4})\b', 
            r'\bUN-(\d{4})\b',
            r'\b(\d{4})\b(?=\s*(?:UN|U\.N\.))',
            r'\b(?:UN|U\.N\.)\s*NO\.?\s*(\d{4})\b'
        ]
        
        # Quantity extraction patterns
        self.quantity_patterns = [
            r'(\d+(?:\.\d+)?)\s*(kg|g|l|ml|tonnes?|tons?|litres?|liters?|gallons?|lbs?|pounds?)',
            r'(\d+(?:\.\d+)?)\s*(kilograms?|grams?|milligrams?)',
            r'(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|l|ml)',
            r'(\d+)\s*(?:drums?|barrels?|containers?|packages?|boxes?)'
        ]
        
        # Packaging patterns  
        self.packaging_patterns = [
            r'\b(drums?|barrels?|containers?|tanks?|boxes?|bags?|sacks?|bottles?|cans?)\b',
            r'\b(\d+(?:\.\d+)?)\s*(?:litre?|liter|gallon)\s*(drums?|containers?)\b',
            r'\bpackaging\s+group\s+([I]{1,3}|1|2|3)\b',
            r'\bPG\s*([I]{1,3}|1|2|3)\b'
        ]

    def _initialize_matchers(self):
        """Initialize spaCy matchers with dangerous goods terms"""
        if not nlp:
            return
            
        self.phrase_matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
        self.pattern_matcher = Matcher(nlp.vocab)
        
        # Load dangerous goods terms from database
        try:
            # Get all dangerous goods proper shipping names
            dg_names = list(DangerousGood.objects.values_list('proper_shipping_name', flat=True))
            dg_simplified = list(DangerousGood.objects.values_list('simplified_name', flat=True))
            
            # Get all synonyms
            synonyms = list(DGProductSynonym.objects.values_list('synonym', flat=True))
            
            # Combine and filter
            all_terms = list(set([term for term in dg_names + dg_simplified + synonyms if term and len(term) > 3]))
            
            # Add to phrase matcher
            patterns = [nlp(term) for term in all_terms[:1000]]  # Limit for performance
            self.phrase_matcher.add("DANGEROUS_GOODS", patterns)
            
            # Add UN number patterns
            un_pattern = [{"TEXT": {"REGEX": r"UN"}}, {"TEXT": {"REGEX": r"\d{4}"}}]
            self.pattern_matcher.add("UN_NUMBER", [un_pattern])
            
            logger.info(f"Initialized NLP matchers with {len(patterns)} dangerous goods terms")
            
        except Exception as e:
            logger.error(f"Failed to initialize NLP matchers: {e}")

    def analyze_document_text(
        self, 
        text: str, 
        use_cache: bool = True,
        advanced_features: bool = True
    ) -> DocumentAnalysisResult:
        """
        Analyze document text for dangerous goods with advanced AI detection
        
        Args:
            text: Document text to analyze
            use_cache: Whether to use Redis caching
            advanced_features: Enable advanced NLP features
            
        Returns:
            DocumentAnalysisResult with detected items and analysis
        """
        # Generate cache key
        cache_key = None
        if use_cache:
            cache_key = f"dg_analysis:{hash(text)}"
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info("DG analysis cache hit")
                return DocumentAnalysisResult(**cached_result)
        
        detected_items = []
        processing_methods = []
        
        # Method 1: Existing text search (baseline)
        legacy_matches = find_dgs_by_text_search(text)
        for match in legacy_matches:
            detected_items.append(DGDetectionResult(
                dangerous_good=match['dangerous_good'],
                matched_term=match['matched_term'],
                confidence=match['confidence'],
                match_type=match['match_type'],
                context=self._extract_context(text, match['matched_term']),
                position=(0, 0),  # Legacy doesn't provide positions
                nlp_entities=[]
            ))
        processing_methods.append("legacy_search")
        
        # Method 2: UN number pattern matching
        un_matches = self._detect_un_numbers(text)
        detected_items.extend(un_matches)
        if un_matches:
            processing_methods.append("un_pattern")
        
        # Method 3: Advanced NLP analysis (if spaCy available)
        if nlp and advanced_features:
            nlp_matches = self._analyze_with_nlp(text)
            detected_items.extend(nlp_matches)
            if nlp_matches:
                processing_methods.append("nlp_analysis")
        
        # Method 4: Context-aware detection
        context_matches = self._detect_with_context(text)
        detected_items.extend(context_matches)
        if context_matches:
            processing_methods.append("context_analysis")
        
        # Deduplicate and merge results
        deduplicated_items = self._deduplicate_results(detected_items)
        
        # Extract quantities and packaging
        for item in deduplicated_items:
            self._extract_quantities_and_packaging(item, text)
        
        # Calculate confidence scores and quality metrics
        confidence_score = self._calculate_overall_confidence(deduplicated_items)
        quality_metrics = self._calculate_quality_metrics(deduplicated_items, text)
        
        # Extract regulatory information
        regulatory_flags = self._extract_regulatory_flags(deduplicated_items)
        
        result = DocumentAnalysisResult(
            detected_items=deduplicated_items,
            confidence_score=confidence_score,
            processing_method=processing_methods,
            extracted_quantities=self._summarize_quantities(deduplicated_items),
            regulatory_flags=regulatory_flags,
            quality_metrics=quality_metrics
        )
        
        # Cache result
        if use_cache and cache_key:
            cache.set(cache_key, {
                'detected_items': [
                    {
                        'dangerous_good': {
                            'id': str(item.dangerous_good.id),
                            'un_number': item.dangerous_good.un_number,
                            'proper_shipping_name': item.dangerous_good.proper_shipping_name,
                            'hazard_class': item.dangerous_good.hazard_class,
                            'packing_group': item.dangerous_good.packing_group
                        },
                        'matched_term': item.matched_term,
                        'confidence': item.confidence,
                        'match_type': item.match_type,
                        'context': item.context,
                        'position': item.position,
                        'extracted_quantity': item.extracted_quantity,
                        'extracted_weight': item.extracted_weight,
                        'extracted_packaging': item.extracted_packaging,
                        'nlp_entities': item.nlp_entities or []
                    } for item in result.detected_items
                ],
                'confidence_score': result.confidence_score,
                'processing_method': result.processing_method,
                'extracted_quantities': result.extracted_quantities,
                'regulatory_flags': result.regulatory_flags,
                'quality_metrics': result.quality_metrics
            }, self.cache_timeout)
        
        return result

    def _detect_un_numbers(self, text: str) -> List[DGDetectionResult]:
        """Detect UN numbers using pattern matching"""
        results = []
        
        for pattern in self.un_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                un_number = match.group(1) if len(match.groups()) > 0 else match.group(0).replace('UN', '').strip()
                
                # Look up dangerous good by UN number
                try:
                    dg = DangerousGood.objects.get(un_number=un_number)
                    results.append(DGDetectionResult(
                        dangerous_good=dg,
                        matched_term=match.group(0),
                        confidence=0.95,  # High confidence for UN number matches
                        match_type='un_pattern',
                        context=self._extract_context(text, match.group(0), match.start()),
                        position=(match.start(), match.end())
                    ))
                except DangerousGood.DoesNotExist:
                    continue
                    
        return results

    def _analyze_with_nlp(self, text: str) -> List[DGDetectionResult]:
        """Analyze text using spaCy NLP"""
        if not nlp or not self.phrase_matcher:
            return []
            
        results = []
        doc = nlp(text)
        
        # Use phrase matcher
        matches = self.phrase_matcher(doc)
        for match_id, start, end in matches:
            matched_span = doc[start:end]
            matched_text = matched_span.text
            
            # Look up the dangerous good
            dg = match_synonym_to_dg(matched_text)
            if dg:
                # Extract named entities around the match
                entities = self._extract_nearby_entities(doc, start, end)
                
                results.append(DGDetectionResult(
                    dangerous_good=dg,
                    matched_term=matched_text,
                    confidence=0.85,
                    match_type='nlp_phrase',
                    context=str(doc[max(0, start-10):min(len(doc), end+10)]),
                    position=(matched_span.start_char, matched_span.end_char),
                    nlp_entities=entities
                ))
        
        # Use pattern matcher for UN numbers
        pattern_matches = self.pattern_matcher(doc)
        for match_id, start, end in pattern_matches:
            if nlp.vocab.strings[match_id] == "UN_NUMBER":
                matched_span = doc[start:end]
                # Extract UN number and look up
                un_text = matched_span.text
                un_match = re.search(r'\d{4}', un_text)
                if un_match:
                    try:
                        dg = DangerousGood.objects.get(un_number=un_match.group(0))
                        results.append(DGDetectionResult(
                            dangerous_good=dg,
                            matched_term=matched_span.text,
                            confidence=0.9,
                            match_type='nlp_pattern',
                            context=str(doc[max(0, start-5):min(len(doc), end+5)]),
                            position=(matched_span.start_char, matched_span.end_char)
                        ))
                    except DangerousGood.DoesNotExist:
                        continue
        
        return results

    def _detect_with_context(self, text: str) -> List[DGDetectionResult]:
        """Detect dangerous goods using contextual analysis"""
        results = []
        
        # Look for manifest-specific patterns
        manifest_indicators = [
            r'dangerous\s+goods?\s*[:]\s*([^\n]+)',
            r'hazardous\s+materials?\s*[:]\s*([^\n]+)',
            r'class\s+(\d+(?:\.\d+)?)\s+([^\n]+)',
            r'(?:substance|chemical|product)\s*[:]\s*([^\n]+)'
        ]
        
        for pattern in manifest_indicators:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Extract the substance name
                substance_text = match.group(-1).strip()  # Last group
                
                # Try to match against database
                dg = match_synonym_to_dg(substance_text)
                if dg:
                    results.append(DGDetectionResult(
                        dangerous_good=dg,
                        matched_term=substance_text,
                        confidence=0.75,
                        match_type='context_pattern',
                        context=match.group(0),
                        position=(match.start(), match.end())
                    ))
        
        return results

    def _extract_context(self, text: str, matched_term: str, position: Optional[int] = None) -> str:
        """Extract context around a matched term"""
        if position is not None:
            start = max(0, position - 50)
            end = min(len(text), position + len(matched_term) + 50)
            return text[start:end].strip()
        else:
            # Find first occurrence
            index = text.lower().find(matched_term.lower())
            if index >= 0:
                start = max(0, index - 50)
                end = min(len(text), index + len(matched_term) + 50)
                return text[start:end].strip()
            return matched_term

    def _extract_nearby_entities(self, doc, start: int, end: int) -> List[Dict]:
        """Extract named entities near a match"""
        entities = []
        
        # Look for entities within 10 tokens
        search_start = max(0, start - 10)
        search_end = min(len(doc), end + 10)
        
        for ent in doc.ents:
            if search_start <= ent.start < search_end:
                entities.append({
                    'text': ent.text,
                    'label': ent.label_,
                    'confidence': 0.8  # spaCy doesn't provide confidence for NER
                })
        
        return entities

    def _extract_quantities_and_packaging(self, item: DGDetectionResult, text: str):
        """Extract quantities and packaging information for a detected item"""
        context_window = item.context if item.context else text
        
        # Extract quantities
        for pattern in self.quantity_patterns:
            match = re.search(pattern, context_window, re.IGNORECASE)
            if match:
                if not item.extracted_quantity:
                    item.extracted_quantity = match.group(0)
                if 'kg' in match.group(0).lower() or 'tonnes' in match.group(0).lower():
                    item.extracted_weight = match.group(0)
                break
        
        # Extract packaging
        for pattern in self.packaging_patterns:
            match = re.search(pattern, context_window, re.IGNORECASE)
            if match:
                item.extracted_packaging = match.group(0)
                break

    def _deduplicate_results(self, items: List[DGDetectionResult]) -> List[DGDetectionResult]:
        """Remove duplicate detections and merge information"""
        seen_dgs = {}
        
        for item in items:
            key = item.dangerous_good.id
            
            if key not in seen_dgs:
                seen_dgs[key] = item
            else:
                # Merge information, keeping higher confidence
                existing = seen_dgs[key]
                if item.confidence > existing.confidence:
                    seen_dgs[key] = item
                    # Merge additional info
                    if existing.extracted_quantity and not item.extracted_quantity:
                        item.extracted_quantity = existing.extracted_quantity
                    if existing.extracted_weight and not item.extracted_weight:
                        item.extracted_weight = existing.extracted_weight
                    if existing.extracted_packaging and not item.extracted_packaging:
                        item.extracted_packaging = existing.extracted_packaging
        
        return list(seen_dgs.values())

    def _calculate_overall_confidence(self, items: List[DGDetectionResult]) -> float:
        """Calculate overall confidence score for the analysis"""
        if not items:
            return 0.0
        
        # Weight by individual confidences and number of detection methods
        total_confidence = sum(item.confidence for item in items)
        method_diversity = len(set(item.match_type for item in items))
        
        base_score = total_confidence / len(items)
        diversity_bonus = min(0.1 * method_diversity, 0.2)  # Up to 20% bonus
        
        return min(1.0, base_score + diversity_bonus)

    def _calculate_quality_metrics(self, items: List[DGDetectionResult], text: str) -> Dict[str, float]:
        """Calculate quality metrics for the analysis"""
        return {
            'detection_count': len(items),
            'average_confidence': sum(item.confidence for item in items) / len(items) if items else 0.0,
            'method_diversity': len(set(item.match_type for item in items)),
            'context_coverage': len([item for item in items if item.context]) / len(items) if items else 0.0,
            'quantity_extraction_rate': len([item for item in items if item.extracted_quantity]) / len(items) if items else 0.0,
            'text_length': len(text)
        }

    def _extract_regulatory_flags(self, items: List[DGDetectionResult]) -> List[str]:
        """Extract regulatory flags and warnings"""
        flags = []
        
        # Check for high-risk classes
        high_risk_classes = ['1.1', '1.2', '1.3', '2.3', '6.1', '6.2']
        for item in items:
            if item.dangerous_good.hazard_class in high_risk_classes:
                flags.append(f"High-risk class {item.dangerous_good.hazard_class} detected")
        
        # Check for mixed loads
        classes = set(item.dangerous_good.hazard_class for item in items)
        if len(classes) > 1:
            flags.append("Mixed hazard classes - compatibility check required")
        
        # Check for large quantities
        for item in items:
            if item.extracted_weight and any(unit in item.extracted_weight.lower() for unit in ['tonnes', 'tons']):
                flags.append("Large quantity detected - additional permits may be required")
        
        return flags

    def _summarize_quantities(self, items: List[DGDetectionResult]) -> Dict[str, Any]:
        """Summarize extracted quantities"""
        total_items = len(items)
        with_quantities = len([item for item in items if item.extracted_quantity])
        with_weights = len([item for item in items if item.extracted_weight])
        with_packaging = len([item for item in items if item.extracted_packaging])
        
        return {
            'total_items': total_items,
            'items_with_quantities': with_quantities,
            'items_with_weights': with_weights,
            'items_with_packaging': with_packaging,
            'quantity_extraction_rate': with_quantities / total_items if total_items else 0.0
        }

# Service instance
enhanced_dg_detection = EnhancedDGDetectionService()
# OpenAI Service Layer with Smart Model Routing
# Enhances SafeShipper's existing AI capabilities with GPT models

import logging
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from decimal import Decimal
import json

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# Import OpenAI with fallback
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI library not installed. Install with: pip install openai")
    OPENAI_AVAILABLE = False

@dataclass
class ModelConfig:
    """Configuration for different OpenAI models"""
    name: str
    input_cost_per_1k: Decimal
    output_cost_per_1k: Decimal
    context_limit: int
    best_for: List[str]

@dataclass
class OpenAIResponse:
    """OpenAI API response wrapper"""
    content: str
    model_used: str
    tokens_used: int
    estimated_cost: Decimal
    processing_time: float
    confidence: float

class SmartModelRouter:
    """
    Intelligent model selection based on task complexity and cost optimization
    Routes between GPT-4.1 nano, mini, and full based on requirements
    """
    
    def __init__(self):
        # Model configurations based on user's pricing information
        self.models = {
            'gpt-4o-mini': ModelConfig(
                name='gpt-4o-mini',
                input_cost_per_1k=Decimal('0.000150'),  # $0.15 per 1M tokens
                output_cost_per_1k=Decimal('0.000600'),  # $0.60 per 1M tokens
                context_limit=128000,
                best_for=['simple_extraction', 'classification', 'basic_analysis']
            ),
            'gpt-4o': ModelConfig(
                name='gpt-4o',
                input_cost_per_1k=Decimal('0.0025'),  # $2.50 per 1M tokens
                output_cost_per_1k=Decimal('0.010'),   # $10.00 per 1M tokens
                context_limit=128000,
                best_for=['complex_analysis', 'reasoning', 'advanced_extraction']
            )
        }
        
        # Task complexity indicators
        self.complexity_indicators = {
            'simple': ['extract', 'find', 'identify', 'classify'],
            'medium': ['analyze', 'compare', 'evaluate', 'assess'],
            'complex': ['reason', 'deduce', 'synthesize', 'comprehensive']
        }

    def select_model(
        self, 
        task_type: str, 
        text_length: int, 
        complexity_hints: List[str] = None
    ) -> str:
        """
        Select optimal model based on task requirements
        
        Args:
            task_type: Type of task ('sds_extraction', 'dg_detection', 'document_analysis')
            text_length: Length of input text
            complexity_hints: Additional complexity indicators
            
        Returns:
            Model name to use
        """
        complexity_hints = complexity_hints or []
        
        # Check if task is inherently complex
        if task_type in ['comprehensive_analysis', 'multi_document_synthesis']:
            return 'gpt-4o'
        
        # Check for complexity indicators in hints
        complex_keywords = any(
            hint.lower() in word.lower() 
            for hint in complexity_hints 
            for word in self.complexity_indicators['complex']
        )
        
        if complex_keywords:
            return 'gpt-4o'
        
        # For most SDS and DG detection tasks, mini is sufficient
        if task_type in ['sds_extraction', 'dg_detection', 'basic_classification']:
            return 'gpt-4o-mini'
        
        # Large documents might need more sophisticated processing
        if text_length > 10000:
            return 'gpt-4o'
        
        # Default to cost-effective mini model
        return 'gpt-4o-mini'

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> Decimal:
        """Estimate cost for a given model and token usage"""
        if model not in self.models:
            return Decimal('0.00')
        
        config = self.models[model]
        input_cost = (input_tokens / 1000) * config.input_cost_per_1k
        output_cost = (output_tokens / 1000) * config.output_cost_per_1k
        
        return input_cost + output_cost

class EnhancedOpenAIService:
    """
    Enhanced OpenAI service for SafeShipper's dangerous goods platform
    Integrates with existing OCR and AI detection services
    """
    
    def __init__(self):
        self.router = SmartModelRouter()
        self.cache_timeout = getattr(settings, 'OPENAI_CACHE_TIMEOUT', 3600)  # 1 hour
        
        # Initialize OpenAI client
        if OPENAI_AVAILABLE:
            api_key = getattr(settings, 'OPENAI_API_KEY', None)
            if api_key:
                openai.api_key = api_key
                self.client = openai.OpenAI(api_key=api_key)
            else:
                logger.warning("OpenAI API key not configured")
                self.client = None
        else:
            self.client = None

    def extract_sds_information(
        self, 
        text: str, 
        use_cache: bool = True,
        force_model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract SDS information using OpenAI with intelligent model selection
        
        Args:
            text: SDS document text
            use_cache: Whether to use Redis caching
            force_model: Force specific model (for testing)
            
        Returns:
            Extracted SDS information
        """
        if not self.client:
            raise ValueError("OpenAI client not available")
        
        # Check cache first
        cache_key = None
        if use_cache:
            cache_key = f"openai_sds:{hash(text)}"
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info("OpenAI SDS extraction cache hit")
                return cached_result
        
        start_time = time.time()
        
        # Select model
        model = force_model or self.router.select_model(
            'sds_extraction', 
            len(text),
            ['extract', 'chemical', 'safety']
        )
        
        # Prepare prompt
        prompt = self._create_sds_extraction_prompt(text)
        
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert in chemical safety data sheets and Australian dangerous goods regulations. Extract key information accurately and comprehensively."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for factual extraction
                max_tokens=2000
            )
            
            processing_time = time.time() - start_time
            
            # Parse response
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            estimated_cost = self.router.estimate_cost(
                model, 
                response.usage.prompt_tokens,
                response.usage.completion_tokens
            )
            
            # Parse JSON response
            try:
                extracted_data = json.loads(content)
            except json.JSONDecodeError:
                # Fallback: extract JSON from response
                extracted_data = self._extract_json_from_text(content)
            
            result = {
                'extracted_data': extracted_data,
                'model_used': model,
                'tokens_used': tokens_used,
                'estimated_cost': float(estimated_cost),
                'processing_time': processing_time,
                'confidence': self._calculate_confidence(extracted_data)
            }
            
            # Cache result
            if use_cache and cache_key:
                cache.set(cache_key, result, self.cache_timeout)
            
            return result
            
        except Exception as e:
            logger.error(f"OpenAI SDS extraction failed: {e}")
            raise

    def enhance_dangerous_goods_detection(
        self, 
        text: str, 
        existing_detections: List[Dict] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Enhance dangerous goods detection using OpenAI context understanding
        
        Args:
            text: Document text
            existing_detections: Results from existing DG detection
            use_cache: Whether to use Redis caching
            
        Returns:
            Enhanced detection results
        """
        if not self.client:
            raise ValueError("OpenAI client not available")
        
        existing_detections = existing_detections or []
        
        # Check cache
        cache_key = None
        if use_cache:
            cache_key = f"openai_dg:{hash(text + str(existing_detections))}"
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info("OpenAI DG enhancement cache hit")
                return cached_result
        
        start_time = time.time()
        
        # Select model
        model = self.router.select_model(
            'dg_detection',
            len(text),
            ['analyze', 'dangerous', 'goods', 'context']
        )
        
        # Create enhancement prompt
        prompt = self._create_dg_enhancement_prompt(text, existing_detections)
        
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert in dangerous goods transportation and Australian ADG regulations. Analyze documents to identify dangerous goods with high accuracy."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.2,
                max_tokens=1500
            )
            
            processing_time = time.time() - start_time
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            # Parse enhancement results
            try:
                enhancement_data = json.loads(content)
            except json.JSONDecodeError:
                enhancement_data = self._extract_json_from_text(content)
            
            estimated_cost = self.router.estimate_cost(
                model,
                response.usage.prompt_tokens,
                response.usage.completion_tokens
            )
            
            result = {
                'enhanced_detections': enhancement_data,
                'model_used': model,
                'tokens_used': tokens_used,
                'estimated_cost': float(estimated_cost),
                'processing_time': processing_time,
                'confidence_boost': enhancement_data.get('confidence_boost', 0.0)
            }
            
            # Cache result
            if use_cache and cache_key:
                cache.set(cache_key, result, self.cache_timeout)
            
            return result
            
        except Exception as e:
            logger.error(f"OpenAI DG enhancement failed: {e}")
            raise

    def analyze_document_compliance(
        self,
        text: str,
        document_type: str = 'manifest',
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze document for regulatory compliance using OpenAI
        
        Args:
            text: Document text
            document_type: Type of document (manifest, sds, certificate)
            use_cache: Whether to use Redis caching
            
        Returns:
            Compliance analysis results
        """
        if not self.client:
            raise ValueError("OpenAI client not available")
        
        # This is a complex task, use full GPT-4
        model = 'gpt-4o'
        
        # Check cache
        cache_key = None
        if use_cache:
            cache_key = f"openai_compliance:{hash(text + document_type)}"
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info("OpenAI compliance analysis cache hit")
                return cached_result
        
        start_time = time.time()
        
        prompt = self._create_compliance_analysis_prompt(text, document_type)
        
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a dangerous goods compliance expert with deep knowledge of Australian ADG Code, IATA DGR, and international transport regulations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=3000
            )
            
            processing_time = time.time() - start_time
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            # Parse compliance results
            try:
                compliance_data = json.loads(content)
            except json.JSONDecodeError:
                compliance_data = self._extract_json_from_text(content)
            
            estimated_cost = self.router.estimate_cost(
                model,
                response.usage.prompt_tokens,
                response.usage.completion_tokens
            )
            
            result = {
                'compliance_analysis': compliance_data,
                'model_used': model,
                'tokens_used': tokens_used,
                'estimated_cost': float(estimated_cost),
                'processing_time': processing_time,
                'compliance_score': compliance_data.get('overall_score', 0.0)
            }
            
            # Cache result
            if use_cache and cache_key:
                cache.set(cache_key, result, self.cache_timeout)
            
            return result
            
        except Exception as e:
            logger.error(f"OpenAI compliance analysis failed: {e}")
            raise

    def _create_sds_extraction_prompt(self, text: str) -> str:
        """Create prompt for SDS information extraction"""
        return f"""
Extract key information from this Safety Data Sheet (SDS) document. Return the information as JSON with the following structure:

{{
    "product_name": "string",
    "manufacturer": "string", 
    "cas_number": "string",
    "un_number": "string",
    "hazard_class": "string",
    "packing_group": "string",
    "physical_state": "string",
    "flash_point": "string",
    "boiling_point": "string",
    "melting_point": "string",
    "density": "string",
    "vapor_pressure": "string",
    "hazard_statements": ["array of hazard statements"],
    "precautionary_statements": ["array of precautionary statements"],
    "first_aid_measures": {{
        "inhalation": "string",
        "skin_contact": "string", 
        "eye_contact": "string",
        "ingestion": "string"
    }},
    "fire_fighting_measures": "string",
    "accidental_release_measures": "string",
    "handling_and_storage": "string",
    "exposure_controls": "string",
    "incompatible_materials": ["array of incompatible substances"],
    "regulatory_information": "string",
    "transport_information": {{
        "proper_shipping_name": "string",
        "transport_hazard_class": "string",
        "packing_group": "string",
        "marine_pollutant": "boolean"
    }}
}}

SDS Document Text:
{text[:8000]}  # Limit text to avoid token limits

Focus on dangerous goods classification and transport-related information. If any field cannot be determined from the document, use null.
"""

    def _create_dg_enhancement_prompt(self, text: str, existing_detections: List[Dict]) -> str:
        """Create prompt for dangerous goods detection enhancement"""
        existing_summary = json.dumps(existing_detections[:5], indent=2) if existing_detections else "None"
        
        return f"""
Analyze this document to enhance dangerous goods detection. Consider the context and existing detections to provide additional insights.

Existing Detections:
{existing_summary}

Document Text:
{text[:6000]}

Provide enhanced analysis as JSON:
{{
    "additional_detections": [
        {{
            "substance_name": "string",
            "un_number": "string",
            "confidence": 0.95,
            "evidence": "supporting text from document",
            "context": "surrounding context"
        }}
    ],
    "quantity_analysis": [
        {{
            "substance": "string",
            "quantity": "string",
            "unit": "string",
            "packaging": "string"
        }}
    ],
    "regulatory_flags": [
        "flag descriptions"
    ],
    "compatibility_concerns": [
        "potential segregation issues"
    ],
    "confidence_boost": 0.15,
    "reasoning": "explanation of analysis"
}}

Focus on substances that may have been missed, quantity information, and regulatory compliance concerns.
"""

    def _create_compliance_analysis_prompt(self, text: str, document_type: str) -> str:
        """Create prompt for compliance analysis"""
        return f"""
Analyze this {document_type} document for dangerous goods regulatory compliance according to Australian ADG Code and international standards.

Document Text:
{text[:10000]}

Provide comprehensive compliance analysis as JSON:
{{
    "overall_score": 0.85,
    "compliance_status": "compliant|non-compliant|requires_review",
    "required_fields_check": {{
        "proper_shipping_name": "present|missing|unclear",
        "un_number": "present|missing|unclear", 
        "hazard_class": "present|missing|unclear",
        "packing_group": "present|missing|unclear",
        "emergency_contact": "present|missing|unclear"
    }},
    "violations": [
        {{
            "severity": "critical|high|medium|low",
            "description": "specific violation description",
            "regulation_reference": "ADG/IATA reference",
            "remediation": "how to fix"
        }}
    ],
    "missing_information": [
        "list of required but missing information"
    ],
    "recommendations": [
        "specific recommendations for compliance"
    ],
    "segregation_requirements": [
        "segregation and compatibility requirements"
    ],
    "special_provisions": [
        "applicable special provisions"
    ]
}}

Be thorough in identifying compliance gaps and provide actionable recommendations.
"""

    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """Extract JSON from mixed text response"""
        try:
            # Look for JSON block
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                json_text = text[start:end]
                return json.loads(json_text)
        except:
            pass
        
        # Fallback: return structured error
        return {
            "error": "Failed to parse JSON response",
            "raw_response": text[:500]
        }

    def _calculate_confidence(self, extracted_data: Dict[str, Any]) -> float:
        """Calculate confidence score based on extracted data completeness"""
        if not extracted_data or 'error' in extracted_data:
            return 0.0
        
        # Count non-null fields
        total_fields = 0
        filled_fields = 0
        
        for key, value in extracted_data.items():
            total_fields += 1
            if value is not None and value != "" and value != []:
                filled_fields += 1
        
        return filled_fields / total_fields if total_fields > 0 else 0.0

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get OpenAI service usage statistics"""
        return {
            'total_requests': cache.get('openai:stats:total_requests', 0),
            'total_tokens': cache.get('openai:stats:total_tokens', 0),
            'estimated_cost': float(cache.get('openai:stats:total_cost', 0.0)),
            'cache_hit_rate': cache.get('openai:stats:cache_hit_rate', 0.0),
            'model_usage': cache.get('openai:stats:model_usage', {}),
            'average_processing_time': cache.get('openai:stats:avg_processing_time', 0.0)
        }

# Service instance
enhanced_openai_service = EnhancedOpenAIService()
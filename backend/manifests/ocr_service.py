# Enhanced OCR Service for Manifest Processing
# Leverages existing infrastructure: pytesseract, PyMuPDF, PIL

import logging
import tempfile
import os
from typing import Dict, List, Optional, Tuple, Union, Any
from dataclasses import dataclass
from pathlib import Path
import io
import base64
import json

import fitz  # PyMuPDF - already in requirements
import pytesseract  # Already in requirements
from PIL import Image, ImageEnhance, ImageFilter  # Pillow - already in requirements
import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

@dataclass
class OCRResult:
    """OCR result with confidence scoring and positioning"""
    text: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # (x1, y1, x2, y2)
    page_number: int
    engine: str
    processing_time: float

@dataclass
class DocumentOCRResult:
    """Complete document OCR result"""
    pages: List[OCRResult]
    total_confidence: float
    processing_time: float
    engines_used: List[str]
    metadata: Dict[str, Any]

class EnhancedOCRService:
    """
    Advanced OCR service leveraging existing SafeShipper infrastructure
    Supports multiple OCR engines with intelligent fallbacks
    """
    
    def __init__(self):
        self.cache_timeout = getattr(settings, 'OCR_CACHE_TIMEOUT', 3600)  # 1 hour
        self.confidence_threshold = 0.6
        self.max_image_size = (3000, 3000)
        
        # Configure pytesseract path if needed
        if hasattr(settings, 'TESSERACT_PATH'):
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

    def extract_text_with_ocr(
        self, 
        pdf_file: Union[str, bytes, io.BytesIO], 
        use_cache: bool = True,
        engines: Optional[List[str]] = None
    ) -> DocumentOCRResult:
        """
        Extract text from PDF using OCR with multiple engines
        
        Args:
            pdf_file: Path to PDF file or file bytes
            use_cache: Whether to use Redis caching
            engines: List of OCR engines to try ['tesseract', 'aws', 'google']
            
        Returns:
            DocumentOCRResult with extracted text and confidence scores
        """
        start_time = timezone.now()
        
        # Generate cache key if using cache
        cache_key = None
        if use_cache:
            if isinstance(pdf_file, str):
                cache_key = f"ocr:{hash(pdf_file + str(os.path.getmtime(pdf_file)))}"
            else:
                cache_key = f"ocr:{hash(pdf_file if isinstance(pdf_file, bytes) else pdf_file.read())}"
                if hasattr(pdf_file, 'seek'):
                    pdf_file.seek(0)
            
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"OCR cache hit for key: {cache_key}")
                return DocumentOCRResult(**cached_result)

        try:
            # Convert PDF to images
            images = self._pdf_to_images(pdf_file)
            
            # Process each page
            page_results = []
            engines_used = set()
            
            for page_num, image in enumerate(images, 1):
                page_result = self._process_page_with_ocr(
                    image, 
                    page_num, 
                    engines or ['tesseract']
                )
                page_results.append(page_result)
                engines_used.add(page_result.engine)
            
            # Calculate overall confidence
            total_confidence = sum(page.confidence for page in page_results) / len(page_results) if page_results else 0.0
            
            processing_time = (timezone.now() - start_time).total_seconds()
            
            result = DocumentOCRResult(
                pages=page_results,
                total_confidence=total_confidence,
                processing_time=processing_time,
                engines_used=list(engines_used),
                metadata={
                    'total_pages': len(page_results),
                    'average_confidence': total_confidence,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            # Cache the result
            if use_cache and cache_key:
                cache.set(cache_key, {
                    'pages': [
                        {
                            'text': page.text,
                            'confidence': page.confidence,
                            'bbox': page.bbox,
                            'page_number': page.page_number,
                            'engine': page.engine,
                            'processing_time': page.processing_time
                        } for page in result.pages
                    ],
                    'total_confidence': result.total_confidence,
                    'processing_time': result.processing_time,
                    'engines_used': result.engines_used,
                    'metadata': result.metadata
                }, self.cache_timeout)
            
            return result
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            raise

    def _pdf_to_images(self, pdf_file: Union[str, bytes, io.BytesIO]) -> List[Image.Image]:
        """Convert PDF pages to PIL Images"""
        images = []
        
        try:
            # Open PDF with PyMuPDF
            if isinstance(pdf_file, str):
                doc = fitz.open(pdf_file)
            else:
                doc = fitz.open(stream=pdf_file, filetype="pdf")
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                
                # Convert to image with high DPI for better OCR
                matrix = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
                pix = page.get_pixmap(matrix=matrix)
                
                # Convert to PIL Image
                img_data = pix.tobytes("ppm")
                image = Image.open(io.BytesIO(img_data))
                
                # Preprocess image for better OCR
                processed_image = self._preprocess_image(image)
                images.append(processed_image)
            
            doc.close()
            return images
            
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
            raise

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for optimal OCR results
        - Convert to grayscale
        - Enhance contrast
        - Apply noise reduction
        - Resize if necessary
        """
        try:
            # Convert to grayscale for better OCR
            if image.mode != 'L':
                image = image.convert('L')
            
            # Resize if image is too large
            if image.size[0] > self.max_image_size[0] or image.size[1] > self.max_image_size[1]:
                image.thumbnail(self.max_image_size, Image.Resampling.LANCZOS)
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)
            
            # Apply slight sharpening
            image = image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
            
            return image
            
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}")
            return image

    def _process_page_with_ocr(
        self, 
        image: Image.Image, 
        page_number: int, 
        engines: List[str]
    ) -> OCRResult:
        """Process a single page with OCR engines"""
        
        for engine in engines:
            try:
                if engine == 'tesseract':
                    return self._tesseract_ocr(image, page_number)
                elif engine == 'aws' and hasattr(settings, 'AWS_TEXTRACT_ENABLED'):
                    return self._aws_textract_ocr(image, page_number)
                elif engine == 'google' and hasattr(settings, 'GOOGLE_VISION_ENABLED'):
                    return self._google_vision_ocr(image, page_number)
                else:
                    continue
                    
            except Exception as e:
                logger.warning(f"OCR engine {engine} failed for page {page_number}: {e}")
                continue
        
        # Fallback to basic tesseract
        return self._tesseract_ocr(image, page_number)

    def _tesseract_ocr(self, image: Image.Image, page_number: int) -> OCRResult:
        """Process image with Tesseract OCR"""
        start_time = timezone.now()
        
        try:
            # Configure Tesseract for better results
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,()-/:[]'
            
            # Extract text with confidence data
            data = pytesseract.image_to_data(
                image, 
                config=custom_config, 
                output_type=pytesseract.Output.DICT
            )
            
            # Combine all text
            text_parts = []
            confidences = []
            
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > 30:  # Filter low-confidence text
                    text = data['text'][i].strip()
                    if text:
                        text_parts.append(text)
                        confidences.append(int(data['conf'][i]))
            
            text = ' '.join(text_parts)
            avg_confidence = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            
            processing_time = (timezone.now() - start_time).total_seconds()
            
            return OCRResult(
                text=text,
                confidence=avg_confidence,
                bbox=(0, 0, image.width, image.height),
                page_number=page_number,
                engine='tesseract',
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Tesseract OCR failed: {e}")
            raise

    def _aws_textract_ocr(self, image: Image.Image, page_number: int) -> OCRResult:
        """Process image with AWS Textract (if configured)"""
        start_time = timezone.now()
        
        try:
            import boto3
            
            # Convert image to bytes
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='PNG')
            img_bytes = img_buffer.getvalue()
            
            # AWS Textract client
            textract = boto3.client('textract')
            
            response = textract.detect_document_text(
                Document={'Bytes': img_bytes}
            )
            
            # Extract text and confidence
            text_parts = []
            confidences = []
            
            for block in response['Blocks']:
                if block['BlockType'] == 'WORD':
                    text_parts.append(block['Text'])
                    confidences.append(block['Confidence'] / 100.0)
            
            text = ' '.join(text_parts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            processing_time = (timezone.now() - start_time).total_seconds()
            
            return OCRResult(
                text=text,
                confidence=avg_confidence,
                bbox=(0, 0, image.width, image.height),
                page_number=page_number,
                engine='aws_textract',
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"AWS Textract OCR failed: {e}")
            raise

    def _google_vision_ocr(self, image: Image.Image, page_number: int) -> OCRResult:
        """Process image with Google Vision API (if configured)"""
        start_time = timezone.now()
        
        try:
            from google.cloud import vision
            
            client = vision.ImageAnnotatorClient()
            
            # Convert image to bytes
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='PNG')
            img_bytes = img_buffer.getvalue()
            
            image_obj = vision.Image(content=img_bytes)
            response = client.text_detection(image=image_obj)
            texts = response.text_annotations
            
            if texts:
                # First annotation contains all detected text
                text = texts[0].description
                # Google Vision doesn't provide word-level confidence, so estimate
                confidence = 0.85  # Assume high confidence for Google Vision
            else:
                text = ""
                confidence = 0.0
            
            processing_time = (timezone.now() - start_time).total_seconds()
            
            return OCRResult(
                text=text,
                confidence=confidence,
                bbox=(0, 0, image.width, image.height),
                page_number=page_number,
                engine='google_vision',
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Google Vision OCR failed: {e}")
            raise

    def get_ocr_stats(self) -> Dict[str, Any]:
        """Get OCR processing statistics"""
        # This could be enhanced with actual metrics from cache/database
        return {
            'total_documents_processed': cache.get('ocr:stats:total', 0),
            'average_confidence': cache.get('ocr:stats:avg_confidence', 0.0),
            'engines_usage': cache.get('ocr:stats:engines', {}),
            'cache_hit_rate': cache.get('ocr:stats:cache_hits', 0.0)
        }

# Service instance
ocr_service = EnhancedOCRService()
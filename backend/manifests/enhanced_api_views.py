# Enhanced API Views for Advanced Manifest Processing
# Integrates all new AI services: OCR, NLP, Elasticsearch, Table Extraction

import logging
import json
from typing import Dict, Any, Optional
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from documents.models import Document
from .tasks import process_manifest_with_enhanced_ocr, get_processing_status, batch_process_manifests
from .ocr_service import ocr_service
from .table_extraction_service import table_extractor
from dangerous_goods.ai_detection_service import enhanced_dg_detection
from dangerous_goods.search_service import enhanced_search_service

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enhanced_manifest_upload(request):
    """
    Enhanced manifest upload with immediate AI processing
    Integrates OCR, NLP, and table extraction
    """
    try:
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        
        # Validate file
        if not uploaded_file.name.lower().endswith('.pdf'):
            return Response(
                {'error': 'Only PDF files are supported'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if uploaded_file.size > 50 * 1024 * 1024:  # 50MB limit
            return Response(
                {'error': 'File size too large (max 50MB)'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get processing options from request
        processing_options = {
            'use_ocr': request.data.get('use_ocr', 'true').lower() == 'true',
            'extract_tables': request.data.get('extract_tables', 'true').lower() == 'true',
            'use_ai_detection': request.data.get('use_ai_detection', 'true').lower() == 'true',
            'engines': request.data.get('ocr_engines', 'tesseract').split(','),
            'shipment_id': request.data.get('shipment_id', f'temp_{timezone.now().strftime("%Y%m%d_%H%M%S")}')
        }
        
        # Save file
        file_content = ContentFile(uploaded_file.read())
        file_path = default_storage.save(f'manifests/{uploaded_file.name}', file_content)
        
        # Create document record
        document = Document.objects.create(
            file=file_path,
            filename=uploaded_file.name,
            document_type=Document.DocumentType.DG_MANIFEST,
            status=Document.DocumentStatus.UPLOADED,
            uploaded_by=request.user,
            file_size=uploaded_file.size
        )
        
        # Start enhanced processing task
        task = process_manifest_with_enhanced_ocr.delay(
            str(document.id),
            use_ocr=processing_options['use_ocr'],
            engines=processing_options['engines']
        )
        
        return Response({
            'success': True,
            'document_id': str(document.id),
            'task_id': task.id,
            'processing_options': processing_options,
            'message': 'File uploaded and processing started',
            'status_endpoint': f'/api/v1/manifests/processing-status/{document.id}/'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Enhanced manifest upload failed: {e}")
        return Response(
            {'error': 'Upload failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_enhanced_processing_status(request, document_id):
    """
    Get real-time processing status with detailed progress
    """
    try:
        # Get status from cache (set by Celery task)
        status_result = get_processing_status.delay(document_id).get(timeout=5)
        
        # Get document from database for additional info
        try:
            document = Document.objects.get(id=document_id)
            document_info = {
                'filename': document.filename,
                'file_size': document.file_size,
                'uploaded_at': document.created_at.isoformat(),
                'status': document.status
            }
        except Document.DoesNotExist:
            document_info = None
        
        return Response({
            'success': True,
            'document_id': document_id,
            'processing_status': status_result,
            'document_info': document_info
        })
        
    except Exception as e:
        logger.error(f"Status check failed for document {document_id}: {e}")
        return Response(
            {'error': 'Status check failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_enhanced_analysis_results(request, document_id):
    """
    Get comprehensive analysis results including OCR, tables, and DG detection
    """
    try:
        document = Document.objects.get(id=document_id)
        
        if not document.validation_results:
            return Response(
                {'error': 'No analysis results available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        results = document.validation_results
        
        # Format results for frontend consumption
        formatted_results = {
            'document_info': {
                'id': str(document.id),
                'filename': document.filename,
                'file_size': document.file_size,
                'status': document.status,
                'processed_at': results.get('timestamp')
            },
            'processing_info': {
                'method': results.get('processing_method'),
                'ocr_confidence': results.get('ocr_confidence', 0.0),
                'processing_time': results.get('processing_time', 0.0),
                'text_length': results.get('text_length', 0)
            },
            'dangerous_goods': {
                'count': results.get('dangerous_goods_detected', 0),
                'items': results.get('dangerous_goods_matches', [])
            },
            'quality_metrics': {
                'overall_confidence': results.get('ocr_confidence', 0.0),
                'detection_quality': len(results.get('dangerous_goods_matches', [])) > 0
            },
            'enhanced_results': results.get('enhanced_results', {})
        }
        
        return Response({
            'success': True,
            'results': formatted_results
        })
        
    except Document.DoesNotExist:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to get analysis results for document {document_id}: {e}")
        return Response(
            {'error': 'Failed to get results', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_tables_from_document(request, document_id):
    """
    Extract tables from a specific document using advanced table extraction
    """
    try:
        document = Document.objects.get(id=document_id)
        
        # Get options from request
        page_numbers = request.data.get('pages', None)
        if page_numbers:
            page_numbers = [int(p) for p in page_numbers if str(p).isdigit()]
        
        # Extract tables
        table_results = table_extractor.extract_tables_from_pdf(
            document.file.path,
            page_numbers=page_numbers
        )
        
        # Format results
        formatted_tables = []
        for table in table_results.tables:
            formatted_tables.append({
                'headers': table.headers,
                'rows': table.rows,
                'page_number': table.page_number,
                'table_type': table.table_type,
                'confidence': table.confidence,
                'extraction_method': table.extraction_method,
                'bbox': table.bbox
            })
        
        return Response({
            'success': True,
            'document_id': document_id,
            'tables': formatted_tables,
            'total_tables': table_results.total_tables,
            'processing_time': table_results.processing_time,
            'quality_score': table_results.quality_score,
            'extraction_methods': table_results.extraction_methods
        })
        
    except Document.DoesNotExist:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Table extraction failed for document {document_id}: {e}")
        return Response(
            {'error': 'Table extraction failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_dangerous_goods_enhanced(request):
    """
    Enhanced dangerous goods search using Elasticsearch with NLP
    """
    try:
        query = request.data.get('query', '')
        filters = request.data.get('filters', {})
        limit = int(request.data.get('limit', 20))
        suggest = request.data.get('suggest', True)
        
        # Perform enhanced search
        search_results = enhanced_search_service.search_dangerous_goods(
            query=query,
            filters=filters,
            limit=limit,
            suggest=suggest
        )
        
        return Response({
            'success': True,
            'search_results': search_results
        })
        
    except Exception as e:
        logger.error(f"Enhanced search failed: {e}")
        return Response(
            {'error': 'Search failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def batch_process_documents(request):
    """
    Process multiple documents in batch with enhanced AI capabilities
    """
    try:
        document_ids = request.data.get('document_ids', [])
        if not document_ids:
            return Response(
                {'error': 'No document IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        processing_options = {
            'use_ocr': request.data.get('use_ocr', True),
            'engines': request.data.get('ocr_engines', ['tesseract'])
        }
        
        # Start batch processing
        batch_task = batch_process_manifests.delay(
            document_ids=document_ids,
            processing_options=processing_options
        )
        
        return Response({
            'success': True,
            'batch_task_id': batch_task.id,
            'document_count': len(document_ids),
            'processing_options': processing_options,
            'message': 'Batch processing started'
        })
        
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        return Response(
            {'error': 'Batch processing failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_text_for_dangerous_goods(request):
    """
    Analyze raw text for dangerous goods using advanced AI detection
    """
    try:
        text = request.data.get('text', '')
        if not text:
            return Response(
                {'error': 'No text provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        use_advanced = request.data.get('use_advanced_features', True)
        
        # Analyze text with AI
        analysis_result = enhanced_dg_detection.analyze_document_text(
            text=text,
            advanced_features=use_advanced
        )
        
        # Format results
        formatted_results = {
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
                } for item in analysis_result.detected_items
            ],
            'confidence_score': analysis_result.confidence_score,
            'processing_method': analysis_result.processing_method,
            'extracted_quantities': analysis_result.extracted_quantities,
            'regulatory_flags': analysis_result.regulatory_flags,
            'quality_metrics': analysis_result.quality_metrics
        }
        
        return Response({
            'success': True,
            'analysis_results': formatted_results
        })
        
    except Exception as e:
        logger.error(f"Text analysis failed: {e}")
        return Response(
            {'error': 'Text analysis failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ai_services_status(request):
    """
    Get status of all AI services for monitoring
    """
    try:
        # Check service availability
        services_status = {
            'ocr_service': {
                'available': True,
                'engines': ['tesseract'],  # Could check AWS/Google availability
                'stats': ocr_service.get_ocr_stats()
            },
            'elasticsearch': {
                'available': enhanced_search_service.es_client is not None,
                'stats': enhanced_search_service.get_search_analytics()
            },
            'nlp_service': {
                'available': enhanced_dg_detection.phrase_matcher is not None,
                'spacy_model': 'en_core_web_sm'
            },
            'table_extraction': {
                'available': True,
                'methods': ['pymupdf_builtin', 'geometric_analysis', 'pattern_matching']
            }
        }
        
        return Response({
            'success': True,
            'services': services_status,
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Service status check failed: {e}")
        return Response(
            {'error': 'Service status check failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
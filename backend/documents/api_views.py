# documents/api_views.py
import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from .models import Document, DocumentType, DocumentStatus
from .serializers import DocumentSerializer, DocumentUploadSerializer, DocumentStatusSerializer
from .tasks import process_manifest_validation
from shipments.models import Shipment

logger = logging.getLogger(__name__)

class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing documents, including manifest uploads and processing.
    """
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter documents based on user permissions"""
        user = self.request.user
        
        if user.is_staff or user.role == user.Role.ADMIN:
            return Document.objects.all()
        
        # Filter by user's depot/company - adjust based on your auth model
        if hasattr(user, 'depot') and user.depot:
            return Document.objects.filter(
                shipment__assigned_depot=user.depot
            )
        
        # Fallback to documents uploaded by the user
        return Document.objects.filter(uploaded_by=user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'upload_manifest':
            return DocumentUploadSerializer
        elif self.action == 'get_status':
            return DocumentStatusSerializer
        return super().get_serializer_class()
    
    @action(detail=False, methods=['post'], url_path='upload-manifest')
    def upload_manifest(self, request):
        """
        Upload a manifest PDF for processing and validation.
        
        Expected payload:
        - file: PDF file
        - shipment_id: UUID of the shipment
        - document_type: Optional, defaults to DG_MANIFEST
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Get and validate shipment
            shipment_id = serializer.validated_data['shipment_id']
            shipment = get_object_or_404(Shipment, id=shipment_id)
            
            # Check permissions for this shipment
            if not self._can_access_shipment(request.user, shipment):
                return Response(
                    {'error': 'You do not have permission to upload documents for this shipment'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create document record
            document = Document.objects.create(
                document_type=serializer.validated_data.get('document_type', DocumentType.DG_MANIFEST),
                status=DocumentStatus.QUEUED,
                file=serializer.validated_data['file'],
                shipment=shipment,
                uploaded_by=request.user,
                original_filename=serializer.validated_data['file'].name
            )
            
            # Update shipment status if it's still pending
            if shipment.status == shipment.ShipmentStatus.PENDING:
                shipment.status = shipment.ShipmentStatus.AWAITING_VALIDATION
                shipment.save(update_fields=['status', 'updated_at'])
            
            logger.info(
                f"Document {document.id} uploaded for shipment {shipment.id} by user {request.user.id}"
            )
            
            # Trigger asynchronous processing
            try:
                process_manifest_validation.delay(str(document.id))
                logger.info(f"Started async processing for document {document.id}")
            except Exception as e:
                logger.error(f"Failed to start async processing for document {document.id}: {str(e)}")
                # Update document status to indicate processing failed
                document.status = DocumentStatus.PROCESSING_FAILED
                document.validation_results = {
                    'error': 'Failed to start processing',
                    'details': str(e)
                }
                document.save()
                
                return Response(
                    {'error': 'Document uploaded but processing failed to start'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Return immediate response with document info
            response_serializer = DocumentSerializer(document)
            return Response({
                'message': 'Manifest uploaded successfully and queued for processing',
                'document': response_serializer.data,
                'processing_status': 'queued'
            }, status=status.HTTP_201_CREATED)
            
        except DjangoValidationError as e:
            logger.warning(f"Validation error during manifest upload: {str(e)}")
            return Response(
                {'error': 'Validation error', 'details': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error during manifest upload: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred during upload'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='status')
    def get_status(self, request, pk=None):
        """
        Get the current processing status and results of a document.
        """
        document = self.get_object()
        serializer = self.get_serializer(document)
        
        response_data = serializer.data
        
        # Add additional status information
        response_data.update({
            'is_processing': document.is_processing,
            'is_validated': document.is_validated,
            'has_errors': bool(document.validation_errors),
            'has_warnings': bool(document.validation_warnings)
        })
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'], url_path='validation-results')
    def get_validation_results(self, request, pk=None):
        """
        Get detailed validation results for a processed document.
        """
        document = self.get_object()
        
        if not document.is_validated:
            return Response(
                {'error': 'Document has not been validated yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validation_results = document.validation_results or {}
        
        return Response({
            'document_id': document.id,
            'status': document.status,
            'validation_results': validation_results,
            'potential_dangerous_goods': validation_results.get('potential_dangerous_goods', []),
            'unmatched_text': validation_results.get('unmatched_text', []),
            'processing_metadata': validation_results.get('metadata', {}),
            'created_at': document.created_at,
            'updated_at': document.updated_at
        })
    
    @action(detail=True, methods=['post'], url_path='confirm-dangerous-goods')
    def confirm_dangerous_goods(self, request, pk=None):
        """
        Confirm which dangerous goods found in the manifest are valid.
        
        Expected payload:
        {
            "confirmed_dangerous_goods": [
                {
                    "un_number": "UN1090",
                    "description": "ACETONE",
                    "quantity": 5,
                    "weight_kg": 25.0,
                    "found_text": "5x Acetone bottles, 5L each"
                }
            ]
        }
        """
        document = self.get_object()
        
        if not document.is_validated:
            return Response(
                {'error': 'Document must be validated before confirming dangerous goods'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if document.status != DocumentStatus.VALIDATED_WITH_ERRORS:
            return Response(
                {'error': 'No dangerous goods confirmation needed for this document'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        confirmed_dgs = request.data.get('confirmed_dangerous_goods', [])
        
        if not confirmed_dgs:
            return Response(
                {'error': 'At least one dangerous good must be confirmed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update validation results with confirmed DGs
        validation_results = document.validation_results or {}
        validation_results['confirmed_dangerous_goods'] = confirmed_dgs
        validation_results['confirmation_timestamp'] = timezone.now().isoformat()
        validation_results['confirmed_by'] = request.user.id
        
        document.validation_results = validation_results
        document.status = DocumentStatus.VALIDATED_OK
        document.save()
        
        logger.info(
            f"User {request.user.id} confirmed {len(confirmed_dgs)} dangerous goods for document {document.id}"
        )
        
        return Response({
            'message': f'Confirmed {len(confirmed_dgs)} dangerous goods',
            'confirmed_count': len(confirmed_dgs),
            'document_status': document.status
        })
    
    def _can_access_shipment(self, user, shipment):
        """Check if user can access this shipment"""
        if user.is_staff or user.role == user.Role.ADMIN:
            return True
        
        # Check depot-based access
        if hasattr(user, 'depot') and hasattr(shipment, 'assigned_depot'):
            return user.depot == shipment.assigned_depot
        
        # Check if user is the one who requested the shipment
        return shipment.requested_by == user
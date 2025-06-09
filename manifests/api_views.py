from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from documents.models import Document, DocumentType, DocumentStatus
from shipments.models import Shipment
from .tasks import process_manifest_validation
from .serializers import ManifestUploadSerializer

class ManifestUploadAPIView(viewsets.ViewSet):
    """
    API endpoint for uploading and processing DG manifests.
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def create(self, request):
        """
        Upload a DG manifest file and queue it for processing.
        
        Expected request data:
        - file: The manifest file (PDF)
        - shipment_id: UUID of the associated shipment
        """
        serializer = ManifestUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the shipment
        shipment = get_object_or_404(
            Shipment,
            id=serializer.validated_data['shipment_id']
        )
        
        # Create document record
        document = Document.objects.create(
            document_type=Document.DocumentType.DG_MANIFEST,
            status=Document.DocumentStatus.QUEUED,
            file=serializer.validated_data['file'],
            original_filename=serializer.validated_data['file'].name,
            mime_type=serializer.validated_data['file'].content_type,
            file_size=serializer.validated_data['file'].size,
            shipment=shipment,
            uploaded_by=request.user
        )
        
        # Queue the validation task
        process_manifest_validation.delay(str(document.id))
        
        return Response({
            'id': document.id,
            'status': document.status,
            'message': _('Manifest uploaded and queued for processing')
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Get the current status and validation results of a manifest.
        """
        document = get_object_or_404(
            Document,
            id=pk,
            document_type=Document.DocumentType.DG_MANIFEST
        )
        
        response_data = {
            'id': document.id,
            'status': document.status,
            'created_at': document.created_at,
            'updated_at': document.updated_at
        }
        
        if document.is_validated:
            response_data.update({
                'validation_results': document.validation_results,
                'validation_errors': document.validation_errors,
                'validation_warnings': document.validation_warnings
            })
        
        return Response(response_data) 
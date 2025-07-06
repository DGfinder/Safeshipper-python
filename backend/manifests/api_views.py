from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from documents.models import Document, DocumentType, DocumentStatus
from shipments.models import Shipment
from .models import Manifest, ManifestDangerousGoodMatch, ManifestType, ManifestStatus
from .tasks import process_manifest_validation
from .serializers import (
    ManifestUploadSerializer, 
    ManifestSerializer, 
    ManifestConfirmationSerializer, 
    ManifestFinalizationSerializer,
    ManifestDangerousGoodMatchSerializer
)
from .services import (
    create_manifest_from_document, 
    confirm_manifest_dangerous_goods, 
    finalize_manifest_shipment
)

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

class ManifestViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing manifests with enhanced functionality.
    """
    serializer_class = ManifestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter manifests based on user permissions.
        """
        # For now, return all manifests - in production you'd filter by user permissions
        return Manifest.objects.select_related(
            'document', 'shipment', 'processed_by', 'confirmed_by'
        ).prefetch_related(
            'dg_matches__dangerous_good'
        ).order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def analysis_results(self, request, pk=None):
        """
        Get detailed analysis results for a manifest.
        """
        manifest = self.get_object()
        
        if not manifest.analysis_results:
            return Response({
                'error': 'Analysis results not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'manifest_id': manifest.id,
            'status': manifest.status,
            'analysis_results': manifest.analysis_results,
            'dg_matches': ManifestDangerousGoodMatchSerializer(
                manifest.dg_matches.all(), many=True
            ).data
        })
    
    @action(detail=True, methods=['post'])
    def confirm_dangerous_goods(self, request, pk=None):
        """
        Confirm dangerous goods selections for a manifest.
        
        Expected payload:
        {
            "confirmed_un_numbers": ["UN1090", "UN1170"]
        }
        """
        manifest = self.get_object()
        
        # Check manifest status
        if manifest.status != ManifestStatus.AWAITING_CONFIRMATION:
            return Response({
                'error': 'Manifest must be awaiting confirmation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ManifestConfirmationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = confirm_manifest_dangerous_goods(
                manifest,
                serializer.validated_data['confirmed_un_numbers'],
                request.user
            )
            
            # Refresh manifest data
            manifest.refresh_from_db()
            
            return Response({
                'message': 'Dangerous goods confirmed successfully',
                'confirmed_count': result['confirmed_count'],
                'compatibility_result': result['compatibility_result'],
                'manifest': ManifestSerializer(manifest).data
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """
        Finalize a manifest by creating shipment items.
        
        Expected payload:
        {
            "confirmed_dangerous_goods": [
                {
                    "un_number": "UN1090",
                    "description": "ACETONE",
                    "quantity": 5,
                    "weight_kg": 25.0
                }
            ]
        }
        """
        manifest = self.get_object()
        
        # Check manifest status
        if manifest.status != ManifestStatus.CONFIRMED:
            return Response({
                'error': 'Manifest must be confirmed before finalization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ManifestFinalizationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = finalize_manifest_shipment(
                manifest,
                serializer.validated_data['confirmed_dangerous_goods'],
                request.user
            )
            
            if not result['success']:
                return Response({
                    'error': result['error'],
                    'compatibility_result': result['compatibility_result']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Refresh manifest data
            manifest.refresh_from_db()
            
            return Response({
                'message': 'Manifest finalized successfully',
                'created_items_count': result['created_items_count'],
                'compatibility_result': result['compatibility_result'],
                'manifest': ManifestSerializer(manifest).data
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def shipment_status(self, request, pk=None):
        """
        Get the current status of the associated shipment.
        """
        manifest = self.get_object()
        shipment = manifest.shipment
        
        return Response({
            'shipment_id': shipment.id,
            'tracking_number': shipment.tracking_number,
            'status': shipment.status,
            'items_count': shipment.items.count(),
            'dangerous_items_count': shipment.items.filter(is_dangerous_good=True).count()
        })
    
    @action(detail=False, methods=['get'], url_path='poll-status/(?P<shipment_id>[^/.]+)')
    def poll_manifest_status(self, request, shipment_id=None):
        """
        Polling endpoint for frontend to get real-time manifest processing status.
        
        Returns comprehensive status information for a shipment's manifests.
        """
        try:
            shipment = get_object_or_404(Shipment, id=shipment_id)
            
            # Get all manifests for this shipment
            manifests = self.get_queryset().filter(shipment=shipment)
            
            manifest_data = []
            for manifest in manifests:
                manifest_info = {
                    'id': manifest.id,
                    'status': manifest.status,
                    'status_display': manifest.get_status_display(),
                    'manifest_type': manifest.manifest_type,
                    'manifest_type_display': manifest.get_manifest_type_display(),
                    'created_at': manifest.created_at,
                    'analysis_started_at': manifest.analysis_started_at,
                    'analysis_completed_at': manifest.analysis_completed_at,
                    'confirmed_at': manifest.confirmed_at,
                    'finalized_at': manifest.finalized_at,
                    'total_dg_matches': manifest.dg_matches.count(),
                    'confirmed_dg_count': manifest.dg_matches.filter(is_confirmed=True).count(),
                    'document_status': manifest.document.status,
                    'document_id': manifest.document.id
                }
                
                # Add analysis results summary if available
                if manifest.analysis_results:
                    analysis = manifest.analysis_results
                    manifest_info['analysis_summary'] = {
                        'total_potential_dgs': analysis.get('total_potential_dgs', 0),
                        'requires_confirmation': analysis.get('requires_confirmation', False),
                        'processing_time': analysis.get('processing_metadata', {}).get('processing_time_seconds')
                    }
                
                manifest_data.append(manifest_info)
            
            # Get shipment status
            shipment_info = {
                'id': shipment.id,
                'tracking_number': shipment.tracking_number,
                'status': shipment.status,
                'status_display': shipment.get_status_display(),
                'total_items': shipment.items.count(),
                'dangerous_items': shipment.items.filter(is_dangerous_good=True).count()
            }
            
            # Determine overall processing status
            if not manifests:
                overall_status = 'no_manifests'
            elif any(m.status == ManifestStatus.PROCESSING_FAILED for m in manifests):
                overall_status = 'processing_failed'
            elif any(m.status == ManifestStatus.ANALYZING for m in manifests):
                overall_status = 'analyzing'
            elif any(m.status == ManifestStatus.AWAITING_CONFIRMATION for m in manifests):
                overall_status = 'awaiting_confirmation'
            elif any(m.status == ManifestStatus.CONFIRMED for m in manifests):
                overall_status = 'ready_for_finalization'
            elif all(m.status == ManifestStatus.FINALIZED for m in manifests):
                overall_status = 'finalized'
            else:
                overall_status = 'uploaded'
            
            return Response({
                'shipment': shipment_info,
                'manifests': manifest_data,
                'overall_status': overall_status,
                'total_manifests': len(manifest_data),
                'timestamp': timezone.now()
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 
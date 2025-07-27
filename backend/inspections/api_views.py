# inspections/api_views.py
import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

from .models import (
    Inspection, 
    InspectionItem, 
    InspectionPhoto, 
    InspectionTemplate,
    InspectionTemplateItem
)
from .serializers import (
    InspectionSerializer,
    InspectionCreateSerializer,
    InspectionUpdateSerializer,
    InspectionItemSerializer,
    InspectionPhotoSerializer,
    InspectionTemplateSerializer,
    InspectionTemplateItemSerializer
)
from shipments.models import Shipment


class InspectionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for inspection management.
    Allows drivers and loaders to create, update, and view inspections.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    filterset_fields = {
        'shipment': ['exact'],
        'inspection_type': ['exact', 'in'],
        'status': ['exact', 'in'],
        'overall_result': ['exact'],
        'created_at': ['date', 'gte', 'lte'],
        'inspector': ['exact'],
    }
    search_fields = ['shipment__tracking_number', 'notes']
    ordering_fields = ['created_at', 'started_at', 'completed_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter inspections based on user role and permissions."""
        queryset = Inspection.objects.select_related(
            'shipment', 'inspector', 'template'
        ).prefetch_related('items', 'photos')
        
        # Role-based filtering
        user_role = getattr(self.request.user, 'role', 'USER')
        
        if user_role == 'DRIVER':
            # Drivers see only their own inspections
            queryset = queryset.filter(inspector=self.request.user)
        elif user_role == 'CUSTOMER':
            # Customers see inspections for their shipments only
            if hasattr(self.request.user, 'company'):
                queryset = queryset.filter(shipment__customer=self.request.user.company)
        
        return queryset

    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'create':
            return InspectionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InspectionUpdateSerializer
        return InspectionSerializer

    def perform_create(self, serializer):
        """Set inspector to current user and validate permissions."""
        # Default inspector to current user if not specified
        if not serializer.validated_data.get('inspector'):
            serializer.save(inspector=self.request.user)
        else:
            # Only allow admins/managers to assign inspections to other users
            if (self.request.user != serializer.validated_data.get('inspector') and 
                not getattr(self.request.user, 'is_staff', False)):
                raise ValidationError("You can only create inspections for yourself.")
            serializer.save()

    @action(detail=False, methods=['get'], url_path='by-shipment/(?P<shipment_id>[^/.]+)')
    def by_shipment(self, request, shipment_id=None):
        """Get inspections for a specific shipment - matches frontend mock API structure."""
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        inspections = self.get_queryset().filter(shipment=shipment)
        
        # Transform to match frontend mock structure
        inspections_data = []
        for inspection in inspections:
            items_data = []
            for item in inspection.items.all():
                photos = [photo.image.url for photo in item.photos.all() if photo.image]
                items_data.append({
                    'id': str(item.id),
                    'description': item.description,
                    'status': item.result,
                    'photos': photos,
                    'notes': item.notes or '',
                })
            
            inspections_data.append({
                'id': str(inspection.id),
                'shipment_id': str(inspection.shipment.id),
                'inspector': {
                    'name': f"{inspection.inspector.first_name} {inspection.inspector.last_name}".strip(),
                    'role': getattr(inspection.inspector, 'role', 'INSPECTOR')
                },
                'inspection_type': inspection.inspection_type,
                'timestamp': inspection.created_at.isoformat(),
                'status': inspection.status,
                'items': items_data,
            })
        
        return Response(inspections_data)

    @action(detail=False, methods=['post'], url_path='create-inspection')
    def create_inspection(self, request):
        """Create a new inspection - matches frontend mock API structure."""
        shipment_id = request.data.get('shipmentId')
        inspection_type = request.data.get('inspectionType', 'PRE_TRIP')
        items = request.data.get('items', [])
        
        if not shipment_id:
            return Response(
                {'error': 'shipmentId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create inspection
        inspection = Inspection.objects.create(
            shipment=shipment,
            inspector=request.user,
            inspection_type=inspection_type,
            status='COMPLETED',
            overall_result='PASS',  # Default, will be calculated from items
            started_at=timezone.now(),
            completed_at=timezone.now()
        )
        
        # Create inspection items
        items_data = []
        for item_data in items:
            item = InspectionItem.objects.create(
                inspection=inspection,
                description=item_data.get('description', ''),
                result=item_data.get('status', 'PASS'),
                notes=item_data.get('notes', ''),
                is_required=True
            )
            items_data.append({
                'id': str(item.id),
                'description': item.description,
                'status': item.result,
                'photos': [],  # No photos in this simplified version
                'notes': item.notes,
            })
        
        # Calculate overall result
        has_failures = any(item.result == 'FAIL' for item in inspection.items.all())
        inspection.overall_result = 'FAIL' if has_failures else 'PASS'
        inspection.save()
        
        # Return response in expected format
        response_data = {
            'id': str(inspection.id),
            'shipment_id': str(inspection.shipment.id),
            'inspector': {
                'name': f"{inspection.inspector.first_name} {inspection.inspector.last_name}".strip(),
                'role': getattr(inspection.inspector, 'role', 'INSPECTOR')
            },
            'inspection_type': inspection.inspection_type,
            'timestamp': inspection.created_at.isoformat(),
            'status': inspection.status,
            'items': items_data,
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter inspections based on user permissions"""
        user = self.request.user
        queryset = Inspection.objects.select_related(
            'shipment', 'inspector'
        ).prefetch_related(
            'items__photos'
        )
        
        # Drivers can only see their own inspections
        if hasattr(user, 'driver_profile'):
            return queryset.filter(inspector=user)
        
        # Dispatchers and managers can see all inspections
        # For their company/depot if applicable
        if hasattr(user, 'depot') and user.depot:
            # Filter by depot if user has one
            return queryset.filter(
                shipment__origin_depot=user.depot
            )
        
        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return InspectionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InspectionUpdateSerializer
        return InspectionSerializer

    def perform_create(self, serializer):
        """Set the inspector to current user"""
        serializer.save(inspector=self.request.user)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark inspection as completed"""
        inspection = self.get_object()
        
        if inspection.status == 'COMPLETED':
            return Response(
                {'error': 'Inspection is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine overall result based on items
        failed_items = inspection.items.filter(result='FAIL').count()
        inspection.overall_result = 'FAIL' if failed_items > 0 else 'PASS'
        inspection.status = 'COMPLETED'
        inspection.completed_at = timezone.now()
        inspection.save()
        
        logger.info(f"Inspection {inspection.id} completed by {request.user}")
        
        serializer = self.get_serializer(inspection)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_inspections(self, request):
        """Get inspections for the current user"""
        inspections = self.get_queryset().filter(inspector=request.user)
        page = self.paginate_queryset(inspections)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(inspections, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def for_shipment(self, request):
        """Get all inspections for a specific shipment"""
        shipment_id = request.query_params.get('shipment_id')
        if not shipment_id:
            return Response(
                {'error': 'shipment_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
            inspections = self.get_queryset().filter(shipment=shipment)
            serializer = self.get_serializer(inspections, many=True)
            return Response(serializer.data)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class InspectionItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for individual inspection items.
    Allows updating individual checklist items during inspection.
    """
    serializer_class = InspectionItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter items based on user's inspection access"""
        user = self.request.user
        queryset = InspectionItem.objects.select_related(
            'inspection__inspector', 'inspection__shipment'
        ).prefetch_related('photos')
        
        # Users can only modify their own inspection items
        if hasattr(user, 'driver_profile'):
            return queryset.filter(inspection__inspector=user)
        
        return queryset

    def perform_update(self, serializer):
        """Set checked timestamp when item is updated"""
        if 'result' in serializer.validated_data:
            serializer.save(checked_at=timezone.now())
        else:
            serializer.save()


class InspectionPhotoViewSet(viewsets.ModelViewSet):
    """
    API endpoint for inspection photos.
    Handles photo upload and management.
    """
    serializer_class = InspectionPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter photos based on user's inspection access"""
        user = self.request.user
        return InspectionPhoto.objects.select_related(
            'inspection_item__inspection__inspector'
        ).filter(
            inspection_item__inspection__inspector=user
        )

    def perform_create(self, serializer):
        """Set the uploaded_by field to current user"""
        serializer.save(uploaded_by=self.request.user)


class InspectionTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for inspection templates.
    Provides standard checklists for different inspection types.
    """
    serializer_class = InspectionTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = InspectionTemplate.objects.filter(is_active=True).prefetch_related(
        'template_items'
    )
    
    filterset_fields = ['inspection_type']
    ordering = ['inspection_type', 'name']

    @action(detail=True, methods=['post'])
    def create_inspection(self, request, pk=None):
        """Create a new inspection from this template"""
        template = self.get_object()
        shipment_id = request.data.get('shipment_id')
        
        if not shipment_id:
            return Response(
                {'error': 'shipment_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shipment = Shipment.objects.get(id=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {'error': 'Shipment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create inspection
        inspection = Inspection.objects.create(
            shipment=shipment,
            inspector=request.user,
            inspection_type=template.inspection_type,
            notes=f"Created from template: {template.name}"
        )
        
        # Create inspection items from template
        for template_item in template.template_items.all():
            InspectionItem.objects.create(
                inspection=inspection,
                description=template_item.description,
                category=template_item.category,
                is_mandatory=template_item.is_mandatory
            )
        
        logger.info(f"Inspection created from template {template.name} by {request.user}")
        
        serializer = InspectionSerializer(inspection)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
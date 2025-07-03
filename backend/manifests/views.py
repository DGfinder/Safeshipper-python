from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

from documents.models import Document, DocumentStatus
from documents.serializers import DocumentSerializer
from .tasks import validate_manifest_task
from .serializers import ManifestUploadSerializer, ManifestValidationSerializer

class ManifestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing manifest documents and their validation.
    """
    queryset = Document.objects.filter(document_type=Document.DocumentType.MANIFEST)
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        """
        Filter queryset based on user permissions.
        """
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(uploaded_by=user)

    @extend_schema(
        summary="Upload a new manifest document",
        description="Upload a new manifest document for validation. The document will be processed asynchronously.",
        request=ManifestUploadSerializer,
        responses={
            201: DocumentSerializer,
            400: OpenApiResponse(description="Bad request - Invalid input data"),
            403: OpenApiResponse(description="Forbidden - Insufficient permissions"),
        },
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Upload a new manifest document and trigger validation.
        """
        serializer = ManifestUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create document record
        document = serializer.save(
            document_type=Document.DocumentType.MANIFEST,
            uploaded_by=request.user,
            status=DocumentStatus.PENDING
        )
        
        # Trigger async validation
        validate_manifest_task.delay(str(document.id))
        
        return Response(
            DocumentSerializer(document).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        summary="Get manifest validation results",
        description="Retrieve the validation results for a specific manifest document.",
        responses={
            200: ManifestValidationSerializer,
            404: OpenApiResponse(description="Not found - Document does not exist"),
            403: OpenApiResponse(description="Forbidden - Insufficient permissions"),
        },
    )
    @action(detail=True, methods=["get"])
    def validation_results(self, request, pk=None):
        """
        Retrieve validation results for a manifest document.
        """
        document = get_object_or_404(self.get_queryset(), pk=pk)
        
        if document.status in [DocumentStatus.PENDING, DocumentStatus.PROCESSING]:
            return Response(
                {"status": "processing", "message": "Validation is still in progress"},
                status=status.HTTP_202_ACCEPTED
            )
        
        serializer = ManifestValidationSerializer(document)
        return Response(serializer.data)

    @extend_schema(
        summary="Retry manifest validation",
        description="Retry the validation process for a manifest document that previously failed.",
        responses={
            202: OpenApiResponse(description="Accepted - Validation restarted"),
            404: OpenApiResponse(description="Not found - Document does not exist"),
            400: OpenApiResponse(description="Bad request - Document cannot be revalidated"),
            403: OpenApiResponse(description="Forbidden - Insufficient permissions"),
        },
    )
    @action(detail=True, methods=["post"])
    def retry_validation(self, request, pk=None):
        """
        Retry validation for a manifest document that previously failed.
        """
        document = get_object_or_404(self.get_queryset(), pk=pk)
        
        if document.status not in [DocumentStatus.VALIDATION_FAILED, DocumentStatus.PROCESSING_FAILED]:
            return Response(
                {"error": "Only failed documents can be revalidated"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset document status and clear previous results
        document.status = DocumentStatus.PENDING
        document.validation_results = {}
        document.save(update_fields=["status", "validation_results", "updated_at"])
        
        # Trigger async validation
        validate_manifest_task.delay(str(document.id))
        
        return Response(
            {"status": "accepted", "message": "Validation restarted"},
            status=status.HTTP_202_ACCEPTED
        )

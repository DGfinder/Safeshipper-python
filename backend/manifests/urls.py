from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ManifestViewSet, ManifestUploadAPIView
from .enhanced_api_views import (
    enhanced_manifest_upload,
    get_enhanced_processing_status,
    get_enhanced_analysis_results,
    extract_tables_from_document,
    search_dangerous_goods_enhanced,
    batch_process_documents,
    analyze_text_for_dangerous_goods,
    get_ai_services_status
)

router = DefaultRouter()
router.register(r"manifests", ManifestViewSet, basename="manifest")

urlpatterns = [
    path("", include(router.urls)),
    
    # Legacy endpoints
    path("manifests/upload-and-analyze/", ManifestUploadAPIView.as_view({'post': 'create'}), name="manifest-upload-analyze"),
    path("manifests/upload-and-analyze/<uuid:pk>/status/", ManifestUploadAPIView.as_view({'get': 'status'}), name="manifest-upload-status"),
    
    # Enhanced AI-powered endpoints
    path("manifests/enhanced-upload/", enhanced_manifest_upload, name="enhanced-manifest-upload"),
    path("manifests/processing-status/<uuid:document_id>/", get_enhanced_processing_status, name="enhanced-processing-status"),
    path("manifests/analysis-results/<uuid:document_id>/", get_enhanced_analysis_results, name="enhanced-analysis-results"),
    path("manifests/extract-tables/<uuid:document_id>/", extract_tables_from_document, name="extract-tables"),
    path("manifests/batch-process/", batch_process_documents, name="batch-process-documents"),
    
    # Enhanced search and analysis endpoints
    path("dangerous-goods/search-enhanced/", search_dangerous_goods_enhanced, name="search-dangerous-goods-enhanced"),
    path("dangerous-goods/analyze-text/", analyze_text_for_dangerous_goods, name="analyze-text-dangerous-goods"),
    
    # Service status endpoints
    path("ai-services/status/", get_ai_services_status, name="ai-services-status"),
]
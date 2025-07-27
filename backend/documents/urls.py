# documents/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import DocumentViewSet
from .file_upload_views import (
    FileUploadView,
    BulkFileUploadView,
    FileDownloadView,
    UploadProgressView,
    StorageStatsView
)

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'', DocumentViewSet, basename='document')

app_name = 'documents'

urlpatterns = [
    # Document CRUD operations
    path('api/', include(router.urls)),
    
    # File upload endpoints
    path('api/files/upload/', FileUploadView.as_view(), name='file-upload'),
    path('api/files/bulk-upload/', BulkFileUploadView.as_view(), name='bulk-file-upload'),
    path('api/files/<uuid:document_id>/download/', FileDownloadView.as_view(), name='file-download'),
    
    # Upload tracking
    path('api/uploads/<uuid:upload_id>/progress/', UploadProgressView.as_view(), name='upload-progress'),
    
    # Storage statistics
    path('api/storage/stats/', StorageStatsView.as_view(), name='storage-stats'),
]
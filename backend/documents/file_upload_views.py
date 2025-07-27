# documents/file_upload_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
from typing import Dict, Any, List
import logging
import mimetypes
import hashlib
import os

from safeshipper_core.storage import storage_service, document_storage_service
from safeshipper_core.storage_backends import DocumentTypeStorageConfig
from .models import Document, DocumentUpload
from .serializers import DocumentSerializer, DocumentUploadSerializer

logger = logging.getLogger(__name__)

class FileUploadView(APIView):
    """
    Comprehensive file upload API endpoint with storage backend integration.
    Supports multiple storage backends (S3, MinIO, Local) with automatic fallback.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """
        Upload file(s) with validation and storage integration
        
        Form Data:
            file: File to upload (required)
            document_type: Type of document (required)
            description: File description (optional)
            tags: Comma-separated tags (optional)
            folder: Custom folder path (optional)
            public: Make file publicly accessible (optional, default: false)
        """
        try:
            # Validate file presence
            if 'file' not in request.FILES:
                return Response({
                    'error': 'No file provided',
                    'message': 'Please select a file to upload'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            uploaded_file = request.FILES['file']
            document_type = request.data.get('document_type', 'general')
            description = request.data.get('description', '')
            tags = request.data.get('tags', '')
            custom_folder = request.data.get('folder', '')
            is_public = request.data.get('public', 'false').lower() == 'true'
            
            # Validate file size
            max_size = getattr(settings, 'MAX_FILE_UPLOAD_SIZE', 100 * 1024 * 1024)  # 100MB
            if uploaded_file.size > max_size:
                return Response({
                    'error': 'File too large',
                    'message': f'File size exceeds maximum allowed size of {max_size // 1024 // 1024}MB',
                    'file_size': uploaded_file.size,
                    'max_size': max_size
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file type
            allowed_extensions = getattr(settings, 'ALLOWED_FILE_EXTENSIONS', [])
            file_extension = os.path.splitext(uploaded_file.name)[1].lower()
            if allowed_extensions and file_extension not in allowed_extensions:
                return Response({
                    'error': 'File type not allowed',
                    'message': f'File type {file_extension} is not permitted',
                    'allowed_types': allowed_extensions
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Determine storage folder
            if custom_folder:
                folder = custom_folder
            else:
                folder = DocumentTypeStorageConfig.get_folder(document_type)
            
            # Upload file using storage service
            upload_result = storage_service.upload_file(
                file_obj=uploaded_file,
                filename=uploaded_file.name,
                folder=folder,
                validate_file=True,
                generate_thumbnail=self._should_generate_thumbnail(uploaded_file.content_type)
            )
            
            if not upload_result['success']:
                return Response({
                    'error': 'Upload failed',
                    'message': upload_result.get('error', 'Unknown error occurred during upload')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create document record using existing Document model fields
            document_data = {
                'original_filename': uploaded_file.name,
                'file_size': uploaded_file.size,
                'mime_type': uploaded_file.content_type,
                'document_type': document_type,
                'uploaded_by': request.user,
            }
            
            # Create document instance
            document = Document.objects.create(**document_data)
            
            # Store additional metadata in validation_results for now
            additional_metadata = {
                'file_path': upload_result['file_path'],
                'file_hash': upload_result.get('file_hash', ''),
                'storage_backend': upload_result.get('storage_backend', 'unknown'),
                'is_public': is_public,
                'description': description,
                'tags': [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []
            }
            
            document.validation_results = additional_metadata
            document.save()
            
            # Create upload tracking record
            upload_record = DocumentUpload.objects.create(
                document=document,
                original_filename=uploaded_file.name,
                upload_status='completed',
                storage_backend=upload_result.get('storage_backend'),
                uploaded_by=request.user
            )
            
            # Prepare response
            response_data = {
                'success': True,
                'document': DocumentSerializer(document).data,
                'upload_info': {
                    'id': str(upload_record.id),
                    'file_path': upload_result['file_path'],
                    'file_size': uploaded_file.size,
                    'content_type': uploaded_file.content_type,
                    'storage_backend': upload_result.get('storage_backend'),
                    'file_hash': upload_result.get('file_hash'),
                    'thumbnail_path': upload_result.get('thumbnail_path'),
                    'upload_timestamp': timezone.now().isoformat()
                },
                'access_urls': self._generate_access_urls(document, upload_result)
            }
            
            logger.info(f"File uploaded successfully: {uploaded_file.name} by {request.user}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"File upload error: {str(e)}")
            return Response({
                'error': 'Upload failed',
                'message': 'An unexpected error occurred during file upload',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _should_generate_thumbnail(self, content_type: str) -> bool:
        """Determine if thumbnail should be generated for file type"""
        image_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        document_types = ['application/pdf']
        return content_type in image_types or content_type in document_types
    
    def _generate_access_urls(self, document: Document, upload_result: Dict) -> Dict[str, str]:
        """Generate access URLs for the uploaded file"""
        urls = {}
        
        try:
            metadata = document.validation_results or {}
            file_path = metadata.get('file_path') or upload_result['file_path']
            
            # Generate download URL
            if metadata.get('is_public', False):
                urls['public_url'] = storage_service.get_public_url(file_path)
            else:
                urls['secure_url'] = storage_service.generate_presigned_url(
                    file_path,
                    expiration=3600  # 1 hour
                )
            
            # Generate thumbnail URL if available
            if upload_result.get('thumbnail_path'):
                urls['thumbnail_url'] = storage_service.generate_presigned_url(
                    upload_result['thumbnail_path'],
                    expiration=3600
                )
            
            # Generate API download URL
            urls['api_download_url'] = f"/api/v1/documents/files/{document.id}/download/"
            
        except Exception as e:
            logger.error(f"Failed to generate access URLs: {e}")
        
        return urls

class BulkFileUploadView(APIView):
    """
    Bulk file upload endpoint for uploading multiple files at once.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """
        Upload multiple files in a single request
        
        Form Data:
            files: Multiple files to upload (required)
            document_type: Type for all documents (required)
            folder: Custom folder path (optional)
            descriptions: JSON array of descriptions (optional)
            tags: Comma-separated tags for all files (optional)
        """
        try:
            files = request.FILES.getlist('files')
            if not files:
                return Response({
                    'error': 'No files provided',
                    'message': 'Please select files to upload'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate bulk upload limits
            max_bulk_files = getattr(settings, 'MAX_BULK_UPLOAD_FILES', 10)
            if len(files) > max_bulk_files:
                return Response({
                    'error': 'Too many files',
                    'message': f'Maximum {max_bulk_files} files allowed in bulk upload',
                    'file_count': len(files)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            document_type = request.data.get('document_type', 'general')
            custom_folder = request.data.get('folder', '')
            tags = request.data.get('tags', '')
            
            # Process descriptions if provided
            descriptions = []
            try:
                import json
                descriptions_json = request.data.get('descriptions', '[]')
                descriptions = json.loads(descriptions_json) if descriptions_json else []
            except json.JSONDecodeError:
                descriptions = []
            
            results = {
                'success_count': 0,
                'error_count': 0,
                'results': [],
                'errors': []
            }
            
            # Process each file
            for index, uploaded_file in enumerate(files):
                try:
                    # Get description for this file
                    description = descriptions[index] if index < len(descriptions) else ''
                    
                    # Create a mock request for single file upload
                    file_request_data = {
                        'document_type': document_type,
                        'description': description,
                        'tags': tags,
                        'folder': custom_folder,
                        'public': 'false'
                    }
                    
                    # Validate file
                    if uploaded_file.size > getattr(settings, 'MAX_FILE_UPLOAD_SIZE', 100 * 1024 * 1024):
                        results['errors'].append({
                            'filename': uploaded_file.name,
                            'error': 'File too large',
                            'index': index
                        })
                        results['error_count'] += 1
                        continue
                    
                    # Upload using storage service
                    folder = custom_folder or DocumentTypeStorageConfig.get_folder(document_type)
                    upload_result = storage_service.upload_file(
                        file_obj=uploaded_file,
                        filename=uploaded_file.name,
                        folder=folder,
                        validate_file=True
                    )
                    
                    if upload_result['success']:
                        # Create document record
                        document = Document.objects.create(
                            original_filename=uploaded_file.name,
                            file_size=uploaded_file.size,
                            mime_type=uploaded_file.content_type,
                            document_type=document_type,
                            uploaded_by=request.user,
                        )
                        
                        # Store additional metadata
                        additional_metadata = {
                            'file_path': upload_result['file_path'],
                            'file_hash': upload_result.get('file_hash', ''),
                            'storage_backend': upload_result.get('storage_backend', 'unknown'),
                            'description': description,
                            'tags': [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []
                        }
                        
                        document.validation_results = additional_metadata
                        document.save()
                        
                        results['results'].append({
                            'filename': uploaded_file.name,
                            'document_id': str(document.id),
                            'file_path': upload_result['file_path'],
                            'index': index,
                            'status': 'success'
                        })
                        results['success_count'] += 1
                    else:
                        results['errors'].append({
                            'filename': uploaded_file.name,
                            'error': upload_result.get('error', 'Upload failed'),
                            'index': index
                        })
                        results['error_count'] += 1
                
                except Exception as e:
                    results['errors'].append({
                        'filename': uploaded_file.name,
                        'error': str(e),
                        'index': index
                    })
                    results['error_count'] += 1
            
            # Determine response status
            if results['success_count'] > 0 and results['error_count'] == 0:
                response_status = status.HTTP_201_CREATED
            elif results['success_count'] > 0:
                response_status = status.HTTP_207_MULTI_STATUS
            else:
                response_status = status.HTTP_400_BAD_REQUEST
            
            results['timestamp'] = timezone.now().isoformat()
            
            return Response(results, status=response_status)
            
        except Exception as e:
            logger.error(f"Bulk upload error: {str(e)}")
            return Response({
                'error': 'Bulk upload failed',
                'message': 'An unexpected error occurred during bulk upload',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FileDownloadView(APIView):
    """
    Secure file download endpoint with access control.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, document_id):
        """
        Download file with access control checks
        
        Query Parameters:
            disposition: attachment (download) or inline (view) - default: attachment
            thumbnail: Return thumbnail if available - default: false
        """
        try:
            # Get document
            try:
                document = Document.objects.get(id=document_id)
            except Document.DoesNotExist:
                return Response({
                    'error': 'Document not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check permissions
            if not self._check_download_permissions(request.user, document):
                return Response({
                    'error': 'Access denied',
                    'message': 'You do not have permission to download this file'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get download parameters
            disposition = request.GET.get('disposition', 'attachment')
            get_thumbnail = request.GET.get('thumbnail', 'false').lower() == 'true'
            
            # Get file path from metadata
            metadata = document.validation_results or {}
            if get_thumbnail and metadata.get('thumbnail_path'):
                file_path = metadata['thumbnail_path']
            else:
                file_path = metadata.get('file_path') or str(document.file) if document.file else None
            
            if not file_path:
                return Response({
                    'error': 'File not found',
                    'message': 'File path not available'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Download file
            download_result = storage_service.download_file(file_path)
            
            if not download_result['success']:
                return Response({
                    'error': 'Download failed',
                    'message': download_result.get('error', 'File not accessible')
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Prepare response
            from django.http import HttpResponse
            response = HttpResponse(
                download_result['content'],
                content_type=document.mime_type
            )
            
            # Set content disposition
            filename = document.original_filename or 'download'
            if disposition == 'attachment':
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
            else:
                response['Content-Disposition'] = f'inline; filename="{filename}"'
            
            response['Content-Length'] = document.file_size
            metadata = document.validation_results or {}
            response['X-File-Hash'] = metadata.get('file_hash', '')
            
            # Log download
            logger.info(f"File downloaded: {document.original_filename} by {request.user}")
            
            return response
            
        except Exception as e:
            logger.error(f"File download error: {str(e)}")
            return Response({
                'error': 'Download failed',
                'message': 'An unexpected error occurred during download'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _check_download_permissions(self, user, document) -> bool:
        """Check if user has permission to download the document"""
        metadata = document.validation_results or {}
        
        # Public documents are accessible to all authenticated users
        if metadata.get('is_public', False):
            return True
        
        # Owner can always download
        if document.uploaded_by == user:
            return True
        
        # Staff users can download any document
        if user.is_staff:
            return True
        
        # Add additional permission logic here
        # For example, check if user belongs to same company
        
        return False

class UploadProgressView(APIView):
    """
    Upload progress tracking endpoint for large file uploads.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, upload_id):
        """Get upload progress for a specific upload"""
        try:
            upload_record = DocumentUpload.objects.get(
                id=upload_id,
                uploaded_by=request.user
            )
            
            return Response({
                'upload_id': str(upload_record.id),
                'status': upload_record.upload_status,
                'progress_percent': upload_record.progress_percent or 0,
                'bytes_uploaded': upload_record.bytes_uploaded or 0,
                'total_bytes': upload_record.total_bytes or 0,
                'error_message': upload_record.error_message,
                'created_at': upload_record.created_at.isoformat(),
                'completed_at': upload_record.completed_at.isoformat() if upload_record.completed_at else None
            })
            
        except DocumentUpload.DoesNotExist:
            return Response({
                'error': 'Upload record not found'
            }, status=status.HTTP_404_NOT_FOUND)

class StorageStatsView(APIView):
    """
    Storage statistics and usage information endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get storage statistics for the user or system"""
        try:
            user = request.user
            
            # Get user-specific stats
            user_documents = Document.objects.filter(uploaded_by=user)
            user_stats = {
                'total_files': user_documents.count(),
                'total_size_bytes': sum(doc.file_size for doc in user_documents),
                'document_types': {},
                'recent_uploads': []
            }
            
            # Calculate size in MB
            user_stats['total_size_mb'] = round(user_stats['total_size_bytes'] / (1024 * 1024), 2)
            
            # Group by document type
            for doc in user_documents:
                doc_type = doc.document_type
                if doc_type not in user_stats['document_types']:
                    user_stats['document_types'][doc_type] = {'count': 0, 'size_bytes': 0}
                user_stats['document_types'][doc_type]['count'] += 1
                user_stats['document_types'][doc_type]['size_bytes'] += doc.file_size
            
            # Recent uploads (last 10)
            recent_docs = user_documents.order_by('-created_at')[:10]
            user_stats['recent_uploads'] = [
                {
                    'id': str(doc.id),
                    'title': doc.title,
                    'document_type': doc.document_type,
                    'file_size': doc.file_size,
                    'uploaded_at': doc.created_at.isoformat()
                } for doc in recent_docs
            ]
            
            # System stats (for staff users)
            system_stats = {}
            if user.is_staff:
                system_stats = storage_service.get_storage_stats()
            
            response_data = {
                'user_stats': user_stats,
                'system_stats': system_stats,
                'storage_limits': {
                    'max_file_size_mb': getattr(settings, 'MAX_FILE_UPLOAD_SIZE', 100 * 1024 * 1024) // (1024 * 1024),
                    'allowed_extensions': getattr(settings, 'ALLOWED_FILE_EXTENSIONS', []),
                    'max_bulk_files': getattr(settings, 'MAX_BULK_UPLOAD_FILES', 10)
                },
                'timestamp': timezone.now().isoformat()
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Storage stats error: {str(e)}")
            return Response({
                'error': 'Failed to retrieve storage statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
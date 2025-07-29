# shipments/pod_capture_service.py

import base64
import io
import uuid
import logging
from typing import Dict, List, Optional, Tuple
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from django.conf import settings
from PIL import Image
import boto3
from botocore.exceptions import ClientError

from .models import Shipment, ProofOfDelivery, ProofOfDeliveryPhoto
from users.models import User
from audits.signals import log_custom_action
from audits.models import AuditActionType

logger = logging.getLogger(__name__)


class PODCaptureService:
    """
    Enhanced service for handling mobile Proof of Delivery capture with signature and photos.
    Includes image processing, cloud storage, and comprehensive validation.
    """

    @classmethod
    def submit_proof_of_delivery(cls, shipment_id: str, driver_user: User, pod_data: Dict) -> Dict:
        """
        Process complete POD submission from mobile app with signature and photos.
        
        Args:
            shipment_id: UUID of the shipment
            driver_user: User object of the driver submitting POD
            pod_data: Dictionary containing POD information
            
        Returns:
            Dict with processing results and POD details
        """
        try:
            shipment = Shipment.objects.select_related('customer', 'carrier').get(id=shipment_id)
            
            # Validate shipment can accept POD
            validation_result = cls._validate_pod_submission(shipment, driver_user)
            if not validation_result['can_submit']:
                return {
                    'success': False,
                    'error': validation_result['reason'],
                    'validation_details': validation_result
                }
            
            # Process signature
            signature_result = cls._process_signature(pod_data.get('signature_file'))
            if not signature_result['success']:
                return {
                    'success': False,
                    'error': f"Signature processing failed: {signature_result['error']}"
                }
            
            # Create POD record
            pod = ProofOfDelivery.objects.create(
                shipment=shipment,
                delivered_by=driver_user,
                recipient_name=pod_data.get('recipient_name', '').strip(),
                recipient_signature_url=signature_result['signature_url'],
                delivery_notes=pod_data.get('delivery_notes', '').strip(),
                delivery_location=pod_data.get('delivery_location', '').strip()
            )
            
            # Process photos
            photos_data = pod_data.get('photos_data', [])
            processed_photos = []
            
            for photo_data in photos_data:
                photo_result = cls._process_pod_photo(pod, photo_data)
                if photo_result['success']:
                    processed_photos.append(photo_result['photo'])
                else:
                    logger.warning(f"Failed to process photo for POD {pod.id}: {photo_result['error']}")
            
            # Update shipment status
            shipment.status = 'DELIVERED'
            shipment.actual_delivery_date = timezone.now()
            shipment.save(update_fields=['status', 'actual_delivery_date', 'updated_at'])
            
            # Log POD creation
            log_custom_action(
                action_type=AuditActionType.CREATE,
                description=f"POD submitted for shipment {shipment.tracking_number} by {driver_user.get_full_name()}",
                content_object=pod,
                metadata={
                    'shipment_id': str(shipment.id),
                    'shipment_tracking': shipment.tracking_number,
                    'driver_id': str(driver_user.id),
                    'recipient_name': pod.recipient_name,
                    'photos_count': len(processed_photos),
                    'delivery_location': pod.delivery_location,
                    'has_signature': bool(pod.recipient_signature_url)
                }
            )
            
            # Trigger notifications and follow-up processes
            cls._trigger_post_delivery_processes(shipment, pod)
            
            return {
                'success': True,
                'pod_id': str(pod.id),
                'shipment_status': shipment.status,
                'delivered_at': pod.delivered_at.isoformat(),
                'photos_processed': len(processed_photos),
                'signature_processed': signature_result['success'],
                'pod_summary': {
                    'recipient_name': pod.recipient_name,
                    'delivery_location': pod.delivery_location,
                    'photo_count': len(processed_photos),
                    'delivered_by': driver_user.get_full_name(),
                    'tracking_number': shipment.tracking_number
                }
            }
            
        except Shipment.DoesNotExist:
            return {
                'success': False,
                'error': 'Shipment not found'
            }
        except Exception as e:
            logger.error(f"Error submitting POD for shipment {shipment_id}: {str(e)}")
            return {
                'success': False,
                'error': f'POD submission failed: {str(e)}'
            }

    @classmethod
    def _validate_pod_submission(cls, shipment: Shipment, driver_user: User) -> Dict:
        """Validate if POD can be submitted for this shipment."""
        validation_result = {
            'can_submit': True,
            'reason': '',
            'issues': []
        }
        
        # Check if shipment is already delivered
        if shipment.status == 'DELIVERED':
            validation_result['can_submit'] = False
            validation_result['reason'] = 'Shipment is already marked as delivered'
            validation_result['issues'].append('STATUS_ALREADY_DELIVERED')
            return validation_result
        
        # Check if POD already exists
        if hasattr(shipment, 'proof_of_delivery'):
            validation_result['can_submit'] = False
            validation_result['reason'] = 'Proof of delivery already exists for this shipment'
            validation_result['issues'].append('POD_ALREADY_EXISTS')
            return validation_result
        
        # Check if driver is authorized
        if driver_user.role != 'DRIVER':
            validation_result['can_submit'] = False
            validation_result['reason'] = 'Only drivers can submit proof of delivery'
            validation_result['issues'].append('UNAUTHORIZED_USER_ROLE')
            return validation_result
        
        # Check if driver is assigned to shipment (optional - may be flexible)
        if shipment.assigned_driver and shipment.assigned_driver != driver_user:
            validation_result['issues'].append('DRIVER_NOT_ASSIGNED')
            # Note: This might be a warning rather than blocking issue
        
        # Check shipment status allows delivery
        allowed_statuses = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'AT_HUB']
        if shipment.status not in allowed_statuses:
            validation_result['issues'].append(f'INVALID_STATUS_{shipment.status}')
            # This might be a warning for some statuses
        
        return validation_result

    @classmethod
    def _process_signature(cls, signature_data: str) -> Dict:
        """Process and store signature image."""
        try:
            if not signature_data:
                return {
                    'success': False,
                    'error': 'No signature data provided'
                }
            
            # Handle base64 signature data
            if signature_data.startswith('data:image'):
                # Remove data URL prefix
                signature_data = signature_data.split(',')[1]
            
            # Decode base64
            try:
                signature_bytes = base64.b64decode(signature_data)
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Invalid base64 signature data: {str(e)}'
                }
            
            # Validate image
            try:
                image = Image.open(io.BytesIO(signature_bytes))
                image.verify()
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Invalid signature image: {str(e)}'
                }
            
            # Generate unique filename
            signature_filename = f"signatures/pod_signature_{uuid.uuid4()}.png"
            
            # Save to storage
            signature_file = ContentFile(signature_bytes, name=signature_filename)
            signature_url = default_storage.save(signature_filename, signature_file)
            
            # Get full URL
            if hasattr(default_storage, 'url'):
                full_signature_url = default_storage.url(signature_url)
            else:
                full_signature_url = signature_url
            
            return {
                'success': True,
                'signature_url': full_signature_url,
                'file_size': len(signature_bytes)
            }
            
        except Exception as e:
            logger.error(f"Error processing signature: {str(e)}")
            return {
                'success': False,
                'error': f'Signature processing error: {str(e)}'
            }

    @classmethod
    def _process_pod_photo(cls, pod: ProofOfDelivery, photo_data: Dict) -> Dict:
        """Process and store a POD photo."""
        try:
            # Extract photo information
            image_url = photo_data.get('image_url', '')
            file_name = photo_data.get('file_name', f'pod_photo_{uuid.uuid4()}.jpg')
            file_size = photo_data.get('file_size', 0)
            caption = photo_data.get('caption', '')
            
            if not image_url:
                return {
                    'success': False,
                    'error': 'No image URL provided'
                }
            
            # Handle different image sources
            if image_url.startswith('data:image'):
                # Base64 image data
                photo_result = cls._process_base64_image(image_url, file_name)
                if not photo_result['success']:
                    return photo_result
                stored_url = photo_result['image_url']
                
            elif image_url.startswith('file://'):
                # Local file path (mobile)
                return {
                    'success': False,
                    'error': 'Local file processing not implemented for POD photos'
                }
            else:
                # Assume it's already a valid URL
                stored_url = image_url
            
            # Create photo record
            photo = ProofOfDeliveryPhoto.objects.create(
                proof_of_delivery=pod,
                image_url=stored_url,
                file_name=file_name,
                file_size=file_size,
                caption=caption
            )
            
            # Generate thumbnail if needed
            thumbnail_result = cls._generate_photo_thumbnail(photo, photo_result.get('image_bytes'))
            if thumbnail_result['success']:
                photo.thumbnail_url = thumbnail_result['thumbnail_url']
                photo.save(update_fields=['thumbnail_url'])
            
            return {
                'success': True,
                'photo': photo,
                'photo_id': str(photo.id)
            }
            
        except Exception as e:
            logger.error(f"Error processing POD photo: {str(e)}")
            return {
                'success': False,
                'error': f'Photo processing error: {str(e)}'
            }

    @classmethod
    def _process_base64_image(cls, image_data: str, file_name: str) -> Dict:
        """Process base64 image data and store it."""
        try:
            # Extract base64 data
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            
            # Validate image
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            
            # Generate storage path
            storage_path = f"pod_photos/{uuid.uuid4()}_{file_name}"
            
            # Save to storage
            image_file = ContentFile(image_bytes, name=storage_path)
            stored_path = default_storage.save(storage_path, image_file)
            
            # Get full URL
            if hasattr(default_storage, 'url'):
                full_image_url = default_storage.url(stored_path)
            else:
                full_image_url = stored_path
            
            return {
                'success': True,
                'image_url': full_image_url,
                'image_bytes': image_bytes,
                'file_size': len(image_bytes)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Base64 image processing error: {str(e)}'
            }

    @classmethod
    def _generate_photo_thumbnail(cls, photo: ProofOfDeliveryPhoto, image_bytes: Optional[bytes] = None) -> Dict:
        """Generate thumbnail for POD photo."""
        try:
            if not image_bytes:
                # Skip thumbnail generation if no image data
                return {'success': False, 'error': 'No image data for thumbnail'}
            
            # Create thumbnail
            image = Image.open(io.BytesIO(image_bytes))
            image.thumbnail((200, 200), Image.Resampling.LANCZOS)
            
            # Save thumbnail
            thumbnail_buffer = io.BytesIO()
            image.save(thumbnail_buffer, format='JPEG', quality=85)
            thumbnail_bytes = thumbnail_buffer.getvalue()
            
            # Store thumbnail
            thumbnail_path = f"pod_thumbnails/thumb_{photo.id}.jpg"
            thumbnail_file = ContentFile(thumbnail_bytes, name=thumbnail_path)
            stored_thumbnail_path = default_storage.save(thumbnail_path, thumbnail_file)
            
            # Get full URL
            if hasattr(default_storage, 'url'):
                thumbnail_url = default_storage.url(stored_thumbnail_path)
            else:
                thumbnail_url = stored_thumbnail_path
            
            return {
                'success': True,
                'thumbnail_url': thumbnail_url
            }
            
        except Exception as e:
            logger.warning(f"Failed to generate thumbnail for photo {photo.id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @classmethod
    def _trigger_post_delivery_processes(cls, shipment: Shipment, pod: ProofOfDelivery):
        """Trigger post-delivery processes like notifications and analytics."""
        try:
            # Import here to avoid circular imports
            from communications.services import NotificationService
            from shipments.tasks import process_delivery_completion
            
            # Send delivery confirmation notifications
            NotificationService.send_delivery_confirmation(
                shipment=shipment,
                pod=pod
            )
            
            # Queue background processing
            process_delivery_completion.delay(
                shipment_id=str(shipment.id),
                pod_id=str(pod.id)
            )
            
        except ImportError:
            logger.warning("Post-delivery process services not available")
        except Exception as e:
            logger.error(f"Error triggering post-delivery processes: {str(e)}")

    @classmethod
    def get_pod_summary(cls, pod_id: str) -> Dict:
        """Get comprehensive POD summary for display."""
        try:
            pod = ProofOfDelivery.objects.select_related(
                'shipment', 'delivered_by'
            ).prefetch_related('photos').get(id=pod_id)
            
            photos_data = []
            for photo in pod.photos.all():
                photos_data.append({
                    'id': str(photo.id),
                    'image_url': photo.image_url,
                    'thumbnail_url': photo.thumbnail_url,
                    'file_name': photo.file_name,
                    'file_size_mb': photo.file_size_mb,
                    'caption': photo.caption,
                    'taken_at': photo.taken_at.isoformat()
                })
            
            return {
                'success': True,
                'pod': {
                    'id': str(pod.id),
                    'shipment': {
                        'id': str(pod.shipment.id),
                        'tracking_number': pod.shipment.tracking_number,
                        'customer_name': pod.shipment.customer.name,
                        'status': pod.shipment.status
                    },
                    'delivered_by': {
                        'id': str(pod.delivered_by.id),
                        'name': pod.delivered_by.get_full_name(),
                        'email': pod.delivered_by.email
                    },
                    'recipient_name': pod.recipient_name,
                    'recipient_signature_url': pod.recipient_signature_url,
                    'delivery_notes': pod.delivery_notes,
                    'delivery_location': pod.delivery_location,
                    'delivered_at': pod.delivered_at.isoformat(),
                    'photos': photos_data,
                    'photo_count': len(photos_data)
                }
            }
            
        except ProofOfDelivery.DoesNotExist:
            return {
                'success': False,
                'error': 'Proof of delivery not found'
            }
        except Exception as e:
            logger.error(f"Error getting POD summary {pod_id}: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get POD summary: {str(e)}'
            }

    @classmethod
    def validate_mobile_pod_data(cls, pod_data: Dict) -> Dict:
        """Validate POD data structure from mobile app."""
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Required fields
        required_fields = ['recipient_name', 'signature_file']
        for field in required_fields:
            if not pod_data.get(field):
                validation_result['is_valid'] = False
                validation_result['errors'].append(f'Missing required field: {field}')
        
        # Validate recipient name
        recipient_name = pod_data.get('recipient_name', '').strip()
        if len(recipient_name) < 2:
            validation_result['is_valid'] = False
            validation_result['errors'].append('Recipient name must be at least 2 characters')
        
        # Validate signature
        signature_file = pod_data.get('signature_file', '')
        if signature_file and not (signature_file.startswith('data:image') or len(signature_file) > 100):
            validation_result['errors'].append('Invalid signature format')
        
        # Validate photos
        photos_data = pod_data.get('photos_data', [])
        if not photos_data:
            validation_result['warnings'].append('No photos provided - photos are recommended for proof of delivery')
        elif len(photos_data) > 10:
            validation_result['warnings'].append('More than 10 photos provided - only first 10 will be processed')
        
        # Validate notes length
        delivery_notes = pod_data.get('delivery_notes', '')
        if len(delivery_notes) > 1000:
            validation_result['warnings'].append('Delivery notes are very long and may be truncated')
        
        return validation_result
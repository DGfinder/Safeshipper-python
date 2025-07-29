# inspections/hazard_inspection_service.py

import base64
import io
import uuid
import logging
from typing import Dict, List, Optional, Tuple
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from PIL import Image
import boto3
from botocore.exceptions import ClientError

from .models import (
    Inspection, 
    InspectionItem, 
    InspectionPhoto, 
    InspectionTemplate,
    InspectionTemplateItem
)
from shipments.models import Shipment
from users.models import User
from audits.signals import log_custom_action
from audits.models import AuditActionType

logger = logging.getLogger(__name__)


class HazardInspectionService:
    """
    Enhanced service for handling mobile hazard inspections with comprehensive 
    photo capture, dangerous goods validation, and safety compliance.
    """

    @classmethod
    def create_inspection_from_template(cls, template_id: str, shipment_id: str, inspector_user: User) -> Dict:
        """
        Create a new inspection from a template with pre-populated items.
        
        Args:
            template_id: UUID of the inspection template
            shipment_id: UUID of the shipment to inspect
            inspector_user: User performing the inspection
            
        Returns:
            Dict with inspection creation results
        """
        try:
            template = InspectionTemplate.objects.prefetch_related('template_items').get(
                id=template_id, is_active=True
            )
            shipment = Shipment.objects.select_related('customer', 'carrier').get(id=shipment_id)
            
            # Validate inspector can perform inspection
            validation_result = cls._validate_inspection_permissions(inspector_user, shipment)
            if not validation_result['can_inspect']:
                return {
                    'success': False,
                    'error': validation_result['reason']
                }
            
            with transaction.atomic():
                # Create inspection
                inspection = Inspection.objects.create(
                    shipment=shipment,
                    inspector=inspector_user,
                    inspection_type=template.inspection_type,
                    status='IN_PROGRESS',
                    notes=f"Created from template: {template.name}"
                )
                
                # Create inspection items from template
                created_items = []
                for template_item in template.template_items.all():
                    item = InspectionItem.objects.create(
                        inspection=inspection,
                        description=template_item.description,
                        category=template_item.category or 'GENERAL',
                        is_mandatory=template_item.is_mandatory
                    )
                    created_items.append(item)
                
                # Log inspection creation
                log_custom_action(
                    action_type=AuditActionType.CREATE,
                    description=f"Started {template.get_inspection_type_display()} inspection for shipment {shipment.tracking_number}",
                    content_object=inspection,
                    metadata={
                        'template_id': str(template.id),
                        'template_name': template.name,
                        'shipment_id': str(shipment.id),
                        'inspector_id': str(inspector_user.id),
                        'items_count': len(created_items),
                        'dangerous_goods': cls._analyze_shipment_dangerous_goods(shipment)
                    }
                )
                
                # Generate specialized checklist items for dangerous goods
                dg_items = cls._generate_dangerous_goods_items(shipment, inspection)
                created_items.extend(dg_items)
                
                return {
                    'success': True,
                    'inspection_id': str(inspection.id),
                    'inspection': cls._serialize_inspection_for_mobile(inspection),
                    'items_count': len(created_items),
                    'dangerous_goods_items': len(dg_items),
                    'template_name': template.name
                }
                
        except InspectionTemplate.DoesNotExist:
            return {
                'success': False,
                'error': 'Inspection template not found'
            }
        except Shipment.DoesNotExist:
            return {
                'success': False,
                'error': 'Shipment not found'
            }
        except Exception as e:
            logger.error(f"Error creating inspection from template {template_id}: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to create inspection: {str(e)}'
            }

    @classmethod
    def update_inspection_item(cls, item_id: str, inspector_user: User, item_data: Dict) -> Dict:
        """
        Update an inspection item with result, notes, and photos.
        
        Args:
            item_id: UUID of the inspection item
            inspector_user: User performing the inspection
            item_data: Dictionary containing item updates
            
        Returns:
            Dict with update results
        """
        try:
            item = InspectionItem.objects.select_related(
                'inspection__inspector', 'inspection__shipment'
            ).get(id=item_id)
            
            # Validate inspector permissions
            if item.inspection.inspector != inspector_user:
                return {
                    'success': False,
                    'error': 'You can only update your own inspection items'
                }
            
            # Update item fields
            updated_fields = []
            
            if 'result' in item_data:
                result = item_data['result']
                if result in ['PASS', 'FAIL', 'N/A']:
                    item.result = result
                    item.checked_at = timezone.now()
                    updated_fields.extend(['result', 'checked_at'])
            
            if 'notes' in item_data:
                item.notes = item_data['notes']
                updated_fields.append('notes')
            
            if 'corrective_action' in item_data:
                item.corrective_action = item_data['corrective_action']
                updated_fields.append('corrective_action')
            
            item.save(update_fields=updated_fields + ['updated_at'] if updated_fields else [])
            
            # Process photos if provided
            photos_processed = []
            if 'photos_data' in item_data:
                for photo_data in item_data['photos_data']:
                    photo_result = cls._process_inspection_photo(item, photo_data, inspector_user)
                    if photo_result['success']:
                        photos_processed.append(photo_result['photo_id'])
                    else:
                        logger.warning(f"Failed to process photo for item {item_id}: {photo_result['error']}")
            
            # Generate safety recommendations for failed items
            recommendations = []
            if item.result == 'FAIL':
                recommendations = cls._generate_safety_recommendations(item)
            
            return {
                'success': True,
                'item_id': str(item.id),
                'updated_fields': updated_fields,
                'photos_processed': len(photos_processed),
                'safety_recommendations': recommendations,
                'item_data': cls._serialize_inspection_item_for_mobile(item)
            }
            
        except InspectionItem.DoesNotExist:
            return {
                'success': False,
                'error': 'Inspection item not found'
            }
        except Exception as e:
            logger.error(f"Error updating inspection item {item_id}: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to update inspection item: {str(e)}'
            }

    @classmethod
    def complete_inspection(cls, inspection_id: str, inspector_user: User, completion_data: Dict) -> Dict:
        """
        Complete an inspection with comprehensive validation and reporting.
        
        Args:
            inspection_id: UUID of the inspection
            inspector_user: User completing the inspection
            completion_data: Dictionary containing completion information
            
        Returns:
            Dict with completion results
        """
        try:
            inspection = Inspection.objects.select_related(
                'shipment', 'inspector'
            ).prefetch_related('items__photos').get(id=inspection_id)
            
            # Validate inspector permissions
            if inspection.inspector != inspector_user:
                return {
                    'success': False,
                    'error': 'You can only complete your own inspections'
                }
            
            if inspection.status == 'COMPLETED':
                return {
                    'success': False,
                    'error': 'Inspection is already completed'
                }
            
            # Validate all mandatory items are completed
            incomplete_mandatory = inspection.items.filter(
                is_mandatory=True,
                result__isnull=True
            )
            
            if incomplete_mandatory.exists():
                return {
                    'success': False,
                    'error': f'{incomplete_mandatory.count()} mandatory items must be completed',
                    'incomplete_items': [
                        {'id': str(item.id), 'description': item.description}
                        for item in incomplete_mandatory
                    ]
                }
            
            # Calculate overall result
            failed_items = inspection.items.filter(result='FAIL')
            passed_items = inspection.items.filter(result='PASS')
            na_items = inspection.items.filter(result='N/A')
            
            overall_result = 'FAIL' if failed_items.exists() else 'PASS'
            
            # Update inspection
            inspection.status = 'COMPLETED'
            inspection.overall_result = overall_result
            inspection.completed_at = timezone.now()
            inspection.notes = completion_data.get('final_notes', inspection.notes)
            inspection.save(update_fields=['status', 'overall_result', 'completed_at', 'notes'])
            
            # Generate comprehensive inspection report
            inspection_report = cls._generate_inspection_report(inspection)
            
            # Trigger safety alerts for failed inspections
            safety_alerts = []
            if overall_result == 'FAIL':
                safety_alerts = cls._trigger_safety_alerts(inspection, failed_items)
            
            # Log completion
            log_custom_action(
                action_type=AuditActionType.UPDATE,
                description=f"Completed {inspection.get_inspection_type_display()} inspection with result: {overall_result}",
                content_object=inspection,
                metadata={
                    'overall_result': overall_result,
                    'failed_items_count': failed_items.count(),
                    'passed_items_count': passed_items.count(),
                    'na_items_count': na_items.count(),
                    'total_photos': inspection.total_photos_count,
                    'duration_minutes': inspection.duration_minutes,
                    'safety_alerts_generated': len(safety_alerts)
                }
            )
            
            # Trigger post-completion processes
            cls._trigger_post_completion_processes(inspection, inspection_report)
            
            return {
                'success': True,
                'inspection_id': str(inspection.id),
                'overall_result': overall_result,
                'completion_summary': {
                    'total_items': inspection.items.count(),
                    'passed_items': passed_items.count(),
                    'failed_items': failed_items.count(),
                    'na_items': na_items.count(),
                    'total_photos': inspection.total_photos_count,
                    'duration_minutes': inspection.duration_minutes
                },
                'inspection_report': inspection_report,
                'safety_alerts': safety_alerts,
                'completed_at': inspection.completed_at.isoformat()
            }
            
        except Inspection.DoesNotExist:
            return {
                'success': False,
                'error': 'Inspection not found'
            }
        except Exception as e:
            logger.error(f"Error completing inspection {inspection_id}: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to complete inspection: {str(e)}'
            }

    @classmethod
    def get_inspection_templates(cls, inspection_type: Optional[str] = None) -> Dict:
        """Get available inspection templates with dangerous goods analysis."""
        try:
            templates_qs = InspectionTemplate.objects.filter(is_active=True).prefetch_related(
                'template_items'
            )
            
            if inspection_type:
                templates_qs = templates_qs.filter(inspection_type=inspection_type)
            
            templates_data = []
            for template in templates_qs:
                template_items = []
                for item in template.template_items.all():
                    template_items.append({
                        'id': str(item.id),
                        'description': item.description,
                        'category': item.category,
                        'is_mandatory': item.is_mandatory,
                        'help_text': item.help_text,
                        'order': item.order
                    })
                
                templates_data.append({
                    'id': str(template.id),
                    'name': template.name,
                    'inspection_type': template.inspection_type,
                    'inspection_type_display': template.get_inspection_type_display(),
                    'description': template.description,
                    'items_count': len(template_items),
                    'mandatory_items_count': sum(1 for item in template_items if item['is_mandatory']),
                    'template_items': template_items
                })
            
            return {
                'success': True,
                'templates': templates_data,
                'templates_count': len(templates_data)
            }
            
        except Exception as e:
            logger.error(f"Error getting inspection templates: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get templates: {str(e)}'
            }

    @classmethod
    def _validate_inspection_permissions(cls, inspector_user: User, shipment: Shipment) -> Dict:
        """Validate if user can perform inspection on shipment."""
        # Basic role validation
        user_role = getattr(inspector_user, 'role', 'USER')
        
        if user_role not in ['DRIVER', 'LOADER', 'INSPECTOR', 'MANAGER', 'ADMIN']:
            return {
                'can_inspect': False,
                'reason': 'User role not authorized for inspections'
            }
        
        # Check if driver is assigned to shipment
        if user_role == 'DRIVER' and shipment.assigned_driver and shipment.assigned_driver != inspector_user:
            return {
                'can_inspect': False,
                'reason': 'Driver not assigned to this shipment'
            }
        
        # Check shipment status
        if shipment.status in ['CANCELLED', 'COMPLETED']:
            return {
                'can_inspect': False,
                'reason': f'Cannot inspect shipment with status: {shipment.status}'
            }
        
        return {
            'can_inspect': True,
            'reason': 'User authorized to perform inspection'
        }

    @classmethod
    def _analyze_shipment_dangerous_goods(cls, shipment: Shipment) -> Dict:
        """Analyze dangerous goods in shipment for inspection planning."""
        dangerous_items = shipment.items.filter(is_dangerous_good=True)
        
        if not dangerous_items.exists():
            return {
                'has_dangerous_goods': False,
                'total_dg_items': 0,
                'hazard_classes': [],
                'special_requirements': []
            }
        
        hazard_classes = set()
        un_numbers = []
        special_requirements = []
        
        for item in dangerous_items:
            if item.dangerous_good_entry:
                dg = item.dangerous_good_entry
                hazard_classes.add(dg.hazard_class)
                un_numbers.append(dg.un_number)
                
                # Add special requirements based on hazard class
                if dg.hazard_class in ['1', '1.1', '1.2', '1.3']:
                    special_requirements.append('EXPLOSIVES_HANDLING')
                elif dg.hazard_class in ['2.1', '2.3']:
                    special_requirements.append('GAS_LEAK_CHECK')
                elif dg.hazard_class == '3':
                    special_requirements.append('FLAMMABLE_LIQUID_CHECK')
                elif dg.hazard_class in ['4.1', '4.2', '4.3']:
                    special_requirements.append('FIRE_HAZARD_CHECK')
                elif dg.hazard_class in ['5.1', '5.2']:
                    special_requirements.append('OXIDIZER_SEPARATION')
                elif dg.hazard_class in ['6.1', '6.2']:
                    special_requirements.append('TOXIC_CONTAINMENT')
                elif dg.hazard_class == '7':
                    special_requirements.append('RADIATION_SAFETY')
                elif dg.hazard_class == '8':
                    special_requirements.append('CORROSIVE_LEAK_CHECK')
        
        return {
            'has_dangerous_goods': True,
            'total_dg_items': dangerous_items.count(),
            'hazard_classes': list(hazard_classes),
            'un_numbers': un_numbers,
            'special_requirements': list(set(special_requirements))
        }

    @classmethod
    def _generate_dangerous_goods_items(cls, shipment: Shipment, inspection: Inspection) -> List[InspectionItem]:
        """Generate specialized inspection items for dangerous goods."""
        dg_analysis = cls._analyze_shipment_dangerous_goods(shipment)
        
        if not dg_analysis['has_dangerous_goods']:
            return []
        
        created_items = []
        
        # General dangerous goods items
        general_dg_items = [
            "Verify all dangerous goods are properly labeled and placarded",
            "Check that packaging is intact and undamaged",
            "Confirm dangerous goods documentation is complete",
            "Verify segregation requirements are met",
            "Check emergency response information is available"
        ]
        
        for description in general_dg_items:
            item = InspectionItem.objects.create(
                inspection=inspection,
                description=description,
                category='DANGEROUS_GOODS',
                is_mandatory=True
            )
            created_items.append(item)
        
        # Hazard-specific items
        for requirement in dg_analysis['special_requirements']:
            if requirement == 'EXPLOSIVES_HANDLING':
                item = InspectionItem.objects.create(
                    inspection=inspection,
                    description="Verify explosives handling procedures and safety distances",
                    category='EXPLOSIVES',
                    is_mandatory=True
                )
                created_items.append(item)
            
            elif requirement == 'GAS_LEAK_CHECK':
                item = InspectionItem.objects.create(
                    inspection=inspection,
                    description="Check gas cylinders for leaks and proper valve security",
                    category='GASES',
                    is_mandatory=True
                )
                created_items.append(item)
            
            elif requirement == 'FLAMMABLE_LIQUID_CHECK':
                item = InspectionItem.objects.create(
                    inspection=inspection,
                    description="Verify flammable liquid containers are secure and leak-free",
                    category='FLAMMABLE_LIQUIDS',
                    is_mandatory=True
                )
                created_items.append(item)
            
            # Add more hazard-specific items as needed
        
        return created_items

    @classmethod
    def _process_inspection_photo(cls, inspection_item: InspectionItem, photo_data: Dict, inspector_user: User) -> Dict:
        """Process and store an inspection photo."""
        try:
            # Extract photo information
            image_data = photo_data.get('image_data', '')
            file_name = photo_data.get('file_name', f'inspection_photo_{uuid.uuid4()}.jpg')
            caption = photo_data.get('caption', '')
            
            if not image_data:
                return {
                    'success': False,
                    'error': 'No image data provided'
                }
            
            # Process base64 image
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            try:
                image_bytes = base64.b64decode(image_data)
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Invalid base64 image data: {str(e)}'
                }
            
            # Validate image
            try:
                image = Image.open(io.BytesIO(image_bytes))
                image.verify()
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Invalid image format: {str(e)}'
                }
            
            # Generate storage path
            storage_path = f"inspection_photos/{uuid.uuid4()}_{file_name}"
            
            # Save to storage
            image_file = ContentFile(image_bytes, name=storage_path)
            stored_path = default_storage.save(storage_path, image_file)
            
            # Get full URL
            if hasattr(default_storage, 'url'):
                full_image_url = default_storage.url(stored_path)
            else:
                full_image_url = stored_path
            
            # Generate thumbnail
            thumbnail_result = cls._generate_photo_thumbnail(image_bytes, stored_path)
            
            # Create photo record
            photo = InspectionPhoto.objects.create(
                inspection_item=inspection_item,
                image_url=full_image_url,
                thumbnail_url=thumbnail_result.get('thumbnail_url', ''),
                file_name=file_name,
                file_size=len(image_bytes),
                caption=caption,
                uploaded_by=inspector_user
            )
            
            return {
                'success': True,
                'photo_id': str(photo.id),
                'image_url': full_image_url,
                'thumbnail_url': thumbnail_result.get('thumbnail_url', ''),
                'file_size': len(image_bytes)
            }
            
        except Exception as e:
            logger.error(f"Error processing inspection photo: {str(e)}")
            return {
                'success': False,
                'error': f'Photo processing error: {str(e)}'
            }

    @classmethod
    def _generate_photo_thumbnail(cls, image_bytes: bytes, storage_path: str) -> Dict:
        """Generate thumbnail for inspection photo."""
        try:
            # Create thumbnail
            image = Image.open(io.BytesIO(image_bytes))
            image.thumbnail((200, 200), Image.Resampling.LANCZOS)
            
            # Save thumbnail
            thumbnail_buffer = io.BytesIO()
            image.save(thumbnail_buffer, format='JPEG', quality=85)
            thumbnail_bytes = thumbnail_buffer.getvalue()
            
            # Store thumbnail
            thumbnail_path = f"inspection_thumbnails/thumb_{storage_path.split('/')[-1]}"
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
            logger.warning(f"Failed to generate thumbnail: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @classmethod
    def _generate_safety_recommendations(cls, inspection_item: InspectionItem) -> List[str]:
        """Generate safety recommendations for failed inspection items."""
        recommendations = []
        
        category = inspection_item.category.upper()
        description = inspection_item.description.upper()
        
        if 'DANGEROUS_GOODS' in category or 'HAZARD' in description:
            recommendations.extend([
                "Isolate the affected dangerous goods immediately",
                "Notify the safety coordinator",
                "Review dangerous goods handling procedures"
            ])
        
        if 'LEAK' in description or 'SPILL' in description:
            recommendations.extend([
                "Contain the leak/spill using appropriate materials",
                "Evacuate area if necessary",
                "Contact emergency response team"
            ])
        
        if 'FIRE' in description or 'FLAMMABLE' in description:
            recommendations.extend([
                "Ensure fire suppression equipment is accessible",
                "Remove ignition sources from area",
                "Review fire safety procedures"
            ])
        
        if 'VEHICLE' in category:
            recommendations.extend([
                "Do not operate vehicle until issue is resolved",
                "Schedule immediate maintenance inspection",
                "Document vehicle defect in maintenance log"
            ])
        
        if not recommendations:
            recommendations.append("Address the identified issue before proceeding")
        
        return recommendations

    @classmethod
    def _serialize_inspection_for_mobile(cls, inspection: Inspection) -> Dict:
        """Serialize inspection for mobile app consumption."""
        items_data = []
        for item in inspection.items.all():
            items_data.append(cls._serialize_inspection_item_for_mobile(item))
        
        return {
            'id': str(inspection.id),
            'shipment_id': str(inspection.shipment.id),
            'shipment_tracking': inspection.shipment.tracking_number,
            'inspection_type': inspection.inspection_type,
            'inspection_type_display': inspection.get_inspection_type_display(),
            'status': inspection.status,
            'overall_result': inspection.overall_result,
            'started_at': inspection.started_at.isoformat(),
            'completed_at': inspection.completed_at.isoformat() if inspection.completed_at else None,
            'notes': inspection.notes,
            'items': items_data,
            'items_count': len(items_data),
            'mandatory_items_count': sum(1 for item in items_data if item['is_mandatory']),
            'completed_items_count': sum(1 for item in items_data if item['result']),
            'failed_items_count': sum(1 for item in items_data if item['result'] == 'FAIL')
        }

    @classmethod
    def _serialize_inspection_item_for_mobile(cls, item: InspectionItem) -> Dict:
        """Serialize inspection item for mobile app consumption."""
        photos_data = []
        for photo in item.photos.all():
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
            'id': str(item.id),
            'description': item.description,
            'category': item.category,
            'is_mandatory': item.is_mandatory,
            'result': item.result,
            'notes': item.notes,
            'corrective_action': item.corrective_action,
            'checked_at': item.checked_at.isoformat() if item.checked_at else None,
            'photos': photos_data,
            'photos_count': len(photos_data),
            'has_photos': len(photos_data) > 0
        }

    @classmethod
    def _generate_inspection_report(cls, inspection: Inspection) -> Dict:
        """Generate comprehensive inspection report."""
        items = inspection.items.all()
        
        failed_items = []
        passed_items = []
        na_items = []
        
        for item in items:
            item_data = {
                'description': item.description,
                'category': item.category,
                'result': item.result,
                'notes': item.notes,
                'photos_count': item.photos.count()
            }
            
            if item.result == 'FAIL':
                failed_items.append(item_data)
            elif item.result == 'PASS':
                passed_items.append(item_data)
            elif item.result == 'N/A':
                na_items.append(item_data)
        
        return {
            'inspection_id': str(inspection.id),
            'inspection_type': inspection.inspection_type,
            'overall_result': inspection.overall_result,
            'duration_minutes': inspection.duration_minutes,
            'total_items': items.count(),
            'failed_items': failed_items,
            'passed_items': passed_items,
            'na_items': na_items,
            'total_photos': inspection.total_photos_count,
            'inspector_name': inspection.inspector.get_full_name(),
            'shipment_tracking': inspection.shipment.tracking_number,
            'completed_at': inspection.completed_at.isoformat() if inspection.completed_at else None
        }

    @classmethod
    def _trigger_safety_alerts(cls, inspection: Inspection, failed_items) -> List[Dict]:
        """Trigger safety alerts for failed inspection items."""
        alerts = []
        
        for item in failed_items:
            alert_data = {
                'type': 'INSPECTION_FAILURE',
                'severity': cls._determine_alert_severity(item),
                'item_description': item.description,
                'category': item.category,
                'shipment_tracking': inspection.shipment.tracking_number,
                'inspector': inspection.inspector.get_full_name(),
                'timestamp': timezone.now().isoformat()
            }
            alerts.append(alert_data)
        
        # TODO: Integrate with notification service to send alerts
        
        return alerts

    @classmethod
    def _determine_alert_severity(cls, inspection_item: InspectionItem) -> str:
        """Determine alert severity based on inspection item."""
        category = inspection_item.category.upper()
        description = inspection_item.description.upper()
        
        # High severity conditions
        if ('DANGEROUS_GOODS' in category or 
            'LEAK' in description or 
            'FIRE' in description or 
            'EXPLOSION' in description):
            return 'HIGH'
        
        # Medium severity conditions
        if ('SAFETY' in category or 
            'EMERGENCY' in description or 
            inspection_item.is_mandatory):
            return 'MEDIUM'
        
        return 'LOW'

    @classmethod
    def _trigger_post_completion_processes(cls, inspection: Inspection, inspection_report: Dict):
        """Trigger post-completion processes."""
        try:
            # Import here to avoid circular imports
            from communications.services import NotificationService
            from inspections.tasks import process_inspection_completion
            
            # Send completion notifications
            NotificationService.send_inspection_completion_notification(
                inspection=inspection,
                report=inspection_report
            )
            
            # Queue background processing
            process_inspection_completion.delay(
                inspection_id=str(inspection.id)
            )
            
        except ImportError:
            logger.warning("Post-completion process services not available")
        except Exception as e:
            logger.error(f"Error triggering post-completion processes: {str(e)}")
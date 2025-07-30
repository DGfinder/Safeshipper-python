# permissions.py for documents app
import logging
from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class CanGeneratePDFReports(permissions.BasePermission):
    """
    Permission class for PDF report generation.
    
    Users can generate PDF reports if they have:
    1. Authentication (not anonymous)
    2. Access to the specific shipment data
    3. Appropriate role permissions for report generation
    """
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        """
        Check if user has permission to generate PDF reports.
        
        Args:
            request: The request being made
            view: The view being accessed
            
        Returns:
            bool: True if user can generate reports
        """
        # Must be authenticated
        if isinstance(request.user, AnonymousUser) or not request.user.is_authenticated:
            logger.warning("Unauthenticated user attempted to access PDF generation")
            return False
        
        user = request.user
        
        # Admin and staff users can always generate reports
        if user.is_staff or user.is_superuser:
            return True
        
        # Check for specific role-based permissions
        if hasattr(user, 'role'):
            # Allow admins, managers, and compliance officers to generate reports
            allowed_roles = ['ADMIN', 'MANAGER', 'COMPLIANCE_OFFICER', 'OPERATIONS_MANAGER']
            if hasattr(user.role, 'name') and user.role.name in allowed_roles:
                return True
            elif isinstance(user.role, str) and user.role in allowed_roles:
                return True
        
        # Check for specific permissions if using Django's permission system
        if user.has_perm('documents.can_generate_reports'):
            return True
        
        # Check if user has general shipment access permissions
        if user.has_perm('shipments.view_shipment'):
            return True
        
        logger.info(f"User {user.id} ({user.email}) denied PDF generation permission")
        return False
    
    def has_object_permission(self, request: Request, view: APIView, obj) -> bool:
        """
        Check if user has permission to generate reports for a specific shipment.
        
        Args:
            request: The request being made
            view: The view being accessed
            obj: The shipment object
            
        Returns:
            bool: True if user can generate reports for this specific shipment
        """
        user = request.user
        
        # Admin and staff users can access all shipments
        if user.is_staff or user.is_superuser:
            return True
        
        # Multi-tenant access control - user can only access their company's shipments
        if hasattr(user, 'company') and hasattr(obj, 'company'):
            if user.company != obj.company:
                logger.warning(
                    f"User {user.id} from company {user.company.id if user.company else 'None'} "
                    f"attempted to access shipment {obj.id} from company {obj.company.id if obj.company else 'None'}"
                )
                return False
        
        # Depot-based access control
        if hasattr(user, 'depot') and hasattr(obj, 'assigned_depot'):
            if obj.assigned_depot and user.depot != obj.assigned_depot:
                logger.warning(
                    f"User {user.id} from depot {user.depot.id if user.depot else 'None'} "
                    f"attempted to access shipment {obj.id} assigned to depot {obj.assigned_depot.id}"
                )
                return False
        
        # Check if user is associated with the shipment in some way
        if hasattr(obj, 'requested_by') and obj.requested_by == user:
            return True
        
        if hasattr(obj, 'assigned_to') and obj.assigned_to == user:
            return True
        
        # For shipments without specific assignment, allow if user has general view permission
        if user.has_perm('shipments.view_shipment'):
            return True
        
        logger.warning(f"User {user.id} denied object-level access to shipment {obj.id}")
        return False


class CanUploadDocuments(permissions.BasePermission):
    """
    Permission class for document uploads.
    """
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user can upload documents"""
        if isinstance(request.user, AnonymousUser) or not request.user.is_authenticated:
            return False
        
        # Admin and staff can always upload
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Check for upload permission
        return request.user.has_perm('documents.add_document')


class CanViewDocuments(permissions.BasePermission):
    """
    Permission class for viewing documents.
    """
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user can view documents"""
        if isinstance(request.user, AnonymousUser) or not request.user.is_authenticated:
            return False
        
        return request.user.has_perm('documents.view_document')

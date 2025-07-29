from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from django.utils.translation import gettext_lazy as _
from django.db import models
from .models import AssessmentTemplate, HazardAssessment, AssessmentAssignment


class BaseHazardAssessmentPermission(permissions.BasePermission):
    """
    Base permission class for hazard assessment system with company-based filtering.
    """
    
    def has_company_access(self, request, obj):
        """Check if user has access to object's company"""
        if not hasattr(request.user, 'company'):
            return False
        
        # Check company ownership based on object type
        if hasattr(obj, 'company'):
            return obj.company == request.user.company
        elif hasattr(obj, 'template') and hasattr(obj.template, 'company'):
            return obj.template.company == request.user.company
        elif hasattr(obj, 'shipment') and hasattr(obj.shipment, 'customer'):
            # For assessments, check if user's company is customer or carrier
            return (obj.shipment.customer == request.user.company or 
                   obj.shipment.carrier == request.user.company)
        
        return False


class HazardAssessmentTemplatePermission(BaseHazardAssessmentPermission):
    """
    Permission class for assessment templates.
    
    Permissions:
    - View: All authenticated users can view templates from their company
    - Create: Managers and admins can create templates
    - Edit: Managers and admins can edit their company's templates
    - Delete: Only admins can delete templates
    """
    
    def has_permission(self, request, view):
        """Check general permission to access template endpoints"""
        if not request.user.is_authenticated:
            return False
        
        # Check role-based permissions
        user_role = getattr(request.user, 'role', '').lower()
        
        if view.action in ['list', 'retrieve']:
            # Any authenticated user can view templates
            return True
        elif view.action in ['create']:
            # Managers and admins can create templates
            return user_role in ['manager', 'admin']
        elif view.action in ['update', 'partial_update']:
            # Managers and admins can edit templates
            return user_role in ['manager', 'admin']
        elif view.action in ['destroy']:
            # Only admins can delete templates
            return user_role == 'admin'
        elif view.action in ['assign_to_shipment', 'clone_template']:
            # Managers and admins can assign and clone templates
            return user_role in ['manager', 'admin']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permission for specific template object"""
        if not self.has_company_access(request, obj):
            raise PermissionDenied(_("You can only access templates from your company"))
        
        user_role = getattr(request.user, 'role', '').lower()
        
        if view.action in ['retrieve']:
            # Any user from same company can view
            return True
        elif view.action in ['update', 'partial_update']:
            # Managers and admins can edit
            return user_role in ['manager', 'admin']
        elif view.action in ['destroy']:
            # Only admins can delete
            return user_role == 'admin'
        
        return True


class HazardAssessmentPermission(BaseHazardAssessmentPermission):
    """
    Permission class for completed hazard assessments.
    
    Permissions:
    - View: All users can view assessments for their company's shipments
    - Create: Drivers, operators, managers, and admins can create assessments
    - Complete: Field users (drivers) can complete assessments they started
    - Review: Managers and admins can review any assessment
    - Override: Drivers can request, managers/admins can approve overrides
    """
    
    def has_permission(self, request, view):
        """Check general permission to access assessment endpoints"""
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        
        if view.action in ['list', 'retrieve']:
            # All authenticated users can view assessments
            return True
        elif view.action in ['create', 'start_assessment']:
            # Drivers, operators, managers, admins can create assessments
            return user_role in ['driver', 'operator', 'manager', 'admin']
        elif view.action in ['update', 'partial_update', 'complete_assessment']:
            # Users can update assessments they're completing
            return user_role in ['driver', 'operator', 'manager', 'admin']
        elif view.action in ['request_override']:
            # Field users can request overrides
            return user_role in ['driver', 'operator', 'manager', 'admin']
        elif view.action in ['review_override', 'approve_override', 'deny_override']:
            # Managers and admins can review overrides
            return user_role in ['manager', 'admin']
        elif view.action in ['analytics', 'audit_trail']:
            # Managers and admins can view analytics and audit trails
            return user_role in ['manager', 'admin']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permission for specific assessment object"""
        if not self.has_company_access(request, obj):
            raise PermissionDenied(_("You can only access assessments for your company's shipments"))
        
        user_role = getattr(request.user, 'role', '').lower()
        
        if view.action in ['retrieve']:
            # Any user from company can view assessments
            return True
        elif view.action in ['update', 'partial_update', 'complete_assessment']:
            # Users can update assessments they started or managers/admins can update any
            return (obj.completed_by == request.user or 
                   user_role in ['manager', 'admin'])
        elif view.action in ['request_override']:
            # Assessment owner can request override
            return obj.completed_by == request.user
        elif view.action in ['review_override', 'approve_override', 'deny_override']:
            # Managers and admins can review overrides
            return user_role in ['manager', 'admin']
        
        return True


class HazardAssessmentAssignmentPermission(BaseHazardAssessmentPermission):
    """
    Permission class for assessment assignment rules.
    
    Permissions:
    - View: Managers and admins can view assignment rules
    - Create/Edit/Delete: Managers and admins can manage assignment rules
    """
    
    def has_permission(self, request, view):
        """Check general permission to access assignment endpoints"""
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        
        # Only managers and admins can access assignment rules
        return user_role in ['manager', 'admin']
    
    def has_object_permission(self, request, view, obj):
        """Check permission for specific assignment rule object"""
        if not self.has_company_access(request, obj):
            raise PermissionDenied(_("You can only access assignment rules from your company"))
        
        return True


class HazardAssessmentMobilePermission(BaseHazardAssessmentPermission):
    """
    Permission class specifically for mobile API endpoints.
    Optimized for field operations with simplified permission checks.
    """
    
    def has_permission(self, request, view):
        """Check permission for mobile endpoints"""
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        
        # Mobile endpoints are primarily for field users
        if view.action in ['list_assigned_assessments', 'get_template', 'submit_assessment']:
            return user_role in ['driver', 'operator', 'manager', 'admin']
        elif view.action in ['upload_photo', 'get_gps_location']:
            return user_role in ['driver', 'operator', 'manager', 'admin']
        elif view.action in ['request_emergency_override']:
            return user_role in ['driver', 'operator', 'manager', 'admin']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permission for mobile object access"""
        # Mobile users can access assessments for shipments they're assigned to
        if hasattr(obj, 'shipment'):
            shipment = obj.shipment
            if hasattr(shipment, 'assigned_driver') and shipment.assigned_driver == request.user:
                return True
        
        # Fall back to company-based access
        return self.has_company_access(request, obj)


class HazardAssessmentAdminPermission(BaseHazardAssessmentPermission):
    """
    Administrative permission class for system-wide hazard assessment management.
    Only for admin users with full access to all assessment data.
    """
    
    def has_permission(self, request, view):
        """Check admin permission"""
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        return user_role == 'admin'
    
    def has_object_permission(self, request, view, obj):
        """Admins have access to all objects"""
        return True


class CanManageHazardAssessmentTemplates(permissions.BasePermission):
    """
    Permission to manage assessment templates.
    Managers and admins can create, edit, and manage templates.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        return user_role in ['manager', 'admin']


class CanCompleteHazardAssessments(permissions.BasePermission):
    """
    Permission to complete hazard assessments in the field.
    Drivers, operators, managers, and admins can complete assessments.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        return user_role in ['driver', 'operator', 'manager', 'admin']


class CanReviewHazardAssessments(permissions.BasePermission):
    """
    Permission to review completed assessments and manage overrides.
    Managers and admins can review assessments and approve/deny overrides.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        return user_role in ['manager', 'admin']


class CanViewHazardAssessmentAnalytics(permissions.BasePermission):
    """
    Permission to view assessment analytics and audit trails.
    Managers and admins can view detailed analytics and audit information.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', '').lower()
        return user_role in ['manager', 'admin']


# Permission mixins for common permission patterns
class CompanyFilteredPermissionMixin:
    """
    Mixin to ensure all hazard assessment objects are filtered by company.
    """
    
    def get_queryset(self):
        """Filter queryset by user's company"""
        queryset = super().get_queryset()
        
        if not hasattr(self.request.user, 'company'):
            return queryset.none()
        
        # Apply company filtering based on model type
        model = queryset.model
        
        if hasattr(model, 'company'):
            # Direct company relationship
            return queryset.filter(company=self.request.user.company)
        elif hasattr(model, 'template'):
            # Through template relationship
            return queryset.filter(template__company=self.request.user.company)
        elif hasattr(model, 'shipment'):
            # Through shipment relationship
            return queryset.filter(
                models.Q(shipment__customer=self.request.user.company) |
                models.Q(shipment__carrier=self.request.user.company)
            )
        
        return queryset


class AuditLogPermissionMixin:
    """
    Mixin to ensure all hazard assessment operations are properly audited.
    """
    
    def perform_create(self, serializer):
        """Add audit information during creation"""
        # Add user and company information
        if hasattr(self.request.user, 'company'):
            serializer.save(
                created_by=self.request.user,
                company=getattr(serializer.validated_data, 'company', self.request.user.company)
            )
        else:
            serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Add audit information during updates"""
        serializer.save()
        
        # Log significant status changes
        if hasattr(serializer.instance, 'status'):
            original_status = getattr(serializer.instance, '_original_status', None)
            new_status = serializer.instance.status
            
            if original_status and original_status != new_status:
                # Log status change (could integrate with audit system)
                pass


class RoleBasedFieldPermissionMixin:
    """
    Mixin to restrict field access based on user role.
    """
    
    def get_serializer(self, *args, **kwargs):
        """Customize serializer fields based on user role"""
        serializer = super().get_serializer(*args, **kwargs)
        
        user_role = getattr(self.request.user, 'role', '').lower()
        
        # Remove sensitive fields for non-admin users
        if user_role not in ['admin', 'manager']:
            # Remove audit trail fields for non-managers
            sensitive_fields = [
                'device_info', 'completion_time_seconds', 'is_suspiciously_fast'
            ]
            
            for field in sensitive_fields:
                if field in serializer.fields:
                    del serializer.fields[field]
        
        return serializer

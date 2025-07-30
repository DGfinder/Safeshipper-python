"""
Audit and Compliance Permission Classes for SafeShipper

This module implements granular permission checking for audit and compliance
operations following SafeShipper's security patterns and dangerous goods
regulatory requirements.

Key Features:
- Company-based data isolation for multi-tenant architecture
- Role-based access control with dangerous goods compliance requirements
- Audit trail security with integrity verification permissions
- Regulatory compliance officer permissions for ADG, DOT, IATA
- Emergency access controls for compliance violations
"""

from rest_framework.permissions import BasePermission
from django.core.exceptions import PermissionDenied


class AuditPermissions(BasePermission):
    """
    Comprehensive permission class for audit trail access and management
    
    Permission Levels:
    - VIEWER: Can view own audit trails only
    - DRIVER: Can view own audit trails + emergency compliance info
    - OPERATOR: Can view department audit trails + basic compliance data
    - MANAGER: Can view all company audit trails + compliance management
    - COMPLIANCE_OFFICER: Full audit access + regulatory reporting
    - ADMIN: Complete audit system access + integrity verification
    """
    
    def has_permission(self, request, view):
        """Check if user has permission to access audit endpoints"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has a company (required for multi-tenant data filtering)
        if not hasattr(request.user, 'company') or not request.user.company:
            return False
        
        user_role = getattr(request.user, 'role', 'VIEWER')
        action = getattr(view, 'action', None)
        
        # Basic audit access permissions
        if action in ['list', 'retrieve']:
            return user_role in [
                'VIEWER', 'DRIVER', 'OPERATOR', 'MANAGER', 
                'COMPLIANCE_OFFICER', 'ADMIN'
            ]
        
        # Analytics and dashboard access
        elif action in ['analytics', 'dashboard']:
            return user_role in [
                'OPERATOR', 'MANAGER', 'COMPLIANCE_OFFICER', 'ADMIN'
            ]
        
        # Advanced search capabilities
        elif action == 'search':
            return user_role in [
                'MANAGER', 'COMPLIANCE_OFFICER', 'ADMIN'
            ]
        
        # Export and reporting functions
        elif action in ['export', 'violations_report']:
            return user_role in [
                'COMPLIANCE_OFFICER', 'ADMIN'
            ]
        
        # Integrity verification (high-security operations)
        elif action == 'verify_integrity':
            return user_role in ['ADMIN']
        
        # Dangerous goods specific operations
        elif action in ['un_number_analytics', 'regulatory_notifications']:
            return user_role in [
                'OPERATOR', 'MANAGER', 'COMPLIANCE_OFFICER', 'ADMIN'
            ]
        
        # Default: Allow read operations for authenticated users with companies
        elif request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # Deny write operations by default
        else:
            return user_role in ['COMPLIANCE_OFFICER', 'ADMIN']
    
    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access specific audit objects"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user, 'role', 'VIEWER')
        
        # Company-based data isolation check
        if hasattr(obj, 'company') and obj.company != request.user.company:
            return False
        
        # For audit logs, check if related to user's company through various relations
        if hasattr(obj, 'user') and hasattr(obj.user, 'company'):
            if obj.user.company != request.user.company:
                return False
        
        # Role-based object access
        if user_role in ['ADMIN', 'COMPLIANCE_OFFICER']:
            # Full access to company's audit data
            return True
        
        elif user_role in ['MANAGER']:
            # Access to audit data except system-level operations
            if hasattr(obj, 'action_type'):
                system_actions = ['SYSTEM_CONFIG', 'USER_ADMIN', 'SECURITY_CONFIG']
                return obj.action_type not in system_actions
            return True
        
        elif user_role in ['OPERATOR']:
            # Access to operational audit data
            if hasattr(obj, 'user') and obj.user == request.user:
                return True
            
            # Can view team members' operational activities
            if hasattr(obj, 'action_type'):
                operational_actions = [
                    'CREATE_SHIPMENT', 'UPDATE_SHIPMENT', 'CLASSIFICATION_UPDATE',
                    'MANIFEST_UPLOAD', 'DOCUMENT_UPLOAD'
                ]
                return obj.action_type in operational_actions
            
            return False
        
        elif user_role in ['DRIVER']:
            # Drivers can only see their own audit trails + emergency compliance info
            if hasattr(obj, 'user') and obj.user == request.user:
                return True
            
            # Emergency compliance information access
            if hasattr(obj, 'compliance_status') and obj.compliance_status in ['NON_COMPLIANT', 'WARNING']:
                # Drivers can see compliance warnings that might affect their operations
                return True
            
            return False
        
        elif user_role in ['VIEWER']:
            # Viewers can only see their own audit entries
            return hasattr(obj, 'user') and obj.user == request.user
        
        return False

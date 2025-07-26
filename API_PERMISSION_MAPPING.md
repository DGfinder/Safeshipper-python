# API Permission Mapping Documentation

## Overview
This document maps SafeShipper's frontend permissions to backend API endpoints, ensuring consistent access control across the entire application stack. This alignment is critical for maintaining security and preventing unauthorized access.

---

## 🔗 **Frontend-Backend Permission Alignment**

### Core Philosophy
Every frontend permission must have corresponding backend validation to ensure:
- **Defense in Depth**: Multiple layers of security validation
- **Consistency**: Same access rules on frontend and backend
- **Auditability**: Complete permission checking trail
- **Security**: No client-side permission bypasses

---

## 📋 **Permission-to-Endpoint Mappings**

### **Dashboard & Navigation**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `dashboard.view` | `/api/v1/dashboard/` | GET | `authenticated` |
| `operations.center.view` | `/api/v1/operations/` | GET | `view_operations` |
| `search.view` | `/api/v1/search/` | GET | `authenticated` |

### **User Management**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `users.manage` | `/api/v1/users/` | GET, POST, PUT, DELETE | `change_user`, `add_user`, `delete_user` |
| `users.view` | `/api/v1/users/` | GET | `view_user` |
| `users.create` | `/api/v1/users/` | POST | `add_user` |
| `users.edit` | `/api/v1/users/{id}/` | PUT, PATCH | `change_user` |
| `users.delete` | `/api/v1/users/{id}/` | DELETE | `delete_user` |
| `users.edit.role` | `/api/v1/users/{id}/` | PUT, PATCH | `change_user_role` |
| `users.assign.manager` | `/api/v1/users/{id}/` | PUT, PATCH | `assign_manager_role` |
| `users.assign.admin` | `/api/v1/users/{id}/` | PUT, PATCH | `assign_admin_role` |

### **Fleet Management**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `vehicle.view` | `/api/v1/vehicles/` | GET | `view_vehicle` |
| `vehicle.create` | `/api/v1/vehicles/` | POST | `add_vehicle` |
| `vehicle.edit` | `/api/v1/vehicles/{id}/` | PUT, PATCH | `change_vehicle` |
| `vehicle.delete` | `/api/v1/vehicles/{id}/` | DELETE | `delete_vehicle` |
| `vehicle.bulk_edit` | `/api/v1/vehicles/bulk/` | POST | `change_vehicle` |
| `fleet.analytics.view` | `/api/v1/fleet/analytics/` | GET | `view_fleet_analytics` |
| `fleet.analytics.export` | `/api/v1/fleet/analytics/export/` | GET | `export_fleet_data` |
| `fleet.analytics.advanced` | `/api/v1/fleet/analytics/advanced/` | GET | `view_advanced_analytics` |
| `fleet.compliance.view` | `/api/v1/fleet/compliance/` | GET | `view_compliance` |
| `fleet.compliance.edit` | `/api/v1/fleet/compliance/{id}/` | PUT, PATCH | `change_compliance` |
| `fleet.maintenance.view` | `/api/v1/fleet/maintenance/` | GET | `view_maintenance` |
| `fleet.maintenance.schedule` | `/api/v1/fleet/maintenance/` | POST | `add_maintenance` |
| `driver.assign` | `/api/v1/vehicles/{id}/assign-driver/` | POST | `assign_driver` |

### **Shipment Management**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `shipments.view.all` | `/api/v1/shipments/` | GET | `view_all_shipments` |
| `shipments.view.own` | `/api/v1/shipments/my/` | GET | `view_own_shipments` |
| `shipment.creation` | `/api/v1/shipments/` | POST | `add_shipment` |
| `shipment.editing` | `/api/v1/shipments/{id}/` | PUT, PATCH | `change_shipment` |
| `shipments.manifest.upload` | `/api/v1/shipments/manifest/` | POST | `upload_manifest` |

### **Safety & Compliance**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `safety.compliance.view` | `/api/v1/safety/compliance/` | GET | `view_safety_compliance` |
| `emergency.procedures.view` | `/api/v1/safety/procedures/` | GET | `view_emergency_procedures` |
| `incidents.view` | `/api/v1/safety/incidents/` | GET | `view_incidents` |
| `training.view` | `/api/v1/safety/training/` | GET | `view_training` |
| `inspections.view` | `/api/v1/safety/inspections/` | GET | `view_inspections` |
| `audits.view` | `/api/v1/safety/audits/` | GET | `view_audits` |

### **SDS Management**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `sds.library.view` | `/api/v1/sds/` | GET | `view_sds` |
| `sds.upload` | `/api/v1/sds/` | POST | `add_sds` |
| `sds.emergency.info` | `/api/v1/sds/{id}/emergency/` | GET | `view_emergency_sds` |
| `sds.bulk.operations` | `/api/v1/sds/bulk/` | POST | `bulk_sds_operations` |
| `sds.version.control` | `/api/v1/sds/{id}/versions/` | GET, POST | `manage_sds_versions` |
| `sds.compliance.analytics` | `/api/v1/sds/analytics/` | GET | `view_sds_analytics` |
| `dg.checker.view` | `/api/v1/dangerous-goods/check/` | POST | `check_dangerous_goods` |

### **Analytics & Reporting**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `analytics.operational` | `/api/v1/analytics/operational/` | GET | `view_operational_analytics` |
| `analytics.insights` | `/api/v1/analytics/insights/` | GET | `view_analytics_insights` |
| `analytics.full.access` | `/api/v1/analytics/` | GET | `view_all_analytics` |
| `reports.view` | `/api/v1/reports/` | GET | `view_reports` |
| `analytics.advanced.view` | `/api/v1/analytics/advanced/` | GET | `view_advanced_analytics` |
| `supply.chain.analytics` | `/api/v1/analytics/supply-chain/` | GET | `view_supply_chain_analytics` |
| `insurance.analytics` | `/api/v1/analytics/insurance/` | GET | `view_insurance_analytics` |
| `route.optimization` | `/api/v1/analytics/route-optimization/` | GET | `access_route_optimization` |
| `digital.twin.view` | `/api/v1/analytics/digital-twin/` | GET | `view_digital_twin` |

### **Customer Portal**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `customer.portal.admin` | `/api/v1/customer-portal/admin/` | GET, POST, PUT | `admin_customer_portal` |
| `customer.portal.tracking` | `/api/v1/customer-portal/tracking/` | GET | `track_shipments` |
| `track.shipment.view` | `/api/v1/tracking/{id}/` | GET | `view_shipment_tracking` |

### **System Administration**
| Frontend Permission | Backend Endpoint | HTTP Method | Backend Permission/Role |
|-------------------|------------------|-------------|------------------------|
| `customers.manage` | `/api/v1/customers/` | GET, POST, PUT, DELETE | `change_customer`, `add_customer`, `delete_customer` |
| `settings.manage` | `/api/v1/settings/` | GET, PUT | `change_settings` |
| `audit.logs` | `/api/v1/audit/logs/` | GET | `view_audit_logs` |

---

## 🔧 **Backend Permission Implementation**

### Django Permission Classes
```python
# Example permission classes that should exist on backend
class HasFleetManagementPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('fleet.management')

class CanViewAdvancedAnalytics(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('analytics.advanced.view')

class CanManageUsers(BasePermission):
    def has_permission(self, request, view):
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return request.user.has_perm('users.manage')
        return request.user.has_perm('users.view')
```

### Role-Based Backend Permissions
```python
# Backend role-to-permission mapping (should align with frontend)
ROLE_PERMISSIONS = {
    'viewer': [
        'view_user',
        'view_vehicle', 
        'view_sds',
        'view_shipment_tracking',
        'authenticated'
    ],
    'driver': [
        'view_user',
        'view_vehicle',
        'view_own_shipments', 
        'view_emergency_procedures',
        'view_emergency_sds',
        'track_shipments'
    ],
    'operator': [
        'view_user',
        'view_vehicle',
        'change_vehicle',
        'view_all_shipments',
        'add_shipment',
        'change_shipment',
        'view_operational_analytics',
        'add_sds',
        'bulk_sds_operations'
    ],
    'manager': [
        'view_user',
        'change_user',
        'add_user',
        'view_vehicle',
        'change_vehicle', 
        'add_vehicle',
        'delete_vehicle',
        'view_all_shipments',
        'add_shipment',
        'change_shipment',
        'view_analytics_insights',
        'view_advanced_analytics',
        'manage_sds_versions',
        'view_sds_analytics',
        'assign_manager_role'
    ],
    'admin': [
        # All permissions
        '*'
    ]
}
```

---

## 🛡️ **Security Implementation Patterns**

### 1. **API View Protection**
```python
# Example protected API view
class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasFleetManagementPermission]
    
    def get_queryset(self):
        user = self.request.user
        
        # Filter based on user permissions
        if user.has_perm('vehicle.view.all'):
            return Vehicle.objects.all()
        elif user.has_perm('vehicle.view.assigned'):
            return Vehicle.objects.filter(assigned_driver=user)
        else:
            return Vehicle.objects.none()
    
    def perform_create(self, serializer):
        # Additional permission check for creation
        if not self.request.user.has_perm('vehicle.create'):
            raise PermissionDenied("Insufficient permissions to create vehicle")
        serializer.save()
```

### 2. **Data Filtering Based on Permissions**
```python
# Example data filtering
class ShipmentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        queryset = Shipment.objects.all()
        
        if user.has_perm('shipments.view.all'):
            return queryset
        elif user.has_perm('shipments.view.own'):
            return queryset.filter(assigned_driver=user)
        elif user.has_perm('shipments.view.company'):
            return queryset.filter(company=user.company)
        else:
            return queryset.none()
```

### 3. **Field-Level Permissions**
```python
# Example serializer with field-level permissions
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Hide sensitive fields based on permissions
        if not request.user.has_perm('users.view.role'):
            data.pop('role', None)
        
        if not request.user.has_perm('users.view.email'):
            data.pop('email', None)
            
        return data
```

---

## 📊 **Permission Validation Checklist**

### Frontend Validation
- [ ] **Component Level**: All components check appropriate permissions before rendering
- [ ] **Navigation Level**: Menu items filtered based on permissions
- [ ] **Form Level**: Form fields shown/hidden based on permissions
- [ ] **Action Level**: Buttons and actions gated by permissions

### Backend Validation
- [ ] **Endpoint Level**: All API endpoints have appropriate permission classes
- [ ] **Data Level**: QuerySets filtered based on user permissions
- [ ] **Field Level**: Sensitive fields hidden based on permissions
- [ ] **Operation Level**: CRUD operations validated against permissions

### Integration Validation
- [ ] **Consistent Mapping**: Frontend permissions map correctly to backend permissions
- [ ] **No Bypasses**: Frontend restrictions enforced on backend
- [ ] **Complete Coverage**: All features have both frontend and backend permission checks
- [ ] **Error Handling**: Proper error responses for permission violations

---

## 🚨 **Common Security Anti-Patterns to Avoid**

### ❌ **Frontend-Only Validation**
```typescript
// BAD: Only checking permissions on frontend
function DeleteButton({ userId }) {
  const { can } = usePermissions();
  
  if (!can('users.delete')) {
    return null; // Hidden on frontend only!
  }
  
  return <Button onClick={() => deleteUser(userId)}>Delete</Button>;
}
```

### ✅ **Defense in Depth**
```typescript
// GOOD: Frontend check + backend validation
function DeleteButton({ userId }) {
  const { can } = usePermissions();
  
  if (!can('users.delete')) {
    return null; // Frontend protection
  }
  
  const handleDelete = async () => {
    try {
      // Backend will also validate permissions
      await deleteUser(userId);
    } catch (error) {
      if (error.status === 403) {
        toast.error('Insufficient permissions');
      }
    }
  };
  
  return <Button onClick={handleDelete}>Delete</Button>;
}
```

### ❌ **Inconsistent Permission Names**
```typescript
// BAD: Frontend and backend use different permission names
// Frontend: 'users.manage'
// Backend: 'change_user', 'add_user', 'delete_user'
```

### ✅ **Consistent Naming**
```typescript
// GOOD: Aligned permission names
// Frontend: 'users.manage' 
// Backend: 'users.manage' (or clear mapping documented)
```

---

## 🔄 **Permission Synchronization Process**

### 1. **Development Workflow**
1. **Define Frontend Permission**: Add to `PermissionContext.tsx`
2. **Map to Backend**: Document in this file
3. **Implement Backend**: Create corresponding permission checks
4. **Test Integration**: Verify frontend-backend alignment
5. **Document**: Update this mapping document

### 2. **Permission Addition Checklist**
- [ ] **Frontend Permission Defined**: Added to Permission type
- [ ] **Role Mapping Updated**: Added to rolePermissions
- [ ] **Backend Permission Created**: Django permission or custom check
- [ ] **API Endpoint Protected**: Permission class applied
- [ ] **Documentation Updated**: This file updated with mapping
- [ ] **Tests Added**: Both frontend and backend permission tests

### 3. **Validation Process**
```bash
# Frontend permission validation
npm run test:permissions

# Backend permission validation  
python manage.py test permissions

# Integration validation
npm run test:integration:permissions
```

---

## 📈 **Monitoring & Auditing**

### Permission Usage Tracking
```typescript
// Frontend permission usage logging
const { can } = usePermissions();

const auditedCan = (permission: string) => {
  const hasPermission = can(permission);
  
  // Log permission checks for audit
  if (process.env.NODE_ENV === 'production') {
    auditLogger.logPermissionCheck({
      user: currentUser.id,
      permission,
      granted: hasPermission,
      timestamp: new Date().toISOString(),
      component: getCurrentComponent()
    });
  }
  
  return hasPermission;
};
```

### Backend Permission Auditing
```python
# Backend permission audit logging
class PermissionAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Log permission checks
        if hasattr(request, 'user') and request.user.is_authenticated:
            audit_logger.info({
                'user': request.user.id,
                'endpoint': request.path,
                'method': request.method,
                'permissions_checked': getattr(request, '_permissions_checked', []),
                'timestamp': timezone.now().isoformat()
            })
        
        response = self.get_response(request)
        return response
```

---

## 🎯 **Success Metrics**

### Security Metrics
- **100% Permission Coverage**: All endpoints have permission validation
- **Zero Permission Bypasses**: No frontend-only permission checks
- **Consistent Mapping**: All frontend permissions map to backend
- **Complete Audit Trail**: All permission checks logged

### Performance Metrics
- **Permission Check Performance**: < 1ms average permission check time
- **Database Query Optimization**: Efficient permission-based filtering
- **Caching**: Permission results cached appropriately
- **Network Efficiency**: Minimal permission-related API calls

### Developer Experience
- **Clear Documentation**: This mapping document maintained
- **Easy Development**: Clear patterns for adding permissions
- **Testing Support**: Comprehensive permission testing utilities
- **Error Clarity**: Clear error messages for permission violations

---

**This API permission mapping ensures SafeShipper maintains consistent, secure, and auditable access control across the entire application stack. Regular updates to this document are essential as the system evolves.** 🔒
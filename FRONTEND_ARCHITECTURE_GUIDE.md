# SafeShipper Frontend Architecture Guide

## Core Philosophy: "Build Once, Render for Permissions"

This document establishes the foundational architectural principle for SafeShipper's frontend development: **Build once, render for permissions**. This pattern ensures scalable, maintainable, and secure component architecture while eliminating code duplication.

---

## 🎯 **The Golden Rule**

> **Never create separate components for different user roles. Instead, build unified components that conditionally render features based on permissions.**

### ❌ **Anti-Pattern: Role-Based Duplication**
```typescript
// DON'T: Separate components for different user types
function AdminDashboard() {
  return (
    <div>
      <UserManagement />
      <SystemSettings />
      <AdvancedAnalytics />
      <FleetOverview />
    </div>
  );
}

function ManagerDashboard() {
  return (
    <div>
      <AdvancedAnalytics />
      <FleetOverview />
      <ReportsPanel />
    </div>
  );
}

function DriverDashboard() {
  return (
    <div>
      <MyShipments />
      <BasicOverview />
    </div>
  );
}
```

### ✅ **Correct Pattern: Permission-Based Rendering**
```typescript
// DO: Single component with conditional rendering
function UnifiedDashboard() {
  const { can } = usePermissions();
  
  return (
    <div className="dashboard-grid">
      {can('users.manage') && (
        <Card>
          <UserManagement />
        </Card>
      )}
      
      {can('settings.manage') && (
        <Card>
          <SystemSettings />
        </Card>
      )}
      
      {can('analytics.advanced.view') && (
        <Card>
          <AdvancedAnalytics />
        </Card>
      )}
      
      {can('fleet.management') && (
        <Card>
          <FleetOverview />
        </Card>
      )}
      
      {can('shipments.view.own') && (
        <Card>
          <MyShipments />
        </Card>
      )}
      
      <Card>
        <BasicOverview /> {/* Always visible */}
      </Card>
    </div>
  );
}
```

---

## 🏗️ **Architectural Patterns**

### 1. **Component-Level Permission Checks**

```typescript
function FeatureComponent() {
  const { can, hasAnyRole } = usePermissions();
  
  return (
    <div>
      <h2>Feature Dashboard</h2>
      
      {/* Simple permission check */}
      {can('feature.create') && (
        <Button onClick={handleCreate}>Create New</Button>
      )}
      
      {/* Multiple permission check */}
      {(can('feature.edit') || can('feature.delete')) && (
        <ActionMenu />
      )}
      
      {/* Role-based check (when needed) */}
      {hasAnyRole(['admin', 'manager']) && (
        <AdminControls />
      )}
      
      <FeatureList />
    </div>
  );
}
```

### 2. **Navigation Pattern**

```typescript
interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
  badge?: string;
  requiredPermission?: string; // Single permission requirement
}

const navigation: NavigationItem[] = [
  {
    name: "Fleet Management",
    icon: Truck,
    children: [
      { 
        name: "Vehicles", 
        href: "/fleet/vehicles", 
        icon: Truck,
        requiredPermission: "vehicle.view" 
      },
      { 
        name: "Analytics", 
        href: "/fleet/analytics", 
        icon: BarChart,
        requiredPermission: "fleet.analytics.view" 
      },
      { 
        name: "Maintenance", 
        href: "/fleet/maintenance", 
        icon: Wrench,
        requiredPermission: "fleet.maintenance.view" 
      }
    ]
  }
];

// Filter navigation based on permissions
function filterNavigation(items: NavigationItem[], can: (permission: string) => boolean) {
  return items.filter(item => {
    // Check parent permission
    if (item.requiredPermission && !can(item.requiredPermission)) {
      return false;
    }
    
    // Filter children and show parent if any children are accessible
    if (item.children) {
      const accessibleChildren = item.children.filter(child => 
        !child.requiredPermission || can(child.requiredPermission)
      );
      return accessibleChildren.length > 0;
    }
    
    return true;
  });
}
```

### 3. **Form Pattern**

```typescript
function UserEditForm({ userId }: { userId: string }) {
  const { can } = usePermissions();
  const user = useUser(userId);
  
  return (
    <Form>
      {/* Basic fields always visible */}
      <Field name="name" label="Name" />
      <Field name="email" label="Email" />
      
      {/* Permission-gated fields */}
      {can('users.edit.role') && (
        <Field name="role" label="Role" type="select">
          <option value="driver">Driver</option>
          <option value="operator">Operator</option>
          {can('users.assign.manager') && (
            <option value="manager">Manager</option>
          )}
          {can('users.assign.admin') && (
            <option value="admin">Admin</option>
          )}
        </Field>
      )}
      
      {can('users.edit.permissions') && (
        <PermissionSelector userId={userId} />
      )}
      
      <ButtonGroup>
        <Button type="submit">
          {can('users.edit') ? 'Save Changes' : 'View Only'}
        </Button>
        
        {can('users.delete') && (
          <Button variant="danger" onClick={handleDelete}>
            Delete User
          </Button>
        )}
      </ButtonGroup>
    </Form>
  );
}
```

### 4. **Data Table Pattern**

```typescript
function UserTable() {
  const { can } = usePermissions();
  const users = useUsers();
  
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    
    // Conditional columns based on permissions
    ...(can('users.view.lastLogin') ? [
      { key: 'lastLogin', label: 'Last Login' }
    ] : []),
    
    ...(can('users.view.permissions') ? [
      { key: 'permissions', label: 'Permissions' }
    ] : []),
    
    // Actions column with conditional content
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <ActionMenu>
          <MenuItem onClick={() => viewUser(user.id)}>View</MenuItem>
          
          {can('users.edit') && (
            <MenuItem onClick={() => editUser(user.id)}>Edit</MenuItem>
          )}
          
          {can('users.delete') && user.id !== currentUser.id && (
            <MenuItem onClick={() => deleteUser(user.id)}>Delete</MenuItem>
          )}
        </ActionMenu>
      )
    }
  ];
  
  return <DataTable columns={columns} data={users} />;
}
```

---

## 🔧 **Development Patterns**

### 1. **Permission Helper Components**

```typescript
// Reusable permission gate component
interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}

// Usage
<PermissionGate permission="analytics.advanced.view">
  <AdvancedAnalyticsPanel />
</PermissionGate>

<PermissionGate 
  permission="fleet.management" 
  fallback={<div>Access Denied</div>}
>
  <FleetManagementPanel />
</PermissionGate>
```

### 2. **Permission Hooks Pattern**

```typescript
// Custom hooks for complex permission logic
function useFeatureAccess(featureId: string) {
  const { can, hasAnyRole } = usePermissions();
  
  return {
    canView: can('feature.view') || can(`feature.view.${featureId}`),
    canEdit: can('feature.edit') && can(`feature.edit.${featureId}`),
    canDelete: can('feature.delete') && hasAnyRole(['admin', 'manager']),
    canExport: can('feature.export'),
    isAdmin: hasAnyRole(['admin'])
  };
}

// Usage in component
function FeatureDetail({ featureId }: { featureId: string }) {
  const { canView, canEdit, canDelete, canExport } = useFeatureAccess(featureId);
  
  if (!canView) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      <FeatureViewer featureId={featureId} />
      
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
      {canExport && <ExportButton />}
    </div>
  );
}
```

### 3. **Conditional Rendering Best Practices**

```typescript
function OptimizedComponent() {
  const { can } = usePermissions();
  
  // ✅ GOOD: Early return for major access control
  if (!can('feature.view')) {
    return <AccessDenied />;
  }
  
  // ✅ GOOD: Memoize expensive permission checks
  const hasAdvancedAccess = useMemo(() => 
    can('feature.advanced') && can('analytics.view'), [can]
  );
  
  // ✅ GOOD: Group related permissions
  const editPermissions = {
    canEdit: can('feature.edit'),
    canDelete: can('feature.delete'),
    canBulkEdit: can('feature.bulk.edit')
  };
  
  return (
    <div>
      <FeatureView />
      
      {/* ✅ GOOD: Simple conditional rendering */}
      {can('feature.create') && <CreateButton />}
      
      {/* ✅ GOOD: Complex logic extracted to variable */}
      {hasAdvancedAccess && <AdvancedFeatures />}
      
      {/* ✅ GOOD: Object destructuring for multiple related permissions */}
      {(editPermissions.canEdit || editPermissions.canDelete) && (
        <EditingTools permissions={editPermissions} />
      )}
    </div>
  );
}
```

---

## 📋 **Permission Naming Conventions**

### Structure: `domain.action.scope?`

```typescript
// Domain-based permissions
"user.view"              // View users
"user.create"            // Create new users
"user.edit"              // Edit user details
"user.delete"            // Delete users
"user.bulk.edit"         // Bulk edit operations

// Scoped permissions
"shipment.view.own"      // View own shipments only
"shipment.view.all"      // View all shipments
"analytics.view.basic"   // Basic analytics access
"analytics.view.advanced"// Advanced analytics access

// Hierarchical permissions
"fleet.view"             // View fleet data
"fleet.edit"             // Edit fleet data
"fleet.analytics.view"   // View fleet analytics
"fleet.analytics.export" // Export fleet analytics
"fleet.compliance.view"  // View compliance data
"fleet.compliance.edit"  // Edit compliance settings
```

### Permission Categories

| **Category** | **Prefix** | **Examples** |
|--------------|------------|--------------|
| **Navigation** | `dashboard`, `search` | `dashboard.view`, `search.advanced` |
| **User Management** | `user`, `users` | `users.manage`, `user.create` |
| **Fleet Operations** | `fleet`, `vehicle` | `fleet.management`, `vehicle.edit` |
| **Shipments** | `shipment`, `shipments` | `shipments.view.all`, `shipment.create` |
| **Safety & Compliance** | `safety`, `compliance`, `sds` | `safety.compliance.view`, `sds.upload` |
| **Analytics** | `analytics`, `reports` | `analytics.advanced.view`, `reports.export` |
| **Settings** | `settings`, `config` | `settings.manage`, `config.system` |

---

## 🚀 **Performance Optimization**

### 1. **Memoization Strategy**

```typescript
function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Memoize permission calculations
  const permissions = useMemo(() => {
    if (!user?.role) return [];
    return rolePermissions[user.role as Role] || [];
  }, [user?.role]);
  
  // Memoize permission checker function
  const can = useCallback((permission: Permission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);
  
  // Memoize expensive permission combinations
  const canViewAnalytics = useMemo(() => 
    can('analytics.full.access') || can('analytics.insights') || can('analytics.operational'),
    [can]
  );
  
  const value = useMemo(() => ({
    can,
    permissions,
    canViewAnalytics,
    // ... other values
  }), [can, permissions, canViewAnalytics]);
  
  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}
```

### 2. **Conditional Component Loading**

```typescript
// Lazy load permission-gated components
const AdvancedAnalytics = lazy(() => import('./AdvancedAnalytics'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function Dashboard() {
  const { can } = usePermissions();
  
  return (
    <div>
      <BasicDashboard />
      
      {can('analytics.advanced.view') && (
        <Suspense fallback={<AnalyticsLoading />}>
          <AdvancedAnalytics />
        </Suspense>
      )}
      
      {can('admin.access') && (
        <Suspense fallback={<AdminLoading />}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

### 3. **Permission Caching**

```typescript
// Cache permission checks for expensive operations
const usePermissionCache = () => {
  const { can } = usePermissions();
  const cache = useRef(new Map<string, boolean>());
  
  return useCallback((permission: string): boolean => {
    if (cache.current.has(permission)) {
      return cache.current.get(permission)!;
    }
    
    const result = can(permission);
    cache.current.set(permission, result);
    return result;
  }, [can]);
};
```

---

## 🧪 **Testing Patterns**

### 1. **Permission Context Testing**

```typescript
// Test utility for rendering with specific permissions
function renderWithPermissions(role: Role, component: React.ReactElement) {
  const mockUser = { role };
  
  return render(
    <PermissionProvider>
      <AuthContext.Provider value={{ user: mockUser }}>
        {component}
      </AuthContext.Provider>
    </PermissionProvider>
  );
}

// Test examples
describe('Dashboard Component', () => {
  it('shows admin features for admin users', () => {
    renderWithPermissions('admin', <Dashboard />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });
  
  it('hides admin features for driver users', () => {
    renderWithPermissions('driver', <Dashboard />);
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.getByText('My Shipments')).toBeInTheDocument();
  });
});
```

### 2. **Permission Hook Testing**

```typescript
describe('usePermissions', () => {
  it('grants correct permissions for manager role', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: ({ children }) => (
        <PermissionProvider>
          <AuthContext.Provider value={{ user: { role: 'manager' } }}>
            {children}
          </AuthContext.Provider>
        </PermissionProvider>
      )
    });
    
    expect(result.current.can('analytics.insights')).toBe(true);
    expect(result.current.can('users.manage')).toBe(false);
    expect(result.current.canViewAnalytics).toBe(true);
  });
});
```

---

## 🔐 **Security Best Practices**

### 1. **Defense in Depth**

```typescript
// Always check permissions at multiple layers
function UserEditPage({ userId }: { userId: string }) {
  const { can } = usePermissions();
  
  // 1. Page-level check
  if (!can('users.view')) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      <UserProfile userId={userId} />
      
      {/* 2. Component-level check */}
      {can('users.edit') && (
        <UserEditForm userId={userId} />
      )}
    </div>
  );
}

function UserEditForm({ userId }: { userId: string }) {
  const { can } = usePermissions();
  
  // 3. Form-level check
  if (!can('users.edit')) {
    return <ReadOnlyUserView userId={userId} />;
  }
  
  return (
    <Form>
      {/* 4. Field-level checks */}
      {can('users.edit.role') && (
        <RoleSelector />
      )}
    </Form>
  );
}
```

### 2. **Secure Defaults**

```typescript
// Always default to no access
function PermissionGate({ permission, children, fallback = null }) {
  const { can } = usePermissions();
  
  // Secure default: deny access if permission check fails
  try {
    return can(permission) ? children : fallback;
  } catch (error) {
    console.error('Permission check failed:', error);
    return fallback; // Fail closed
  }
}

// Validate permission strings at runtime in development
function validatePermission(permission: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    if (!permission || typeof permission !== 'string') {
      console.error('Invalid permission string:', permission);
      return false;
    }
  }
  return true;
}
```

### 3. **Audit Trail Integration**

```typescript
// Log permission checks for audit purposes
function usePermissions() {
  const context = useContext(PermissionContext);
  
  const auditedCan = useCallback((permission: string): boolean => {
    const hasPermission = context.can(permission);
    
    // Log permission checks in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Permission Check: ${permission} = ${hasPermission}`);
    }
    
    // In production, send to audit service
    if (process.env.NODE_ENV === 'production' && !hasPermission) {
      auditService.logPermissionDenied(permission, context.userRole);
    }
    
    return hasPermission;
  }, [context]);
  
  return {
    ...context,
    can: auditedCan
  };
}
```

---

## 📚 **Migration Checklist**

When migrating existing components to the permission-based pattern:

### ✅ **Component Analysis**
- [ ] Identify all role-based conditionals in the component
- [ ] Map role checks to specific permission requirements
- [ ] Determine appropriate permission granularity
- [ ] Check for hardcoded role strings

### ✅ **Permission Definition**
- [ ] Add required permissions to `PermissionContext.tsx`
- [ ] Update role-to-permission mappings
- [ ] Ensure permission naming follows conventions
- [ ] Verify TypeScript types are updated

### ✅ **Component Refactoring**
- [ ] Replace role checks with permission checks
- [ ] Use `usePermissions()` hook instead of role-based hooks
- [ ] Implement conditional rendering patterns
- [ ] Add permission gates for complex features

### ✅ **Testing & Validation**
- [ ] Test component with different user roles
- [ ] Verify permission boundaries work correctly
- [ ] Check that unauthorized features are hidden
- [ ] Validate performance impact

### ✅ **Documentation**
- [ ] Update component documentation
- [ ] Document permission requirements
- [ ] Add examples of permission usage
- [ ] Update any related API documentation

---

## 🎯 **Success Metrics**

### Code Quality
- **Reduced Duplication**: Elimination of role-specific component variants
- **Maintainability**: Single source of truth for permission logic
- **Type Safety**: Compile-time validation of permission strings
- **Test Coverage**: Comprehensive permission scenario testing

### Performance
- **Bundle Size**: Reduced bundle size from component consolidation
- **Runtime Performance**: Optimized permission checks with memoization
- **Memory Usage**: Lower memory footprint from unified components

### Developer Experience
- **Development Speed**: Faster feature development with clear patterns
- **Debugging**: Easier debugging with centralized permission logic
- **Code Reviews**: Consistent patterns make reviews more efficient
- **Onboarding**: Clear guidelines for new team members

### Security
- **Access Control**: Granular, auditable permission system
- **Consistency**: Uniform permission enforcement across application
- **Defense in Depth**: Multiple layers of permission validation
- **Audit Trail**: Complete logging of permission checks and failures

---

**This architecture guide establishes SafeShipper as a platform built for scale, security, and maintainability. By following these patterns, every new feature will seamlessly integrate with our permission system while providing appropriate access to all user types.** 🚀
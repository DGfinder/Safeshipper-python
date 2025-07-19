// demo-users.ts
// Demo user configurations for different roles in the SafeShipper system

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'INSPECTOR' | 'MANAGER';
  department: string;
  permissions: string[];
  description: string;
  avatar?: string;
}

export const demoUsers: DemoUser[] = [
  {
    id: 'admin-001',
    email: 'admin@safeshipper.com',
    password: 'admin123',
    firstName: 'Sarah',
    lastName: 'Richardson',
    role: 'ADMIN',
    department: 'IT Administration',
    permissions: [
      'user_management',
      'system_configuration',
      'audit_logs',
      'all_shipments',
      'all_customers',
      'reports',
      'compliance_management'
    ],
    description: 'System Administrator with full access to all features',
    avatar: '/avatars/admin.jpg'
  },
  {
    id: 'dispatcher-001',
    email: 'dispatcher@safeshipper.com',
    password: 'dispatcher123',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'DISPATCHER',
    department: 'Operations',
    permissions: [
      'shipment_management',
      'route_planning',
      'driver_assignment',
      'customer_communication',
      'tracking_updates',
      'schedule_management'
    ],
    description: 'Operations Dispatcher responsible for shipment coordination',
    avatar: '/avatars/dispatcher.jpg'
  },
  {
    id: 'driver-001',
    email: 'driver@safeshipper.com',
    password: 'driver123',
    firstName: 'Jake',
    lastName: 'Morrison',
    role: 'DRIVER',
    department: 'Transportation',
    permissions: [
      'my_shipments',
      'delivery_updates',
      'route_view',
      'document_access',
      'emergency_contacts'
    ],
    description: 'Certified dangerous goods driver with route access',
    avatar: '/avatars/driver.jpg'
  },
  {
    id: 'inspector-001',
    email: 'inspector@safeshipper.com',
    password: 'inspector123',
    firstName: 'Dr. Emma',
    lastName: 'Wilson',
    role: 'INSPECTOR',
    department: 'Compliance & Safety',
    permissions: [
      'compliance_audits',
      'safety_inspections',
      'violation_management',
      'certification_review',
      'incident_reports',
      'regulatory_updates'
    ],
    description: 'Safety Inspector and Compliance Officer',
    avatar: '/avatars/inspector.jpg'
  },
  {
    id: 'manager-001',
    email: 'manager@safeshipper.com',
    password: 'manager123',
    firstName: 'David',
    lastName: 'Thompson',
    role: 'MANAGER',
    department: 'Operations Management',
    permissions: [
      'team_management',
      'performance_reports',
      'customer_relations',
      'budget_oversight',
      'strategic_planning',
      'compliance_oversight'
    ],
    description: 'Operations Manager with team and performance oversight',
    avatar: '/avatars/manager.jpg'
  }
];

export const customerDemoUsers = [
  {
    name: "BHP Billiton",
    email: "logistics@bhpbilliton.com.au",
    password: "demo123",
    category: "Mining",
    description: "Australia's largest mining company"
  },
  {
    name: "Wesfarmers Chemicals",
    email: "logistics@wesfarmerschemicals.com.au",
    password: "demo123",
    category: "Industrial",
    description: "Industrial chemicals and energy company"
  },
  {
    name: "CBH Group",
    email: "logistics@cbhgroup.com.au",
    password: "demo123",
    category: "Agricultural",
    description: "Cooperative bulk handling of agricultural products"
  }
];

// Helper functions
export function getDemoUserByEmail(email: string): DemoUser | undefined {
  return demoUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
}

export function getCustomerDemoUserByEmail(email: string) {
  return customerDemoUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
}

export function getDemoUsersByRole(role: DemoUser['role']): DemoUser[] {
  return demoUsers.filter(user => user.role === role);
}

export function validateDemoCredentials(email: string, password: string): DemoUser | null {
  const user = getDemoUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

export function validateCustomerCredentials(email: string, password: string) {
  const user = getCustomerDemoUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

// Get all available demo credentials for display
export function getAllDemoCredentials() {
  return {
    internal: demoUsers.map(user => ({
      email: user.email,
      password: user.password,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      department: user.department,
      description: user.description
    })),
    customer: customerDemoUsers.map(user => ({
      email: user.email,
      password: user.password,
      name: user.name,
      category: user.category,
      description: user.description
    }))
  };
}
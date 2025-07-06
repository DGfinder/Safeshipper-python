'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { 
  Home, 
  Users, 
  Truck, 
  Package, 
  Shield, 
  BarChart3, 
  Settings, 
  FileText,
  Building2,
  Search,
  MapPin,
  BookOpen,
  Activity,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronRight,
  Plus,
  Upload,
  GraduationCap,
  ClipboardCheck,
  TrendingUp,
  BarChart
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
  badge?: string;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    icon: Home,
    children: [
      { name: 'Overview', href: '/dashboard', icon: Home },
      { name: 'Live Map', href: '/dashboard/live-map', icon: MapPin },
    ]
  },
  {
    name: 'Shipments',
    icon: Package,
    children: [
      { name: 'All Shipments', href: '/shipments', icon: Package },
      { name: 'Create Shipment', href: '/shipments/create', icon: Plus },
      { name: 'Manifest Upload', href: '/shipments/manifest-upload', icon: Upload },
      { name: 'Public Tracking', href: '/track', icon: Search },
    ]
  },
  {
    name: 'Operations',
    icon: Truck,
    children: [
      { name: 'Fleet Management', href: '/fleet', icon: Truck },
      { name: 'IoT Monitoring', href: '/iot-monitoring', icon: Activity },
    ]
  },
  {
    name: 'Safety & Compliance',
    icon: Shield,
    children: [
      { name: 'DG Compliance', href: '/dg-compliance', icon: Shield },
      { name: 'Emergency Procedures', href: '/emergency-procedures', icon: AlertTriangle },
      { name: 'Incident Management', href: '/incidents', icon: ClipboardCheck },
      { name: 'Training', href: '/training', icon: GraduationCap },
    ]
  },
  {
    name: 'Resources',
    icon: Database,
    children: [
      { name: 'SDS Library', href: '/sds-library', icon: Database },
      { name: 'DG Checker', href: '/dg-checker', icon: Search },
      { name: 'Documentation', href: '/documentation', icon: FileText },
    ]
  },
  {
    name: 'Reports & Analytics',
    icon: BarChart3,
    children: [
      { name: 'Reports Dashboard', href: '/reports', icon: BarChart },
      { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    ]
  },
  {
    name: 'Management',
    icon: Users,
    children: [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Customers', href: '/customers', icon: Building2 },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [expandedSections, setExpandedSections] = useState<string[]>(['Dashboard', 'Shipments']);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isChildActive = (children: NavigationItem[]) => 
    children.some(child => child.href && pathname === child.href);

  const NavigationSection = ({ item }: { item: NavigationItem }) => {
    const isExpanded = expandedSections.includes(item.name);
    const hasActiveChild = item.children ? isChildActive(item.children) : false;

    if (!item.children) {
      return (
        <Link
          href={item.href!}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive(item.href!)
              ? 'bg-[#153F9F] text-white'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.name}
          {item.badge && (
            <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {item.badge}
            </span>
          )}
        </Link>
      );
    }

    return (
      <div>
        <button
          onClick={() => toggleSection(item.name)}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            hasActiveChild
              ? 'bg-blue-50 text-[#153F9F]'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.name}
          {item.badge && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {item.badge}
            </span>
          )}
          <div className="ml-auto">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child) => (
              <Link
                key={child.name}
                href={child.href!}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive(child.href!)
                    ? 'bg-[#153F9F] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <child.icon className="h-4 w-4" />
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 px-6">
        <Link href="/dashboard" className="flex items-center space-x-3">
          <div className="relative h-8 w-8">
            <Image
              src="/symbol.svg"
              alt="SafeShipper Symbol"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="relative h-6 w-32">
            <Image
              src="/logo.svg"
              alt="SafeShipper"
              width={128}
              height={24}
              className="object-contain"
            />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavigationSection key={item.name} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#153F9F] text-white text-sm font-medium">
            {user?.avatar || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.username || 'Unknown User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role || 'User'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  MapPin
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Live Map', href: '/dashboard/live-map', icon: MapPin },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Shipments', href: '/shipments/demo-shipment', icon: Package },
  { name: 'DG Checker', href: '/dg-checker', icon: Search },
  { name: 'Fleet', href: '/fleet', icon: Truck },
  { name: 'DG Compliance', href: '/dg-compliance', icon: Shield },
  { name: 'Customers', href: '/customers', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Documentation', href: '/documentation', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 px-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-[#153F9F]" />
          <span className="text-xl font-bold text-[#153F9F]">SafeShipper</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#153F9F] text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
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
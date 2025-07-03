"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  TruckIcon,
  ShieldCheckIcon,
  MapIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    name: 'Shipments',
    icon: TruckIcon,
    children: [
      { name: 'New Shipment', href: '/shipments/new', icon: TruckIcon },
      { name: 'Live Map (Full-Screen)', href: '/shipments/live-map', icon: MapIcon },
      {
        name: 'Shipment Management',
        icon: TruckIcon,
        children: [
          { name: 'Shipment Overview', href: '/shipments/management/overview', icon: TruckIcon },
          { name: 'Shipment Details', href: '/shipments/management/details', icon: TruckIcon },
          { name: 'Shipment Tracking', href: '/shipments/management/tracking', icon: TruckIcon },
          { name: 'Shipment Documents', href: '/shipments/management/documents', icon: DocumentTextIcon },
          { name: 'Load Planning & Hazard Assessments', href: '/shipments/management/load-planning', icon: ExclamationTriangleIcon },
          { name: 'Comments (Instant Messaging)', href: '/shipments/management/comments', icon: TruckIcon },
          { name: 'Pre-Unloading & Completion', href: '/shipments/management/completion', icon: TruckIcon },
        ]
      }
    ]
  },
  {
    name: 'DG Compliance',
    icon: ShieldCheckIcon,
    children: [
      { name: 'Manifest Search (DG Identification)', href: '/dg-compliance/manifest-search', icon: DocumentTextIcon },
      { name: 'DG Compatibility Tool', href: '/dg-compliance/compatibility', icon: ShieldCheckIcon },
      { name: 'SDS Database (Safety Data Sheets)', href: '/dg-compliance/sds-database', icon: DocumentTextIcon },
      { name: 'Emergency Procedure Guide Database', href: '/dg-compliance/emergency-procedures', icon: ExclamationTriangleIcon },
      { name: 'DG Transport Compliance Reports', href: '/dg-compliance/transport-reports', icon: DocumentTextIcon },
      { name: 'DG Risk & Violation Alerts', href: '/dg-compliance/risk-alerts', icon: ExclamationTriangleIcon },
    ]
  },
  {
    name: 'Fleet & GPS Health',
    icon: MapIcon,
    children: [
      { name: 'Vehicle Database', href: '/fleet/vehicles', icon: TruckIcon },
      { name: 'GPS Device Monitoring & Alerts', href: '/fleet/gps-monitoring', icon: MapIcon },
      { name: 'Fleet & Vehicle Compliance Checks', href: '/fleet/compliance-checks', icon: ShieldCheckIcon },
      { name: 'Predictive Maintenance', href: '/fleet/maintenance', icon: CogIcon },
      { name: 'Inspection Scheduling', href: '/fleet/inspections', icon: DocumentTextIcon },
    ]
  },
  {
    name: 'Safety & Incidents',
    icon: ExclamationTriangleIcon,
    children: [
      { name: 'Incident Report Submission', href: '/safety/incident-reports', icon: ExclamationTriangleIcon },
      { name: 'Hazard Logs & Risk Assessments', href: '/safety/hazard-logs', icon: ExclamationTriangleIcon },
      { name: 'Corrective Actions & Compliance Tracking', href: '/safety/corrective-actions', icon: ShieldCheckIcon },
      { name: 'Safety Performance Reports', href: '/safety/performance-reports', icon: DocumentTextIcon },
    ]
  },
  {
    name: 'Customers',
    icon: UserGroupIcon,
    children: [
      { name: 'Customer Profiles', href: '/customers/profiles', icon: UserGroupIcon },
      { name: 'Geofencing & Delivery Zones', href: '/customers/geofencing', icon: MapIcon },
      { name: 'DG Handling Requirements', href: '/customers/dg-requirements', icon: ShieldCheckIcon },
      { name: 'Shipment History (Linked, Not Merged)', href: '/customers/history', icon: DocumentTextIcon },
      { name: 'Customer-Specific Compliance Rules', href: '/customers/compliance-rules', icon: ShieldCheckIcon },
      { name: 'Demurrage & Delivery Constraints', href: '/customers/demurrage', icon: DocumentTextIcon },
    ]
  },
  {
    name: 'Reports',
    icon: DocumentTextIcon,
    children: [
      { name: 'Fleet Performance Reports', href: '/reports/fleet-performance', icon: TruckIcon },
      { name: 'Shipment & Logistics Insights', href: '/reports/logistics-insights', icon: DocumentTextIcon },
      { name: 'DG Compliance & Safety Metrics', href: '/reports/compliance-metrics', icon: ShieldCheckIcon },
      { name: 'Warehouse & Load Efficiency Analytics', href: '/reports/warehouse-analytics', icon: DocumentTextIcon },
      { name: 'Demurrage Reports', href: '/reports/demurrage-reports', icon: DocumentTextIcon },
    ]
  },
  {
    name: 'System Settings',
    icon: CogIcon,
    children: [
      { name: 'General System Configurations', href: '/settings/general', icon: CogIcon },
      { name: 'Regional Compliance & Security', href: '/settings/regional-compliance', icon: ShieldCheckIcon },
      { name: 'API Integrations & Third-Party Tools', href: '/settings/api-integrations', icon: CogIcon },
    ]
  }
];

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = '' }: NavigationProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isExpanded = (itemName: string) => expandedItems.includes(itemName);
  
  const hasActiveChild = (item: NavItem): boolean => {
    if (item.href && isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => hasActiveChild(child));
    }
    return false;
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const itemIsExpanded = isExpanded(item.name);
    const itemHasActiveChild = hasActiveChild(item);

    return (
      <div key={item.name} className="mb-1">
        {item.href ? (
          <Link
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              level > 0 ? 'ml-4' : ''
            } ${
              isActive(item.href)
                ? 'bg-gradient-to-r from-[#153F9F] to-[rgba(21,63,159,0.7)] shadow-[0px_2px_6px_rgba(115,103,240,0.48)] text-white'
                : itemHasActiveChild
                ? 'bg-blue-50 text-[#153F9F]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-[22px] h-[22px]" />
            <span className="font-['Poppins'] font-normal text-[15px] leading-[22px] flex-1">
              {item.name}
            </span>
          </Link>
        ) : (
          <button
            onClick={() => hasChildren && toggleExpanded(item.name)}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              level > 0 ? 'ml-4' : ''
            } ${
              itemHasActiveChild
                ? 'bg-blue-50 text-[#153F9F]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-[22px] h-[22px]" />
            <span className="font-['Poppins'] font-normal text-[15px] leading-[22px] flex-1 text-left">
              {item.name}
            </span>
            {hasChildren && (
              <ChevronDownIcon 
                className={`w-[18px] h-[18px] transition-transform ${
                  itemIsExpanded ? 'rotate-180' : ''
                }`} 
              />
            )}
          </button>
        )}
        
        {hasChildren && itemIsExpanded && (
          <div className="mt-1 ml-4 space-y-1">
            {item.children.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-[260px] bg-white shadow-[0px_2px_4px_rgba(165,163,174,0.3)] min-h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="flex justify-center items-center py-5 px-6 h-[68px] border-b border-gray-100">
        <div className="w-[129.41px] h-7">
          <span className="text-xl font-bold text-[#153F9F]">SafeShipper</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-[14px] py-4 overflow-y-auto">
        {navigationItems.map(item => renderNavItem(item))}
      </nav>
    </div>
  );
}
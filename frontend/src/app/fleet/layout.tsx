"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Truck, 
  MapPin, 
  BarChart3, 
  Wrench, 
  Shield, 
  FileText,
  Plus,
  List,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

const fleetNavItems = [
  {
    title: "Overview",
    href: "/fleet",
    icon: Activity,
    exact: true
  },
  {
    title: "Vehicles",
    href: "/fleet/vehicles",
    icon: Truck,
    children: [
      { title: "All Vehicles", href: "/fleet/vehicles", icon: List },
      { title: "Add Vehicle", href: "/fleet/vehicles/new", icon: Plus }
    ]
  },
  {
    title: "Compliance",
    href: "/fleet/compliance",
    icon: Shield,
    children: [
      { title: "DG Compliance", href: "/fleet/compliance", icon: Shield },
      { title: "Safety Equipment", href: "/fleet/compliance/equipment", icon: FileText }
    ]
  },
  {
    title: "Analytics",
    href: "/fleet/analytics",
    icon: BarChart3,
    children: [
      { title: "Performance", href: "/fleet/analytics/performance", icon: BarChart3 },
      { title: "Compliance Stats", href: "/fleet/analytics/compliance", icon: Shield }
    ]
  },
  {
    title: "Maintenance",
    href: "/fleet/maintenance",
    icon: Wrench,
    children: [
      { title: "Schedule", href: "/fleet/maintenance/schedule", icon: FileText },
      { title: "History", href: "/fleet/maintenance/history", icon: List }
    ]
  }
];

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fleet Management</h2>
          <nav className="space-y-1">
            {fleetNavItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <div key={item.href}>
                  <Link
                    href={item.href as any}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                  
                  {/* Sub-navigation */}
                  {item.children && isActive && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;
                        
                        return (
                          <Link
                            key={child.href}
                            href={child.href as any}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                              isChildActive
                                ? "text-blue-700 font-medium"
                                : "text-gray-600 hover:text-gray-900"
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5" />
                            {child.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        
        {/* Quick Stats */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Vehicles</span>
              <span className="font-medium text-gray-900">12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">In Transit</span>
              <span className="font-medium text-blue-600">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Maintenance</span>
              <span className="font-medium text-yellow-600">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
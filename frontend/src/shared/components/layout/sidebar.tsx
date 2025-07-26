"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/shared/stores/auth-store";
import UnifiedSearchBar from "@/shared/components/search/UnifiedSearchBar";
import { ConnectionStatus } from "@/shared/components/ui/connection-status";
import { ThemeToggle } from "@/shared/components/ui/theme-toggle";
import { TextLogo } from "@/shared/components/ui/text-logo";
import { useTheme } from "@/contexts/ThemeContext";
import { usePermissions } from "@/contexts/PermissionContext";
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
  BarChart,
  Brain,
  TestTube,
  Menu,
  X,
  Zap,
  Globe,
  UserCheck,
  Code2,
  Layers,
  Workflow,
  LineChart,
  MonitorSpeaker,
  DollarSign,
  Route,
  Monitor,
  Shield as ShieldAnalytics,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
  badge?: string;
  requiredPermission?: string;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    icon: Home,
    children: [
      { name: "Overview", href: "/dashboard", icon: Home, requiredPermission: "dashboard.view" },
      { name: "Operations Center", href: "/operations", icon: MonitorSpeaker, badge: "New", requiredPermission: "operations.center.view" },
      { name: "Live Map", href: "/dashboard/live-map", icon: MapPin, requiredPermission: "dashboard.view" },
      { name: "Search", href: "/search", icon: Search, requiredPermission: "search.view" },
    ],
  },
  {
    name: "Shipments",
    icon: Package,
    children: [
      { name: "All Shipments", href: "/shipments", icon: Package, requiredPermission: "shipments.view.all" },
      {
        name: "My Shipments",
        href: "/shipments/my-shipments",
        icon: Package,
        requiredPermission: "shipments.view.own"
      },
      {
        name: "Manifest Upload",
        href: "/shipments/manifest-upload",
        icon: Upload,
        requiredPermission: "shipments.manifest.upload"
      },
    ],
  },
  {
    name: "Enterprise Integration",
    icon: Layers,
    children: [
      { name: "ERP Integration", href: "/erp-integration", icon: Workflow, badge: "New", requiredPermission: "erp.integration.view" },
      { name: "API Gateway", href: "/api-gateway", icon: Globe, badge: "New", requiredPermission: "api.gateway.view" },
      { name: "Developer Portal", href: "/developer", icon: Code2, badge: "New", requiredPermission: "developer.portal.view" },
    ],
  },
  {
    name: "Operations",
    icon: Truck,
    children: [
      { name: "Fleet Management", href: "/fleet", icon: Truck, requiredPermission: "vehicle.view" },
      { name: "IoT Monitoring", href: "/iot-monitoring", icon: Activity, requiredPermission: "iot.monitoring.view" },
    ],
  },
  {
    name: "Safety & Compliance",
    icon: Shield,
    children: [
      { name: "DG Compliance", href: "/dg-compliance", icon: Shield, requiredPermission: "safety.compliance.view" },
      { name: "Live Compliance", href: "/compliance-live", icon: Activity, badge: "Live", requiredPermission: "safety.compliance.view" },
      {
        name: "Emergency Procedures",
        href: "/emergency-procedures",
        icon: AlertTriangle,
        requiredPermission: "emergency.procedures.view"
      },
      { name: "Incident Management", href: "/incidents", icon: ClipboardCheck, requiredPermission: "incidents.view" },
      { name: "Training", href: "/training", icon: GraduationCap, requiredPermission: "training.view" },
      { name: "Inspections", href: "/inspections", icon: ClipboardCheck, badge: "New", requiredPermission: "inspections.view" },
      { name: "Audits", href: "/audits", icon: FileText, badge: "New", requiredPermission: "audits.view" },
    ],
  },
  {
    name: "Resources",
    icon: Database,
    children: [
      { name: "SDS Library", href: "/sds-library", icon: Database, requiredPermission: "sds.library.view" },
      { name: "SDS Enhanced", href: "/sds-enhanced", icon: BookOpen, requiredPermission: "sds.library.view" },
      { name: "DG Checker", href: "/dg-checker", icon: Search, requiredPermission: "dg.checker.view" },
    ],
  },
  {
    name: "AI Tools",
    icon: Brain,
    children: [
      { name: "AI Insights", href: "/ai-insights", icon: Brain, requiredPermission: "ai.insights.view" },
      { name: "Risk Analytics", href: "/risk-analytics", icon: TrendingUp, badge: "New", requiredPermission: "risk.analytics.view" },
    ],
  },
  {
    name: "Public Services",
    icon: MapPin,
    children: [
      { name: "Track Shipment", href: "/track", icon: Search, requiredPermission: "track.shipment.view" },
    ],
  },
  {
    name: "Customer Portal",
    icon: UserCheck,
    children: [
      { name: "Portal Dashboard", href: "/customer-portal", icon: UserCheck, badge: "New", requiredPermission: "customer.portal.admin" },
      { name: "Self-Service", href: "/customer-portal/requests", icon: Users, badge: "New", requiredPermission: "customer.portal.admin" },
      { name: "Notifications", href: "/customer-portal/notifications", icon: AlertTriangle, badge: "New", requiredPermission: "customer.portal.admin" },
    ],
  },
  {
    name: "Reports & Analytics",
    icon: BarChart3,
    children: [
      { name: "Reports Dashboard", href: "/reports", icon: BarChart, requiredPermission: "reports.view" },
      { name: "Advanced Analytics", href: "/analytics", icon: LineChart, badge: "New", requiredPermission: "analytics.advanced.view" },
      { name: "Business Intelligence", href: "/analytics/insights", icon: Brain, badge: "New", requiredPermission: "analytics.advanced.view" },
    ],
  },
  {
    name: "Advanced Analytics",
    icon: TrendingUp,
    children: [
      { name: "Supply Chain Stress", href: "/supply-chain-stress", icon: ShieldAnalytics, badge: "Analytics", requiredPermission: "supply.chain.analytics" },
      { name: "Insurance Pricing", href: "/insurance-pricing", icon: DollarSign, badge: "Analytics", requiredPermission: "insurance.analytics" },
      { name: "Route Optimization", href: "/route-optimization", icon: Route, badge: "Analytics", requiredPermission: "route.optimization" },
      { name: "Digital Twin", href: "/digital-twin", icon: Monitor, badge: "Analytics", requiredPermission: "digital.twin.view" },
    ],
  },
  {
    name: "Management",
    icon: Users,
    children: [
      { name: "Users", href: "/users", icon: Users, requiredPermission: "users.manage" },
      { name: "Customers", href: "/customers", icon: Building2, requiredPermission: "customers.manage" },
      { name: "Settings", href: "/settings", icon: Settings, requiredPermission: "settings.manage" },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

// Helper function to check if user has required permission
function hasPermission(permission: string | undefined, can: (permission: any) => boolean): boolean {
  if (!permission) return true; // No permission required means everyone can see it
  return can(permission);
}

// Helper function to filter navigation items based on user permissions
function filterNavigationItems(items: NavigationItem[], can: (permission: any) => boolean): NavigationItem[] {
  return items.filter(item => {
    // Check if parent item has permission requirement
    if (item.requiredPermission && !hasPermission(item.requiredPermission, can)) {
      return false;
    }
    
    // Filter children and check if any are visible
    if (item.children) {
      const filteredChildren = item.children.filter(child => hasPermission(child.requiredPermission, can));
      // Only show parent if it has accessible children or no permission requirement
      return filteredChildren.length > 0 || !item.requiredPermission;
    }
    
    return true;
  }).map(item => ({
    ...item,
    children: item.children ? item.children.filter(child => hasPermission(child.requiredPermission, can)) : undefined
  }));
}

export function Sidebar({ 
  isCollapsed = false, 
  onToggleCollapse,
  isMobile = false,
  onClose 
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isDark } = useTheme();
  const { can } = usePermissions();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Dashboard",
    "Shipments",
    "Enterprise Integration",
  ]);
  
  // Filter navigation items based on user permissions
  const filteredNavigation = filterNavigationItems(navigation, can);

  const toggleSection = (sectionName: string) => {
    if (isCollapsed) return; // Don't expand sections when collapsed
    setExpandedSections((prev) =>
      prev.includes(sectionName)
        ? prev.filter((name) => name !== sectionName)
        : [...prev, sectionName],
    );
  };

  // Close expanded sections when sidebar is collapsed
  useEffect(() => {
    if (isCollapsed) {
      setExpandedSections([]);
    } else {
      setExpandedSections(["Dashboard", "Shipments", "Enterprise Integration"]);
    }
  }, [isCollapsed]);

  const isActive = (href: string) => pathname === href;
  const isChildActive = (children: NavigationItem[]) =>
    children.some((child) => child.href && pathname === child.href);

  const NavigationSection = ({ item }: { item: NavigationItem }) => {
    const isExpanded = expandedSections.includes(item.name);
    const hasActiveChild = item.children ? isChildActive(item.children) : false;

    if (!item.children) {
      return (
        <Link
          href={item.href! as any}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative group",
            isActive(item.href!)
              ? "bg-[#153F9F] text-white"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? item.name : undefined}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="truncate">{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </>
          )}
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              {item.name}
            </div>
          )}
        </Link>
      );
    }

    return (
      <div>
        <button
          onClick={() => toggleSection(item.name)}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative group focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:ring-offset-2",
            hasActiveChild
              ? "bg-blue-50 text-[#153F9F]"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? item.name : undefined}
          aria-expanded={isExpanded && !isCollapsed}
          aria-controls={`section-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="truncate">{item.name}</span>
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
            </>
          )}
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              {item.name}
            </div>
          )}
        </button>
        {isExpanded && !isCollapsed && (
          <div 
            className="ml-8 mt-1 space-y-1"
            id={`section-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {item.children.map((child) => (
              <Link
                key={child.name}
                href={child.href! as any}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:ring-offset-2",
                  isActive(child.href!)
                    ? "bg-[#153F9F] text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
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
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={cn(
        "flex h-full flex-col bg-surface-card border-r border-surface-border transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        isMobile && "fixed left-0 top-0 z-50 lg:relative"
      )}>
        {/* Header with logo and collapse toggle */}
        <div className={cn(
          "flex h-16 items-center border-b border-surface-border",
          isCollapsed ? "justify-center px-4" : "justify-between px-6"
        )}>
          <Link href="/dashboard" className={cn(
            "flex items-center",
            isCollapsed ? "space-x-0" : "space-x-2"
          )}>
            <div className="relative h-8 w-8 flex-shrink-0">
              <Image
                src="/symbol.svg"
                alt="SafeShipper Symbol"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            {!isCollapsed && (
              <TextLogo size="lg" className="ml-1" />
            )}
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {!isCollapsed && (
              <ThemeToggle />
            )}
            
            {/* Mobile close button */}
            {isMobile && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-accent rounded-lg lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            
            {/* Desktop collapse toggle */}
            {!isMobile && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 hover:bg-surface-accent rounded-lg hidden lg:block"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!isCollapsed}
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

      {/* Global Search */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-surface-border">
          <UnifiedSearchBar
            placeholder="Search SafeShipper..."
            compact={true}
            showAIToggle={true}
            className="w-full"
          />
        </div>
      )}

      {/* Navigation */}
      <nav 
        className={cn(
          "flex-1 space-y-1 overflow-y-auto",
          isCollapsed ? "p-2" : "p-4"
        )}
        aria-label="Main navigation"
        role="navigation"
      >
        {filteredNavigation.map((item) => (
          <NavigationSection key={item.name} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t border-surface-border",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {/* Connection Status */}
        <div className={cn(
          "mb-3",
          isCollapsed ? "flex justify-center" : ""
        )}>
          <ConnectionStatus />
        </div>
        
        {/* User Info */}
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#153F9F] text-white text-sm font-medium flex-shrink-0">
            {user?.avatar || "U"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username || "Unknown User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role || "User"}
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

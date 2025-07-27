"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarCollapsible?: boolean;
  fullHeight?: boolean;
  noPadding?: boolean;
}

export function DashboardLayout({ 
  children, 
  sidebarCollapsible = false,
  fullHeight = false,
  noPadding = false
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    if (sidebarCollapsible) {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setSidebarCollapsed(JSON.parse(saved));
      }
    }
  }, [sidebarCollapsible]);

  // Save sidebar state to localStorage
  useEffect(() => {
    if (sidebarCollapsible) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed, sidebarCollapsible]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const openMobileMenu = () => {
    setMobileMenuOpen(true);
  };

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar 
            isCollapsed={sidebarCollapsible ? sidebarCollapsed : false}
            onToggleCollapse={sidebarCollapsible ? toggleSidebar : undefined}
          />
        </div>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <Sidebar 
            isMobile={true}
            onClose={closeMobileMenu}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onMenuClick={openMobileMenu}
            showMenuButton={true}
          />
          <main className={cn(
            "flex-1 overflow-y-auto",
            noPadding ? "" : "p-6",
            fullHeight ? "h-full" : ""
          )}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

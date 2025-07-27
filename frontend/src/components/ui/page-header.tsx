"use client";

import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface PageHeaderAction {
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: PageHeaderAction[];
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  className?: string;
  showSeparator?: boolean;
  loadTime?: number;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions = [],
  badge,
  className,
  showSeparator = true,
  loadTime
}: PageHeaderProps) {
  const formatLoadTime = (time: number) => {
    if (time < 1000) {
      return `${Math.round(time)}ms`;
    } else {
      return `${(time / 1000).toFixed(1)}s`;
    }
  };

  const enhancedSubtitle = subtitle ? (
    <>
      {subtitle}
      {loadTime && (
        <span className="ml-2 text-xs text-gray-400">
          (Loaded in {formatLoadTime(loadTime)})
        </span>
      )}
    </>
  ) : loadTime ? (
    <span className="text-xs text-gray-400">
      Loaded in {formatLoadTime(loadTime)}
    </span>
  ) : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-gray-500">
          <Link href="/dashboard" className="flex items-center hover:text-gray-700 transition-colors">
            <Home className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-4 w-4" />
              {item.href ? (
                <Link href={item.href as any} className="flex items-center hover:text-gray-700 transition-colors">
                  {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center text-gray-900 font-medium">
                  {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {badge && (
                <Badge variant={badge.variant || "default"}>
                  {badge.label}
                </Badge>
              )}
            </div>
            {enhancedSubtitle && (
              <p className="text-gray-600 mt-1">
                {enhancedSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  size={action.size || "sm"}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={cn(
                    action.loading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {Icon && (
                    <Icon className={cn(
                      "h-4 w-4",
                      action.size === "sm" && "h-3 w-3",
                      action.size === "lg" && "h-5 w-5",
                      action.label && "mr-2",
                      action.loading && "animate-spin"
                    )} />
                  )}
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Optional Separator */}
      {showSeparator && <Separator />}
    </div>
  );
}

// Convenience components for common header patterns
interface DashboardPageHeaderProps extends Omit<PageHeaderProps, "breadcrumbs"> {
  section?: string;
  sectionIcon?: React.ComponentType<{ className?: string }>;
  sectionHref?: string;
}

export function DashboardPageHeader({
  section,
  sectionIcon,
  sectionHref,
  ...props
}: DashboardPageHeaderProps) {
  const breadcrumbs: BreadcrumbItem[] = section ? [
    {
      label: section,
      href: sectionHref,
      icon: sectionIcon
    }
  ] : [];

  return <PageHeader {...props} breadcrumbs={breadcrumbs} />;
}

interface NestedPageHeaderProps extends PageHeaderProps {
  parentSection: string;
  parentSectionIcon?: React.ComponentType<{ className?: string }>;
  parentSectionHref: string;
  currentSection: string;
  currentSectionIcon?: React.ComponentType<{ className?: string }>;
}

export function NestedPageHeader({
  parentSection,
  parentSectionIcon,
  parentSectionHref,
  currentSection,
  currentSectionIcon,
  ...props
}: NestedPageHeaderProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: parentSection,
      href: parentSectionHref,
      icon: parentSectionIcon
    },
    {
      label: currentSection,
      icon: currentSectionIcon
    }
  ];

  return <PageHeader {...props} breadcrumbs={breadcrumbs} />;
}

// Hook for common header actions
export function usePageHeaderActions() {
  const createRefreshAction = (onRefresh: () => void, isLoading: boolean = false): PageHeaderAction => ({
    label: "Refresh",
    variant: "outline",
    icon: isLoading ? 
      ({ className }) => <div className={cn("animate-spin", className)}>⟳</div> : 
      ({ className }) => <div className={className}>⟳</div>,
    onClick: onRefresh,
    disabled: isLoading,
    loading: isLoading
  });

  const createExportAction = (onExport: () => void, isLoading: boolean = false): PageHeaderAction => ({
    label: "Export",
    variant: "outline",
    icon: ({ className }) => <div className={className}>↓</div>,
    onClick: onExport,
    disabled: isLoading
  });

  const createNewAction = (onNew: () => void, label: string = "New"): PageHeaderAction => ({
    label,
    variant: "default",
    icon: ({ className }) => <div className={className}>+</div>,
    onClick: onNew
  });

  const createSettingsAction = (onSettings: () => void): PageHeaderAction => ({
    label: "Settings",
    variant: "outline",
    icon: ({ className }) => <div className={className}>⚙</div>,
    onClick: onSettings
  });

  return {
    createRefreshAction,
    createExportAction,
    createNewAction,
    createSettingsAction
  };
}
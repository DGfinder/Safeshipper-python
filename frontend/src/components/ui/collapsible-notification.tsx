"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "warning" | "recommendation" | "info" | "error";
  title: string;
  message: string;
  dismissible?: boolean;
}

interface CollapsibleNotificationProps {
  notifications: NotificationItem[];
  onDismiss?: (id: string) => void;
  onDismissAll?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

const getNotificationIcon = (type: NotificationItem["type"]) => {
  switch (type) {
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case "error":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "recommendation":
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    case "info":
    default:
      return <Bell className="h-4 w-4 text-gray-600" />;
  }
};

const getNotificationStyles = (type: NotificationItem["type"]) => {
  switch (type) {
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "error":
      return "bg-red-50 border-red-200 text-red-800";
    case "recommendation":
      return "bg-blue-50 border-blue-200 text-blue-800";
    case "info":
    default:
      return "bg-gray-50 border-gray-200 text-gray-800";
  }
};

const getTypeColor = (type: NotificationItem["type"]) => {
  switch (type) {
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "error":
      return "bg-red-100 text-red-800";
    case "recommendation":
      return "bg-blue-100 text-blue-800";
    case "info":
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function CollapsibleNotification({
  notifications,
  onDismiss,
  onDismissAll,
  className,
  defaultExpanded = false,
}: CollapsibleNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (notifications.length === 0) {
    return null;
  }

  // Count notifications by type
  const warningCount = notifications.filter(n => n.type === "warning").length;
  const errorCount = notifications.filter(n => n.type === "error").length;
  const recommendationCount = notifications.filter(n => n.type === "recommendation").length;
  const infoCount = notifications.filter(n => n.type === "info").length;

  const totalCount = notifications.length;
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;

  return (
    <Card className={cn("w-full", className)}>
      {/* Collapsed Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 cursor-pointer border-b transition-colors",
          hasErrors
            ? "bg-red-50 hover:bg-red-100"
            : hasWarnings
            ? "bg-amber-50 hover:bg-amber-100"
            : "bg-blue-50 hover:bg-blue-100"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : hasWarnings ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <Bell className="h-5 w-5 text-blue-600" />
            )}
            <span className="font-medium text-sm">
              {hasErrors
                ? "Errors and Notifications"
                : hasWarnings
                ? "Warnings and Notifications"
                : "Notifications"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {recommendationCount > 0 && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                {recommendationCount} tip{recommendationCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 text-xs">
                {infoCount} info
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDismissAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDismissAll();
              }}
              className="text-xs h-7"
            >
              Dismiss All
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="p-0">
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 border-b last:border-b-0",
                  getNotificationStyles(notification.type)
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{notification.title}</h4>
                      <p className="text-sm mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getTypeColor(notification.type))}
                      >
                        {notification.type}
                      </Badge>
                      
                      {notification.dismissible !== false && onDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDismiss(notification.id)}
                          className="h-6 w-6 p-0 hover:bg-white/50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default CollapsibleNotification;
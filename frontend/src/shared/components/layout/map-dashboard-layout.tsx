"use client";

import { DashboardLayout } from "./dashboard-layout";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MapDashboardLayoutProps {
  children: React.ReactNode;
  mapTitle?: string;
  mapDescription?: string;
  headerActions?: React.ReactNode;
}

export function MapDashboardLayout({ 
  children, 
  mapTitle = "Live Map",
  mapDescription = "Real-time tracking and monitoring",
  headerActions
}: MapDashboardLayoutProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  return (
    <DashboardLayout 
      sidebarCollapsible={true}
      fullHeight={true}
      noPadding={true}
    >
      <div className="h-full flex flex-col">
        {/* Map Header */}
        {!isFullscreen && (
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{mapTitle}</h1>
                <p className="text-sm text-gray-600 mt-1">{mapDescription}</p>
              </div>
              
              <div className="flex items-center gap-3">
                {headerActions}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Map Content */}
        <div className={cn(
          "flex-1 relative",
          isFullscreen ? "fixed inset-0 z-50 bg-white" : ""
        )}>
          {/* Fullscreen exit button */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-50">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="flex items-center gap-2 bg-white shadow-lg"
              >
                <Minimize2 className="h-4 w-4" />
                Exit Fullscreen
              </Button>
            </div>
          )}
          
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
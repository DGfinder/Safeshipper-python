"use client";

import { useState } from "react";
import { 
  Workflow, 
  Plus, 
  Search, 
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Database,
  Zap,
  Settings,
  Activity
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import ERPSystemsDashboard from "@/shared/components/erp/ERPSystemsDashboard";
import ManifestImportMonitor from "@/shared/components/erp/ManifestImportMonitor";
import ConnectionWizard from "@/shared/components/erp/ConnectionWizard";
import FieldMappingStudio from "@/shared/components/erp/FieldMappingStudio";
import SyncLogsViewer from "@/shared/components/erp/SyncLogsViewer";

export default function ERPIntegrationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showConnectionWizard, setShowConnectionWizard] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

  // Mock data - replace with real API calls
  const stats = {
    totalSystems: 4,
    activeSystems: 3,
    syncJobsToday: 127,
    manifestsImported: 89,
    errorCount: 2,
    avgSyncTime: "2.3s"
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Workflow className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ERP Integration Center</h1>
                <p className="text-gray-600">Manage ERP connections and manifest imports</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowConnectionWizard(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add ERP System
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSystems}</p>
                <p className="text-sm text-gray-600">ERP Systems</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSystems}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.syncJobsToday}</p>
                <p className="text-sm text-gray-600">Syncs Today</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Workflow className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.manifestsImported}</p>
                <p className="text-sm text-gray-600">Manifests</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.errorCount}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.avgSyncTime}</p>
                <p className="text-sm text-gray-600">Avg Time</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="systems" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="systems">ERP Systems</TabsTrigger>
            <TabsTrigger value="manifests">Manifest Monitor</TabsTrigger>
            <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
            <TabsTrigger value="logs">Sync Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="systems" className="space-y-6">
            <ERPSystemsDashboard />
          </TabsContent>

          <TabsContent value="manifests" className="space-y-6">
            <ManifestImportMonitor />
          </TabsContent>

          <TabsContent value="mappings" className="space-y-6">
            <FieldMappingStudio />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <SyncLogsViewer />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Integration Settings</h3>
              <p className="text-gray-600">Global ERP integration settings and preferences.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Connection Wizard Modal */}
      {showConnectionWizard && (
        <ConnectionWizard
          onClose={() => setShowConnectionWizard(false)}
          onSuccess={() => {
            setShowConnectionWizard(false);
            // Refresh data
          }}
        />
      )}
    </div>
  );
}
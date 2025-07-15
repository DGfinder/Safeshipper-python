"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Settings,
  RefreshCw,
  Database,
  ExternalLink,
  Trash2,
  Edit
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ERPSystem {
  id: string;
  name: string;
  systemType: string;
  connectionType: string;
  status: 'active' | 'inactive' | 'testing' | 'error';
  lastSyncAt: string | null;
  endpointCount: number;
  lastSyncStatus: string | null;
  errorCount: number;
  companyName: string;
}

export default function ERPSystemsDashboard() {
  const [systems, setSystems] = useState<ERPSystem[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with real API call
  useEffect(() => {
    // Simulate API call
    const mockSystems: ERPSystem[] = [
      {
        id: "1",
        name: "SAP ERP Central Component",
        systemType: "sap",
        connectionType: "rest_api",
        status: "active",
        lastSyncAt: "2024-07-14T13:30:00Z",
        endpointCount: 2,
        lastSyncStatus: "completed",
        errorCount: 0,
        companyName: "Demo Company Ltd"
      },
      {
        id: "2", 
        name: "Oracle ERP Cloud",
        systemType: "oracle",
        connectionType: "rest_api",
        status: "testing",
        lastSyncAt: null,
        endpointCount: 0,
        lastSyncStatus: null,
        errorCount: 0,
        companyName: "Demo Company Ltd"
      },
      {
        id: "3",
        name: "NetSuite ERP",
        systemType: "netsuite", 
        connectionType: "rest_api",
        status: "error",
        lastSyncAt: "2024-07-14T12:45:00Z",
        endpointCount: 1,
        lastSyncStatus: "failed",
        errorCount: 3,
        companyName: "Demo Company Ltd"
      }
    ];

    setTimeout(() => {
      setSystems(mockSystems);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'testing': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-gray-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatSystemType = (type: string) => {
    switch (type) {
      case 'sap': return 'SAP';
      case 'oracle': return 'Oracle';
      case 'netsuite': return 'NetSuite';
      case 'dynamics': return 'Microsoft Dynamics';
      default: return type.toUpperCase();
    }
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const handleTestConnection = async (systemId: string) => {
    // Implement connection test
    console.log(`Testing connection for system ${systemId}`);
  };

  const handleSync = async (systemId: string) => {
    // Implement sync
    console.log(`Starting sync for system ${systemId}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Connected ERP Systems</h2>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systems.map((system) => (
          <Card key={system.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{system.name}</h3>
                    <p className="text-sm text-gray-600">{formatSystemType(system.systemType)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(system.status)}
                  <Badge className={getStatusColor(system.status)}>
                    {system.status}
                  </Badge>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-600">Endpoints</p>
                  <p className="text-lg font-semibold text-gray-900">{system.endpointCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Last Sync</p>
                  <p className="text-sm text-gray-900">{formatLastSync(system.lastSyncAt)}</p>
                </div>
              </div>

              {/* Status Info */}
              {system.errorCount > 0 && (
                <div className="flex items-center space-x-2 p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">{system.errorCount} errors</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(system.id)}
                  className="flex-1"
                >
                  Test Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(system.id)}
                  disabled={system.status !== 'active'}
                  className="flex-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <button className="flex items-center hover:text-blue-600">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Details
                </button>
                <button className="flex items-center hover:text-blue-600">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {systems.length === 0 && (
        <Card className="p-12 text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No ERP Systems Connected</h3>
          <p className="text-gray-600 mb-4">Get started by connecting your first ERP system.</p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add ERP System
          </Button>
        </Card>
      )}
    </div>
  );
}
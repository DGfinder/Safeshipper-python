"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  Filter,
  Search,
  Play,
  Pause,
  MoreVertical
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

interface ManifestImport {
  id: string;
  fileName: string;
  erpSystem: string;
  importedAt: string;
  status: 'processing' | 'completed' | 'failed' | 'pending';
  recordsTotal: number;
  recordsProcessed: number;
  errorCount: number;
  manifestId?: string;
  externalReference: string;
  fileSize: string;
  importedBy: string;
  processingTime?: string;
}

export default function ManifestImportMonitor() {
  const [imports, setImports] = useState<ManifestImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [systemFilter, setSystemFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockImports: ManifestImport[] = [
      {
        id: "1",
        fileName: "manifest_batch_001.xml",
        erpSystem: "SAP ERP",
        importedAt: "2024-07-14T14:30:00Z",
        status: "processing",
        recordsTotal: 150,
        recordsProcessed: 89,
        errorCount: 2,
        externalReference: "SAP-MAN-2024-0001",
        fileSize: "2.4 MB",
        importedBy: "system.integration"
      },
      {
        id: "2", 
        fileName: "shipment_export_20240714.json",
        erpSystem: "Oracle ERP",
        importedAt: "2024-07-14T13:15:00Z",
        status: "completed",
        recordsTotal: 75,
        recordsProcessed: 75,
        errorCount: 0,
        manifestId: "MAN-2024-0089",
        externalReference: "ORA-SHP-240714-001",
        fileSize: "1.8 MB",
        importedBy: "john.doe",
        processingTime: "2m 15s"
      },
      {
        id: "3",
        fileName: "bulk_manifest_upload.csv",
        erpSystem: "NetSuite",
        importedAt: "2024-07-14T12:45:00Z", 
        status: "failed",
        recordsTotal: 200,
        recordsProcessed: 45,
        errorCount: 12,
        externalReference: "NS-BLK-2024-0012",
        fileSize: "3.1 MB",
        importedBy: "jane.smith",
        processingTime: "45s"
      },
      {
        id: "4",
        fileName: "priority_shipments.xml",
        erpSystem: "SAP ERP",
        importedAt: "2024-07-14T11:30:00Z",
        status: "pending",
        recordsTotal: 25,
        recordsProcessed: 0,
        errorCount: 0,
        externalReference: "SAP-PRI-2024-0003",
        fileSize: "512 KB",
        importedBy: "automated.scheduler"
      }
    ];

    setTimeout(() => {
      setImports(mockImports);
      setLoading(false);
    }, 1000);
  }, []);

  // Auto refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // In real app, this would refresh data from API
      console.log("Auto-refreshing manifest imports...");
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getProgressPercentage = (processed: number, total: number) => {
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  };

  const filteredImports = imports.filter((imp) => {
    const matchesSearch = 
      imp.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imp.externalReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imp.erpSystem.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || imp.status === statusFilter;
    const matchesSystem = systemFilter === "all" || imp.erpSystem === systemFilter;
    
    return matchesSearch && matchesStatus && matchesSystem;
  });

  const stats = {
    total: imports.length,
    processing: imports.filter(i => i.status === 'processing').length,
    completed: imports.filter(i => i.status === 'completed').length,
    failed: imports.filter(i => i.status === 'failed').length,
    totalRecords: imports.reduce((sum, i) => sum + i.recordsTotal, 0),
    totalErrors: imports.reduce((sum, i) => sum + i.errorCount, 0)
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
        <Card className="p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Imports</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.processing}</p>
              <p className="text-sm text-gray-600">Processing</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.totalErrors}</p>
              <p className="text-sm text-gray-600">Total Errors</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search imports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={systemFilter} onValueChange={setSystemFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="ERP System" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              <SelectItem value="SAP ERP">SAP ERP</SelectItem>
              <SelectItem value="Oracle ERP">Oracle ERP</SelectItem>
              <SelectItem value="NetSuite">NetSuite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 text-green-700" : ""}
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Import List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Manifest Imports</h3>
            <p className="text-sm text-gray-600">{filteredImports.length} imports</p>
          </div>
          
          <div className="space-y-4">
            {filteredImports.map((importItem) => (
              <div key={importItem.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <FileText className="h-8 w-8 text-blue-600 mt-1" />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{importItem.fileName}</h4>
                        <Badge className={getStatusColor(importItem.status)}>
                          {getStatusIcon(importItem.status)}
                          <span className="ml-1">{importItem.status}</span>
                        </Badge>
                        {importItem.manifestId && (
                          <Badge variant="outline">
                            {importItem.manifestId}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">ERP System:</span> {importItem.erpSystem}
                        </div>
                        <div>
                          <span className="font-medium">External Ref:</span> {importItem.externalReference}
                        </div>
                        <div>
                          <span className="font-medium">File Size:</span> {importItem.fileSize}
                        </div>
                        <div>
                          <span className="font-medium">Imported By:</span> {importItem.importedBy}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-gray-600">Progress:</span>
                          <span className="ml-2 font-medium">
                            {importItem.recordsProcessed}/{importItem.recordsTotal} records
                          </span>
                          <span className="ml-2 text-gray-500">
                            ({getProgressPercentage(importItem.recordsProcessed, importItem.recordsTotal)}%)
                          </span>
                        </div>
                        
                        {importItem.errorCount > 0 && (
                          <div className="text-red-600">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            {importItem.errorCount} errors
                          </div>
                        )}
                        
                        <div className="text-gray-500">
                          {formatTimeAgo(importItem.importedAt)}
                        </div>
                        
                        {importItem.processingTime && (
                          <div className="text-gray-500">
                            Processed in {importItem.processingTime}
                          </div>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {importItem.status === 'processing' && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${getProgressPercentage(importItem.recordsProcessed, importItem.recordsTotal)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    {importItem.status === 'completed' && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    )}
                    {importItem.status === 'failed' && (
                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-600">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  Calendar,
  User,
  Database,
  FileText,
  Zap
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

interface SyncLog {
  id: string;
  timestamp: string;
  erpSystem: string;
  operation: 'import' | 'export' | 'sync' | 'test';
  status: 'success' | 'error' | 'warning' | 'info';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: string;
  duration?: number;
  recordsProcessed?: number;
  recordsTotal?: number;
  errorCount?: number;
  userId?: string;
  correlationId?: string;
  endpoint?: string;
  requestId?: string;
  stackTrace?: string;
}

interface LogFilter {
  search: string;
  system: string;
  operation: string;
  status: string;
  level: string;
  dateRange: string;
}

export default function SyncLogsViewer() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filter, setFilter] = useState<LogFilter>({
    search: '',
    system: 'all',
    operation: 'all',
    status: 'all',
    level: 'all',
    dateRange: 'today'
  });

  // Mock data
  useEffect(() => {
    const mockLogs: SyncLog[] = [
      {
        id: "1",
        timestamp: "2024-07-14T14:32:15Z",
        erpSystem: "SAP ERP Central",
        operation: "import",
        status: "success",
        level: "info",
        message: "Successfully imported 150 manifest records from SAP",
        details: "Batch import completed. All records processed without errors.",
        duration: 2.35,
        recordsProcessed: 150,
        recordsTotal: 150,
        errorCount: 0,
        userId: "system.integration",
        correlationId: "corr-2024-0001",
        endpoint: "/api/v1/manifests/import",
        requestId: "req-789123"
      },
      {
        id: "2",
        timestamp: "2024-07-14T14:15:42Z",
        erpSystem: "Oracle ERP Cloud",
        operation: "sync",
        status: "warning",
        level: "warn",
        message: "Sync completed with warnings - 3 records skipped due to validation errors",
        details: "Customer CUST-001 has invalid address format. Item SKU-789 missing weight data. Order ORD-456 has future ship date.",
        duration: 1.87,
        recordsProcessed: 72,
        recordsTotal: 75,
        errorCount: 3,
        userId: "john.doe",
        correlationId: "corr-2024-0002",
        endpoint: "/api/v1/orders/sync"
      },
      {
        id: "3",
        timestamp: "2024-07-14T13:45:18Z",
        erpSystem: "NetSuite",
        operation: "test",
        status: "error",
        level: "error",
        message: "Connection test failed - Authentication timeout",
        details: "Failed to authenticate with NetSuite API. Check credentials and network connectivity.",
        duration: 30.0,
        userId: "jane.smith",
        correlationId: "corr-2024-0003",
        endpoint: "/auth/token",
        stackTrace: "AuthenticationError: Timeout occurred during OAuth token exchange\n  at NetSuiteConnector.authenticate()\n  at ConnectionTest.run()"
      },
      {
        id: "4",
        timestamp: "2024-07-14T13:30:00Z",
        erpSystem: "SAP ERP Central",
        operation: "export",
        status: "success",
        level: "info",
        message: "Exported 45 shipment updates to SAP",
        details: "Shipment status updates sent successfully. All tracking numbers confirmed.",
        duration: 0.89,
        recordsProcessed: 45,
        recordsTotal: 45,
        errorCount: 0,
        userId: "automated.scheduler",
        correlationId: "corr-2024-0004",
        endpoint: "/api/v1/shipments/export"
      },
      {
        id: "5",
        timestamp: "2024-07-14T12:15:33Z",
        erpSystem: "Microsoft Dynamics",
        operation: "import",
        status: "error",
        level: "error",
        message: "Import failed due to data format mismatch",
        details: "Expected JSON format but received XML. Check endpoint configuration and data mapping.",
        duration: 0.12,
        recordsProcessed: 0,
        recordsTotal: 100,
        errorCount: 1,
        userId: "mike.johnson",
        correlationId: "corr-2024-0005",
        endpoint: "/api/v1/customers/import",
        stackTrace: "DataFormatError: Invalid content type 'application/xml' for JSON endpoint\n  at DataParser.parse()\n  at ImportService.process()"
      }
    ];

    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 1000);
  }, []);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      console.log("Auto-refreshing sync logs...");
      // In real app, this would fetch new logs
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'debug': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.message.toLowerCase().includes(filter.search.toLowerCase()) ||
      log.erpSystem.toLowerCase().includes(filter.search.toLowerCase()) ||
      log.correlationId?.toLowerCase().includes(filter.search.toLowerCase());
    
    const matchesSystem = filter.system === 'all' || log.erpSystem === filter.system;
    const matchesOperation = filter.operation === 'all' || log.operation === filter.operation;
    const matchesStatus = filter.status === 'all' || log.status === filter.status;
    const matchesLevel = filter.level === 'all' || log.level === filter.level;
    
    return matchesSearch && matchesSystem && matchesOperation && matchesStatus && matchesLevel;
  });

  const logStats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    errors: logs.filter(l => l.status === 'error').length,
    warnings: logs.filter(l => l.status === 'warning').length,
    averageDuration: logs.filter(l => l.duration).reduce((sum, l) => sum + (l.duration || 0), 0) / logs.filter(l => l.duration).length
  };

  const uniqueSystems = [...new Set(logs.map(l => l.erpSystem))];

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
              <p className="text-2xl font-bold text-gray-900">{logStats.total}</p>
              <p className="text-sm text-gray-600">Total Logs</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-600">{logStats.success}</p>
              <p className="text-sm text-gray-600">Success</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-600">{logStats.errors}</p>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Zap className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {logStats.averageDuration ? `${logStats.averageDuration.toFixed(2)}s` : 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Avg Duration</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Filter Logs</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-50 text-green-700" : ""}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          <Select value={filter.system} onValueChange={(value) => setFilter(prev => ({ ...prev, system: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="ERP System" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              {uniqueSystems.map((system) => (
                <SelectItem key={system} value={system}>{system}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter.operation} onValueChange={(value) => setFilter(prev => ({ ...prev, operation: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Operation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="sync">Sync</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter.level} onValueChange={(value) => setFilter(prev => ({ ...prev, level: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter.dateRange} onValueChange={(value) => setFilter(prev => ({ ...prev, dateRange: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sync Logs</h3>
            <p className="text-sm text-gray-600">{filteredLogs.length} logs</p>
          </div>
          
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedLog(log);
                  setShowDetails(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <Badge className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-medium text-gray-900">{log.message}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.operation}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Database className="h-3 w-3" />
                          <span>{log.erpSystem}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(log.timestamp)}</span>
                        </div>
                        {log.userId && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{log.userId}</span>
                          </div>
                        )}
                        {log.duration && (
                          <div className="flex items-center space-x-1">
                            <Zap className="h-3 w-3" />
                            <span>{log.duration}s</span>
                          </div>
                        )}
                      </div>
                      
                      {(log.recordsProcessed !== undefined || log.errorCount !== undefined) && (
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                          {log.recordsProcessed !== undefined && (
                            <span>
                              Records: {log.recordsProcessed}/{log.recordsTotal}
                            </span>
                          )}
                          {log.errorCount !== undefined && log.errorCount > 0 && (
                            <span className="text-red-600">
                              Errors: {log.errorCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>No logs found matching the current filters.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Log Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
                <Button variant="ghost" onClick={() => setShowDetails(false)}>
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(selectedLog.status)}
                        <Badge className={getStatusColor(selectedLog.status)}>
                          {selectedLog.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">ERP System</label>
                      <p className="text-gray-900">{selectedLog.erpSystem}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Operation</label>
                      <p className="text-gray-900">{selectedLog.operation}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Timestamp</label>
                      <p className="text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Duration</label>
                      <p className="text-gray-900">{selectedLog.duration ? `${selectedLog.duration}s` : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">User</label>
                      <p className="text-gray-900">{selectedLog.userId || 'System'}</p>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm font-medium text-gray-600">Message</label>
                  <p className="text-gray-900 mt-1">{selectedLog.message}</p>
                </div>

                {/* Details */}
                {selectedLog.details && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Details</label>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">{selectedLog.details}</p>
                  </div>
                )}

                {/* Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {selectedLog.correlationId && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Correlation ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedLog.correlationId}</p>
                      </div>
                    )}
                    {selectedLog.requestId && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Request ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedLog.requestId}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {selectedLog.endpoint && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Endpoint</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedLog.endpoint}</p>
                      </div>
                    )}
                    {selectedLog.recordsProcessed !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Records</label>
                        <p className="text-gray-900">
                          {selectedLog.recordsProcessed}/{selectedLog.recordsTotal} 
                          {selectedLog.errorCount ? ` (${selectedLog.errorCount} errors)` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedLog.stackTrace && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stack Trace</label>
                    <pre className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
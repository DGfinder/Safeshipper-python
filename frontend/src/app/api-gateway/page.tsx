"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import {
  Activity,
  Key,
  Shield,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Database,
  Zap,
  Lock,
  Unlock,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Filter,
  Search,
  Download,
  Upload,
  BarChart3,
  Globe,
  Server,
  Network,
  Monitor,
  AlertTriangle,
  Info,
  Users,
  Calendar,
  FileText,
  Code,
  Terminal,
  HelpCircle
} from "lucide-react";

// Mock data for API Gateway
const mockEndpoints = [
  {
    id: "1",
    path: "/api/v1/shipments",
    method: "GET",
    status: "active",
    requests: 1250,
    avgResponseTime: 145,
    errorRate: 0.2,
    rateLimit: 1000,
    lastAccess: "2 minutes ago"
  },
  {
    id: "2",
    path: "/api/v1/shipments",
    method: "POST",
    status: "active",
    requests: 340,
    avgResponseTime: 89,
    errorRate: 0.1,
    rateLimit: 500,
    lastAccess: "5 minutes ago"
  },
  {
    id: "3",
    path: "/api/v1/tracking",
    method: "GET",
    status: "active",
    requests: 2100,
    avgResponseTime: 72,
    errorRate: 0.05,
    rateLimit: 2000,
    lastAccess: "1 minute ago"
  },
  {
    id: "4",
    path: "/api/v1/fleet/status",
    method: "GET",
    status: "deprecated",
    requests: 45,
    avgResponseTime: 210,
    errorRate: 1.2,
    rateLimit: 100,
    lastAccess: "1 hour ago"
  }
];

const mockApiKeys = [
  {
    id: "1",
    name: "Production Web App",
    key: "sk_prod_1234567890abcdef",
    status: "active",
    permissions: ["read", "write"],
    lastUsed: "2 minutes ago",
    createdAt: "2024-01-15"
  },
  {
    id: "2",
    name: "Mobile App",
    key: "sk_prod_abcdef1234567890",
    status: "active",
    permissions: ["read"],
    lastUsed: "10 minutes ago",
    createdAt: "2024-01-10"
  },
  {
    id: "3",
    name: "Analytics Service",
    key: "sk_prod_9876543210fedcba",
    status: "revoked",
    permissions: ["read"],
    lastUsed: "3 days ago",
    createdAt: "2024-01-05"
  }
];

const mockRateLimits = [
  {
    id: "1",
    rule: "Global Rate Limit",
    limit: 10000,
    window: "1 hour",
    current: 7234,
    status: "active"
  },
  {
    id: "2",
    rule: "Auth Endpoints",
    limit: 100,
    window: "15 minutes",
    current: 23,
    status: "active"
  },
  {
    id: "3",
    rule: "Tracking API",
    limit: 5000,
    window: "1 hour",
    current: 3421,
    status: "active"
  }
];

export default function ApiGatewayPage() {
  const { loadTime } = usePerformanceMonitoring('ApiGatewayPage');
  const { isDark } = useTheme();
  const [selectedEndpoint, setSelectedEndpoint] = useState(mockEndpoints[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const filteredEndpoints = mockEndpoints.filter(endpoint => {
    const matchesSearch = endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.method.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || endpoint.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKey(showApiKey === keyId ? null : keyId);
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    // Could show toast notification here
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Gateway</h1>
              <p className="text-gray-600">
                Monitor and manage API endpoints, rate limits, and access controls
                {loadTime && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Loaded in {loadTime.toFixed(0)}ms)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Endpoint
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <div className="text-sm text-gray-600">Active Endpoints</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">127</div>
                <div className="text-sm text-green-600">+3 from last week</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div className="text-sm text-gray-600">Requests/Hour</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">15.2K</div>
                <div className="text-sm text-green-600">+12% from last hour</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div className="text-sm text-gray-600">Avg Response</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">89ms</div>
                <div className="text-sm text-red-600">+5ms from last hour</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <div className="text-sm text-gray-600">Error Rate</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">0.15%</div>
                <div className="text-sm text-green-600">-0.05% from last hour</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="endpoints" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="endpoints" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Endpoints
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="ratelimits" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Rate Limits
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Endpoints Tab */}
            <TabsContent value="endpoints" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search endpoints..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4">
                {filteredEndpoints.map((endpoint) => (
                  <Card key={endpoint.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={endpoint.method === "GET" ? "default" : endpoint.method === "POST" ? "secondary" : "outline"}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{endpoint.path}</code>
                          <Badge variant={endpoint.status === "active" ? "default" : "destructive"}>
                            {endpoint.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Requests</div>
                          <div className="font-semibold">{endpoint.requests.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Avg Response</div>
                          <div className="font-semibold">{endpoint.avgResponseTime}ms</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Error Rate</div>
                          <div className="font-semibold">{endpoint.errorRate}%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Last Access</div>
                          <div className="font-semibold">{endpoint.lastAccess}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="apikeys" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">API Keys</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </div>

              <div className="grid gap-4">
                {mockApiKeys.map((apiKey) => (
                  <Card key={apiKey.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-semibold">{apiKey.name}</div>
                            <div className="text-sm text-gray-600">Created {apiKey.createdAt}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={apiKey.status === "active" ? "default" : "destructive"}>
                            {apiKey.status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => toggleApiKeyVisibility(apiKey.id)}>
                            {showApiKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => copyApiKey(apiKey.key)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                            {showApiKey === apiKey.id ? apiKey.key : `${apiKey.key.substring(0, 16)}...`}
                          </code>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div>Permissions: {apiKey.permissions.join(", ")}</div>
                          <div>Last used: {apiKey.lastUsed}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Rate Limits Tab */}
            <TabsContent value="ratelimits" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Rate Limiting Rules</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>

              <div className="grid gap-4">
                {mockRateLimits.map((rateLimit) => (
                  <Card key={rateLimit.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Zap className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-semibold">{rateLimit.rule}</div>
                            <div className="text-sm text-gray-600">
                              {rateLimit.limit.toLocaleString()} requests per {rateLimit.window}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rateLimit.status === "active" ? "default" : "destructive"}>
                            {rateLimit.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Usage</span>
                          <span>{rateLimit.current.toLocaleString()} / {rateLimit.limit.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(rateLimit.current / rateLimit.limit) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Request Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Request volume chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Response Times
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Response time chart would go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Error Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">4xx Errors</span>
                        <span className="text-sm font-semibold">0.12%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">5xx Errors</span>
                        <span className="text-sm font-semibold">0.03%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Timeouts</span>
                        <span className="text-sm font-semibold">0.01%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Top Consumers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {["Web Application", "Mobile App", "Analytics Service", "External Integration"].map((consumer, index) => (
                        <div key={consumer} className="flex items-center justify-between">
                          <span className="text-sm">{consumer}</span>
                          <span className="text-sm font-semibold">{(100 - index * 20).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </DashboardLayout>
  );
}
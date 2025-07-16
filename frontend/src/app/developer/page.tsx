"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Code2,
  Book,
  Key,
  Zap,
  Activity,
  Globe,
  Shield,
  CheckCircle,
  Copy,
  ExternalLink,
  Search,
  Play,
  Download,
  Settings,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  FileText,
  Terminal,
  Layers,
  Package,
  Truck,
  MapPin
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  category: string;
  authentication: boolean;
  rateLimit: string;
  responseTime: string;
  availability: number;
}

interface APIKey {
  id: string;
  name: string;
  type: 'production' | 'sandbox' | 'development';
  environment: string;
  created: string;
  lastUsed: string;
  status: 'active' | 'inactive' | 'revoked';
  permissions: string[];
  usageLimit: number;
  usageCount: number;
}

interface CodeSample {
  language: string;
  code: string;
}

interface WebhookEvent {
  event: string;
  description: string;
  payload: object;
}

export default function DeveloperPortalPage() {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    const mockEndpoints: APIEndpoint[] = [
      {
        id: "1",
        method: "POST",
        path: "/api/v1/shipments",
        summary: "Create a new shipment",
        description: "Creates a new shipment with package details, origin, destination, and service options.",
        category: "Shipments",
        authentication: true,
        rateLimit: "100 req/min",
        responseTime: "150ms",
        availability: 99.9
      },
      {
        id: "2",
        method: "GET",
        path: "/api/v1/shipments/{id}",
        summary: "Get shipment details",
        description: "Retrieves detailed information about a specific shipment including current status and tracking history.",
        category: "Shipments",
        authentication: true,
        rateLimit: "200 req/min",
        responseTime: "85ms",
        availability: 99.95
      },
      {
        id: "3",
        method: "GET",
        path: "/api/v1/shipments/{id}/track",
        summary: "Track shipment",
        description: "Get real-time tracking information for a shipment including current location and estimated delivery.",
        category: "Tracking",
        authentication: false,
        rateLimit: "500 req/min",
        responseTime: "120ms",
        availability: 99.8
      },
      {
        id: "4",
        method: "POST",
        path: "/api/v1/quotes",
        summary: "Get shipping quote",
        description: "Calculate shipping costs and delivery estimates for a potential shipment.",
        category: "Quotes",
        authentication: true,
        rateLimit: "50 req/min",
        responseTime: "200ms",
        availability: 99.7
      },
      {
        id: "5",
        method: "GET",
        path: "/api/v1/customers/{id}",
        summary: "Get customer information",
        description: "Retrieve customer details including shipping addresses and preferences.",
        category: "Customers",
        authentication: true,
        rateLimit: "100 req/min",
        responseTime: "95ms",
        availability: 99.9
      },
      {
        id: "6",
        method: "POST",
        path: "/api/v1/webhooks",
        summary: "Create webhook",
        description: "Register a webhook endpoint to receive real-time shipment status updates.",
        category: "Webhooks",
        authentication: true,
        rateLimit: "10 req/min",
        responseTime: "180ms",
        availability: 99.5
      }
    ];

    const mockAPIKeys: APIKey[] = [
      {
        id: "1",
        name: "Production API Key",
        type: "production",
        environment: "production",
        created: "2024-01-15",
        lastUsed: "2024-07-14T14:30:00Z",
        status: "active",
        permissions: ["shipments:read", "shipments:write", "tracking:read", "quotes:read"],
        usageLimit: 10000,
        usageCount: 2847
      },
      {
        id: "2",
        name: "Development Key",
        type: "development",
        environment: "sandbox",
        created: "2024-06-01",
        lastUsed: "2024-07-14T12:15:00Z",
        status: "active",
        permissions: ["shipments:read", "tracking:read"],
        usageLimit: 1000,
        usageCount: 156
      },
      {
        id: "3",
        name: "Legacy Integration",
        type: "production",
        environment: "production",
        created: "2023-11-20",
        lastUsed: "2024-06-30T09:45:00Z",
        status: "inactive",
        permissions: ["quotes:read"],
        usageLimit: 5000,
        usageCount: 4892
      }
    ];

    setTimeout(() => {
      setEndpoints(mockEndpoints);
      setAPIKeys(mockAPIKeys);
      setLoading(false);
    }, 1000);
  }, []);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'production': return 'bg-red-100 text-red-800';
      case 'sandbox': return 'bg-yellow-100 text-yellow-800';
      case 'development': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = ["all", ...Array.from(new Set(endpoints.map(e => e.category)))];
  
  const filteredEndpoints = endpoints.filter((endpoint) => {
    const matchesSearch = 
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || endpoint.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const codeSamples: { [key: string]: CodeSample[] } = {
    "create-shipment": [
      {
        language: "curl",
        code: `curl -X POST "https://api.safeshipper.com/v1/shipments" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": {
      "address": "123 Main St",
      "city": "Toronto",
      "province": "ON",
      "postal_code": "M5V 3A8"
    },
    "destination": {
      "address": "456 Oak Ave",
      "city": "Vancouver",
      "province": "BC", 
      "postal_code": "V6B 1A1"
    },
    "packages": [{
      "weight": 2.5,
      "dimensions": {
        "length": 30,
        "width": 20,
        "height": 15
      }
    }],
    "service_type": "express"
  }'`
      },
      {
        language: "javascript",
        code: `const response = await fetch('https://api.safeshipper.com/v1/shipments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    origin: {
      address: '123 Main St',
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M5V 3A8'
    },
    destination: {
      address: '456 Oak Ave',
      city: 'Vancouver',
      province: 'BC',
      postal_code: 'V6B 1A1'
    },
    packages: [{
      weight: 2.5,
      dimensions: {
        length: 30,
        width: 20,
        height: 15
      }
    }],
    service_type: 'express'
  })
});

const shipment = await response.json();`
      },
      {
        language: "python",
        code: `import requests

url = "https://api.safeshipper.com/v1/shipments"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

data = {
    "origin": {
        "address": "123 Main St",
        "city": "Toronto",
        "province": "ON",
        "postal_code": "M5V 3A8"
    },
    "destination": {
        "address": "456 Oak Ave",
        "city": "Vancouver",
        "province": "BC",
        "postal_code": "V6B 1A1"
    },
    "packages": [{
        "weight": 2.5,
        "dimensions": {
            "length": 30,
            "width": 20,
            "height": 15
        }
    }],
    "service_type": "express"
}

response = requests.post(url, headers=headers, json=data)
shipment = response.json()`
      }
    ]
  };

  const webhookEvents: WebhookEvent[] = [
    {
      event: "shipment.created",
      description: "Triggered when a new shipment is created",
      payload: {
        event_type: "shipment.created",
        shipment_id: "SS-2024-001234",
        timestamp: "2024-07-14T15:30:00Z",
        data: {
          tracking_number: "SS-2024-001234",
          status: "created",
          origin: "Toronto, ON",
          destination: "Vancouver, BC"
        }
      }
    },
    {
      event: "shipment.status_updated",
      description: "Triggered when shipment status changes",
      payload: {
        event_type: "shipment.status_updated",
        shipment_id: "SS-2024-001234",
        timestamp: "2024-07-14T16:45:00Z",
        data: {
          tracking_number: "SS-2024-001234",
          previous_status: "created",
          current_status: "in_transit",
          location: "Distribution Center Toronto"
        }
      }
    },
    {
      event: "shipment.delivered",
      description: "Triggered when shipment is delivered",
      payload: {
        event_type: "shipment.delivered",
        shipment_id: "SS-2024-001234",
        timestamp: "2024-07-16T09:15:00Z",
        data: {
          tracking_number: "SS-2024-001234",
          status: "delivered",
          delivered_at: "2024-07-16T09:15:00Z",
          recipient: "John Smith"
        }
      }
    }
  ];

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Code2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1>
                  <p className="text-gray-600">APIs, documentation, and tools for developers</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  OpenAPI Spec
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Key className="h-4 w-4 mr-2" />
                  Get API Key
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">API Endpoints</p>
                    <p className="text-3xl font-bold text-indigo-600">{endpoints.length}</p>
                  </div>
                  <Globe className="h-8 w-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Uptime</p>
                    <p className="text-3xl font-bold text-green-600">99.9%</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response</p>
                    <p className="text-3xl font-bold text-blue-600">125ms</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Keys</p>
                    <p className="text-3xl font-bold text-purple-600">{apiKeys.filter(k => k.status === 'active').length}</p>
                  </div>
                  <Key className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="endpoints" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="endpoints">API Reference</TabsTrigger>
              <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
              <TabsTrigger value="keys">API Keys</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="sdks">SDKs & Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>API Endpoints</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search endpoints..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category === "all" ? "All Categories" : category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredEndpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedEndpoint(endpoint)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <Badge className={getMethodColor(endpoint.method)}>
                              {endpoint.method}
                            </Badge>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <code className="font-mono text-sm font-medium">{endpoint.path}</code>
                                <Badge variant="outline">{endpoint.category}</Badge>
                                {endpoint.authentication && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                                    <Key className="h-3 w-3 mr-1" />
                                    Auth Required
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-gray-600 text-sm mb-2">{endpoint.summary}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{endpoint.responseTime}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Shield className="h-3 w-3" />
                                  <span>{endpoint.rateLimit}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Activity className="h-3 w-3" />
                                  <span>{endpoint.availability}% uptime</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Try It
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quickstart" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Book className="h-5 w-5" />
                      <span>Getting Started</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-medium">1</div>
                        <div>
                          <h4 className="font-medium">Get Your API Key</h4>
                          <p className="text-sm text-gray-600">Sign up and generate your API key from the API Keys tab.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-medium">2</div>
                        <div>
                          <h4 className="font-medium">Make Your First Request</h4>
                          <p className="text-sm text-gray-600">Use our API to create a shipment or get a quote.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-medium">3</div>
                        <div>
                          <h4 className="font-medium">Set Up Webhooks</h4>
                          <p className="text-sm text-gray-600">Configure webhooks to receive real-time updates.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-medium">4</div>
                        <div>
                          <h4 className="font-medium">Go Live</h4>
                          <p className="text-sm text-gray-600">Switch to production and start shipping!</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Create Your First Shipment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Example Request</h4>
                        <div className="bg-gray-900 text-white p-4 rounded-lg text-sm font-mono overflow-x-auto">
                          <pre>{codeSamples["create-shipment"]?.[0]?.code}</pre>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Try in Console
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="keys" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>API Keys</CardTitle>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Key className="h-4 w-4 mr-2" />
                      Create New Key
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold">{key.name}</h3>
                              <Badge className={getStatusColor(key.status)}>
                                {key.status}
                              </Badge>
                              <Badge className={getTypeColor(key.type)}>
                                {key.type}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="font-medium">Environment:</span> {key.environment}
                              </div>
                              <div>
                                <span className="font-medium">Created:</span> {key.created}
                              </div>
                              <div>
                                <span className="font-medium">Last Used:</span> {formatTimeAgo(key.lastUsed)}
                              </div>
                              <div>
                                <span className="font-medium">Usage:</span> {key.usageCount.toLocaleString()}/{key.usageLimit.toLocaleString()}
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <span className="text-sm font-medium text-gray-600">Permissions:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {key.permissions.map((permission) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {permission}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(key.usageCount / key.usageLimit) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Webhook Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {webhookEvents.map((event) => (
                        <div key={event.event} className="border rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <code className="font-mono text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                              {event.event}
                            </code>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                          <details className="text-sm">
                            <summary className="cursor-pointer font-medium">Example Payload</summary>
                            <div className="mt-2 bg-gray-900 text-white p-3 rounded text-xs font-mono overflow-x-auto">
                              <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Webhook Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Configure Webhook Endpoint</h4>
                      <div className="space-y-3">
                        <Input placeholder="https://your-api.com/webhooks/safeshipper" />
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Events to Subscribe:</label>
                          <div className="space-y-1">
                            {webhookEvents.map((event) => (
                              <label key={event.event} className="flex items-center space-x-2">
                                <input type="checkbox" className="rounded" />
                                <span className="text-sm">{event.event}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <Button className="w-full">
                          Create Webhook
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Webhook Security</p>
                          <p className="text-sm text-blue-700 mt-1">
                            All webhook payloads are signed with HMAC-SHA256. Verify the signature using the webhook secret.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sdks" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Terminal className="h-5 w-5" />
                      <span>JavaScript/Node.js</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-900 text-white p-3 rounded text-sm font-mono">
                        npm install safeshipper-sdk
                      </div>
                      <p className="text-sm text-gray-600">
                        Official SDK for JavaScript and Node.js applications.
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          GitHub
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Terminal className="h-5 w-5" />
                      <span>Python</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-900 text-white p-3 rounded text-sm font-mono">
                        pip install safeshipper
                      </div>
                      <p className="text-sm text-gray-600">
                        Python SDK with full API coverage and async support.
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          PyPI
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Terminal className="h-5 w-5" />
                      <span>PHP</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-900 text-white p-3 rounded text-sm font-mono">
                        composer require safeshipper/sdk
                      </div>
                      <p className="text-sm text-gray-600">
                        PHP SDK compatible with Laravel and other frameworks.
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Packagist
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Layers className="h-5 w-5" />
                      <span>Postman Collection</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Complete Postman collection with all API endpoints and examples.
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-1" />
                        Import to Postman
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>OpenAPI Spec</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        OpenAPI 3.0 specification for code generation and documentation.
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-1" />
                        Download YAML
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Community</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Join our developer community for support and updates.
                      </p>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Discord Server
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          GitHub Discussions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}
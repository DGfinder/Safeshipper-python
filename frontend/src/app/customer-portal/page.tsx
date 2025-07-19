"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  Bell,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  Phone,
  Mail,
  Settings,
  RefreshCw,
  Shield,
  Award,
  BarChart3,
  Building2,
  Archive,
  Beaker,
  ClipboardCheck
} from "lucide-react";
import { CustomerAuthGuard } from "@/shared/components/auth/customer-auth-guard";
import { useCustomerProfile, useCustomerAccess, useCustomerCompliance } from "@/shared/hooks/useCustomerProfile";
import { useCustomerDocuments } from "@/shared/hooks/useCustomerDocuments";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import { DemoIndicator, ApiStatusIndicator } from "@/shared/components/ui/demo-indicator";
import { customerApiService } from "@/shared/services/customerApiService";
import { getEnvironmentConfig } from "@/shared/config/environment";
import { MobileNavWrapper } from "@/shared/components/layout/mobile-bottom-nav";
import { useTheme } from "@/shared/services/ThemeContext";
import { useAccessibility } from "@/shared/services/AccessibilityContext";
import { AdvancedTracking } from "@/shared/components/customer/advanced-tracking";
import { FloatingActionButton } from "@/shared/components/ui/floating-action-button";
import { toast } from "react-hot-toast";

interface CustomerShipment {
  id: string;
  trackingNumber: string;
  externalReference: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'exception';
  origin: string;
  destination: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  packages: number;
  weight: number;
  value: number;
  serviceType: string;
  lastUpdate: string;
  hasHazmat: boolean;
  customerNotes?: string;
}

interface ServiceRequest {
  id: string;
  type: 'quote' | 'pickup' | 'delivery' | 'complaint' | 'general';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  responses: number;
}

interface CustomerNotification {
  id: string;
  type: 'shipment' | 'delivery' | 'delay' | 'system' | 'promotional';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export default function CustomerPortalPage() {
  const [shipments, setShipments] = useState<CustomerShipment[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null);
  const [showAdvancedTracking, setShowAdvancedTracking] = useState(false);
  
  const { isDark } = useTheme();
  const { preferences } = useAccessibility();
  const { data: customerAccess } = useCustomerAccess();
  const { data: customerProfile } = useCustomerProfile(customerAccess?.customerId || "");
  const { data: complianceProfile } = useCustomerCompliance(customerAccess?.customerId || "");
  const { data: documents } = useCustomerDocuments();
  const config = getEnvironmentConfig();
  const [apiStatus, setApiStatus] = useState(customerApiService.getApiStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(customerApiService.getApiStatus());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load real customer data and shipments
  useEffect(() => {
    if (customerProfile) {
      // Get customer's actual shipments from simulated data service
      const customerShipments = simulatedDataService.getCustomerShipments(customerProfile.name);
      
      const transformedShipments: CustomerShipment[] = customerShipments.map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        externalReference: `REF-${shipment.id.slice(-6)}`,
        status: shipment.status.toLowerCase().replace('_', '_') as any,
        origin: shipment.route.split(' → ')[0],
        destination: shipment.route.split(' → ')[1],
        estimatedDelivery: shipment.estimatedDelivery,
        packages: Math.floor(Math.random() * 5) + 1,
        weight: parseFloat(shipment.weight.replace(/[^0-9.]/g, '')),
        value: Math.floor(Math.random() * 5000) + 1000,
        serviceType: shipment.dangerousGoods?.length > 0 ? "Dangerous Goods" : "Standard",
        lastUpdate: shipment.createdAt,
        hasHazmat: shipment.dangerousGoods?.length > 0,
        customerNotes: shipment.dangerousGoods?.length > 0 ? "Dangerous goods shipment - special handling required" : undefined
      }));
      
      setShipments(transformedShipments);
    } else {
      // Fallback mock data for demo
      const mockShipments: CustomerShipment[] = [
      {
        id: "1",
        trackingNumber: "SS-2024-001234",
        externalReference: "PO-789123",
        status: "in_transit",
        origin: "Toronto, ON",
        destination: "Vancouver, BC",
        estimatedDelivery: "2024-07-16T09:00:00Z",
        packages: 3,
        weight: 125.5,
        value: 2500,
        serviceType: "Express",
        lastUpdate: "2024-07-14T14:30:00Z",
        hasHazmat: false,
        customerNotes: "Fragile items - handle with care"
      },
      {
        id: "2",
        trackingNumber: "SS-2024-001235",
        externalReference: "PO-789124",
        status: "delivered",
        origin: "Montreal, QC",
        destination: "Calgary, AB",
        estimatedDelivery: "2024-07-13T17:00:00Z",
        actualDelivery: "2024-07-13T15:45:00Z",
        packages: 1,
        weight: 45.2,
        value: 850,
        serviceType: "Standard",
        lastUpdate: "2024-07-13T15:45:00Z",
        hasHazmat: true
      },
      {
        id: "3",
        trackingNumber: "SS-2024-001236",
        externalReference: "PO-789125",
        status: "delayed",
        origin: "Vancouver, BC",
        destination: "Halifax, NS",
        estimatedDelivery: "2024-07-15T12:00:00Z",
        packages: 2,
        weight: 78.9,
        value: 1200,
        serviceType: "Standard",
        lastUpdate: "2024-07-14T12:15:00Z",
        hasHazmat: false,
        customerNotes: "Weather delay - updated ETA available"
      }
    ];

    const mockRequests: ServiceRequest[] = [
      {
        id: "1",
        type: "quote",
        subject: "Bulk Shipment Quote Request",
        description: "Need quote for 50+ packages from Toronto to multiple western cities",
        status: "in_progress",
        priority: "medium",
        createdAt: "2024-07-14T09:00:00Z",
        updatedAt: "2024-07-14T11:30:00Z",
        assignedTo: "Sales Team",
        responses: 2
      },
      {
        id: "2",
        type: "pickup",
        subject: "Emergency Pickup Request",
        description: "Urgent pickup needed for time-sensitive materials",
        status: "resolved",
        priority: "urgent",
        createdAt: "2024-07-13T14:00:00Z",
        updatedAt: "2024-07-13T16:45:00Z",
        assignedTo: "Operations",
        responses: 5
      }
    ];

    const mockNotifications: CustomerNotification[] = [
      {
        id: "1",
        type: "delivery",
        title: "Package Delivered Successfully",
        message: "Your shipment SS-2024-001235 has been delivered to Calgary, AB",
        timestamp: "2024-07-13T15:45:00Z",
        read: false,
        actionUrl: "/customer-portal/track/SS-2024-001235",
        severity: "success"
      },
      {
        id: "2",
        type: "delay",
        title: "Shipment Delayed",
        message: "SS-2024-001236 is delayed due to weather conditions. New ETA: July 16th",
        timestamp: "2024-07-14T12:15:00Z",
        read: false,
        actionUrl: "/customer-portal/track/SS-2024-001236",
        severity: "warning"
      },
      {
        id: "3",
        type: "system",
        title: "Maintenance Window Scheduled",
        message: "Portal maintenance scheduled for July 15th, 2-4 AM EST",
        timestamp: "2024-07-12T10:00:00Z",
        read: true,
        severity: "info"
      }
    ];

    setTimeout(() => {
      if (!customerProfile) {
        setShipments(mockShipments);
      }
      setRequests(mockRequests);
      setNotifications(mockNotifications);
      setLoading(false);
    }, 1000);
    }
  }, [customerProfile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'delayed': return 'bg-yellow-100 text-yellow-800';
      case 'exception': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delayed': return <Clock className="h-4 w-4" />;
      case 'exception': return <AlertTriangle className="h-4 w-4" />;
      case 'pending': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch = 
      shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.externalReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const activeShipments = shipments.filter(s => s.status === 'in_transit' || s.status === 'pending').length;
  const openRequests = requests.filter(r => r.status === 'open' || r.status === 'in_progress').length;

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

  const handleNewRequest = () => {
    toast.success('Request form would open here');
  };

  const handleTrackShipment = (trackingNumber: string) => {
    setSelectedShipment(trackingNumber);
    setShowAdvancedTracking(true);
  };

  if (showAdvancedTracking && selectedShipment) {
    return (
      <CustomerAuthGuard>
        <MobileNavWrapper>
          <div className="min-h-screen bg-surface-background">
            <AdvancedTracking
              trackingNumber={selectedShipment}
              onClose={() => {
                setShowAdvancedTracking(false);
                setSelectedShipment(null);
              }}
            />
          </div>
        </MobileNavWrapper>
      </CustomerAuthGuard>
    );
  }

  return (
    <CustomerAuthGuard>
      <MobileNavWrapper 
        showFAB={true} 
        fabVariant="expandable"
        fabAction={handleNewRequest}
        fabLabel="New Request"
      >
        <div className="min-h-screen bg-surface-background">
          {/* Header */}
          <div className="bg-surface-card border-b border-surface-border">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-surface-foreground">Customer Portal</h1>
                  <p className="text-neutral-600 dark:text-neutral-400">Welcome back! Track shipments and manage your account.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button className="bg-primary-600 hover:bg-primary-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </div>
              </div>
            </div>
          </div>

        <div className="px-6 py-6">
          {/* Demo Indicator */}
          {(config.apiMode === "demo" || config.enableTerryMode) && (
            <div className="mb-6 space-y-2">
              <DemoIndicator 
                type={config.apiMode === "demo" ? "demo" : apiStatus.connected ? "live" : "hybrid"} 
                label={`Customer Portal - ${config.apiMode.toUpperCase()} Mode`}
                size="md"
              />
              <ApiStatusIndicator 
                isConnected={apiStatus.connected}
                lastUpdate={apiStatus.lastCheck}
              />
            </div>
          )}

          {/* Customer Profile Overview */}
          {customerProfile && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{customerProfile.name}</h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          {customerProfile.tier} Tier
                        </span>
                        <span>•</span>
                        <span>{customerProfile.category}</span>
                        <span>•</span>
                        <span>{customerProfile.totalShipments} Total Shipments</span>
                      </div>
                    </div>
                  </div>
                  {complianceProfile && (
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-lg font-bold text-green-600">{complianceProfile.complianceRate}%</span>
                      </div>
                      <p className="text-sm text-gray-600">Compliance Rate</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Shipments</p>
                    <p className="text-3xl font-bold text-blue-600">{activeShipments}</p>
                  </div>
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Open Requests</p>
                    <p className="text-3xl font-bold text-orange-600">{openRequests}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Notifications</p>
                    <p className="text-3xl font-bold text-purple-600">{unreadNotifications}</p>
                  </div>
                  <Bell className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {complianceProfile && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Safety Rating</p>
                      <p className="text-3xl font-bold text-green-600">{complianceProfile.safetyRating}/5.0</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <Tabs defaultValue="shipments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="shipments">My Shipments</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="shipments" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Shipments</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search shipments..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="delayed">Delayed</option>
                        <option value="exception">Exception</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredShipments.map((shipment) => (
                      <div key={shipment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              {getStatusIcon(shipment.status)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-lg">{shipment.trackingNumber}</h3>
                                <Badge className={getStatusColor(shipment.status)}>
                                  {shipment.status.replace('_', ' ')}
                                </Badge>
                                {shipment.hasHazmat && (
                                  <Badge variant="outline" className="text-red-600 border-red-600">
                                    HAZMAT
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                                <div>
                                  <span className="font-medium">From:</span> {shipment.origin}
                                </div>
                                <div>
                                  <span className="font-medium">To:</span> {shipment.destination}
                                </div>
                                <div>
                                  <span className="font-medium">Service:</span> {shipment.serviceType}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Packages:</span> {shipment.packages}
                                </div>
                                <div>
                                  <span className="font-medium">Weight:</span> {shipment.weight} kg
                                </div>
                                <div>
                                  <span className="font-medium">ETA:</span> {formatDate(shipment.estimatedDelivery)}
                                </div>
                              </div>
                              
                              {shipment.customerNotes && (
                                <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                  <strong>Note:</strong> {shipment.customerNotes}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleTrackShipment(shipment.trackingNumber)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Track
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Documents
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              {complianceProfile ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Compliance Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Compliance Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{complianceProfile.complianceRate}%</div>
                          <div className="text-sm text-gray-600">Compliance Rate</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{complianceProfile.safetyRating}/5.0</div>
                          <div className="text-sm text-gray-600">Safety Rating</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Shipments:</span>
                          <span className="font-medium ml-2">{complianceProfile.totalShipments}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">DG Shipments:</span>
                          <span className="font-medium ml-2">{complianceProfile.dgShipments}</span>
                        </div>
                      </div>
                      
                      {complianceProfile.violations.length > 0 && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">{complianceProfile.violations.length} Open Violations</span>
                          </div>
                          <p className="text-sm text-yellow-700 mt-1">Please review and address compliance issues</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dangerous Goods Authorizations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        DG Authorizations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {complianceProfile.authorizedGoods.slice(0, 5).map((dg: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">UN{dg.unNumber}</div>
                              <div className="text-sm text-gray-600">{dg.properShippingName}</div>
                              <div className="text-xs text-blue-600">Class {dg.hazardClass}</div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                              <div className="text-xs text-gray-500 mt-1">Until {new Date(dg.authorizedUntil).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ))}
                        
                        {complianceProfile.authorizedGoods.length > 5 && (
                          <div className="text-center">
                            <Button variant="outline" size="sm">
                              View All ({complianceProfile.authorizedGoods.length}) Authorizations
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Violations */}
                  {complianceProfile.violations.length > 0 && (
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          Compliance Violations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {complianceProfile.violations.map((violation: any) => (
                            <div key={violation.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge className={
                                    violation.severity === 'High' ? 'bg-red-100 text-red-800' :
                                    violation.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }>
                                    {violation.severity}
                                  </Badge>
                                  <Badge className={
                                    violation.status === 'Open' ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                  }>
                                    {violation.status}
                                  </Badge>
                                </div>
                                <h4 className="font-medium">{violation.type}</h4>
                                <p className="text-sm text-gray-600">{violation.description}</p>
                                <p className="text-xs text-gray-500 mt-1">Shipment: {violation.shipmentId}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">{new Date(violation.date).toLocaleDateString()}</div>
                                <Button variant="outline" size="sm" className="mt-2">
                                  View Details
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Data Loading</h3>
                    <p className="text-gray-600">
                      Your compliance profile and safety metrics are being loaded.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Document Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Archive className="h-5 w-5" />
                      Document Library
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{documents?.length || 0}</div>
                        <div className="text-sm text-gray-600">Total Documents</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {documents?.filter(d => d.category === 'safety').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">Safety Docs</div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Button className="w-full" onClick={() => window.location.href = '/customer-portal/documents'}>
                        <Archive className="h-4 w-4 mr-2" />
                        View All Documents
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Documents */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Recent Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {documents?.slice(0, 5).map((document) => (
                        <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded">
                              {document.type === 'sds' && <Beaker className="h-4 w-4 text-orange-600" />}
                              {document.type === 'compliance_certificate' && <Award className="h-4 w-4 text-green-600" />}
                              {document.type === 'inspection_report' && <ClipboardCheck className="h-4 w-4 text-blue-600" />}
                              {!['sds', 'compliance_certificate', 'inspection_report'].includes(document.type) && 
                                <FileText className="h-4 w-4 text-gray-600" />}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{document.title}</div>
                              <div className="text-xs text-gray-600">{document.fileName}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={{
                                  'safety': 'bg-orange-100 text-orange-800',
                                  'compliance': 'bg-green-100 text-green-800',
                                  'operational': 'bg-blue-100 text-blue-800',
                                  'financial': 'bg-purple-100 text-purple-800'
                                }[document.category]}>
                                  {document.category}
                                </Badge>
                                {document.metadata.unNumber && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                                    UN{document.metadata.unNumber}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8">
                          <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No documents available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold">{request.subject}</h3>
                              <Badge className={
                                request.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {request.status.replace('_', ' ')}
                              </Badge>
                              <Badge className={
                                request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {request.priority}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-2">{request.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Created: {formatTimeAgo(request.createdAt)}</span>
                              <span>Updated: {formatTimeAgo(request.updatedAt)}</span>
                              <span>Responses: {request.responses}</span>
                              {request.assignedTo && <span>Assigned: {request.assignedTo}</span>}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border rounded-lg p-4 ${
                          !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Badge className={getSeverityColor(notification.severity)}>
                            {notification.type}
                          </Badge>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{notification.title}</h4>
                            <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-2">{formatTimeAgo(notification.timestamp)}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {customerProfile ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Company Name</label>
                          <p className="text-gray-900">{customerProfile.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Account Number</label>
                          <p className="text-gray-900">{customerProfile.id}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <p className="text-gray-900">{customerProfile.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phone</label>
                          <p className="text-gray-900">{customerProfile.phone}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Address</label>
                          <p className="text-gray-900">{customerProfile.address}</p>
                          <p className="text-gray-900">{customerProfile.city}, {customerProfile.state} {customerProfile.country}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Customer Tier</label>
                          <Badge className={({
                            'PLATINUM': 'bg-purple-100 text-purple-800',
                            'GOLD': 'bg-yellow-100 text-yellow-800',
                            'SILVER': 'bg-gray-100 text-gray-800',
                            'BRONZE': 'bg-orange-100 text-orange-800'
                          } as any)[customerProfile.tier] || 'bg-gray-100 text-gray-800'}>
                            {customerProfile.tier}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Company Name</label>
                          <p className="text-gray-900">Demo Company Ltd</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Account Number</label>
                          <p className="text-gray-900">CUST-001</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Primary Contact</label>
                          <p className="text-gray-900">John Doe</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <p className="text-gray-900">john@democompany.com</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phone</label>
                          <p className="text-gray-900">+1-555-0123</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Request Quote
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Pickup
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      View Invoices
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </MobileNavWrapper>
    </CustomerAuthGuard>
  );
}
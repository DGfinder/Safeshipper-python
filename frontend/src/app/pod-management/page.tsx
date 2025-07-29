"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import {
  FileCheck,
  Camera,
  Search,  
  Download,
  RefreshCw,
  Eye,
  MapPin,
  User,
  Calendar,
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Image,
  Signature,
  Navigation,
  Phone,
  Mail,
  Archive,
  Filter,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Shield,
  AlertCircle,
  Info,
  Zap,
  Activity
} from "lucide-react";

// Mock data for PODs
const mockPODs = [
  {
    id: "pod_001",
    shipment: {
      id: "shp_456",
      tracking_number: "SS2024001234",
      customer_name: "Acme Chemicals Ltd",
      status: "DELIVERED"
    },
    delivered_by: {
      id: "drv_123",
      name: "John Smith",
      email: "john.smith@safeshipper.com",
      phone: "+61 412 345 678"
    },
    recipient_name: "Sarah Johnson",
    delivery_location: "Loading Dock B, 123 Industrial Ave, Melbourne VIC",
    delivered_at: "2024-01-15T14:30:00Z",
    delivery_notes: "Customer requested delivery to rear loading dock. All safety protocols followed.",
    photos: [
      {
        id: "photo_001",
        image_url: "/api/photos/delivery_001.jpg",
        thumbnail_url: "/api/photos/thumb_delivery_001.jpg",
        file_name: "delivery_proof_001.jpg",
        file_size_mb: 2.3,
        caption: "Packages delivered to loading dock",
        taken_at: "2024-01-15T14:25:00Z"
      },
      {
        id: "photo_002", 
        image_url: "/api/photos/delivery_002.jpg",
        thumbnail_url: "/api/photos/thumb_delivery_002.jpg",
        file_name: "delivery_proof_002.jpg",
        file_size_mb: 1.8,
        caption: "Hazard labels clearly visible",
        taken_at: "2024-01-15T14:28:00Z"
      }
    ],
    signature_url: "/api/signatures/sig_001.png",
    photo_count: 2,
    processing_summary: {
      total_photos: 2,
      signature_captured: true,
      shipment_status_updated: true,
      notifications_triggered: true
    },
    validation_warnings: [],
    created_at: "2024-01-15T14:35:00Z"
  },
  {
    id: "pod_002",
    shipment: {
      id: "shp_789",
      tracking_number: "SS2024001235",
      customer_name: "Industrial Solutions Pty",
      status: "DELIVERED"
    },
    delivered_by: {
      id: "drv_124",
      name: "Mike Johnson",
      email: "mike.johnson@safeshipper.com",
      phone: "+61 423 456 789"
    },
    recipient_name: "David Wilson",
    delivery_location: "Warehouse 5, 456 Freight Rd, Sydney NSW",
    delivered_at: "2024-01-15T10:15:00Z",
    delivery_notes: "Customer inspected all packages before signing. No issues noted.",
    photos: [
      {
        id: "photo_003",
        image_url: "/api/photos/delivery_003.jpg",
        thumbnail_url: "/api/photos/thumb_delivery_003.jpg",
        file_name: "delivery_proof_003.jpg",
        file_size_mb: 2.1,
        caption: "Complete delivery at warehouse 5",
        taken_at: "2024-01-15T10:12:00Z"
      }
    ],
    signature_url: "/api/signatures/sig_002.png",
    photo_count: 1,
    processing_summary: {
      total_photos: 1,
      signature_captured: true,
      shipment_status_updated: true,
      notifications_triggered: true
    },
    validation_warnings: ["Photo quality could be improved"],
    created_at: "2024-01-15T10:20:00Z"
  },
  {
    id: "pod_003",
    shipment: {
      id: "shp_321",
      tracking_number: "SS2024001236",
      customer_name: "ChemCorp Australia",
      status: "DELIVERED" 
    },
    delivered_by: {
      id: "drv_125",
      name: "Emma Davis",
      email: "emma.davis@safeshipper.com", 
      phone: "+61 434 567 890"
    },
    recipient_name: "Lisa Chen",
    delivery_location: "Main Entrance, 789 Chemical Way, Brisbane QLD",
    delivered_at: "2024-01-14T16:45:00Z",
    delivery_notes: "Special handling required for hazardous materials. Customer provided additional safety briefing.",
    photos: [
      {
        id: "photo_004",
        image_url: "/api/photos/delivery_004.jpg",
        thumbnail_url: "/api/photos/thumb_delivery_004.jpg",
        file_name: "delivery_proof_004.jpg",
        file_size_mb: 3.2,
        caption: "Hazardous materials safely delivered",
        taken_at: "2024-01-14T16:40:00Z"
      },
      {
        id: "photo_005",
        image_url: "/api/photos/delivery_005.jpg", 
        thumbnail_url: "/api/photos/thumb_delivery_005.jpg",
        file_name: "delivery_proof_005.jpg",
        file_size_mb: 2.7,
        caption: "Safety signage and documentation",
        taken_at: "2024-01-14T16:43:00Z"
      },
      {
        id: "photo_006",
        image_url: "/api/photos/delivery_006.jpg",
        thumbnail_url: "/api/photos/thumb_delivery_006.jpg", 
        file_name: "delivery_proof_006.jpg",
        file_size_mb: 1.9,
        caption: "Recipient acknowledgment",
        taken_at: "2024-01-14T16:44:00Z"
      }
    ],
    signature_url: "/api/signatures/sig_003.png",
    photo_count: 3,
    processing_summary: {
      total_photos: 3,
      signature_captured: true,
      shipment_status_updated: true,
      notifications_triggered: true
    },
    validation_warnings: [],
    created_at: "2024-01-14T16:50:00Z"
  }
];

const mockAnalytics = {
  total_pods: 127,
  weekly_increase: 12,
  avg_photos_per_pod: 2.3,
  signature_capture_rate: 98.4,
  avg_processing_time: "2.4 minutes",
  quality_score: 94.2,
  most_common_locations: [
    { location: "Loading Dock", count: 45 },
    { location: "Warehouse", count: 38 },
    { location: "Main Entrance", count: 22 },
    { location: "Storage Area", count: 17 }
  ],
  delivery_patterns: {
    peak_hour: "2:00 PM",
    busiest_day: "Wednesday", 
    avg_delivery_time: "14 minutes"
  }
};

export default function PODManagementPage() {
  const { loadTime } = usePerformanceMonitoring('PODManagementPage');
  const { isDark } = useTheme();
  const [selectedPOD, setSelectedPOD] = useState<typeof mockPODs[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const filteredPODs = mockPODs.filter(pod => {
    const matchesSearch = pod.shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pod.shipment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pod.delivered_by.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pod.recipient_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDriver = driverFilter === "all" || pod.delivered_by.id === driverFilter;
    const matchesCustomer = customerFilter === "all" || pod.shipment.customer_name.toLowerCase().includes(customerFilter.toLowerCase());
    
    return matchesSearch && matchesDriver && matchesCustomer;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getValidationStatusColor = (warnings: string[]) => {
    if (warnings.length === 0) {
      return "bg-green-50 text-green-700 border-green-200";
    } else if (warnings.length <= 2) {
      return "bg-yellow-50 text-yellow-700 border-yellow-200";  
    } else {
      return "bg-red-50 text-red-700 border-red-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proof of Delivery Management</h1>
            <p className="text-gray-600">
              View and manage mobile-captured PODs with photos and signatures
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
              Export PODs
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="h-4 w-4 mr-2" />
              Archive Old
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-gray-600">Total PODs</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{mockAnalytics.total_pods}</div>
              <div className="text-sm text-green-600">+{mockAnalytics.weekly_increase} this week</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-green-600" />
                <div className="text-sm text-gray-600">Avg Photos/POD</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{mockAnalytics.avg_photos_per_pod}</div>
              <div className="text-sm text-blue-600">Quality improving</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Signature className="h-4 w-4 text-purple-600" />
                <div className="text-sm text-gray-600">Signature Rate</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{mockAnalytics.signature_capture_rate}%</div>
              <div className="text-sm text-green-600">Excellent compliance</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div className="text-sm text-gray-600">Avg Processing</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{mockAnalytics.avg_processing_time}</div>
              <div className="text-sm text-green-600">Under target</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pods" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pods" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              POD Records
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo Gallery
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* POD Records Tab */}
          <TabsContent value="pods" className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search PODs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  <SelectItem value="drv_123">John Smith</SelectItem>
                  <SelectItem value="drv_124">Mike Johnson</SelectItem>
                  <SelectItem value="drv_125">Emma Davis</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="acme">Acme Chemicals</SelectItem>
                  <SelectItem value="industrial">Industrial Solutions</SelectItem>
                  <SelectItem value="chemcorp">ChemCorp Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* POD List */}
            <div className="grid gap-4">
              {filteredPODs.map((pod) => (
                <Card key={pod.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileCheck className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-semibold text-lg">{pod.shipment.tracking_number}</div>
                            <div className="text-sm text-gray-600">{pod.shipment.customer_name}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Delivered By</div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{pod.delivered_by.name}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Recipient</div>
                            <div className="font-medium">{pod.recipient_name}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Delivered At</div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{formatDate(pod.delivered_at)}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Evidence</div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                {pod.photo_count}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Signature className="h-3 w-3" />
                                {pod.processing_summary.signature_captured ? 'Yes' : 'No'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 mb-1">Delivery Location</div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{pod.delivery_location}</span>
                          </div>
                        </div>
                        
                        {pod.delivery_notes && (
                          <div className="mt-3">
                            <div className="text-sm text-gray-600 mb-1">Notes</div>
                            <div className="text-sm bg-gray-50 p-2 rounded">{pod.delivery_notes}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge className={getValidationStatusColor(pod.validation_warnings)}>
                          {pod.validation_warnings.length === 0 ? 'Validated' : `${pod.validation_warnings.length} Warning(s)`}
                        </Badge>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPOD(pod)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* POD Detail Dialog */}
            {selectedPOD && (
              <Dialog open={!!selectedPOD} onOpenChange={() => setSelectedPOD(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      POD Details: {selectedPOD.shipment.tracking_number}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Shipment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Shipment Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <span className="text-sm text-gray-600">Tracking Number:</span>
                            <div className="font-medium">{selectedPOD.shipment.tracking_number}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Customer:</span>
                            <div className="font-medium">{selectedPOD.shipment.customer_name}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Status:</span>
                            <Badge className="ml-2 bg-green-50 text-green-700">{selectedPOD.shipment.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Delivery Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <span className="text-sm text-gray-600">Driver:</span>
                            <div className="font-medium">{selectedPOD.delivered_by.name}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Recipient:</span>
                            <div className="font-medium">{selectedPOD.recipient_name}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Delivered:</span>
                            <div className="font-medium">{formatDate(selectedPOD.delivered_at)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Location */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Delivery Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-medium">{selectedPOD.delivery_location}</div>
                      </CardContent>
                    </Card>
                    
                    {/* Notes */}
                    {selectedPOD.delivery_notes && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Delivery Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm">{selectedPOD.delivery_notes}</div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Photos */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Delivery Photos ({selectedPOD.photos.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {selectedPOD.photos.map((photo) => (
                            <div key={photo.id} className="space-y-2">
                              <div 
                                className="aspect-square bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center"
                                onClick={() => setSelectedPhoto(photo.image_url)}
                              >
                                <Image className="h-8 w-8 text-gray-400" />
                              </div>
                              <div className="text-xs space-y-1">
                                <div className="font-medium truncate">{photo.file_name}</div>
                                <div className="text-gray-500">{photo.file_size_mb}MB</div>
                                {photo.caption && (
                                  <div className="text-gray-600">{photo.caption}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Signature */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Signature className="h-4 w-4" />
                          Digital Signature
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-[3/1] bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Signature className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-sm text-gray-600">Signature captured</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Validation Status */}
                    {selectedPOD.validation_warnings.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium mb-2">Validation Warnings:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedPOD.validation_warnings.map((warning, index) => (
                              <li key={index} className="text-sm">{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Photo Gallery Tab */}
          <TabsContent value="photos" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mockPODs.flatMap(pod => 
                pod.photos.map(photo => (
                  <div key={photo.id} className="space-y-2">
                    <div 
                      className="aspect-square bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center"
                      onClick={() => setSelectedPhoto(photo.image_url)}
                    >
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-xs">
                      <div className="font-medium truncate">{photo.file_name}</div>
                      <div className="text-gray-500">{formatDate(photo.taken_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    POD Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">POD collection trends would be shown here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Top Delivery Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockAnalytics.most_common_locations.map((location, index) => (
                      <div key={location.location} className="flex items-center justify-between">
                        <span className="text-sm">{location.location}</span>
                        <span className="text-sm font-semibold">{location.count} deliveries</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Delivery Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Peak Hour</span>
                      <span className="text-sm font-semibold">{mockAnalytics.delivery_patterns.peak_hour}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Busiest Day</span>
                      <span className="text-sm font-semibold">{mockAnalytics.delivery_patterns.busiest_day}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Delivery Time</span>
                      <span className="text-sm font-semibold">{mockAnalytics.delivery_patterns.avg_delivery_time}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Quality Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Overall Quality Score</span>
                        <span className="text-sm font-semibold">{mockAnalytics.quality_score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${mockAnalytics.quality_score}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Signature Capture Rate</span>
                        <span className="text-sm font-semibold">{mockAnalytics.signature_capture_rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${mockAnalytics.signature_capture_rate}%` }}
                        ></div>
                      </div>
                    </div>
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
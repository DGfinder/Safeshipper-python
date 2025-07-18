// app/customers/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  AlertTriangle,
  ChevronLeft,
  Package,
  TrendingUp,
  Clock,
  Route,
  Users,
  Map,
  Shield,
  FileText,
} from "lucide-react";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import { DemoIndicator } from "@/shared/components/ui/demo-indicator";
import Link from "next/link";

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Customer interface matching the main page
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  category: "MINING" | "INDUSTRIAL" | "AGRICULTURAL" | "MEDICAL" | "RETAIL";
  joinDate: string;
  totalShipments: number;
  totalValue: number;
  lastShipment: string;
  rating: number;
  dangerousGoods: boolean;
  primaryRoutes: string[];
  locationLat: number;
  locationLng: number;
}

// Function to get customer by ID using real data from simulatedDataService
const getCustomerById = (id: string): Customer | null => {
  const customers = simulatedDataService.getCustomerProfiles();
  return customers.find(c => c.id === id) || null;
};

// Function to get customer shipments by customer name
const getCustomerShipments = (customerName: string) => {
  return simulatedDataService.getCustomerShipments(customerName);
};

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerShipments, setCustomerShipments] = useState<any[]>([]);
  const [complianceProfile, setComplianceProfile] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then((p) => {
      // Customer IDs are simple strings, no need for URL decoding
      setCustomerId(p.id);
      
      const foundCustomer = getCustomerById(p.id);
      
      if (foundCustomer) {
        setCustomer(foundCustomer);
        setNotFound(false);
        // Load customer shipments
        const shipments = getCustomerShipments(foundCustomer.name);
        setCustomerShipments(shipments);
        // Load compliance profile
        const compliance = simulatedDataService.getCustomerComplianceProfile(foundCustomer.name);
        setComplianceProfile(compliance);
      } else {
        setCustomer(null);
        setCustomerShipments([]);
        setNotFound(true);
      }
    });
  }, [params]);

  if (!customerId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <Building2 className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading customer details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Not Found</h1>
            <p className="text-gray-600 mb-4">
              The customer with ID "{customerId}" could not be found.
            </p>
            <Link href="/customers">
              <Button className="bg-[#153F9F] hover:bg-[#153F9F]/90">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Customers
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <Building2 className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading customer details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM":
        return "bg-purple-100 text-purple-800";
      case "GOLD":
        return "bg-yellow-100 text-yellow-800";
      case "SILVER":
        return "bg-gray-100 text-gray-800";
      case "BRONZE":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "MINING":
        return "bg-amber-100 text-amber-800";
      case "INDUSTRIAL":
        return "bg-blue-100 text-blue-800";
      case "AGRICULTURAL":
        return "bg-green-100 text-green-800";
      case "MEDICAL":
        return "bg-red-100 text-red-800";
      case "RETAIL":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/customers" className="hover:text-gray-900">
            Customers
          </Link>
          <ChevronLeft className="h-4 w-4 rotate-180" />
          <span className="font-medium">{customer.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <Badge className={getStatusColor(customer.status)}>
                  {customer.status}
                </Badge>
                <Badge className={getTierColor(customer.tier)}>
                  {customer.tier}
                </Badge>
                <Badge className={getCategoryColor(customer.category)}>
                  {customer.category}
                </Badge>
                {customer.dangerousGoods && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Dangerous Goods
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-lg font-semibold">{customer.rating}</span>
            </div>
            <p className="text-sm text-gray-600">Customer Rating</p>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customer.totalShipments}</div>
              <p className="text-xs text-gray-500">Since {formatDate(customer.joinDate)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(customer.totalValue)}</div>
              <p className="text-xs text-gray-500">Lifetime value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Last Shipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDate(customer.lastShipment)}</div>
              <p className="text-xs text-gray-500">Most recent activity</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Primary Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customer.primaryRoutes.length}</div>
              <p className="text-xs text-gray-500">Active routes</p>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="geofence">Geofence</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{customer.email}</p>
                      <p className="text-sm text-gray-500">Primary contact</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{customer.phone}</p>
                      <p className="text-sm text-gray-500">Main phone</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{customer.address}</p>
                      <p className="text-sm text-gray-500">
                        {customer.city}, {customer.state} {customer.country}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Industry Category</p>
                    <Badge className={getCategoryColor(customer.category)} variant="outline">
                      {customer.category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Account Status</p>
                    <Badge className={getStatusColor(customer.status)} variant="outline">
                      {customer.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer Since</p>
                    <p className="font-medium">{formatDate(customer.joinDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Dangerous Goods Approved</p>
                    <div className="flex items-center gap-2">
                      {customer.dangerousGoods ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          Not Approved
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shipments">
            <Card>
              <CardHeader>
                <CardTitle>Shipment History ({customerShipments.length} shipments)</CardTitle>
              </CardHeader>
              <CardContent>
                {customerShipments.length > 0 ? (
                  <div className="space-y-4">
                    {customerShipments.slice(0, 10).map((shipment, index) => (
                      <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-lg">{shipment.trackingNumber}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {shipment.route}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(shipment.createdAt)}
                              </span>
                              {shipment.dangerousGoods && shipment.dangerousGoods.length > 0 && (
                                <span className="flex items-center gap-1 text-orange-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  DG
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : shipment.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}>
                              {shipment.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Weight: {shipment.weight}</p>
                            <p className="font-medium">{shipment.priority} Priority</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/shipments/${shipment.id}`}>
                            <Button variant="outline" size="sm">
                              <Package className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    {customerShipments.length > 10 && (
                      <div className="text-center pt-4">
                        <p className="text-sm text-gray-500">
                          Showing 10 of {customerShipments.length} shipments
                        </p>
                        <Button variant="outline" className="mt-2">
                          View All Shipments
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No shipments found for this customer</p>
                    <p className="text-sm text-gray-500 mt-2">
                      This customer hasn't made any shipments yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Safety & Compliance Profile</h3>
                <DemoIndicator type="demo" label="Simulated Compliance Data" />
              </div>
              
              {complianceProfile ? (
                <div className="space-y-6">
                  {/* Compliance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {complianceProfile.complianceRate}%
                        </div>
                        <p className="text-sm text-gray-600">Compliance Rate</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {complianceProfile.dgShipments}
                        </div>
                        <p className="text-sm text-gray-600">DG Shipments</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {complianceProfile.violations.length}
                        </div>
                        <p className="text-sm text-gray-600">Active Violations</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {complianceProfile.safetyRating.toFixed(1)}
                        </div>
                        <p className="text-sm text-gray-600">Safety Rating</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* DG Authorizations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Dangerous Goods Authorizations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {complianceProfile.authorizedGoods.slice(0, 6).map((good: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">UN{good.unNumber}</p>
                                <p className="text-sm text-gray-600">{good.properShippingName}</p>
                                <Badge className="mt-1 text-xs">Class {good.hazardClass}</Badge>
                              </div>
                              <Badge className="bg-green-100 text-green-800">Authorized</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                      {complianceProfile.authorizedGoods.length > 6 && (
                        <p className="text-sm text-gray-500 mt-3 text-center">
                          +{complianceProfile.authorizedGoods.length - 6} more authorizations
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Violations */}
                  {complianceProfile.violations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          Recent Violations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {complianceProfile.violations.map((violation: any) => (
                            <div key={violation.id} className="border rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <p className="font-medium">{violation.type}</p>
                                <p className="text-sm text-gray-600">Shipment: {violation.shipmentId}</p>
                                <p className="text-xs text-gray-500">{formatDate(violation.date)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={violation.severity === 'High' ? 'bg-red-100 text-red-800' : 
                                  violation.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-blue-100 text-blue-800'}>
                                  {violation.severity}
                                </Badge>
                                <Badge className={violation.status === 'Open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                  {violation.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No compliance data available</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="routes">
            <Card>
              <CardHeader>
                <CardTitle>Primary Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customer.primaryRoutes.map((route, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Route className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{route}</p>
                        <p className="text-sm text-gray-500">Regular delivery route</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geofence">
            <Card>
              <CardHeader>
                <CardTitle>Geofence & Delivery Zones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Geofence management will be displayed here</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Set up delivery zones, demurrage tracking, and location-based alerts
                  </p>
                  <Button className="mt-4" variant="outline">
                    <MapPin className="h-4 w-4 mr-2" />
                    Set Up Geofence
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents & Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Customer documents will be displayed here</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Contracts, certifications, and compliance documents
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
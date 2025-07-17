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

// Mock function to get customer by ID (would normally come from API)
const getCustomerById = (id: string): Customer | null => {
  // This is a simplified version - in real app this would come from the same data source
  const mockCustomers: Customer[] = [
    {
      id: "mining-1",
      name: "BHP Billiton",
      email: "logistics@bhp.com.au",
      phone: "+61 8 9338 4444",
      address: "Level 18, 125 St Georges Terrace",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "PLATINUM",
      category: "MINING",
      joinDate: "2018-03-15",
      totalShipments: 1250,
      totalValue: 45000000,
      lastShipment: "2024-01-16",
      rating: 4.9,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Port Hedland", "Perth to Newman"],
      locationLat: -20.3099,
      locationLng: 118.6011,
    },
    // Add more customers as needed
  ];
  
  return mockCustomers.find(c => c.id === id) || null;
};

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then((p) => {
      const decodedId = decodeURIComponent(p.id);
      setCustomerId(decodedId);
      
      const foundCustomer = getCustomerById(decodedId);
      
      if (foundCustomer) {
        setCustomer(foundCustomer);
        setNotFound(false);
      } else {
        setCustomer(null);
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
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
                <CardTitle>Shipment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Shipment history will be displayed here</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Connect to shipment data to show customer's shipping history
                  </p>
                </div>
              </CardContent>
            </Card>
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
// app/customers/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Building2,
  Users,
  Package,
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { useShipments } from "@/shared/hooks/useShipments";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import Link from "next/link";

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

// Function to generate WA transport customer data
const generateWACustomers = (): Customer[] => {
  const companyInfo = simulatedDataService.getCompanyInfo();
  const locations = simulatedDataService.getLocations();
  const routes = simulatedDataService.getRoutes();
  
  const waCustomers: Customer[] = [
    // Mining Companies
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
      locationLat: locations.portHedland.lat,
      locationLng: locations.portHedland.lng,
    },
    {
      id: "mining-2",
      name: "Rio Tinto",
      email: "transport@riotinto.com.au",
      phone: "+61 8 6211 6000",
      address: "Level 43, 108 St Georges Terrace",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "PLATINUM",
      category: "MINING",
      joinDate: "2017-11-20",
      totalShipments: 980,
      totalValue: 38500000,
      lastShipment: "2024-01-15",
      rating: 4.8,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Karratha", "Perth to Tom Price"],
      locationLat: locations.karratha.lat,
      locationLng: locations.karratha.lng,
    },
    {
      id: "mining-3",
      name: "Fortescue Metals Group",
      email: "logistics@fmgl.com.au",
      phone: "+61 8 6218 8888",
      address: "Level 2, 87 Adelaide Terrace",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "GOLD",
      category: "MINING",
      joinDate: "2019-07-10",
      totalShipments: 750,
      totalValue: 28000000,
      lastShipment: "2024-01-14",
      rating: 4.7,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Port Hedland", "Perth to Newman"],
      locationLat: locations.newman.lat,
      locationLng: locations.newman.lng,
    },
    {
      id: "mining-4",
      name: "Newcrest Mining",
      email: "supply@newcrest.com.au",
      phone: "+61 8 9270 5200",
      address: "Level 8, 600 Murray Street",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "GOLD",
      category: "MINING",
      joinDate: "2020-02-28",
      totalShipments: 420,
      totalValue: 15600000,
      lastShipment: "2024-01-13",
      rating: 4.6,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Kalgoorlie"],
      locationLat: locations.kalgoorlie.lat,
      locationLng: locations.kalgoorlie.lng,
    },
    // Industrial Companies
    {
      id: "industrial-1",
      name: "Woodside Energy",
      email: "logistics@woodside.com.au",
      phone: "+61 8 9348 4000",
      address: "Mia Yellagonga Tower, 11 Mount Street",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "PLATINUM",
      category: "INDUSTRIAL",
      joinDate: "2019-05-15",
      totalShipments: 680,
      totalValue: 32000000,
      lastShipment: "2024-01-16",
      rating: 4.8,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Karratha", "Perth to Broome"],
      locationLat: locations.karratha.lat,
      locationLng: locations.karratha.lng,
    },
    {
      id: "industrial-2",
      name: "Chevron Australia",
      email: "transport@chevron.com.au",
      phone: "+61 8 9216 4000",
      address: "QV1 Building, 250 St Georges Terrace",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "GOLD",
      category: "INDUSTRIAL",
      joinDate: "2020-01-12",
      totalShipments: 340,
      totalValue: 18500000,
      lastShipment: "2024-01-15",
      rating: 4.5,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Broome"],
      locationLat: locations.broome.lat,
      locationLng: locations.broome.lng,
    },
    // Agricultural Companies
    {
      id: "agricultural-1",
      name: "Elders Limited",
      email: "logistics@elders.com.au",
      phone: "+61 8 9213 1200",
      address: "Level 1, 570 Wellington Street",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "SILVER",
      category: "AGRICULTURAL",
      joinDate: "2021-03-20",
      totalShipments: 280,
      totalValue: 8900000,
      lastShipment: "2024-01-14",
      rating: 4.4,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Geraldton", "Perth to Albany"],
      locationLat: locations.geraldton.lat,
      locationLng: locations.geraldton.lng,
    },
    {
      id: "agricultural-2",
      name: "Nutrien Ag Solutions",
      email: "transport@nutrien.com.au",
      phone: "+61 8 9327 0200",
      address: "Level 3, 256 Adelaide Terrace",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "SILVER",
      category: "AGRICULTURAL",
      joinDate: "2021-08-05",
      totalShipments: 195,
      totalValue: 6200000,
      lastShipment: "2024-01-13",
      rating: 4.3,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Albany"],
      locationLat: locations.albany.lat,
      locationLng: locations.albany.lng,
    },
    // Medical Companies
    {
      id: "medical-1",
      name: "Pathwest",
      email: "logistics@pathwest.health.wa.gov.au",
      phone: "+61 8 6396 4000",
      address: "Locked Bag 2009, Nedlands",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "GOLD",
      category: "MEDICAL",
      joinDate: "2020-06-15",
      totalShipments: 520,
      totalValue: 12300000,
      lastShipment: "2024-01-16",
      rating: 4.7,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Geraldton", "Perth to Albany"],
      locationLat: locations.perth.lat,
      locationLng: locations.perth.lng,
    },
    {
      id: "medical-2",
      name: "Australian Clinical Labs",
      email: "supply@clinicallabs.com.au",
      phone: "+61 8 9212 4444",
      address: "Level 7, 145 St Georges Terrace",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "BRONZE",
      category: "MEDICAL",
      joinDate: "2022-01-10",
      totalShipments: 150,
      totalValue: 4800000,
      lastShipment: "2024-01-15",
      rating: 4.2,
      dangerousGoods: true,
      primaryRoutes: ["Perth to Fremantle"],
      locationLat: locations.fremantle.lat,
      locationLng: locations.fremantle.lng,
    },
    // Retail Companies
    {
      id: "retail-1",
      name: "Bunnings Warehouse",
      email: "logistics@bunnings.com.au",
      phone: "+61 8 9327 4444",
      address: "16-18 Cato Street",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "ACTIVE",
      tier: "GOLD",
      category: "RETAIL",
      joinDate: "2019-11-25",
      totalShipments: 890,
      totalValue: 22000000,
      lastShipment: "2024-01-16",
      rating: 4.6,
      dangerousGoods: false,
      primaryRoutes: ["Perth to Geraldton", "Perth to Albany", "Perth to Kalgoorlie"],
      locationLat: locations.perth.lat,
      locationLng: locations.perth.lng,
    },
    {
      id: "retail-2",
      name: "Supercheap Auto",
      email: "supply@supercheapauto.com.au",
      phone: "+61 8 9422 0200",
      address: "Level 2, 727 Collins Street",
      city: "Perth",
      state: "WA",
      country: "Australia",
      status: "PENDING",
      tier: "BRONZE",
      category: "RETAIL",
      joinDate: "2024-01-05",
      totalShipments: 25,
      totalValue: 780000,
      lastShipment: "2024-01-14",
      rating: 4.0,
      dangerousGoods: false,
      primaryRoutes: ["Perth to Fremantle"],
      locationLat: locations.fremantle.lat,
      locationLng: locations.fremantle.lng,
    },
  ];
  
  return waCustomers;
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const { data: shipments, isLoading: shipmentsLoading } = useShipments();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Generate WA transport customer data
  const customers: Customer[] = generateWACustomers();

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier =
      selectedTier === "ALL" || customer.tier === selectedTier;
    const matchesCategory =
      selectedCategory === "ALL" || customer.category === selectedCategory;
    return matchesSearch && matchesTier && matchesCategory;
  });

  const customerStats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "ACTIVE").length,
    pending: customers.filter((c) => c.status === "PENDING").length,
    inactive: customers.filter((c) => c.status === "INACTIVE").length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalValue, 0),
    averageShipments: Math.round(
      customers.reduce((sum, c) => sum + c.totalShipments, 0) /
        customers.length,
    ),
  };

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
      month: "short",
      day: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage customer relationships and track performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Customers
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {customerStats.active} active, {customerStats.pending} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(customerStats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">Lifetime value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Shipments
              </CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {customerStats.averageShipments}
              </div>
              <p className="text-xs text-muted-foreground">Per customer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">+12.5%</div>
              <p className="text-xs text-muted-foreground">This quarter</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="ALL">All Tiers</option>
                <option value="PLATINUM">Platinum</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="BRONZE">Bronze</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="ALL">All Categories</option>
                <option value="MINING">Mining</option>
                <option value="INDUSTRIAL">Industrial</option>
                <option value="AGRICULTURAL">Agricultural</option>
                <option value="MEDICAL">Medical</option>
                <option value="RETAIL">Retail</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Tabs */}
        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customers">Customer List</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="tiers">Tier Management</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customers ({filteredCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-lg">
                            {customer.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {customer.city}, {customer.state}
                            </span>
                            {customer.dangerousGoods && (
                              <span className="flex items-center gap-1 text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                DG
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getStatusColor(customer.status)}>
                              {customer.status}
                            </Badge>
                            <Badge className={getTierColor(customer.tier)}>
                              {customer.tier}
                            </Badge>
                            <Badge className={getCategoryColor(customer.category)}>
                              {customer.category}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{customer.totalShipments} shipments</p>
                            <p className="font-medium">
                              {formatCurrency(customer.totalValue)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">
                              {customer.rating}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Last: {formatDate(customer.lastShipment)}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Link href={`/customers/${customer.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Customer Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">This Month</span>
                      <span className="font-medium text-green-600">
                        +8 customers
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Month</span>
                      <span className="font-medium">+12 customers</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Growth Rate</span>
                      <span className="font-medium text-blue-600">+12.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue by Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Platinum</span>
                      <span className="font-medium">$1.2M (65%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Gold</span>
                      <span className="font-medium">$420K (23%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Silver</span>
                      <span className="font-medium">$180K (10%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bronze</span>
                      <span className="font-medium">$35K (2%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tiers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {["PLATINUM", "GOLD", "SILVER", "BRONZE"].map((tier) => {
                const tierCustomers = customers.filter((c) => c.tier === tier);
                const tierRevenue = tierCustomers.reduce(
                  (sum, c) => sum + c.totalValue,
                  0,
                );

                return (
                  <Card key={tier}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className={getTierColor(tier)}>{tier}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">
                          {tierCustomers.length}
                        </div>
                        <p className="text-sm text-gray-600">Customers</p>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(tierRevenue)}
                        </div>
                        <p className="text-xs text-gray-500">Total Revenue</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

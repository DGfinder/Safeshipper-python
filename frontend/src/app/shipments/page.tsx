"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MapPin,
  Calendar,
  Truck,
  User,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Brain,
  Zap,
  History,
  TrendingUp,
  X,
  Shield,
  Weight,
  Route,
} from "lucide-react";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { HazardSymbol } from "@/shared/components/ui/hazard-symbol";
import Link from "next/link";
import {
  semanticSearchService,
  type SearchQuery,
  type SearchResult,
  type SearchSuggestion,
  type SemanticAnalysis,
} from "@/services/semanticSearchService";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import { usePermissions } from "@/contexts/PermissionContext";

const getStatusColor = (status: string) => {
  switch (status) {
    case "DELIVERED":
      return "bg-green-100 text-green-800 border-green-200";
    case "IN_TRANSIT":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "READY_FOR_DISPATCH":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "PLANNING":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "DELIVERED":
      return <CheckCircle className="h-4 w-4" />;
    case "IN_TRANSIT":
      return <Truck className="h-4 w-4" />;
    case "READY_FOR_DISPATCH":
      return <Clock className="h-4 w-4" />;
    case "PLANNING":
      return <Edit className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    "1": "bg-orange-500",
    "2.1": "bg-red-500",
    "2.2": "bg-green-500",
    "2.3": "bg-blue-500",
    "3": "bg-red-600",
    "4.1": "bg-yellow-500",
    "4.2": "bg-blue-600",
    "4.3": "bg-blue-400",
    "5.1": "bg-yellow-600",
    "5.2": "bg-yellow-700",
    "6.1": "bg-purple-500",
    "6.2": "bg-purple-600",
    "7": "bg-yellow-400",
    "8": "bg-gray-600",
    "9": "bg-gray-500",
  };
  return colors[dgClass] || "bg-gray-400";
};

export default function ShipmentsPage() {
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dgFilter, setDgFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Early access check - if user can't view shipments, show access denied
  if (!can('shipments.view.all') && !can('shipments.view.own')) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to view shipments.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // AI Search State
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<
    SearchSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [semanticAnalysis, setSemanticAnalysis] =
    useState<SemanticAnalysis | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const shipments = simulatedDataService.getShipments();

  // Traditional filter logic
  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.trackingNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      shipment.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.route.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || shipment.status === statusFilter;

    const matchesDG =
      dgFilter === "all" ||
      (dgFilter === "with_dg" && shipment.dangerousGoods.length > 0) ||
      (dgFilter === "without_dg" && shipment.dangerousGoods.length === 0);

    return matchesSearch && matchesStatus && matchesDG;
  });

  // Debounced search suggestions
  const debouncedGetSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length >= 2) {
        try {
          const suggestions = await semanticSearchService.getSuggestions(
            query,
            {
              userRole: "dispatcher",
              recentSearches,
              currentPage: "shipments",
              activeShipments: shipments.map((s) => s.id),
              complianceAlerts: 3,
            },
          );
          setSearchSuggestions(suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Failed to get suggestions:", error);
        }
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    [recentSearches, shipments],
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    if (isSemanticSearch) {
      debouncedGetSuggestions(value);
    } else {
      setShowSuggestions(false);
    }
  };

  // Perform semantic search
  const performSemanticSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearchLoading(true);
    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        searchScope: ["shipments"],
        filters: {
          status: statusFilter !== "all" ? [statusFilter] : undefined,
          dateRange:
            dateFilter !== "all"
              ? {
                  start: getDateRangeStart(dateFilter),
                  end: new Date().toISOString(),
                }
              : undefined,
        },
      };

      const result = await semanticSearchService.search(searchQuery, {
        userRole: "dispatcher",
        recentSearches,
        currentPage: "shipments",
        activeShipments: shipments.map((s) => s.id),
        complianceAlerts: 3,
      });

      setSearchResults(result.results);
      setSemanticAnalysis(result.semanticAnalysis);

      // Add to recent searches
      if (!recentSearches.includes(query)) {
        setRecentSearches((prev) => [query, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error("Semantic search failed:", error);
    } finally {
      setSearchLoading(false);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.text);
    if (suggestion.type === "query") {
      performSemanticSearch(suggestion.text);
    } else if (suggestion.metadata) {
      // Apply filter based on suggestion metadata
      if (suggestion.metadata.hazardClass) {
        setDgFilter("with_dg");
        setAppliedFilters((prev) => [
          ...prev,
          `Class ${suggestion.metadata?.hazardClass}`,
        ]);
      }
    }
    setShowSuggestions(false);
  };

  // Toggle search mode
  const toggleSearchMode = () => {
    setIsSemanticSearch(!isSemanticSearch);
    setSearchResults([]);
    setSemanticAnalysis(null);
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setAppliedFilters([]);
  };

  // Remove applied filter
  const removeFilter = (filter: string) => {
    setAppliedFilters((prev) => prev.filter((f) => f !== filter));
  };

  // Get date range start for filters
  const getDateRangeStart = (range: string): string => {
    const now = new Date();
    switch (range) {
      case "today":
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case "week":
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case "month":
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      default:
        return new Date(0).toISOString();
    }
  };

  // Debounce utility
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }

  // Determine which results to show
  const displayResults =
    isSemanticSearch && searchResults.length > 0
      ? searchResults
      : filteredShipments.map((shipment) => ({
          id: shipment.id,
          type: "shipment" as const,
          title: `${shipment.trackingNumber} - ${shipment.client}`,
          description: `Route: ${shipment.route} | Weight: ${shipment.weight} | Status: ${shipment.status}`,
          relevanceScore: 1,
          highlights: [],
          metadata: shipment,
          url: `/shipments/${shipment.id}`,
          lastModified: shipment.estimatedDelivery,
          tags: [],
        }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Shipments</h1>
                <p className="text-blue-100 mt-1">
                  Manage and track all your dangerous goods shipments
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {can('shipments.manifest.upload') && (
                <Link href="/shipments/manifest-upload">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    <Package className="h-4 w-4" />
                    Upload Manifest
                  </Button>
                </Link>
              )}
              {can('shipment.creation') && (
                <Link href="/shipments/create">
                  <Button className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-md">
                    <Plus className="h-4 w-4" />
                    Create Shipment
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Search */}
        <Card className="shadow-md border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSemanticSearch ? (
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="h-5 w-5 text-blue-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Filter className="h-5 w-5 text-gray-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {isSemanticSearch ? "AI-Powered Search" : "Search & Filter"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isSemanticSearch ? "Find shipments using natural language" : "Filter shipments by criteria"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSearchMode}
                className={`flex items-center gap-2 ${
                  isSemanticSearch 
                    ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" 
                    : "hover:bg-gray-50"
                }`}
              >
                {isSemanticSearch ? (
                  <>
                    <Brain className="h-4 w-4" />
                    AI Search
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Enable AI
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Input with Suggestions */}
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                    searchLoading
                      ? "animate-pulse text-blue-500"
                      : "text-gray-400"
                  }`}
                />
                <Input
                  placeholder={
                    isSemanticSearch
                      ? "Try: 'lithium batteries delayed this week' or 'Class 3 from Sydney'"
                      : "Search shipments..."
                  }
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isSemanticSearch) {
                      performSemanticSearch(searchTerm);
                    }
                  }}
                  className={`pl-10 ${isSemanticSearch ? "border-blue-200 focus:border-blue-400" : ""}`}
                />

                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                    {searchSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {suggestion.type === "entity" && (
                              <Package className="h-4 w-4 text-blue-500" />
                            )}
                            {suggestion.type === "query" && (
                              <Search className="h-4 w-4 text-green-500" />
                            )}
                            {suggestion.type === "filter" && (
                              <Filter className="h-4 w-4 text-orange-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {suggestion.text}
                              </p>
                              <p className="text-xs text-gray-500">
                                {suggestion.category}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Applied AI Filters */}
              {appliedFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">
                    Applied filters:
                  </span>
                  {appliedFilters.map((filter, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 bg-blue-100 text-blue-800"
                    >
                      {filter}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-blue-600"
                        onClick={() => removeFilter(filter)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Semantic Analysis Display */}
              {semanticAnalysis && isSemanticSearch && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      AI Understanding
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-blue-700">
                      Intent:{" "}
                      <span className="font-medium">
                        {semanticAnalysis.intent.replace("_", " ")}
                      </span>
                    </p>
                    {semanticAnalysis.entities.length > 0 && (
                      <div>
                        <span className="text-blue-700">Detected: </span>
                        {semanticAnalysis.entities.map((entity, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="mr-1 text-xs"
                          >
                            {entity.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Traditional Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="READY_FOR_DISPATCH">
                      Ready for Dispatch
                    </SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dgFilter} onValueChange={setDgFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dangerous Goods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shipments</SelectItem>
                    <SelectItem value="with_dg">
                      With Dangerous Goods
                    </SelectItem>
                    <SelectItem value="without_dg">
                      Without Dangerous Goods
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recent Searches */}
              {isSemanticSearch && recentSearches.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Recent Searches
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchTerm(search);
                          performSemanticSearch(search);
                        }}
                        className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50 text-gray-700"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                <p className="text-sm font-medium text-gray-900">
                  {isSemanticSearch && searchResults.length > 0 ? (
                    <>
                      Showing {searchResults.length} AI search results
                      {semanticAnalysis && (
                        <span className="ml-2 text-blue-600 font-normal">
                          •{" "}
                          {semanticAnalysis.intent === "compliance_check"
                            ? "Compliance focused"
                            : "General search"}
                        </span>
                      )}
                    </>
                  ) : (
                    `Showing ${filteredShipments.length} of ${shipments.length} shipments`
                  )}
                </p>
              </div>
              {isSemanticSearch && searchResults.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {filteredShipments.filter(s => s.dangerousGoods.length > 0).length} with DG
              </span>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid gap-6">
          {displayResults.map((result) => {
            // Handle both search results and traditional shipment display
            const isSearchResult =
              result.type === "shipment" && "relevanceScore" in result;
            const shipmentData = isSearchResult ? result.metadata : result;

            return (
              <Card
                key={result.id}
                className={`hover:shadow-lg transition-all duration-200 overflow-hidden ${
                  isSearchResult && isSemanticSearch
                    ? "ring-2 ring-blue-400"
                    : ""
                }`}
              >
                {/* Hazard Header - Most Prominent */}
                {(shipmentData as any).dangerousGoods.length > 0 && (
                  <div className="bg-red-50 border-b-2 border-red-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-red-600" />
                        <h4 className="font-semibold text-red-900">
                          Dangerous Goods Shipment
                        </h4>
                      </div>
                      <div className="flex items-center gap-3">
                        {(shipmentData as any).dangerousGoods.map(
                          (dg: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <HazardSymbol 
                                hazardClass={dg.class} 
                                size="lg"
                              />
                              <div className="text-sm">
                                <p className="font-semibold text-gray-900">
                                  Class {dg.class}
                                </p>
                                <p className="text-gray-600">
                                  {dg.count} items
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <CardContent className="p-6">
                  {/* Main Content Grid */}
                  <div className="grid grid-cols-12 gap-6">
                    {/* Left Section - Shipment Info */}
                    <div className="col-span-5">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <Package className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-xl text-gray-900">
                              {isSearchResult
                                ? result.title.split(" - ")[0]
                                : (shipmentData as any).trackingNumber}
                            </h3>
                            <Badge
                              className={`${getStatusColor((shipmentData as any).status)} flex items-center gap-1`}
                            >
                              {getStatusIcon((shipmentData as any).status)}
                              {(shipmentData as any).status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          
                          <p className="text-lg font-medium text-gray-700 mb-3">
                            {(shipmentData as any).client}
                          </p>

                          {/* Route Info */}
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Route className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                {(shipmentData as any).route}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Weight className="h-3 w-3" />
                                {(shipmentData as any).weight}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {(shipmentData as any).distance}
                              </span>
                            </div>
                          </div>

                          {/* Search Highlights */}
                          {isSearchResult && result.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {result.highlights.map((highlight, idx) => (
                                <span
                                  key={idx}
                                  className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium"
                                >
                                  {highlight}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Center Section - Progress & Delivery */}
                    <div className="col-span-4 border-l border-r border-gray-200 px-6">
                      <div className="space-y-4">
                        {/* Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Shipment Progress
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              {(shipmentData as any).progress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative"
                              style={{
                                width: `${(shipmentData as any).progress}%`,
                              }}
                            >
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-sm"></div>
                            </div>
                          </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                              Estimated Delivery
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-blue-700">
                            {new Date(
                              (shipmentData as any).estimatedDelivery,
                            ).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>

                        {/* Driver & Vehicle */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-1">
                              <User className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-600">Driver</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {(shipmentData as any).driver || "Unassigned"}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Truck className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-600">Vehicle</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {(shipmentData as any).vehicle || "TBD"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="col-span-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <Link href={`/shipments/${shipmentData.id}`}>
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            size="default"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/shipments/${shipmentData.id}/validate`}>
                          <Button
                            variant="outline"
                            className="w-full"
                            size="default"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Validate DG
                          </Button>
                        </Link>
                      </div>

                      {isSearchResult && isSemanticSearch && (
                        <div className="mt-4 text-center">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-300"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {Math.round(result.relevanceScore * 100)}% match
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {displayResults.length === 0 && (
          <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
            <CardContent className="text-center py-16">
              <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No shipments found
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Try adjusting your search criteria or create a new shipment to get started.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/shipments/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shipment
                  </Button>
                </Link>
                <Link href="/shipments/manifest-upload">
                  <Button variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    Upload Manifest
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

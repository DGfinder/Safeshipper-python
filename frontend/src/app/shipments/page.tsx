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
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import Link from "next/link";
import {
  semanticSearchService,
  type SearchQuery,
  type SearchResult,
  type SearchSuggestion,
  type SemanticAnalysis,
} from "@/services/semanticSearchService";

// Mock shipment data
const generateMockShipments = () => [
  {
    id: "SS-001-2024",
    trackingNumber: "SS-001-2024",
    client: "Global Manufacturing Inc.",
    route: "Sydney → Melbourne",
    weight: "12,360 KG",
    distance: "1172 km",
    status: "IN_TRANSIT",
    dangerousGoods: [
      { class: "5.1", count: 12 },
      { class: "3", count: 8 },
    ],
    progress: 65,
    estimatedDelivery: "2024-01-15",
    driver: "John Smith",
    vehicle: "VIC-123-ABC",
  },
  {
    id: "SS-002-2024",
    trackingNumber: "SS-002-2024",
    client: "Chemical Solutions Ltd.",
    route: "Brisbane → Perth",
    weight: "8,450 KG",
    distance: "3,290 km",
    status: "READY_FOR_DISPATCH",
    dangerousGoods: [
      { class: "8", count: 15 },
      { class: "6.1", count: 5 },
    ],
    progress: 0,
    estimatedDelivery: "2024-01-18",
    driver: "Sarah Johnson",
    vehicle: "QLD-456-DEF",
  },
  {
    id: "SS-003-2024",
    trackingNumber: "SS-003-2024",
    client: "Pharma Corp Australia",
    route: "Adelaide → Darwin",
    weight: "5,780 KG",
    distance: "1,534 km",
    status: "DELIVERED",
    dangerousGoods: [{ class: "2.1", count: 20 }],
    progress: 100,
    estimatedDelivery: "2024-01-12",
    driver: "Mike Wilson",
    vehicle: "SA-789-GHI",
  },
  {
    id: "SS-004-2024",
    trackingNumber: "SS-004-2024",
    client: "Industrial Chemicals Inc.",
    route: "Melbourne → Sydney",
    weight: "15,200 KG",
    distance: "878 km",
    status: "PLANNING",
    dangerousGoods: [
      { class: "4.1", count: 25 },
      { class: "5.1", count: 10 },
      { class: "8", count: 7 },
    ],
    progress: 15,
    estimatedDelivery: "2024-01-20",
    driver: null,
    vehicle: null,
  },
];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dgFilter, setDgFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

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

  const shipments = generateMockShipments();

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
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
            <p className="text-gray-600">
              Manage and track all your dangerous goods shipments
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/shipments/manifest-upload">
              <Button variant="outline" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Upload Manifest
              </Button>
            </Link>
            <Link href="/shipments/create">
              <Button className="flex items-center gap-2 bg-[#153F9F] hover:bg-[#153F9F]/90">
                <Plus className="h-4 w-4" />
                Create Shipment
              </Button>
            </Link>
          </div>
        </div>

        {/* Enhanced Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSemanticSearch ? (
                  <Brain className="h-5 w-5 text-blue-600" />
                ) : (
                  <Filter className="h-5 w-5" />
                )}
                {isSemanticSearch ? "AI-Powered Search" : "Search & Filter"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSearchMode}
                className={`flex items-center gap-2 ${isSemanticSearch ? "bg-blue-50 border-blue-200" : ""}`}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              {isSemanticSearch && searchResults.length > 0 ? (
                <>
                  Showing {searchResults.length} AI search results
                  {semanticAnalysis && (
                    <span className="ml-2 text-blue-600">
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
                className={`hover:shadow-md transition-shadow ${
                  isSearchResult && isSemanticSearch
                    ? "border-l-4 border-l-blue-400"
                    : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Left Section - Main Info */}
                    <div className="flex items-center gap-6">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">
                            {isSearchResult
                              ? result.title.split(" - ")[0]
                              : (shipmentData as any).trackingNumber}
                          </h3>
                          <Badge
                            className={`${getStatusColor((shipmentData as any).status)} flex items-center gap-1`}
                          >
                            {getStatusIcon((shipmentData as any).status)}
                            {(shipmentData as any).status.replace("_", " ")}
                          </Badge>
                          {isSearchResult && isSemanticSearch && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-600 border-blue-200"
                            >
                              {Math.round(result.relevanceScore * 100)}% match
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 font-medium">
                          {(shipmentData as any).client}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {(shipmentData as any).route}
                          </span>
                          <span>{(shipmentData as any).weight}</span>
                          <span>{(shipmentData as any).distance}</span>
                        </div>

                        {/* Search Highlights */}
                        {isSearchResult && result.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.highlights.map((highlight, idx) => (
                              <span
                                key={idx}
                                className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs"
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Center Section - Dangerous Goods & Progress */}
                    <div className="flex items-center gap-6">
                      {/* Dangerous Goods */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-2">
                          Dangerous Goods
                        </p>
                        <div className="flex gap-1">
                          {(shipmentData as any).dangerousGoods.length > 0 ? (
                            (shipmentData as any).dangerousGoods.map(
                              (dg: any, index: number) => (
                                <div key={index} className="relative">
                                  <div
                                    className={`w-8 h-8 ${getDGClassColor(dg.class)} rounded flex items-center justify-center text-white text-xs font-bold`}
                                  >
                                    {dg.class}
                                  </div>
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                    {dg.count}
                                  </span>
                                </div>
                              ),
                            )
                          ) : (
                            <span className="text-gray-400 text-sm">None</span>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="text-center min-w-[120px]">
                        <p className="text-xs text-gray-500 mb-2">Progress</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(shipmentData as any).progress}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">
                          {(shipmentData as any).progress}%
                        </span>
                      </div>
                    </div>

                    {/* Right Section - Driver & Actions */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm">
                          <p className="text-gray-500">Driver:</p>
                          <p className="font-medium">
                            {(shipmentData as any).driver || "Unassigned"}
                          </p>
                        </div>
                        <div className="text-sm mt-2">
                          <p className="text-gray-500">Vehicle:</p>
                          <p className="font-medium">
                            {(shipmentData as any).vehicle || "TBD"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/shipments/${shipmentData.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Delivery */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Estimated Delivery:{" "}
                          {new Date(
                            (shipmentData as any).estimatedDelivery,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      {isSearchResult && isSemanticSearch && (
                        <div className="text-xs text-blue-600">
                          Search relevance:{" "}
                          {Math.round(result.relevanceScore * 100)}%
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
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No shipments found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or create a new shipment.
              </p>
              <Link href="/shipments/create">
                <Button className="bg-[#153F9F] hover:bg-[#153F9F]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Shipment
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}

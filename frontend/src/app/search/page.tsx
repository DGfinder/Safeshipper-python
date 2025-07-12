"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Brain,
  Package,
  FileText,
  Truck,
  Users,
  Shield,
  Clock,
  ArrowLeft,
  Filter,
  BarChart3,
  Eye,
  ExternalLink,
  Calendar,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import {
  semanticSearchService,
  type SearchQuery,
  type SearchResult,
  type SemanticAnalysis,
} from "@/services/semanticSearchService";
import Link from "next/link";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [semanticAnalysis, setSemanticAnalysis] =
    useState<SemanticAnalysis | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTime, setSearchTime] = useState(0);

  const query = searchParams.get("q") || "";
  const isAI = searchParams.get("ai") === "true";

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query, isAI]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    const startTime = Date.now();

    try {
      const searchRequest: SearchQuery = {
        query: searchQuery.trim(),
        searchScope: ["shipments", "documents", "fleet", "users", "compliance"],
        limit: 50,
      };

      const result = await semanticSearchService.search(searchRequest, {
        userRole: "dispatcher",
        recentSearches: [],
        currentPage: "search",
        activeShipments: [],
        complianceAlerts: 0,
      });

      setSearchResults(result.results);
      setSemanticAnalysis(result.semanticAnalysis);
      setSearchTime(Date.now() - startTime);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search from unified search bar
  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
  };

  // Filter results by type
  const filterResultsByType = (type?: string) => {
    if (!type || type === "all") return searchResults;
    return searchResults.filter((result) => result.type === type);
  };

  // Get result counts by type
  const getResultCounts = () => {
    const counts = {
      all: searchResults.length,
      shipment: searchResults.filter((r) => r.type === "shipment").length,
      document: searchResults.filter((r) => r.type === "document").length,
      vehicle: searchResults.filter((r) => r.type === "vehicle").length,
      user: searchResults.filter((r) => r.type === "user").length,
      compliance_record: searchResults.filter(
        (r) => r.type === "compliance_record",
      ).length,
    };
    return counts;
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case "shipment":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "vehicle":
        return <Truck className="h-4 w-4 text-orange-500" />;
      case "user":
        return <Users className="h-4 w-4 text-purple-500" />;
      case "compliance_record":
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get color class for result type
  const getResultColorClass = (type: string) => {
    switch (type) {
      case "shipment":
        return "border-l-blue-400 bg-blue-50/30";
      case "document":
        return "border-l-green-400 bg-green-50/30";
      case "vehicle":
        return "border-l-orange-400 bg-orange-50/30";
      case "user":
        return "border-l-purple-400 bg-purple-50/30";
      case "compliance_record":
        return "border-l-red-400 bg-red-50/30";
      default:
        return "border-l-gray-400 bg-gray-50/30";
    }
  };

  // Format result metadata for display
  const formatResultMetadata = (result: SearchResult) => {
    const metadata = result.metadata;
    if (!metadata) return [];

    const items = [];

    if (metadata.status) {
      items.push({
        label: "Status",
        value: metadata.status,
        icon: AlertTriangle,
      });
    }
    if (metadata.route) {
      items.push({ label: "Route", value: metadata.route, icon: MapPin });
    }
    if (metadata.estimatedDelivery || metadata.lastModified) {
      const date = metadata.estimatedDelivery || metadata.lastModified;
      items.push({
        label: metadata.estimatedDelivery ? "Delivery" : "Modified",
        value: new Date(date).toLocaleDateString(),
        icon: Calendar,
      });
    }
    if (metadata.dangerousGoods && metadata.dangerousGoods.length > 0) {
      const classes = metadata.dangerousGoods
        .map((dg: any) => dg.class)
        .join(", ");
      items.push({ label: "Hazard Classes", value: classes, icon: Shield });
    }

    return items.slice(0, 3); // Show max 3 metadata items
  };

  const resultCounts = getResultCounts();
  const filteredResults = filterResultsByType(activeTab);

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
            <p className="text-gray-600">
              {query && (
                <>
                  Results for{" "}
                  <span className="font-medium">&quot;{query}&quot;</span>
                  {isAI && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800">
                      AI Enhanced
                    </Badge>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <Card>
          <CardContent className="p-4">
            <UnifiedSearchBar
              placeholder="Refine your search across all modules..."
              onSearchResults={handleSearchResults}
              showAIToggle={true}
            />
          </CardContent>
        </Card>

        {/* Search Analysis */}
        {semanticAnalysis && isAI && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI Search Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Search Intent</p>
                  <p className="font-medium text-blue-700">
                    {semanticAnalysis.intent.replace("_", " ").toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Entities Detected</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {semanticAnalysis.entities.map((entity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {entity.value}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Search Time</p>
                  <p className="font-medium">{searchTime}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Search Results ({resultCounts.all})
              </div>
              {searchTime > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {searchTime}ms
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  All ({resultCounts.all})
                </TabsTrigger>
                <TabsTrigger
                  value="shipment"
                  className="flex items-center gap-1"
                >
                  <Package className="h-3 w-3" />
                  Shipments ({resultCounts.shipment})
                </TabsTrigger>
                <TabsTrigger
                  value="document"
                  className="flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  Documents ({resultCounts.document})
                </TabsTrigger>
                <TabsTrigger
                  value="vehicle"
                  className="flex items-center gap-1"
                >
                  <Truck className="h-3 w-3" />
                  Fleet ({resultCounts.vehicle})
                </TabsTrigger>
                <TabsTrigger value="user" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Users ({resultCounts.user})
                </TabsTrigger>
                <TabsTrigger
                  value="compliance_record"
                  className="flex items-center gap-1"
                >
                  <Shield className="h-3 w-3" />
                  Compliance ({resultCounts.compliance_record})
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                {/* Results List */}
                {searchLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="border rounded-lg p-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredResults.length > 0 ? (
                  <div className="space-y-4">
                    {filteredResults.map((result, index) => (
                      <Card
                        key={result.id}
                        className={`border-l-4 ${getResultColorClass(result.type)} hover:shadow-md transition-shadow`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Result Header */}
                              <div className="flex items-center gap-3 mb-2">
                                {getResultIcon(result.type)}
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {result.title}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">
                                    {result.type
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </Badge>
                                </div>
                                {isAI && (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-600 border-blue-200"
                                  >
                                    {Math.round(result.relevanceScore * 100)}%
                                    match
                                  </Badge>
                                )}
                              </div>

                              {/* Result Description */}
                              <p className="text-gray-600 mb-3">
                                {result.description}
                              </p>

                              {/* Search Highlights */}
                              {result.highlights.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
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

                              {/* Result Metadata */}
                              {formatResultMetadata(result).length > 0 && (
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  {formatResultMetadata(result).map(
                                    (item, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-1"
                                      >
                                        <item.icon className="h-3 w-3" />
                                        <span>
                                          {item.label}: {item.value}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {/* Result Tags */}
                              {result.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {result.tags.map((tag, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 ml-4">
                              <Link href={result.url}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {query ? "No results found" : "Enter a search query"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {query
                        ? "Try adjusting your search terms or using different keywords."
                        : "Use the search bar above to find shipments, documents, fleet, users, and compliance records."}
                    </p>
                    {query && (
                      <Button
                        variant="outline"
                        onClick={() => router.push("/search")}
                        className="flex items-center gap-2"
                      >
                        <Search className="h-4 w-4" />
                        Start New Search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

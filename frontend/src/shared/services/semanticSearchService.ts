// Semantic Search Service
// AI-powered intelligent search for dangerous goods transport
// Provides natural language search across shipments, documents, and compliance data

interface SearchQuery {
  query: string;
  filters?: {
    dateRange?: { start: string; end: string };
    status?: string[];
    hazardClasses?: string[];
    routes?: string[];
    documentTypes?: string[];
  };
  searchScope?: (
    | "shipments"
    | "documents"
    | "fleet"
    | "users"
    | "compliance"
  )[];
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  type: "shipment" | "document" | "vehicle" | "user" | "compliance_record";
  title: string;
  description: string;
  relevanceScore: number;
  highlights: string[];
  metadata: {
    [key: string]: any;
  };
  url: string;
  lastModified: string;
  tags: string[];
}

interface SearchSuggestion {
  text: string;
  type: "query" | "filter" | "entity";
  category: string;
  confidence: number;
  metadata?: {
    unNumber?: string;
    hazardClass?: string;
    route?: string;
  };
}

interface SearchContext {
  userRole: string;
  recentSearches: string[];
  currentPage: string;
  activeShipments: string[];
  complianceAlerts: number;
}

interface SemanticAnalysis {
  intent: "search" | "filter" | "navigate" | "compliance_check";
  entities: Array<{
    type:
      | "un_number"
      | "hazard_class"
      | "location"
      | "date"
      | "status"
      | "document_type";
    value: string;
    confidence: number;
  }>;
  suggestedFilters: {
    [key: string]: string[];
  };
  expandedQuery: string;
}

interface SearchAnalytics {
  queryId: string;
  timestamp: string;
  query: string;
  resultCount: number;
  clickedResults: string[];
  searchTime: number;
  userSatisfaction?: "high" | "medium" | "low";
  refinements: string[];
}

class SemanticSearchService {
  private baseUrl = "/api/v1";
  private searchCache = new Map<
    string,
    { results: SearchResult[]; timestamp: number }
  >();
  private suggestionCache = new Map<
    string,
    { suggestions: SearchSuggestion[]; timestamp: number }
  >();
  private cacheTimeout = 300000; // 5 minutes

  // Perform intelligent search across all modules
  async search(
    query: SearchQuery,
    context?: SearchContext,
  ): Promise<{
    results: SearchResult[];
    totalCount: number;
    suggestions: SearchSuggestion[];
    semanticAnalysis: SemanticAnalysis;
    searchTime: number;
  }> {
    const startTime = Date.now();
    const cacheKey = JSON.stringify({ query, context });

    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return {
        results: cached.results,
        totalCount: cached.results.length,
        suggestions: [],
        semanticAnalysis: await this.analyzeQuery(query.query),
        searchTime: Date.now() - startTime,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/search/semantic/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          context,
          include_analytics: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Semantic search failed");
      }

      const data = await response.json();

      // Cache results
      this.searchCache.set(cacheKey, {
        results: data.results,
        timestamp: Date.now(),
      });

      // Track search analytics
      this.trackSearch({
        queryId: `search-${Date.now()}`,
        timestamp: new Date().toISOString(),
        query: query.query,
        resultCount: data.results.length,
        clickedResults: [],
        searchTime: Date.now() - startTime,
        refinements: [],
      });

      return {
        results: data.results || [],
        totalCount: data.total_count || 0,
        suggestions: data.suggestions || [],
        semanticAnalysis:
          data.semantic_analysis || (await this.analyzeQuery(query.query)),
        searchTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Semantic search failed:", error);
      return this.simulateSearch(query, context);
    }
  }

  // Analyze query semantics and extract entities
  async analyzeQuery(query: string): Promise<SemanticAnalysis> {
    try {
      const response = await fetch(`${this.baseUrl}/search/analyze-query/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Query analysis failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Query analysis failed:", error);
      return this.simulateQueryAnalysis(query);
    }
  }

  private simulateQueryAnalysis(query: string): SemanticAnalysis {
    const lowerQuery = query.toLowerCase();
    const entities: SemanticAnalysis["entities"] = [];

    // Extract UN numbers
    const unNumberMatch = lowerQuery.match(/un\s*(\d{4})/g);
    if (unNumberMatch) {
      unNumberMatch.forEach((match) => {
        const unNumber = match.replace(/\D/g, "");
        entities.push({
          type: "un_number",
          value: `UN${unNumber}`,
          confidence: 0.95,
        });
      });
    }

    // Extract hazard classes
    const hazardClassMatch = lowerQuery.match(/class\s*(\d+\.?\d*)/g);
    if (hazardClassMatch) {
      hazardClassMatch.forEach((match) => {
        const hazardClass = match.replace(/class\s*/i, "");
        entities.push({
          type: "hazard_class",
          value: hazardClass,
          confidence: 0.9,
        });
      });
    }

    // Extract locations
    const locations = [
      "sydney",
      "melbourne",
      "brisbane",
      "perth",
      "adelaide",
      "darwin",
    ];
    locations.forEach((location) => {
      if (lowerQuery.includes(location)) {
        entities.push({
          type: "location",
          value: location.charAt(0).toUpperCase() + location.slice(1),
          confidence: 0.85,
        });
      }
    });

    // Extract status keywords
    const statusKeywords = [
      "delayed",
      "in transit",
      "delivered",
      "planning",
      "ready",
    ];
    statusKeywords.forEach((status) => {
      if (lowerQuery.includes(status.toLowerCase())) {
        entities.push({
          type: "status",
          value: status.toUpperCase().replace(" ", "_"),
          confidence: 0.8,
        });
      }
    });

    // Determine intent
    let intent: SemanticAnalysis["intent"] = "search";
    if (
      lowerQuery.includes("expired") ||
      lowerQuery.includes("compliance") ||
      lowerQuery.includes("violation")
    ) {
      intent = "compliance_check";
    } else if (
      lowerQuery.includes("show") ||
      lowerQuery.includes("find") ||
      lowerQuery.includes("get")
    ) {
      intent = "search";
    }

    return {
      intent,
      entities,
      suggestedFilters: this.generateSuggestedFilters(entities),
      expandedQuery: this.expandQuery(query, entities),
    };
  }

  private generateSuggestedFilters(entities: SemanticAnalysis["entities"]): {
    [key: string]: string[];
  } {
    const filters: { [key: string]: string[] } = {};

    entities.forEach((entity) => {
      switch (entity.type) {
        case "hazard_class":
          if (!filters.hazardClasses) filters.hazardClasses = [];
          filters.hazardClasses.push(entity.value);
          break;
        case "location":
          if (!filters.routes) filters.routes = [];
          filters.routes.push(entity.value);
          break;
        case "status":
          if (!filters.status) filters.status = [];
          filters.status.push(entity.value);
          break;
      }
    });

    return filters;
  }

  private expandQuery(
    query: string,
    entities: SemanticAnalysis["entities"],
  ): string {
    let expanded = query;

    // Add synonyms and related terms
    const expansions: { [key: string]: string[] } = {
      lithium: ["UN3480", "UN3481", "battery"],
      flammable: ["class 3", "combustible"],
      corrosive: ["class 8", "acidic"],
      toxic: ["class 6.1", "poisonous"],
      delayed: ["late", "overdue", "behind schedule"],
    };

    Object.entries(expansions).forEach(([term, synonyms]) => {
      if (query.toLowerCase().includes(term)) {
        expanded += ` ${synonyms.join(" ")}`;
      }
    });

    return expanded;
  }

  // Get search suggestions as user types
  async getSuggestions(
    partialQuery: string,
    context?: SearchContext,
  ): Promise<SearchSuggestion[]> {
    if (partialQuery.length < 2) return [];

    const cacheKey = `${partialQuery}-${JSON.stringify(context)}`;
    const cached = this.suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.suggestions;
    }

    try {
      const response = await fetch(`${this.baseUrl}/search/suggestions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partial_query: partialQuery,
          context,
          max_suggestions: 10,
        }),
      });

      if (!response.ok) {
        throw new Error("Suggestions fetch failed");
      }

      const data = await response.json();
      const suggestions = data.suggestions || [];

      // Cache suggestions
      this.suggestionCache.set(cacheKey, {
        suggestions,
        timestamp: Date.now(),
      });

      return suggestions;
    } catch (error) {
      console.error("Suggestions fetch failed:", error);
      return this.simulateSuggestions(partialQuery, context);
    }
  }

  private simulateSuggestions(
    partialQuery: string,
    context?: SearchContext,
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const lowerQuery = partialQuery.toLowerCase();

    // UN Number suggestions
    const unNumbers = ["UN1942", "UN3480", "UN3481", "UN1203", "UN1993"];
    unNumbers.forEach((un) => {
      if (
        un.toLowerCase().includes(lowerQuery) ||
        lowerQuery.includes(un.toLowerCase().substring(2))
      ) {
        suggestions.push({
          text: `${un} - ${this.getUNDescription(un)}`,
          type: "entity",
          category: "UN Number",
          confidence: 0.9,
          metadata: { unNumber: un },
        });
      }
    });

    // Hazard class suggestions
    const hazardClasses = [
      { class: "3", name: "Flammable liquids" },
      { class: "5.1", name: "Oxidizing substances" },
      { class: "6.1", name: "Toxic substances" },
      { class: "8", name: "Corrosive substances" },
      { class: "9", name: "Miscellaneous dangerous goods" },
    ];

    hazardClasses.forEach(({ class: hazardClass, name }) => {
      if (
        hazardClass.includes(lowerQuery) ||
        name.toLowerCase().includes(lowerQuery)
      ) {
        suggestions.push({
          text: `Class ${hazardClass} - ${name}`,
          type: "entity",
          category: "Hazard Class",
          confidence: 0.85,
          metadata: { hazardClass },
        });
      }
    });

    // Common search queries
    const commonQueries = [
      "lithium battery shipments",
      "expired documents",
      "delayed shipments this week",
      "Class 3 flammable liquids",
      "shipments from Sydney",
      "ready for dispatch",
      "compliance violations",
      "emergency contacts",
    ];

    commonQueries.forEach((queryText) => {
      if (queryText.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          text: queryText,
          type: "query",
          category: "Common Searches",
          confidence: 0.75,
        });
      }
    });

    // Sort by confidence and return top suggestions
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  }

  private getUNDescription(unNumber: string): string {
    const descriptions: { [key: string]: string } = {
      UN1942: "Ammonium nitrate",
      UN3480: "Lithium ion batteries",
      UN3481: "Lithium ion batteries in equipment",
      UN1203: "Gasoline",
      UN1993: "Flammable liquid, n.o.s.",
    };
    return descriptions[unNumber] || "Dangerous goods";
  }

  private simulateSearch(
    query: SearchQuery,
    context?: SearchContext,
  ): Promise<{
    results: SearchResult[];
    totalCount: number;
    suggestions: SearchSuggestion[];
    semanticAnalysis: SemanticAnalysis;
    searchTime: number;
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: SearchResult[] = [
          {
            id: "SS-001-2024",
            type: "shipment",
            title: "SS-001-2024 - Global Manufacturing Inc.",
            description:
              "Shipment containing Class 5.1 oxidizing substances and Class 3 flammable liquids from Sydney to Melbourne",
            relevanceScore: 0.95,
            highlights: ["Class 5.1", "Class 3", "Sydney → Melbourne"],
            metadata: {
              status: "IN_TRANSIT",
              dangerousGoods: [
                { class: "5.1", count: 12 },
                { class: "3", count: 8 },
              ],
              route: "Sydney → Melbourne",
              progress: 65,
            },
            url: "/shipments/SS-001-2024",
            lastModified: "2024-01-14T10:30:00Z",
            tags: ["hazmat", "in-transit", "oxidizing", "flammable"],
          },
          {
            id: "doc-sds-001",
            type: "document",
            title: "SDS - Ammonium Nitrate (UN1942)",
            description:
              "Safety Data Sheet for ammonium nitrate - Class 5.1 oxidizing substance",
            relevanceScore: 0.87,
            highlights: ["UN1942", "ammonium nitrate", "Class 5.1"],
            metadata: {
              documentType: "SDS",
              unNumber: "UN1942",
              hazardClass: "5.1",
              expiryDate: "2025-06-01",
            },
            url: "/documents/sds/doc-sds-001",
            lastModified: "2024-01-10T14:20:00Z",
            tags: ["sds", "oxidizer", "compliance"],
          },
        ];

        resolve({
          results: mockResults.filter(
            (result) =>
              result.title.toLowerCase().includes(query.query.toLowerCase()) ||
              result.description
                .toLowerCase()
                .includes(query.query.toLowerCase()) ||
              result.tags.some((tag) =>
                tag.includes(query.query.toLowerCase()),
              ),
          ),
          totalCount: mockResults.length,
          suggestions: [],
          semanticAnalysis: this.simulateQueryAnalysis(query.query),
          searchTime: 150,
        });
      }, 150);
    });
  }

  // Track search analytics
  private async trackSearch(analytics: SearchAnalytics): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/search/analytics/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analytics),
      });
    } catch (error) {
      console.warn("Search analytics tracking failed:", error);
    }
  }

  // Record search result click
  async recordClick(
    queryId: string,
    resultId: string,
    position: number,
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/search/click/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_id: queryId,
          result_id: resultId,
          position,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn("Click tracking failed:", error);
    }
  }

  // Get popular searches
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search/popular/?limit=${limit}`,
      );
      if (!response.ok) return [];

      const data = await response.json();
      return data.popular_searches || [];
    } catch (error) {
      console.error("Popular searches fetch failed:", error);
      return [
        "lithium battery shipments",
        "Class 3 flammable liquids",
        "expired documents",
        "delayed shipments",
        "Sydney to Melbourne",
        "compliance violations",
      ];
    }
  }

  // Clear search cache
  clearCache(): void {
    this.searchCache.clear();
    this.suggestionCache.clear();
  }
}

export const semanticSearchService = new SemanticSearchService();

export type {
  SearchQuery,
  SearchResult,
  SearchSuggestion,
  SearchContext,
  SemanticAnalysis,
  SearchAnalytics,
};

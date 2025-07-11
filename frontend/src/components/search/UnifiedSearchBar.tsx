'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Brain, 
  Zap, 
  Package, 
  FileText, 
  Truck, 
  Users, 
  Shield,
  Clock,
  History,
  X,
  ChevronRight,
  Filter,
  ArrowRight
} from 'lucide-react';
import { 
  semanticSearchService, 
  type SearchQuery, 
  type SearchResult, 
  type SearchSuggestion,
  type SemanticAnalysis 
} from '@/services/semanticSearchService';
import { useRouter } from 'next/navigation';

interface UnifiedSearchBarProps {
  placeholder?: string;
  currentModule?: 'shipments' | 'documents' | 'fleet' | 'users' | 'compliance';
  onSearchResults?: (results: SearchResult[]) => void;
  className?: string;
  compact?: boolean;
  showAIToggle?: boolean;
}

export default function UnifiedSearchBar({
  placeholder = "Search across SafeShipper...",
  currentModule,
  onSearchResults,
  className = "",
  compact = false,
  showAIToggle = true
}: UnifiedSearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [semanticAnalysis, setSemanticAnalysis] = useState<SemanticAnalysis | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Load popular searches and recent searches on mount
  useEffect(() => {
    loadPopularSearches();
    loadRecentSearches();
  }, []);

  const loadPopularSearches = async () => {
    try {
      const popular = await semanticSearchService.getPopularSearches(6);
      setPopularSearches(popular);
    } catch (error) {
      console.error('Failed to load popular searches:', error);
    }
  };

  const loadRecentSearches = () => {
    const stored = localStorage.getItem('safeshipper_recent_searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  };

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('safeshipper_recent_searches', JSON.stringify(updated));
  };

  // Debounced suggestions
  const debouncedGetSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length >= 2 && isSemanticSearch) {
        try {
          const suggestions = await semanticSearchService.getSuggestions(query, {
            userRole: 'dispatcher',
            recentSearches,
            currentPage: currentModule || 'global',
            activeShipments: [],
            complianceAlerts: 0
          });
          setSearchSuggestions(suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        }
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    [isSemanticSearch, recentSearches, currentModule]
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (value.length === 0) {
      setShowQuickActions(true);
      setShowSuggestions(false);
    } else {
      setShowQuickActions(false);
      if (isSemanticSearch) {
        debouncedGetSuggestions(value);
      }
    }
  };

  // Perform semantic search
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    setShowSuggestions(false);
    setShowQuickActions(false);
    
    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        searchScope: currentModule ? [currentModule] : ['shipments', 'documents', 'fleet', 'users', 'compliance'],
        limit: 20
      };

      const result = await semanticSearchService.search(searchQuery, {
        userRole: 'dispatcher',
        recentSearches,
        currentPage: currentModule || 'global',
        activeShipments: [],
        complianceAlerts: 0
      });

      setSearchResults(result.results);
      setSemanticAnalysis(result.semanticAnalysis);
      
      // Save to recent searches
      saveRecentSearch(query);
      
      // Call callback if provided
      if (onSearchResults) {
        onSearchResults(result.results);
      } else {
        // Navigate to search results page if no callback
        router.push(`/search?q=${encodeURIComponent(query)}&ai=${isSemanticSearch}`);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.text);
    performSearch(suggestion.text);
  };

  // Handle quick action click
  const handleQuickActionClick = (action: string) => {
    setSearchTerm(action);
    performSearch(action);
  };

  // Toggle search mode
  const toggleSearchMode = () => {
    setIsSemanticSearch(!isSemanticSearch);
    setSearchResults([]);
    setSemanticAnalysis(null);
    setSearchSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (searchTerm.length === 0) {
      setShowQuickActions(true);
    } else if (isSemanticSearch) {
      debouncedGetSuggestions(searchTerm);
    }
  };

  // Handle input blur (with delay to allow clicks)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setShowQuickActions(false);
    }, 200);
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'shipment': return <Package className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'vehicle': return <Truck className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'compliance_record': return <Shield className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  // Get color for result type
  const getResultColor = (type: string) => {
    switch (type) {
      case 'shipment': return 'text-blue-500';
      case 'document': return 'text-green-500';
      case 'vehicle': return 'text-orange-500';
      case 'user': return 'text-purple-500';
      case 'compliance_record': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Debounce utility
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }

  const quickActions = [
    { text: 'lithium battery shipments', icon: Package, color: 'text-blue-500' },
    { text: 'expired documents', icon: FileText, color: 'text-red-500' },
    { text: 'delayed shipments', icon: Clock, color: 'text-orange-500' },
    { text: 'Class 3 flammable liquids', icon: Shield, color: 'text-yellow-600' },
    { text: 'compliance violations', icon: Shield, color: 'text-red-600' },
    { text: 'ready for dispatch', icon: Truck, color: 'text-green-500' }
  ];

  return (
    <div className={`relative ${className}`}>
      <div className={`relative flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
            searchLoading ? 'animate-pulse text-blue-500' : 'text-gray-400'
          }`} />
          <Input
            ref={inputRef}
            placeholder={isSemanticSearch ? 
              "Try: 'lithium batteries delayed this week' or 'Class 3 from Sydney'" : 
              placeholder
            }
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                performSearch(searchTerm);
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setShowQuickActions(false);
                inputRef.current?.blur();
              }
            }}
            className={`pl-10 ${compact ? 'h-9' : 'h-10'} ${
              isSemanticSearch ? 'border-blue-200 focus:border-blue-400 bg-blue-50/30' : ''
            }`}
          />
        </div>

        {/* AI Toggle */}
        {showAIToggle && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={toggleSearchMode}
            className={`flex items-center gap-2 ${compact ? 'px-3' : 'px-4'} ${
              isSemanticSearch ? 'bg-blue-50 border-blue-200 text-blue-700' : ''
            }`}
          >
            {isSemanticSearch ? (
              <>
                <Brain className="h-4 w-4" />
                {!compact && 'AI'}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                {!compact && 'AI'}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Dropdown Content */}
      {(showSuggestions || showQuickActions) && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {/* Quick Actions */}
            {showQuickActions && (
              <div className="p-4 space-y-3">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <History className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Recent</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickActionClick(search)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Quick Actions</span>
                  </div>
                  <div className="space-y-1">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickActionClick(action.text)}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded text-left"
                      >
                        <action.icon className={`h-4 w-4 ${action.color}`} />
                        <span className="text-sm">{action.text}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400 ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>

                {popularSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Popular</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {popularSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickActionClick(search)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-blue-700"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="max-h-80 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {suggestion.type === 'entity' && <Package className="h-4 w-4 text-blue-500" />}
                        {suggestion.type === 'query' && <Search className="h-4 w-4 text-green-500" />}
                        {suggestion.type === 'filter' && <Filter className="h-4 w-4 text-orange-500" />}
                        <div>
                          <p className="text-sm font-medium">{suggestion.text}</p>
                          <p className="text-xs text-gray-500">{suggestion.category}</p>
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
          </CardContent>
        </Card>
      )}

      {/* Semantic Analysis */}
      {semanticAnalysis && isSemanticSearch && !compact && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">AI Understanding</span>
          </div>
          <p className="text-blue-700">
            Intent: <span className="font-medium">{semanticAnalysis.intent.replace('_', ' ')}</span>
          </p>
          {semanticAnalysis.entities.length > 0 && (
            <div className="mt-1">
              <span className="text-blue-700">Detected: </span>
              {semanticAnalysis.entities.map((entity, index) => (
                <Badge key={index} variant="outline" className="mr-1 text-xs">
                  {entity.value}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
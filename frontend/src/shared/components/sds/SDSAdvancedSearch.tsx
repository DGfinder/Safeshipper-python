"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  Search,
  Filter,
  X,
  Thermometer,
  Droplets,
  AlertTriangle,
  Globe,
  Factory,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type SDSSearchParams } from "@/shared/hooks/useSDS";

interface SDSAdvancedSearchProps {
  searchParams: SDSSearchParams;
  onSearchChange: (params: Partial<SDSSearchParams>) => void;
  onReset: () => void;
}

export default function SDSAdvancedSearch({
  searchParams,
  onSearchChange,
  onReset,
}: SDSAdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const updateFilter = (key: keyof SDSSearchParams, value: string | boolean | number | undefined) => {
    const newParams = { [key]: value };
    onSearchChange(newParams);

    // Track active filters for display
    if (value && value !== "" && (typeof value !== 'boolean' || value === true) && value !== 0) {
      if (!activeFilters.includes(key)) {
        setActiveFilters([...activeFilters, key]);
      }
    } else {
      setActiveFilters(activeFilters.filter(filter => filter !== key));
    }
  };

  const clearFilter = (filterKey: string) => {
    updateFilter(filterKey as keyof SDSSearchParams, undefined);
  };

  const handleReset = () => {
    setActiveFilters([]);
    onReset();
  };

  const getFilterDisplayName = (key: string): string => {
    const displayNames: Record<string, string> = {
      query: "General Search",
      un_number: "UN Number",
      manufacturer: "Manufacturer",
      product_name: "Product Name",
      hazard_class: "Hazard Class",
      language: "Language",
      country_code: "Country",
      status: "Status",
      physical_state: "Physical State",
      flash_point_min: "Min Flash Point",
      flash_point_max: "Max Flash Point",
      hazard_code: "Hazard Code",
      include_expired: "Include Expired",
    };
    return displayNames[key] || key;
  };

  const getFilterDisplayValue = (key: string, value: any): string => {
    if (key === "include_expired") {
      return value ? "Yes" : "No";
    }
    if (key === "flash_point_min" || key === "flash_point_max") {
      return `${value}°C`;
    }
    return String(value);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter SDS Documents
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} active
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {activeFilters.map((filterKey) => {
              const value = (searchParams as any)[filterKey];
              if (!value && value !== 0) return null;

              return (
                <Badge
                  key={filterKey}
                  variant="outline"
                  className="flex items-center gap-1 text-xs"
                >
                  <span className="font-medium">{getFilterDisplayName(filterKey)}:</span>
                  <span>{getFilterDisplayValue(filterKey, value)}</span>
                  <button
                    onClick={() => clearFilter(filterKey)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 text-xs text-gray-500 hover:text-red-600"
            >
              Clear all
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary Search */}
        <div className="space-y-2">
          <Label htmlFor="main-search" className="text-sm font-medium">
            General Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="main-search"
              placeholder="Search by product name, manufacturer, UN number, or chemical name..."
              value={searchParams.query || ""}
              onChange={(e) => updateFilter("query", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-6">
            {/* Basic Identification Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  UN Number
                </Label>
                <Input
                  placeholder="e.g. UN1090, 1263"
                  value={searchParams.un_number || ""}
                  onChange={(e) => updateFilter("un_number", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Factory className="h-3 w-3" />
                  Manufacturer
                </Label>
                <Input
                  placeholder="Manufacturer name"
                  value={searchParams.manufacturer || ""}
                  onChange={(e) => updateFilter("manufacturer", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Product Name</Label>
                <Input
                  placeholder="Product or chemical name"
                  value={searchParams.product_name || ""}
                  onChange={(e) => updateFilter("product_name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Hazard Class
                </Label>
                <select
                  value={searchParams.hazard_class || ""}
                  onChange={(e) => updateFilter("hazard_class", e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Classes</option>
                  <option value="1">Class 1 - Explosives</option>
                  <option value="2.1">Class 2.1 - Flammable Gases</option>
                  <option value="2.2">Class 2.2 - Non-flammable Gases</option>
                  <option value="2.3">Class 2.3 - Toxic Gases</option>
                  <option value="3">Class 3 - Flammable Liquids</option>
                  <option value="4.1">Class 4.1 - Flammable Solids</option>
                  <option value="4.2">Class 4.2 - Spontaneously Combustible</option>
                  <option value="4.3">Class 4.3 - Dangerous When Wet</option>
                  <option value="5.1">Class 5.1 - Oxidizing Substances</option>
                  <option value="5.2">Class 5.2 - Organic Peroxides</option>
                  <option value="6.1">Class 6.1 - Toxic Substances</option>
                  <option value="6.2">Class 6.2 - Infectious Substances</option>
                  <option value="7">Class 7 - Radioactive Material</option>
                  <option value="8">Class 8 - Corrosive Substances</option>
                  <option value="9">Class 9 - Miscellaneous</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Language
                </Label>
                <select
                  value={searchParams.language || ""}
                  onChange={(e) => updateFilter("language", e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Languages</option>
                  <option value="EN">English</option>
                  <option value="FR">French</option>
                  <option value="ES">Spanish</option>
                  <option value="DE">German</option>
                  <option value="IT">Italian</option>
                  <option value="PT">Portuguese</option>
                  <option value="NL">Dutch</option>
                  <option value="SV">Swedish</option>
                  <option value="NO">Norwegian</option>
                  <option value="DA">Danish</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <select
                  value={searchParams.status || ""}
                  onChange={(e) => updateFilter("status", e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="SUPERSEDED">Superseded</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            {/* Chemical Properties Filters */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-blue-600" />
                Chemical Properties
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Physical State</Label>
                  <select
                    value={searchParams.physical_state || ""}
                    onChange={(e) => updateFilter("physical_state", e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">All States</option>
                    <option value="SOLID">Solid</option>
                    <option value="LIQUID">Liquid</option>
                    <option value="GAS">Gas</option>
                    <option value="AEROSOL">Aerosol</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-red-500" />
                    Min Flash Point (°C)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 20"
                    value={searchParams.flash_point_min || ""}
                    onChange={(e) => updateFilter("flash_point_min", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-orange-500" />
                    Max Flash Point (°C)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 100"
                    value={searchParams.flash_point_max || ""}
                    onChange={(e) => updateFilter("flash_point_max", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Hazard Code
                  </Label>
                  <Input
                    placeholder="e.g. H314, H272"
                    value={searchParams.hazard_code || ""}
                    onChange={(e) => updateFilter("hazard_code", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include_expired"
                    checked={searchParams.include_expired || false}
                    onChange={(e) => updateFilter("include_expired", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="include_expired" className="text-sm cursor-pointer">
                    Include expired SDS documents
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {activeFilters.length > 0 ? (
                  <span>{activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} applied</span>
                ) : (
                  <span>No filters applied</span>
                )}
              </div>
              
              <div className="flex gap-2">
                {activeFilters.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-1"
                >
                  <ChevronUp className="h-3 w-3" />
                  Collapse
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
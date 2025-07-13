"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Smartphone,
  AlertTriangle,
  Download,
  Eye,
  QrCode,
  MapPin,
  Phone,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  Thermometer,
  Droplets,
  Shield,
} from "lucide-react";
import {
  useSDSLookup,
  useSafetyDataSheets,
  type SafetyDataSheet,
} from "@/hooks/useSDS";
import { useSearchDangerousGoods } from "@/hooks/useDangerousGoods";

interface SDSMobileLookupProps {
  className?: string;
}

export default function SDSMobileLookup({ className = "" }: SDSMobileLookupProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDangerousGoodId, setSelectedDangerousGoodId] = useState("");
  const [language, setLanguage] = useState("EN");
  const [countryCode, setCountryCode] = useState("AU");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);

  const { data: searchResults } = useSearchDangerousGoods(searchTerm, searchTerm.length >= 2);
  const lookupMutation = useSDSLookup();
  const { data: frequentSDS } = useSafetyDataSheets({ 
    query: "", 
    status: "ACTIVE",
    language 
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get user location for emergency services
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you'd reverse geocode this
          setCurrentLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
        },
        (error) => {
          console.warn("Geolocation error:", error);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sds-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.warn("Failed to load recent searches:", error);
      }
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('sds-recent-searches', JSON.stringify(updated));
  };

  const handleQuickLookup = async (dangerousGoodId: string, term: string) => {
    try {
      setSelectedDangerousGoodId(dangerousGoodId);
      saveRecentSearch(term);
      
      await lookupMutation.mutateAsync({
        dangerous_good_id: dangerousGoodId,
        language,
        country_code: countryCode,
      });
    } catch (error) {
      console.error("SDS lookup failed:", error);
    }
  };

  const handleEmergencyInfo = (sds: SafetyDataSheet) => {
    // Extract emergency information for quick access
    const emergencyData = {
      productName: sds.product_name,
      unNumber: sds.dangerous_good.un_number,
      hazardClass: sds.dangerous_good.hazard_class,
      emergencyContacts: sds.emergency_contacts,
      firstAid: sds.first_aid_measures,
      location: currentLocation,
    };

    // In a real app, this could open an emergency modal or call emergency services
    console.log("Emergency Info:", emergencyData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile SDS Lookup
            </div>
            <div className="flex items-center gap-2">
              {isOffline ? (
                <WifiOff className="h-4 w-4 text-red-300" />
              ) : (
                <Wifi className="h-4 w-4 text-green-300" />
              )}
              {currentLocation && (
                <MapPin className="h-4 w-4 text-blue-300" />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-blue-100">
            Quick access to Safety Data Sheets for drivers and field personnel
          </div>
          {isOffline && (
            <Alert className="mt-3 border-red-300 bg-red-50">
              <WifiOff className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                You're offline. Some features may be limited.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-4 w-4" />
            Quick SDS Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="UN number or chemical name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.slice(0, 5).map((dg) => (
                <div
                  key={dg.id}
                  onClick={() => handleQuickLookup(dg.id, `${dg.un_number} ${dg.proper_shipping_name}`)}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {dg.un_number} - {dg.proper_shipping_name}
                    </div>
                    <div className="text-xs text-gray-600">
                      Class {dg.hazard_class}
                      {dg.packing_group && ` • PG ${dg.packing_group}`}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}

          {/* Language & Country Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1"
              >
                <option value="EN">English</option>
                <option value="FR">French</option>
                <option value="ES">Spanish</option>
                <option value="DE">German</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1"
              >
                <option value="AU">Australia</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SDS Lookup Result */}
      {lookupMutation.data && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Eye className="h-4 w-4" />
              SDS Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-green-900">
                {lookupMutation.data.product_name}
              </h3>
              <div className="text-sm text-green-700 mt-1">
                {lookupMutation.data.manufacturer} • Version {lookupMutation.data.version}
              </div>
            </div>

            {/* Key Safety Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-2 rounded border">
                <div className="text-xs font-medium text-gray-500 mb-1">UN Number</div>
                <div className="text-sm font-mono text-gray-900">
                  {lookupMutation.data.dangerous_good.un_number}
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="text-xs font-medium text-gray-500 mb-1">Hazard Class</div>
                <Badge variant="outline" className="text-xs">
                  Class {lookupMutation.data.dangerous_good.hazard_class}
                </Badge>
              </div>
            </div>

            {/* Physical Properties */}
            {(lookupMutation.data.physical_state || lookupMutation.data.flash_point_celsius) && (
              <div className="grid grid-cols-2 gap-3">
                {lookupMutation.data.physical_state && (
                  <div className="bg-white p-2 rounded border">
                    <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      State
                    </div>
                    <div className="text-sm text-gray-900 capitalize">
                      {lookupMutation.data.physical_state.toLowerCase()}
                    </div>
                  </div>
                )}
                {lookupMutation.data.flash_point_celsius && (
                  <div className="bg-white p-2 rounded border">
                    <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      Flash Point
                    </div>
                    <div className="text-sm text-gray-900">
                      {lookupMutation.data.flash_point_celsius}°C
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleEmergencyInfo(lookupMutation.data!)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Phone className="h-3 w-3 mr-1" />
                Emergency Info
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={!lookupMutation.data.document?.file_url}
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>

            {/* Document Info */}
            <div className="text-xs text-green-700 bg-white p-2 rounded border">
              📄 {lookupMutation.data.document?.original_filename} 
              ({formatFileSize(lookupMutation.data.document?.file_size || 0)})
              <br />
              📅 Revised: {new Date(lookupMutation.data.revision_date).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {lookupMutation.isPending && (
        <Card>
          <CardContent className="text-center py-6">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Looking up SDS...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {lookupMutation.error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {lookupMutation.error instanceof Error 
              ? lookupMutation.error.message 
              : "Failed to find SDS document"}
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-4 w-4" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm(search)}
                  className="w-full justify-start text-left h-auto p-2"
                >
                  <div className="truncate">
                    <div className="text-sm">{search}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequently Accessed SDS */}
      {frequentSDS?.results && frequentSDS.results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-4 w-4" />
              Frequently Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {frequentSDS.results.slice(0, 3).map((sds) => (
                <div
                  key={sds.id}
                  onClick={() => handleQuickLookup(sds.dangerous_good.id, sds.product_name)}
                  className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {sds.product_name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {sds.dangerous_good.un_number} • {sds.manufacturer}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Scanner Option */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="text-center py-6">
          <QrCode className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Scan QR code on dangerous goods packaging
          </p>
          <Button variant="outline" size="sm" disabled>
            <QrCode className="h-3 w-3 mr-1" />
            Open Scanner
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Feature coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
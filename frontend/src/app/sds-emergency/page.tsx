"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  AlertTriangle,
  Search,
  Phone,
  MapPin,
  Clock,
  Zap,
  Navigation,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import SDSEmergencyInfo from "@/shared/components/sds/SDSEmergencyInfo";
import { useSDSLookup } from "@/shared/hooks/useSDS";
import { useSearchDangerousGoods } from "@/shared/hooks/useDangerousGoods";

export default function SDSEmergencyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [emergencyContacted, setEmergencyContacted] = useState(false);

  const { data: searchResults } = useSearchDangerousGoods(searchTerm, searchTerm.length >= 2);
  const lookupMutation = useSDSLookup();

  // Get user location immediately for emergency services
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(
            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          );
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setCurrentLocation("Location unavailable");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  const handleQuickLookup = async (dangerousGoodId: string) => {
    try {
      await lookupMutation.mutateAsync({
        dangerous_good_id: dangerousGoodId,
        language: "EN",
        country_code: "AU",
      });
    } catch (error) {
      console.error("Emergency SDS lookup failed:", error);
    }
  };

  const handleEmergencyCall = () => {
    if (window.confirm("Call emergency services (000)?")) {
      setEmergencyContacted(true);
      window.location.href = "tel:000";
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-red-50 p-4">
        {/* Emergency Header */}
        <Card className="border-red-500 bg-red-600 text-white mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                EMERGENCY SDS LOOKUP
              </div>
              <div className="flex items-center gap-2 text-sm">
                {currentLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {currentLocation}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-100 text-sm mb-4">
              Quick access to critical safety information for dangerous goods incidents
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleEmergencyCall}
                className="bg-red-800 hover:bg-red-900 text-white"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call 000
              </Button>
              
              <Button
                variant="outline"
                className="border-red-300 text-white hover:bg-red-700"
                onClick={() => window.location.href = "tel:131126"}
              >
                <Phone className="h-4 w-4 mr-2" />
                Poison Control
              </Button>
              
              <Button
                variant="outline"
                className="border-red-300 text-white hover:bg-red-700"
                onClick={() => window.location.href = "tel:1800803772"}
              >
                <Phone className="h-4 w-4 mr-2" />
                HAZMAT Hotline
              </Button>
            </div>

            {emergencyContacted && (
              <Alert className="mt-4 border-green-300 bg-green-100">
                <Phone className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Emergency services contacted. Stay on the line and follow their instructions.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Quick Search */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Zap className="h-5 w-5" />
              Quick SDS Lookup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Enter UN number or chemical name (e.g. UN1090, Acetone)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 text-lg h-12"
                  autoFocus
                />
              </div>

              {/* Quick Search Results */}
              {searchResults && searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Quick Results:</h4>
                  {searchResults.slice(0, 3).map((dg) => (
                    <Button
                      key={dg.id}
                      onClick={() => handleQuickLookup(dg.id)}
                      variant="outline"
                      className="w-full justify-start h-auto p-4 text-left"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {dg.un_number} - {dg.proper_shipping_name}
                        </div>
                        <div className="text-sm text-red-600">
                          Class {dg.hazard_class} Dangerous Good
                        </div>
                      </div>
                      <Navigation className="h-4 w-4 text-gray-400" />
                    </Button>
                  ))}
                </div>
              )}

              {lookupMutation.isPending && (
                <Alert>
                  <Search className="h-4 w-4" />
                  <AlertDescription>
                    Looking up emergency information...
                  </AlertDescription>
                </Alert>
              )}

              {lookupMutation.error && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Could not find SDS information. Contact emergency services immediately if this is an active incident.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Information Display */}
        {lookupMutation.data && (
          <SDSEmergencyInfo
            sds={lookupMutation.data}
            currentLocation={currentLocation || undefined}
          />
        )}

        {/* Quick Reference for Common Emergencies */}
        {!lookupMutation.data && (
          <Card className="border-yellow-500 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-900">
                <AlertTriangle className="h-5 w-5" />
                General Emergency Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-yellow-900">For Spills:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Evacuate the immediate area</li>
                    <li>• Prevent entry into waterways</li>
                    <li>• Eliminate ignition sources</li>
                    <li>• Call HAZMAT response team</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-yellow-900">For Exposure:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Remove person from danger</li>
                    <li>• Flush with water if safe to do so</li>
                    <li>• Do not induce vomiting</li>
                    <li>• Seek immediate medical attention</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-yellow-900">For Fires:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Evacuate area immediately</li>
                    <li>• Call fire department</li>
                    <li>• Do not use water on chemical fires</li>
                    <li>• Stay upwind of incident</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-yellow-900">For Transport Incidents:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Secure the scene</li>
                    <li>• Identify the material (UN number)</li>
                    <li>• Contact emergency services</li>
                    <li>• Provide wind direction information</li>
                  </ul>
                </div>
              </div>

              <Alert className="border-red-300 bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>When in doubt, evacuate and call emergency services immediately.</strong>
                  <br />
                  Your safety is more important than property.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
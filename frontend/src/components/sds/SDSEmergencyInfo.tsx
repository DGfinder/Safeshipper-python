"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Phone,
  AlertTriangle,
  MapPin,
  Clock,
  Thermometer,
  Droplets,
  Shield,
  Eye,
  Heart,
  Flame,
  Wind,
  Navigation,
  Users,
  Truck,
  Activity,
  FileText,
  ExternalLink,
} from "lucide-react";
import { type SafetyDataSheet } from "@/hooks/useSDS";

interface SDSEmergencyInfoProps {
  sds: SafetyDataSheet;
  currentLocation?: string;
  className?: string;
}

interface EmergencyContact {
  type: string;
  number: string;
  description: string;
}

export default function SDSEmergencyInfo({
  sds,
  currentLocation,
  className = "",
}: SDSEmergencyInfoProps) {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [incidentReported, setIncidentReported] = useState(false);

  useEffect(() => {
    // Parse emergency contacts from SDS data
    const contacts: EmergencyContact[] = [];
    
    // Add manufacturer emergency contact
    if (sds.emergency_contacts) {
      Object.entries(sds.emergency_contacts).forEach(([key, value]) => {
        if (typeof value === "string" && value.includes("phone") || value.includes("tel")) {
          contacts.push({
            type: "Manufacturer Emergency",
            number: String(value),
            description: `${sds.manufacturer} emergency hotline`,
          });
        } else if (typeof value === "object" && value.phone) {
          contacts.push({
            type: "Manufacturer Emergency",
            number: value.phone,
            description: `${sds.manufacturer} emergency hotline`,
          });
        }
      });
    }

    // Add regional emergency numbers based on country
    const regionalContacts = getRegionalEmergencyContacts(sds.country_code);
    contacts.push(...regionalContacts);

    setEmergencyContacts(contacts);
  }, [sds]);

  const getRegionalEmergencyContacts = (countryCode: string): EmergencyContact[] => {
    const contactsByCountry: Record<string, EmergencyContact[]> = {
      AU: [
        { type: "Emergency Services", number: "000", description: "Police, Fire, Ambulance" },
        { type: "Poison Control", number: "13 11 26", description: "Poisons Information Centre" },
        { type: "HAZMAT Hotline", number: "1800 803 772", description: "24/7 Chemical Emergency" },
      ],
      US: [
        { type: "Emergency Services", number: "911", description: "Police, Fire, Ambulance" },
        { type: "Poison Control", number: "1-800-222-1222", description: "National Poison Control" },
        { type: "CHEMTREC", number: "1-800-424-9300", description: "Chemical Emergency Response" },
      ],
      CA: [
        { type: "Emergency Services", number: "911", description: "Police, Fire, Ambulance" },
        { type: "Poison Control", number: "1-844-764-7669", description: "Poison Control Centre" },
        { type: "CANUTEC", number: "1-888-226-8832", description: "Transport Emergency Response" },
      ],
      GB: [
        { type: "Emergency Services", number: "999", description: "Police, Fire, Ambulance" },
        { type: "Poison Control", number: "0344 892 0111", description: "National Poisons Information" },
        { type: "Chemical Incident", number: "0800 321 3734", description: "Public Health England" },
      ],
    };

    return contactsByCountry[countryCode] || contactsByCountry.AU;
  };

  const handleEmergencyCall = (number: string) => {
    // In a real mobile app, this would initiate a phone call
    if (window.confirm(`Call ${number}?`)) {
      window.location.href = `tel:${number}`;
    }
  };

  const handleReportIncident = () => {
    setIncidentReported(true);
    // In a real app, this would send incident data to monitoring systems
    console.log("Incident reported for:", {
      product: sds.product_name,
      unNumber: sds.dangerous_good.un_number,
      location: currentLocation,
      timestamp: new Date().toISOString(),
    });
  };

  const getHazardClassInfo = (hazardClass: string) => {
    const hazardInfo: Record<string, { color: string; icon: React.ReactNode; risks: string[] }> = {
      "1": {
        color: "bg-orange-600",
        icon: <AlertTriangle className="h-4 w-4" />,
        risks: ["Explosion risk", "Fire hazard", "Keep away from heat/sparks"],
      },
      "2.1": {
        color: "bg-red-600",
        icon: <Flame className="h-4 w-4" />,
        risks: ["Flammable gas", "Fire/explosion risk", "Ventilation required"],
      },
      "2.3": {
        color: "bg-gray-600",
        icon: <Wind className="h-4 w-4" />,
        risks: ["Toxic gas", "Inhalation hazard", "Evacuate area immediately"],
      },
      "3": {
        color: "bg-red-600",
        icon: <Flame className="h-4 w-4" />,
        risks: ["Flammable liquid", "Fire hazard", "Keep away from ignition sources"],
      },
      "6.1": {
        color: "bg-purple-600",
        icon: <AlertTriangle className="h-4 w-4" />,
        risks: ["Toxic substance", "Health hazard", "Avoid skin/eye contact"],
      },
      "8": {
        color: "bg-gray-800",
        icon: <Droplets className="h-4 w-4" />,
        risks: ["Corrosive", "Burns skin/eyes", "Use protective equipment"],
      },
    };

    return hazardInfo[hazardClass] || {
      color: "bg-orange-600",
      icon: <AlertTriangle className="h-4 w-4" />,
      risks: ["Dangerous goods", "Follow safety procedures"],
    };
  };

  const hazardInfo = getHazardClassInfo(sds.dangerous_good.hazard_class);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Emergency Header */}
      <Card className="border-red-500 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            EMERGENCY INFORMATION
          </CardTitle>
          <div className="text-sm text-red-800">
            {sds.product_name} • {sds.dangerous_good.un_number} • Class {sds.dangerous_good.hazard_class}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`${hazardInfo.color} text-white`}>
              {hazardInfo.icon}
              <span className="ml-1">Class {sds.dangerous_good.hazard_class}</span>
            </Badge>
            {currentLocation && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {currentLocation}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {new Date().toLocaleTimeString()}
            </Badge>
          </div>

          {!incidentReported ? (
            <Button
              onClick={handleReportIncident}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Activity className="h-4 w-4 mr-2" />
              REPORT INCIDENT
            </Button>
          ) : (
            <Alert className="border-green-500 bg-green-50">
              <Activity className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Incident reported. Emergency services may contact you shortly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-red-600" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {emergencyContacts.map((contact, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
            >
              <div>
                <div className="font-medium text-gray-900">{contact.type}</div>
                <div className="text-sm text-gray-600">{contact.description}</div>
              </div>
              <Button
                onClick={() => handleEmergencyCall(contact.number)}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Phone className="h-3 w-3 mr-1" />
                {contact.number}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Immediate Hazards */}
      <Card className="border-orange-500 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Shield className="h-5 w-5" />
            Immediate Hazards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hazardInfo.risks.map((risk, index) => (
              <div key={index} className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span className="text-sm font-medium">{risk}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* First Aid Quick Reference */}
      {sds.first_aid_measures && Object.keys(sds.first_aid_measures).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-600" />
              First Aid Quick Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(sds.first_aid_measures).map(([route, instructions]) => {
              const routeIcons: Record<string, React.ReactNode> = {
                eye_contact: <Eye className="h-4 w-4 text-blue-600" />,
                skin_contact: <Users className="h-4 w-4 text-orange-600" />,
                inhalation: <Wind className="h-4 w-4 text-gray-600" />,
                ingestion: <Heart className="h-4 w-4 text-red-600" />,
              };

              return (
                <div key={route} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    {routeIcons[route] || <Heart className="h-4 w-4 text-red-600" />}
                    <span className="font-medium text-gray-900 capitalize">
                      {route.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {typeof instructions === 'string' 
                      ? instructions 
                      : JSON.stringify(instructions)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Transport Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Transport Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-lg font-bold text-gray-900">
                {sds.dangerous_good.un_number}
              </div>
              <div className="text-xs text-gray-600">UN Number</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-lg font-bold text-gray-900">
                {sds.dangerous_good.hazard_class}
              </div>
              <div className="text-xs text-gray-600">Hazard Class</div>
            </div>
          </div>

          <div className="text-sm">
            <div className="font-medium text-gray-900">Proper Shipping Name:</div>
            <div className="text-gray-700">{sds.dangerous_good.proper_shipping_name}</div>
          </div>

          {sds.dangerous_good.packing_group && (
            <div className="text-sm">
              <div className="font-medium text-gray-900">Packing Group:</div>
              <div className="text-gray-700">{sds.dangerous_good.packing_group}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Physical Properties Alert */}
      {(sds.flash_point_celsius || sds.physical_state) && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Thermometer className="h-5 w-5" />
              Physical Properties Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sds.flash_point_celsius && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-900">Flash Point:</span>
                <Badge variant="outline" className="border-yellow-400 text-yellow-800">
                  {sds.flash_point_celsius}°C
                </Badge>
              </div>
            )}
            {sds.physical_state && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-900">Physical State:</span>
                <Badge variant="outline" className="border-yellow-400 text-yellow-800 capitalize">
                  {sds.physical_state.toLowerCase()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-green-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={!sds.document?.file_url}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Full SDS Document
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Share Emergency Info
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Get Directions to Nearest Hospital
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
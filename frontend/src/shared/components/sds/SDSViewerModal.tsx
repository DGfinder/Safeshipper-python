"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  FileText,
  Download,
  AlertTriangle,
  Factory,
  Globe,
  Calendar,
  Shield,
} from "lucide-react";
import { type SafetyDataSheet } from "@/shared/hooks/useSDS";
import SDSDocumentPreview from "./SDSDocumentPreview";

interface SDSViewerModalProps {
  sds: SafetyDataSheet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (sdsId: string) => void;
}

export default function SDSViewerModal({
  sds,
  open,
  onOpenChange,
  onDownload,
}: SDSViewerModalProps) {
  if (!sds) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload(sds.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "SUPERSEDED":
        return "bg-gray-100 text-gray-800";
      case "UNDER_REVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "DRAFT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {sds.product_name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(sds.status)}>
                {sds.status_display}
              </Badge>
              {sds.is_expired && (
                <Badge className="bg-red-100 text-red-800">
                  Expired
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            </div>
          </div>

          {/* SDS Summary Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Factory className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-medium">Manufacturer</div>
                <div className="text-gray-600">{sds.manufacturer}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-medium">UN Number</div>
                <div className="text-gray-600">{sds.dangerous_good.un_number}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">Language</div>
                <div className="text-gray-600">{sds.language_display}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">Revision</div>
                <div className="text-gray-600">
                  {new Date(sds.revision_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="preview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">Document Preview</TabsTrigger>
              <TabsTrigger value="details">SDS Details</TabsTrigger>
              <TabsTrigger value="safety">Safety Information</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
              <div className="h-full overflow-auto">
                <SDSDocumentPreview
                  sds={sds}
                  onDownload={handleDownload}
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="flex-1 overflow-auto mt-4">
              <div className="space-y-6">
                {/* Product Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Product Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Product Name</label>
                        <p className="text-gray-900">{sds.product_name}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">Manufacturer</label>
                        <p className="text-gray-900">{sds.manufacturer}</p>
                      </div>
                      
                      {sds.manufacturer_code && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Manufacturer Code</label>
                          <p className="text-gray-900">{sds.manufacturer_code}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">Version</label>
                        <p className="text-gray-900">{sds.version}</p>
                      </div>
                      
                      {sds.supersedes_version && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Supersedes Version</label>
                          <p className="text-gray-900">{sds.supersedes_version}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      Dangerous Good Classification
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">UN Number</label>
                        <p className="text-gray-900 font-mono">{sds.dangerous_good.un_number}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">Proper Shipping Name</label>
                        <p className="text-gray-900">{sds.dangerous_good.proper_shipping_name}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">Hazard Class</label>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Class {sds.dangerous_good.hazard_class}
                        </Badge>
                      </div>
                      
                      {sds.dangerous_good.packing_group && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Packing Group</label>
                          <p className="text-gray-900">{sds.dangerous_good.packing_group}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Physical Properties */}
                {(sds.physical_state || sds.color || sds.odor || sds.flash_point_celsius) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Physical Properties</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {sds.physical_state && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Physical State</label>
                          <p className="text-gray-900 capitalize">{sds.physical_state.toLowerCase()}</p>
                        </div>
                      )}
                      
                      {sds.color && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Color</label>
                          <p className="text-gray-900">{sds.color}</p>
                        </div>
                      )}
                      
                      {sds.odor && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Odor</label>
                          <p className="text-gray-900">{sds.odor}</p>
                        </div>
                      )}
                      
                      {sds.flash_point_celsius && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Flash Point</label>
                          <p className="text-gray-900">{sds.flash_point_celsius}°C</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Regulatory Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Regulatory Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Language</label>
                      <p className="text-gray-900">{sds.language_display}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Country Code</label>
                      <p className="text-gray-900">{sds.country_code}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Regulatory Standard</label>
                      <p className="text-gray-900">{sds.regulatory_standard}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="safety" className="flex-1 overflow-auto mt-4">
              <div className="space-y-6">
                {/* Hazard Information */}
                {sds.hazard_statements.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Hazard Statements
                    </h3>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {sds.hazard_statements.map((statement, index) => (
                          <li key={index} className="text-red-800 text-sm">
                            • {statement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Precautionary Statements */}
                {sds.precautionary_statements.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Precautionary Statements</h3>
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {sds.precautionary_statements.map((statement, index) => (
                          <li key={index} className="text-yellow-800 text-sm">
                            • {statement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* First Aid Measures */}
                {sds.first_aid_measures && Object.keys(sds.first_aid_measures).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">First Aid Measures</h3>
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      {Object.entries(sds.first_aid_measures).map(([key, value]) => (
                        <div key={key} className="mb-3 last:mb-0">
                          <h4 className="font-medium text-blue-900 capitalize mb-1">
                            {key.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-blue-800 text-sm">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {sds.emergency_contacts && Object.keys(sds.emergency_contacts).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Emergency Contact Information</h3>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      {Object.entries(sds.emergency_contacts).map(([key, value]) => (
                        <div key={key} className="mb-2 last:mb-0">
                          <span className="font-medium text-green-900 capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>{" "}
                          <span className="text-green-800">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
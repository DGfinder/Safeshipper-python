"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  AlertTriangle,
  Phone,
  Eye,
  Thermometer,
  Droplets,
  Flame,
  Shield,
  FileText,
  Printer,
  Download,
  Info,
} from "lucide-react";
import { type EPGData } from "@/services/epgTemplateService";

interface EPGViewerProps {
  epgData: EPGData;
  className?: string;
  showActions?: boolean;
}

export default function EPGViewer({
  epgData,
  className = "",
  showActions = true,
}: EPGViewerProps) {
  const [isPrintMode, setIsPrintMode] = useState(false);

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  const getHazardIcon = (category: string) => {
    switch (category) {
      case "fire":
        return <Flame className="h-4 w-4 text-red-600" />;
      case "spill":
        return <Droplets className="h-4 w-4 text-blue-600" />;
      case "exposure":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "transport":
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white";
      case "high":
        return "bg-orange-600 text-white";
      case "medium":
        return "bg-yellow-600 text-white";
      case "low":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getExposureIcon = (exposureType: string) => {
    switch (exposureType) {
      case "eyes":
        return <Eye className="h-4 w-4 text-blue-600" />;
      case "inhalation":
        return <Thermometer className="h-4 w-4 text-purple-600" />;
      case "skin":
        return <Droplets className="h-4 w-4 text-green-600" />;
      case "ingestion":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div
      className={`bg-white ${isPrintMode ? "print:shadow-none" : "shadow-lg"} ${className}`}
    >
      {/* Actions Bar */}
      {showActions && !isPrintMode && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 print:hidden">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Emergency Procedure Guide
            </h2>
            <p className="text-sm text-gray-600">
              Generated: {new Date(epgData.generatedDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      )}

      <div className="p-6 max-w-4xl mx-auto print:p-4 print:max-w-none">
        {/* Header */}
        <div className="text-center mb-8 print:mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 print:text-xl">
                Emergency Procedure Guide - Transport
              </h1>
              <p className="text-lg font-semibold text-[#153F9F] print:text-base">
                {epgData.chemicalName}
              </p>
            </div>
          </div>

          {/* Basic Info Table */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm print:text-xs">
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium text-gray-600">UN NO.</span>
              <p className="font-bold text-lg text-gray-900">
                {epgData.unNumber}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium text-gray-600">HAZCHEM</span>
              <p className="font-bold text-lg text-gray-900">
                {epgData.hazchemCode}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium text-gray-600">CLASS</span>
              <p className="font-bold text-lg text-gray-900">
                {epgData.hazardClass}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium text-gray-600">APPEARANCE</span>
              <p className="font-bold text-gray-900 text-sm">
                WHITE TO OFF-WHITE GRANULAR SOLID, SLIGHT ODOUR
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-4">
          {/* Left Column */}
          <div className="space-y-6 print:space-y-4">
            {/* Health Hazards */}
            <section>
              <div className="bg-black text-white p-3 print:p-2">
                <h2 className="font-bold text-center">Health Hazards</h2>
              </div>
              <div className="border border-gray-300 p-4 print:p-3">
                <div className="grid grid-cols-1 gap-4 text-sm print:text-xs">
                  <div>
                    <span className="font-medium text-gray-700">
                      Hazard Summary
                    </span>
                    <p className="text-gray-900 mt-1">
                      {epgData.hazardSummary}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Special hazards
                    </span>
                    <div className="mt-1">
                      {epgData.specialHazards.map((hazard, index) => (
                        <p key={index} className="text-gray-900">
                          {hazard}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Reactivity
                    </span>
                    <p className="text-gray-900 mt-1">{epgData.reactivity}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Precautions */}
            <section>
              <div className="bg-black text-white p-3 print:p-2">
                <h2 className="font-bold text-center">Precautions</h2>
              </div>
              <div className="border border-gray-300 p-4 print:p-3">
                <div className="text-sm print:text-xs">
                  {epgData.precautions.map((precaution, index) => (
                    <p key={index} className="text-gray-900 mb-2">
                      {precaution}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            {/* Emergency Contact */}
            <section>
              <div className="bg-black text-white p-3 print:p-2">
                <h2 className="font-bold text-center">Emergency Contact</h2>
              </div>
              <div className="border border-gray-300 p-4 print:p-3">
                <div className="space-y-3 text-sm print:text-xs">
                  {epgData.emergencyContacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">
                        {contact.organization}
                      </span>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[#153F9F]" />
                        <span className="font-bold text-gray-900">
                          {contact.phone}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6 print:space-y-4">
            {/* Emergency Procedures */}
            <section>
              <div className="bg-black text-white p-3 print:p-2">
                <h2 className="font-bold text-center">Emergency Procedures</h2>
              </div>
              <div className="border border-gray-300">
                <table className="w-full text-sm print:text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 print:p-2 font-medium">
                        If this happens
                      </th>
                      <th className="text-left p-3 print:p-2 font-medium">
                        Do this
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {epgData.emergencyProcedures.map((procedure, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="p-3 print:p-2 align-top">
                          <div className="flex items-start gap-2">
                            {getHazardIcon(procedure.category)}
                            <div>
                              <span className="font-medium text-gray-900">
                                {procedure.scenario}
                              </span>
                              <Badge
                                className={`ml-2 text-xs ${getSeverityColor(procedure.severity)}`}
                              >
                                {procedure.severity.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 print:p-2 text-gray-900">
                          {procedure.immediateActions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* First Aid */}
            <section>
              <div className="bg-black text-white p-3 print:p-2">
                <h2 className="font-bold text-center">First Aid</h2>
              </div>
              <div className="border border-gray-300">
                <table className="w-full text-sm print:text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 print:p-2 font-medium">
                        Exposure
                      </th>
                      <th className="text-left p-3 print:p-2 font-medium">
                        Treatment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {epgData.firstAidProcedures.map((procedure, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="p-3 print:p-2 align-top">
                          <div className="flex items-center gap-2">
                            {getExposureIcon(procedure.exposureType)}
                            <span className="font-medium text-gray-900 capitalize">
                              {procedure.exposureType}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 print:p-2 text-gray-900">
                          {procedure.procedure}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        {/* Extinguishing Media */}
        <section className="mt-6 print:mt-4">
          <div className="bg-black text-white p-3 print:p-2">
            <h2 className="font-bold text-center">Extinguishing Media</h2>
          </div>
          <div className="border border-gray-300 p-4 print:p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm print:text-xs">
              {epgData.extinguishingMedia.map((media, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-600" />
                  <span className="text-gray-900">{media}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 print:mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500 print:text-xs">
          <p>
            Emergency Procedure Guide v{epgData.documentVersion} | Generated by
            SafeShipper
          </p>
          <p>Generated: {new Date(epgData.generatedDate).toLocaleString()}</p>
          <p className="mt-2">
            Regulatory References: {epgData.regulatoryReferences.join(", ")}
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:p-3 {
            padding: 0.75rem !important;
          }
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:text-base {
            font-size: 1rem !important;
          }
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:gap-4 {
            gap: 1rem !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem !important;
          }
          .print\\:mt-4 {
            margin-top: 1rem !important;
          }
          .print\\:mt-6 {
            margin-top: 1.5rem !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }

          @page {
            margin: 1cm;
            size: A4;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

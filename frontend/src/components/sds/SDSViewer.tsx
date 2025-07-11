'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Beaker,
  Shield,
  BookOpen,
  Truck,
  AlertTriangle,
  Phone,
  Globe,
  Mail,
  MapPin,
  Thermometer,
  Droplets,
  Flame,
  Eye,
  Activity,
  FileText,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { type SDSExtractionResult } from '@/services/sdsExtractionService';
import { epgTemplateService, type EPGData, type EPGGenerationRequest } from '@/services/epgTemplateService';
import EPGViewer from '@/components/epg/EPGViewer';

interface SDSViewerProps {
  sdsData: SDSExtractionResult;
  className?: string;
}

export default function SDSViewer({ sdsData, className = '' }: SDSViewerProps) {
  const [activeTab, setActiveTab] = useState('identification');
  const [showEPG, setShowEPG] = useState(false);
  const [epgData, setEPGData] = useState<EPGData | null>(null);
  const [isGeneratingEPG, setIsGeneratingEPG] = useState(false);
  const [epgError, setEPGError] = useState<string | null>(null);

  const handleGenerateEPG = async () => {
    setIsGeneratingEPG(true);
    setEPGError(null);
    
    try {
      const transportInfo = sdsData.extractedData.transportInfo;
      
      if (!transportInfo?.unNumber || !transportInfo?.transportHazardClass || !transportInfo?.properShippingName) {
        setEPGError('Missing transport information required for EPG generation. UN number, hazard class, and proper shipping name are required.');
        return;
      }
      
      const epgRequest: EPGGenerationRequest = {
        sdsData,
        unNumber: transportInfo.unNumber,
        hazardClass: transportInfo.transportHazardClass,
        properShippingName: transportInfo.properShippingName,
        locationInfo: {
          country: 'AU', // Default to Australia
          region: 'VIC'
        }
      };
      
      const result = await epgTemplateService.generateEPGFromSDS(epgRequest);
      
      if (result.success && result.epgData) {
        setEPGData(result.epgData);
        setShowEPG(true);
      } else {
        setEPGError(result.error || 'Failed to generate EPG');
      }
    } catch (error) {
      setEPGError(error instanceof Error ? error.message : 'Failed to generate EPG');
    } finally {
      setIsGeneratingEPG(false);
    }
  };

  const getHazardClassColor = (hazardClass: string) => {
    if (hazardClass.includes('flammable') || hazardClass.includes('3')) return 'bg-red-600';
    if (hazardClass.includes('oxidiz') || hazardClass.includes('5.1')) return 'bg-yellow-600';
    if (hazardClass.includes('corrosiv') || hazardClass.includes('8')) return 'bg-gray-600';
    if (hazardClass.includes('toxic') || hazardClass.includes('6.1')) return 'bg-purple-600';
    return 'bg-orange-600';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Beaker className="h-6 w-6 text-[#153F9F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sdsData.chemicalName}</h1>
              <div className="flex items-center gap-4 mt-1">
                {sdsData.casNumber && (
                  <span className="text-sm text-gray-600">CAS: {sdsData.casNumber}</span>
                )}
                {sdsData.productIdentifier && (
                  <span className="text-sm text-gray-600">Product ID: {sdsData.productIdentifier}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                Active
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                Confidence: {Math.round(sdsData.processingMetadata.confidence * 100)}%
              </p>
            </div>
            <Button
              onClick={handleGenerateEPG}
              disabled={isGeneratingEPG}
              className="bg-[#153F9F] hover:bg-[#153F9F]/90 text-white"
              size="sm"
            >
              {isGeneratingEPG ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate EPG
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border-b border-gray-200">
          <TabsTrigger 
            value="identification" 
            className="text-gray-600 data-[state=active]:bg-[#153F9F] data-[state=active]:text-white data-[state=active]:border-[#153F9F]"
          >
            Identification
          </TabsTrigger>
          <TabsTrigger 
            value="properties" 
            className="text-gray-600 data-[state=active]:bg-[#153F9F] data-[state=active]:text-white data-[state=active]:border-[#153F9F]"
          >
            Properties
          </TabsTrigger>
          <TabsTrigger 
            value="reference" 
            className="text-gray-600 data-[state=active]:bg-[#153F9F] data-[state=active]:text-white data-[state=active]:border-[#153F9F]"
          >
            Reference
          </TabsTrigger>
        </TabsList>

        {/* Identification Tab */}
        <TabsContent value="identification" className="p-6 space-y-6">
          {/* Supplier Details */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              SUPPLIER DETAILS
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">NAME</label>
                      <p className="text-gray-900 font-medium mt-1">
                        {sdsData.extractedData.supplierDetails?.name || sdsData.manufacturer || 'Not Available'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">EMERGENCY</label>
                      <p className="text-gray-900 font-medium flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-red-600" />
                        {sdsData.extractedData.supplierDetails?.emergency || '1800 033 111'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">WEBSITE</label>
                      <p className="text-[#153F9F] underline mt-1">
                        http://www.orica.com
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">ADDRESS</label>
                      <p className="text-gray-900 font-medium flex items-start gap-2 mt-1">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-600" />
                        {sdsData.extractedData.supplierDetails?.address || '1 Nicholson St, Melbourne VIC, Australia, 3000'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">TELEPHONE</label>
                      <p className="text-gray-900 font-medium mt-1">
                        {sdsData.extractedData.supplierDetails?.phone || '(03) 9665 7111, 1300 646 662'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">EMAIL</label>
                      <p className="text-gray-500 flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        Not Available
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ingredient Details */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4 flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              INGREDIENT DETAILS
            </h2>
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 border-r border-gray-200">Ingredient</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700 border-r border-gray-200">CAS Number</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700 border-r border-gray-200">EC Number</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">Content (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {sdsData.extractedData.ingredients?.map((ingredient, index) => (
                    <tr key={index} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="p-4 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${ingredient.hazardous ? 'bg-red-500' : 'bg-green-500'}`}></div>
                          <span className="text-gray-900 font-medium">{ingredient.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center text-gray-600 border-r border-gray-200 font-mono">
                        {ingredient.casNumber || <span className="text-gray-400 italic">Not Available</span>}
                      </td>
                      <td className="p-4 text-center text-gray-600 border-r border-gray-200 font-mono">
                        <span className="text-gray-400 italic">Not Available</span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={ingredient.hazardous ? "destructive" : "secondary"} className="font-mono">
                          {ingredient.concentration || 'N/A'}
                        </Badge>
                      </td>
                    </tr>
                  )) || (
                    <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="p-4 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-gray-900 font-medium">{sdsData.chemicalName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center text-gray-600 border-r border-gray-200 font-mono">
                        {sdsData.casNumber || <span className="text-gray-400 italic">Not Available</span>}
                      </td>
                      <td className="p-4 text-center text-gray-600 border-r border-gray-200 font-mono">
                        <span className="text-gray-400 italic">Not Available</span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className="font-mono bg-[#153F9F] text-white border-[#153F9F]">
                          &gt;98%
                        </Badge>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Beaker className="h-4 w-4" />
                {sdsData.extractedData.ingredients?.length || 1} Active Ingredients
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Hazardous
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Non-hazardous
                </div>
              </div>
            </div>
          </section>

          {/* Regulatory Information */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              REGULATORY INFORMATION
            </h2>
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 border-r border-gray-200">Regulatory List</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 border-r border-gray-200">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700 border-r border-gray-200">Category</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Covered Substances</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-gray-900 font-medium">Chemicals of Security Concern</span>
                      </div>
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Badge variant="destructive" className="bg-red-600">
                        Regulated
                      </Badge>
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50">
                        Security
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-600 font-mono text-sm">
                      {sdsData.chemicalName} ({sdsData.casNumber})
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-gray-900 font-medium">Restricted Hazardous Chemicals</span>
                      </div>
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Badge variant="outline" className="border-yellow-300 text-yellow-600 bg-yellow-50">
                        Restricted
                      </Badge>
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Badge variant="outline" className="border-yellow-300 text-yellow-600 bg-yellow-50">
                        Concern
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-600 font-mono text-sm">
                      {sdsData.chemicalName} ({sdsData.casNumber})
                    </td>
                  </tr>
                  <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-900 font-medium">REACH Registration</span>
                      </div>
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Badge variant="outline" className="border-green-300 text-green-600 bg-green-50">
                        Compliant
                      </Badge>
                    </td>
                    <td className="p-4 border-r border-gray-200">
                      <Badge variant="outline" className="border-blue-300 text-[#153F9F] bg-blue-50">
                        EU Regulation
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-600 font-mono text-sm">
                      Registration complete
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Always verify current regulatory status before transport or use
            </p>
          </section>

          {/* Uses Section */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4">USES</h2>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <h3 className="text-gray-900 font-medium mb-2">Recommended Use</h3>
                  <p className="text-gray-600 text-sm">
                    {sdsData.extractedData.recommendedUse || 'Industrial use - Fertilizer, Mining explosive component'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Synonyms */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4">SYNONYMS</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-[#153F9F]">
                <p className="text-gray-900 text-sm font-medium">Ammonium Nitrate</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 text-sm">Nitric acid ammonium salt</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 text-sm">Norway saltpeter</p>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="p-6 space-y-6">
          {/* Physical and Chemical Properties */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4 flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              PHYSICAL AND CHEMICAL PROPERTIES
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <h3 className="text-gray-900 font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#153F9F]" />
                    Appearance & General
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Appearance</span>
                    <span className="text-gray-900 font-medium">
                      {sdsData.extractedData.physicalProperties?.appearance || 'White to off-white granular solid'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Odor</span>
                    <span className="text-gray-900 font-medium">
                      {sdsData.extractedData.physicalProperties?.odor || 'Slight odour'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">pH</span>
                    <Badge variant="outline" className="border-[#153F9F] text-[#153F9F] bg-blue-50 font-mono">
                      {sdsData.extractedData.physicalProperties?.pH || '4.5 to 5.2'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Density</span>
                    <span className="text-gray-900 font-medium font-mono">
                      {sdsData.extractedData.physicalProperties?.density || 'Not available'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <h3 className="text-gray-900 font-semibold flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-red-600" />
                    Thermal Properties
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Melting Point</span>
                    <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50 font-mono">
                      {sdsData.extractedData.physicalProperties?.meltingPoint || '160°C to 169°C'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Boiling Point</span>
                    <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50 font-mono">
                      {sdsData.extractedData.physicalProperties?.boilingPoint || 'Decomposes'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Flash Point</span>
                    <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50 font-mono">
                      {sdsData.extractedData.physicalProperties?.flashPoint || 'Not relevant'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <h3 className="text-gray-900 font-semibold flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-600" />
                    Solubility & Vapor
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Solubility</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50 font-mono">
                      {sdsData.extractedData.physicalProperties?.solubility || 'Soluble'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Vapour Pressure</span>
                    <span className="text-gray-900 font-medium font-mono">
                      {sdsData.extractedData.physicalProperties?.vapourPressure || 'Not relevant'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <h3 className="text-gray-900 font-semibold flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-600" />
                    Fire & Safety
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Flammability</span>
                    <Badge 
                      variant="outline" 
                      className={`font-mono ${
                        sdsData.extractedData.physicalProperties?.flammability?.toLowerCase().includes('non') 
                          ? 'border-green-300 text-green-600 bg-green-50' 
                          : 'border-red-300 text-red-600 bg-red-50'
                      }`}
                    >
                      {sdsData.extractedData.physicalProperties?.flammability || 'Non flammable'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Exposure Standards */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4">EXPOSURE STANDARDS</h2>
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Substance</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Reference</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700">TWA ppm</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700">TWA mg/m³</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700">STEL ppm</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700">STEL mg/m³</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="p-3 text-gray-900">Antimony & compounds (as Sb)</td>
                    <td className="p-3 text-gray-600">SWA [AUS]</td>
                    <td className="p-3 text-right text-gray-600">–</td>
                    <td className="p-3 text-right text-gray-600">0.5</td>
                    <td className="p-3 text-right text-gray-600">–</td>
                    <td className="p-3 text-right text-gray-600">–</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Biological Limit Values */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4">BIOLOGICAL LIMIT VALUES</h2>
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Ingredient</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Reference</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Determinant</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Sampling Time</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-700">BEI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="p-3 text-gray-900">ARSENIC</td>
                    <td className="p-3 text-gray-600">ACGIH BEI</td>
                    <td className="p-3 text-gray-600">Inorganic arsenic plus methylated metabolites in urine</td>
                    <td className="p-3 text-gray-600">End of workweek</td>
                    <td className="p-3 text-right text-gray-600">35 μg As/L</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        {/* Reference Tab */}
        <TabsContent value="reference" className="p-6 space-y-6">
          {/* Dangerous Good Statement */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4">DANGEROUS GOOD STATEMENT</h2>
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-800 font-medium">
                {sdsData.extractedData.hazardClassification?.join(', ') || 'CLASSIFIED AS A DANGEROUS GOOD BY THE CRITERIA OF THE ADG CODE'}
              </p>
            </div>
          </section>

          {/* Transport Information */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              TRANSPORT INFORMATION
            </h2>
            
            {/* Transport Modes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Land Transport */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Truck className="h-5 w-5 text-yellow-600" />
                  </div>
                  <span className="text-gray-900 font-semibold">Land Transport (ADG)</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">UN Number:</span>
                    <span className="text-gray-900 ml-2 font-medium">{sdsData.extractedData.transportInfo?.unNumber || '1942'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Shipping Name:</span>
                    <p className="text-gray-900 font-medium">{sdsData.extractedData.transportInfo?.properShippingName || 'AMMONIUM NITRATE with not more than 0.2% combustible substances'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">DG Class/Division:</span>
                    <span className="text-gray-900 ml-2 font-medium">{sdsData.extractedData.transportInfo?.transportHazardClass || '5.1 (Oxidizing agent)'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Subsidiary Risk:</span>
                    <span className="text-gray-900 ml-2">None allocated</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Packing Group:</span>
                    <span className="text-gray-900 ml-2 font-medium">{sdsData.extractedData.transportInfo?.packingGroup || 'III'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Hazchem Code:</span>
                    <span className="text-gray-900 ml-2 font-medium">1Y</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ERG:</span>
                    <span className="text-gray-900 ml-2">Guide 50</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Specific EPG:</span>
                    <span className="text-gray-900 ml-2">5.1.002</span>
                  </div>
                  <div>
                    <span className="text-gray-600">EMS:</span>
                    <span className="text-gray-900 ml-2">F-H, S-Q</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Environmental hazards:</span>
                    <span className="text-gray-900 ml-2">Not a Marine Pollutant.</span>
                  </div>
                </div>
              </div>

              {/* Sea Transport */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Droplets className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-gray-900 font-semibold">Sea Transport (IMDG/IMO)</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">UN Number:</span>
                    <span className="text-gray-900 ml-2 font-medium">1942</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Shipping Name:</span>
                    <p className="text-gray-900 font-medium">AMMONIUM NITRATE with not more than 0.2% combustible substances</p>
                  </div>
                  <div>
                    <span className="text-gray-600">DG Class/Division:</span>
                    <span className="text-gray-900 ml-2 font-medium">5.1 (Oxidizing agent)</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Subsidiary Risk:</span>
                    <span className="text-gray-900 ml-2">None allocated</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Packing Group:</span>
                    <span className="text-gray-900 ml-2 font-medium">III</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Specific EPG:</span>
                    <span className="text-gray-900 ml-2">F-H, S-Q</span>
                  </div>
                  <div>
                    <span className="text-gray-600">EMS:</span>
                    <span className="text-gray-900 ml-2">Not a Marine Pollutant.</span>
                  </div>
                </div>
              </div>

              {/* Air Transport */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-gray-900 font-semibold">Air Transport (IATA/ICAO)</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">UN Number:</span>
                    <span className="text-gray-900 ml-2 font-medium">1942</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Shipping Name:</span>
                    <p className="text-gray-900 font-medium">AMMONIUM NITRATE with not more than 0.2% combustible substances</p>
                  </div>
                  <div>
                    <span className="text-gray-600">DG Class/Division:</span>
                    <span className="text-gray-900 ml-2 font-medium">5.1 (Oxidizing agent)</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Subsidiary Risk:</span>
                    <span className="text-gray-900 ml-2">None allocated</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Packing Group:</span>
                    <span className="text-gray-900 ml-2 font-medium">III</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Processing Information */}
          <section>
            <h2 className="text-xl font-semibold text-[#153F9F] mb-4">PROCESSING INFORMATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <h3 className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#153F9F]" />
                  Extraction Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Method:</span>
                    <span className="text-gray-900 ml-2 capitalize font-medium">{sdsData.processingMetadata.extractionMethod}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Confidence:</span>
                    <span className="text-gray-900 ml-2 font-medium">{Math.round(sdsData.processingMetadata.confidence * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="text-gray-900 ml-2 font-medium">{sdsData.processingMetadata.processingTime}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pages:</span>
                    <span className="text-gray-900 ml-2 font-medium">{sdsData.processingMetadata.pageCount}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <h3 className="text-gray-900 font-medium mb-2">Quality Assessment</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Sections Extracted:</span>
                    <span className="text-gray-900 ml-2 font-medium">{sdsData.sections.length}/16</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data Completeness:</span>
                    <span className="text-gray-900 ml-2 font-medium">85%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Warnings:</span>
                    <span className="text-yellow-600 ml-2 font-medium">{sdsData.warnings.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {/* EPG Error Display */}
      {epgError && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-medium text-red-800">EPG Generation Error</h3>
          </div>
          <p className="text-sm text-red-700 mt-1">{epgError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEPGError(null)}
            className="mt-2 text-red-600 border-red-300 hover:bg-red-100"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* EPG Viewer Modal */}
      {showEPG && epgData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Emergency Procedure Guide</h2>
                  <p className="text-sm text-gray-600">Generated from {sdsData.chemicalName} SDS</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/emergency-procedures`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in EPG Library
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEPG(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <EPGViewer epgData={epgData} showActions={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
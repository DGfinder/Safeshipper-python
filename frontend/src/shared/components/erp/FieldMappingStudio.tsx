"use client";

import { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Plus, 
  Save, 
  RotateCcw, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Settings
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

interface FieldMapping {
  id: string;
  erpField: string;
  erpFieldType: string;
  erpFieldDescription?: string;
  safeShipperField: string;
  safeShipperFieldType: string;
  safeShipperFieldDescription?: string;
  transformationType: 'direct' | 'format' | 'lookup' | 'calculated' | 'conditional';
  transformationRule?: string;
  isRequired: boolean;
  isActive: boolean;
  lastTested?: string;
  testStatus?: 'passed' | 'failed' | 'warning';
  testResults?: string;
}

interface ERPSystem {
  id: string;
  name: string;
  type: string;
  availableFields: ERPField[];
}

interface ERPField {
  name: string;
  type: string;
  description?: string;
  isRequired: boolean;
  sampleValue?: string;
}

interface SafeShipperField {
  name: string;
  type: string;
  description?: string;
  isRequired: boolean;
  validation?: string;
}

export default function FieldMappingStudio() {
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['shipment', 'customer']);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data
  const erpSystems: ERPSystem[] = [
    {
      id: "sap",
      name: "SAP ERP Central",
      type: "sap",
      availableFields: [
        { name: "VBELN", type: "string", description: "Sales Document Number", isRequired: true, sampleValue: "0000123456" },
        { name: "KUNNR", type: "string", description: "Customer Number", isRequired: true, sampleValue: "CUST001" },
        { name: "MATNR", type: "string", description: "Material Number", isRequired: true, sampleValue: "MAT-001" },
        { name: "MENGE", type: "number", description: "Quantity", isRequired: true, sampleValue: "100" },
        { name: "WAERK", type: "string", description: "Currency", isRequired: false, sampleValue: "USD" },
        { name: "NETWR", type: "decimal", description: "Net Value", isRequired: false, sampleValue: "1500.00" }
      ]
    },
    {
      id: "oracle",
      name: "Oracle ERP Cloud",
      type: "oracle",
      availableFields: [
        { name: "ORDER_NUMBER", type: "string", description: "Order Number", isRequired: true, sampleValue: "ORD-2024-001" },
        { name: "CUSTOMER_ID", type: "string", description: "Customer ID", isRequired: true, sampleValue: "12345" },
        { name: "ITEM_CODE", type: "string", description: "Item Code", isRequired: true, sampleValue: "ITEM001" },
        { name: "QUANTITY", type: "number", description: "Order Quantity", isRequired: true, sampleValue: "50" }
      ]
    }
  ];

  const safeShipperFields: { [key: string]: SafeShipperField[] } = {
    shipment: [
      { name: "tracking_number", type: "string", description: "SafeShipper Tracking Number", isRequired: true },
      { name: "external_reference", type: "string", description: "External Reference Number", isRequired: true },
      { name: "shipment_type", type: "string", description: "Type of Shipment", isRequired: true, validation: "standard|express|priority" },
      { name: "origin_address", type: "string", description: "Origin Address", isRequired: true },
      { name: "destination_address", type: "string", description: "Destination Address", isRequired: true },
      { name: "total_weight", type: "decimal", description: "Total Weight (kg)", isRequired: true },
      { name: "total_value", type: "decimal", description: "Total Declared Value", isRequired: false }
    ],
    customer: [
      { name: "customer_code", type: "string", description: "Customer Code", isRequired: true },
      { name: "company_name", type: "string", description: "Company Name", isRequired: true },
      { name: "contact_email", type: "email", description: "Contact Email", isRequired: true },
      { name: "contact_phone", type: "string", description: "Contact Phone", isRequired: false },
      { name: "billing_address", type: "string", description: "Billing Address", isRequired: true }
    ],
    items: [
      { name: "item_code", type: "string", description: "Item/SKU Code", isRequired: true },
      { name: "item_description", type: "string", description: "Item Description", isRequired: true },
      { name: "quantity", type: "number", description: "Quantity", isRequired: true },
      { name: "unit_weight", type: "decimal", description: "Unit Weight (kg)", isRequired: true },
      { name: "unit_value", type: "decimal", description: "Unit Value", isRequired: false },
      { name: "hazmat_class", type: "string", description: "Hazardous Material Class", isRequired: false }
    ]
  };

  useEffect(() => {
    // Load existing mappings
    const mockMappings: FieldMapping[] = [
      {
        id: "1",
        erpField: "VBELN",
        erpFieldType: "string",
        erpFieldDescription: "Sales Document Number",
        safeShipperField: "external_reference",
        safeShipperFieldType: "string",
        safeShipperFieldDescription: "External Reference Number",
        transformationType: "direct",
        isRequired: true,
        isActive: true,
        lastTested: "2024-07-14T10:30:00Z",
        testStatus: "passed"
      },
      {
        id: "2",
        erpField: "KUNNR",
        erpFieldType: "string", 
        erpFieldDescription: "Customer Number",
        safeShipperField: "customer_code",
        safeShipperFieldType: "string",
        safeShipperFieldDescription: "Customer Code",
        transformationType: "format",
        transformationRule: "CUST-{value}",
        isRequired: true,
        isActive: true,
        lastTested: "2024-07-14T10:30:00Z",
        testStatus: "passed"
      },
      {
        id: "3",
        erpField: "MENGE",
        erpFieldType: "number",
        erpFieldDescription: "Quantity",
        safeShipperField: "quantity",
        safeShipperFieldType: "number",
        safeShipperFieldDescription: "Quantity",
        transformationType: "direct",
        isRequired: true,
        isActive: true,
        lastTested: "2024-07-14T10:25:00Z",
        testStatus: "warning",
        testResults: "Some values may exceed maximum quantity limits"
      }
    ];

    setTimeout(() => {
      setMappings(mockMappings);
      setSelectedSystem("sap");
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'passed': return <Check className="h-4 w-4" />;
      case 'failed': return <X className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const handleDragStart = (fieldName: string) => {
    setDraggedField(fieldName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault();
    if (draggedField && selectedSystem) {
      // Create new mapping
      const newMapping: FieldMapping = {
        id: Math.random().toString(36).substr(2, 9),
        erpField: draggedField,
        erpFieldType: "string", // Would get from ERP field data
        safeShipperField: targetField,
        safeShipperFieldType: "string", // Would get from SafeShipper field data
        transformationType: "direct",
        isRequired: false,
        isActive: true
      };
      setMappings(prev => [...prev, newMapping]);
    }
    setDraggedField(null);
  };

  const selectedSystemData = erpSystems.find(s => s.id === selectedSystem);
  const activeMappings = mappings.filter(m => m.isActive);
  const mappingStats = {
    total: mappings.length,
    active: activeMappings.length,
    tested: mappings.filter(m => m.lastTested).length,
    passed: mappings.filter(m => m.testStatus === 'passed').length,
    failed: mappings.filter(m => m.testStatus === 'failed').length
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Field Mapping Studio</h2>
          <p className="text-gray-600">Map ERP fields to SafeShipper fields with drag and drop</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy Mappings
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Save Mappings
          </Button>
        </div>
      </div>

      {/* ERP System Selection */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">ERP System:</label>
            <Select value={selectedSystem} onValueChange={setSelectedSystem}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select ERP System" />
              </SelectTrigger>
              <SelectContent>
                {erpSystems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6 text-sm text-gray-600 ml-8">
            <div>
              <span className="font-medium text-gray-900">{mappingStats.total}</span> mappings
            </div>
            <div>
              <span className="font-medium text-green-600">{mappingStats.passed}</span> tested
            </div>
            <div>
              <span className="font-medium text-gray-900">{mappingStats.active}</span> active
            </div>
          </div>
        </div>
      </Card>

      {/* Main Mapping Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ERP Fields */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">ERP Fields</h3>
            <Badge variant="outline">{selectedSystemData?.name}</Badge>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedSystemData?.availableFields.map((field) => (
              <div
                key={field.name}
                draggable
                onDragStart={() => handleDragStart(field.name)}
                className="p-3 border rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{field.name}</span>
                    {field.isRequired && (
                      <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {field.type}
                  </Badge>
                </div>
                {field.description && (
                  <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                )}
                {field.sampleValue && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sample: <code className="bg-gray-100 px-1 rounded">{field.sampleValue}</code>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Mapping Arrow */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center space-y-2 text-gray-400">
            <ArrowRight className="h-8 w-8" />
            <span className="text-sm">Drag to map</span>
          </div>
        </div>

        {/* SafeShipper Fields */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">SafeShipper Fields</h3>
            <Badge variant="outline">Target Schema</Badge>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(safeShipperFields).map(([groupName, fields]) => (
              <div key={groupName}>
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-50 rounded"
                >
                  {expandedGroups.includes(groupName) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium text-gray-700 capitalize">{groupName}</span>
                  <Badge variant="outline" className="text-xs">
                    {fields.length} fields
                  </Badge>
                </button>
                
                {expandedGroups.includes(groupName) && (
                  <div className="ml-6 space-y-2">
                    {fields.map((field) => (
                      <div
                        key={field.name}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, field.name)}
                        className="p-2 border border-dashed border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{field.name}</span>
                          <div className="flex items-center space-x-1">
                            {field.isRequired && (
                              <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                        </div>
                        {field.description && (
                          <p className="text-xs text-gray-600">{field.description}</p>
                        )}
                        {field.validation && (
                          <p className="text-xs text-blue-600">
                            Valid: {field.validation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Current Mappings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Current Mappings</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Test All
            </Button>
            <Button variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {mappings.map((mapping) => (
            <div key={mapping.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 flex-1">
                  {/* ERP Field */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-blue-600">{mapping.erpField}</span>
                      <Badge variant="outline" className="text-xs">
                        {mapping.erpFieldType}
                      </Badge>
                    </div>
                    {mapping.erpFieldDescription && (
                      <p className="text-xs text-gray-600">{mapping.erpFieldDescription}</p>
                    )}
                  </div>

                  {/* Transformation */}
                  <div className="flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <Badge className="bg-purple-100 text-purple-800">
                      {mapping.transformationType}
                    </Badge>
                    {mapping.transformationRule && (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {mapping.transformationRule}
                      </code>
                    )}
                  </div>

                  {/* SafeShipper Field */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-green-600">{mapping.safeShipperField}</span>
                      <Badge variant="outline" className="text-xs">
                        {mapping.safeShipperFieldType}
                      </Badge>
                      {mapping.isRequired && (
                        <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {mapping.safeShipperFieldDescription && (
                      <p className="text-xs text-gray-600">{mapping.safeShipperFieldDescription}</p>
                    )}
                  </div>

                  {/* Test Status */}
                  {mapping.testStatus && (
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(mapping.testStatus)}>
                        {getStatusIcon(mapping.testStatus)}
                        <span className="ml-1">{mapping.testStatus}</span>
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {/* Test Results */}
              {mapping.testResults && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  {mapping.testResults}
                </div>
              )}
            </div>
          ))}
        </div>

        {mappings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p>No mappings configured. Drag ERP fields to SafeShipper fields to create mappings.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Progress } from "@/shared/components/ui/progress";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  Calendar,
  Globe,
  Factory,
} from "lucide-react";
import { useSDSUpload, type SDSUploadRequest } from "@/shared/hooks/useSDS";
import { useSearchDangerousGoods, type DangerousGood } from "@/shared/hooks/useDangerousGoods";

interface SDSUploadFormProps {
  onUploadSuccess?: (sdsId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  file: File | null;
  dangerous_good_id: string;
  product_name: string;
  manufacturer: string;
  version: string;
  revision_date: string;
  language: string;
  country_code: string;
}

export default function SDSUploadForm({ onUploadSuccess, onCancel }: SDSUploadFormProps) {
  const [formData, setFormData] = useState<FormData>({
    file: null,
    dangerous_good_id: "",
    product_name: "",
    manufacturer: "",
    version: "",
    revision_date: "",
    language: "EN",
    country_code: "AU",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDangerousGood, setSelectedDangerousGood] = useState<DangerousGood | null>(null);
  const [showDangerousGoodsSearch, setShowDangerousGoodsSearch] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useSDSUpload();
  const { data: searchResults } = useSearchDangerousGoods(searchTerm, searchTerm.length >= 2);

  // File validation function
  const validateFile = (file: File): string[] => {
    const errors: string[] = [];
    
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      errors.push("File must be a PDF document");
    }
    
    if (file.size > 25 * 1024 * 1024) { // 25MB limit
      errors.push("File size must be less than 25MB");
    }
    
    if (file.size < 1024) {
      errors.push("File appears to be too small to be a valid SDS");
    }
    
    return errors;
  };

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const errors = validateFile(file);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      setValidationErrors([]);
      setFormData(prev => ({ ...prev, file }));
      
      // Auto-extract product name from filename if not set
      if (!formData.product_name) {
        const filename = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const cleanName = filename.replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        setFormData(prev => ({ ...prev, product_name: cleanName }));
      }
    }
  }, [formData.product_name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    maxSize: 25 * 1024 * 1024, // 25MB
  });

  const handleDangerousGoodSelect = (dangerousGood: DangerousGood) => {
    setSelectedDangerousGood(dangerousGood);
    setFormData(prev => ({ ...prev, dangerous_good_id: dangerousGood.id }));
    setShowDangerousGoodsSearch(false);
    setSearchTerm("");
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.file) errors.push("Please select an SDS file");
    if (!formData.dangerous_good_id) errors.push("Please select a dangerous good");
    if (!formData.product_name.trim()) errors.push("Product name is required");
    if (!formData.manufacturer.trim()) errors.push("Manufacturer is required");
    if (!formData.version.trim()) errors.push("Version is required");
    if (!formData.revision_date) errors.push("Revision date is required");
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    
    try {
      const uploadData: SDSUploadRequest = {
        file: formData.file!,
        dangerous_good_id: formData.dangerous_good_id,
        product_name: formData.product_name.trim(),
        manufacturer: formData.manufacturer.trim(),
        version: formData.version.trim(),
        revision_date: formData.revision_date,
        language: formData.language,
        country_code: formData.country_code,
      };
      
      // Simulate upload progress
      setUploadProgress(10);
      
      const result = await uploadMutation.mutateAsync(uploadData);
      
      setUploadProgress(100);
      
      if (onUploadSuccess) {
        onUploadSuccess(result.sds_id);
      }
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : "Upload failed"]);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setFormData(prev => ({ ...prev, file: null }));
    setValidationErrors([]);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-6 w-6 text-blue-600" />
          Upload Safety Data Sheet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <Label className="text-base font-medium">SDS Document</Label>
          
          {!formData.file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? "Drop the SDS file here" : "Upload SDS Document"}
                  </p>
                  <p className="text-gray-600">
                    Drag and drop your PDF file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports PDF files up to 25MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{formData.file.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(formData.file.size)} • PDF Document
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dangerous Good Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Associated Dangerous Good *</Label>
          
          {!selectedDangerousGood ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by UN number or shipping name (e.g. UN1090, Acetone)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDangerousGoodsSearch(e.target.value.length >= 2);
                  }}
                  className="pl-10"
                />
              </div>
              
              {showDangerousGoodsSearch && searchResults && searchResults.length > 0 && (
                <div className="border rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((dg) => (
                    <div
                      key={dg.id}
                      onClick={() => handleDangerousGoodSelect(dg)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {dg.un_number} - {dg.proper_shipping_name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                            <span>Class {dg.hazard_class}</span>
                            {dg.packing_group && <span>PG {dg.packing_group}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {dg.hazard_class}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedDangerousGood.un_number} - {selectedDangerousGood.proper_shipping_name}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span>Hazard Class {selectedDangerousGood.hazard_class}</span>
                      {selectedDangerousGood.packing_group && (
                        <span>Packing Group {selectedDangerousGood.packing_group}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDangerousGood(null);
                    setFormData(prev => ({ ...prev, dangerous_good_id: "" }));
                  }}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* SDS Information Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="product_name">Product Name *</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => handleInputChange("product_name", e.target.value)}
              placeholder="Commercial product name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer *</Label>
            <div className="relative">
              <Factory className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange("manufacturer", e.target.value)}
                placeholder="Manufacturer name"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">SDS Version *</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(e) => handleInputChange("version", e.target.value)}
              placeholder="e.g., 1.0, 2.3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="revision_date">Revision Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="revision_date"
                type="date"
                value={formData.revision_date}
                onChange={(e) => handleInputChange("revision_date", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange("language", e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm"
              >
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="country_code">Country Code</Label>
            <select
              id="country_code"
              value={formData.country_code}
              onChange={(e) => handleInputChange("country_code", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="AU">Australia (AU)</option>
              <option value="US">United States (US)</option>
              <option value="CA">Canada (CA)</option>
              <option value="GB">United Kingdom (GB)</option>
              <option value="DE">Germany (DE)</option>
              <option value="FR">France (FR)</option>
              <option value="ES">Spain (ES)</option>
              <option value="IT">Italy (IT)</option>
            </select>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <p key={index}>• {error}</p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {uploadMutation.isSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              SDS uploaded successfully! Document is now available in the library.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={uploadMutation.isPending || !formData.file}
            className="flex items-center gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload SDS
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
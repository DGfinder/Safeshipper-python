'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Download
} from 'lucide-react';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
  duration?: number;
}

export default function ManifestWorkflowTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const updateTestResult = (step: string, status: TestResult['status'], message?: string, data?: any, duration?: number) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.step === step);
      const newResult = { step, status, message, data, duration };
      
      if (existing) {
        return prev.map(r => r.step === step ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runWorkflowTest = async () => {
    if (!selectedFile) {
      alert('Please select the SAP PDF file first');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: File Validation
      updateTestResult('File Validation', 'running', 'Validating PDF file...');
      const startTime = Date.now();
      
      const { manifestService } = await import('@/services/manifestService');
      const validation = manifestService.validatePDFFile(selectedFile);
      
      if (validation.valid) {
        updateTestResult('File Validation', 'success', 'PDF file is valid', validation, Date.now() - startTime);
      } else {
        updateTestResult('File Validation', 'error', validation.errors.join(', '), validation, Date.now() - startTime);
        return;
      }

      // Test 2: Upload and Analysis
      updateTestResult('Manifest Analysis', 'running', 'Uploading and analyzing manifest...');
      const analysisStart = Date.now();
      
      const analysisResponse = await manifestService.uploadAndAnalyzeManifest({
        file: selectedFile,
        analysisOptions: {
          detectDangerousGoods: true,
          extractMetadata: true,
          validateFormat: true
        }
      });

      if (analysisResponse.success) {
        updateTestResult('Manifest Analysis', 'success', 
          `Found ${analysisResponse.results?.dangerousGoods.length || 0} dangerous goods`, 
          analysisResponse.results, 
          Date.now() - analysisStart
        );
      } else {
        updateTestResult('Manifest Analysis', 'error', analysisResponse.error || 'Analysis failed', null, Date.now() - analysisStart);
      }

      // Test 3: Compatibility Checking
      if (analysisResponse.results?.dangerousGoods && analysisResponse.results.dangerousGoods.length > 1) {
        updateTestResult('Compatibility Check', 'running', 'Checking dangerous goods compatibility...');
        const compatStart = Date.now();
        
        const { compatibilityService } = await import('@/services/compatibilityService');
        const dgItems = analysisResponse.results.dangerousGoods.map(dg => ({
          id: dg.id,
          un: dg.un,
          class: dg.class,
          subHazard: dg.subHazard,
          packingGroup: dg.packingGroup,
          properShippingName: dg.properShippingName
        }));

        const compatibilityResult = await compatibilityService.checkCompatibility(dgItems);
        updateTestResult('Compatibility Check', 'success', 
          `Compatibility: ${compatibilityResult.compatible ? 'OK' : 'Issues found'}`, 
          compatibilityResult, 
          Date.now() - compatStart
        );

        // Test 4: Document Generation
        updateTestResult('Document Generation', 'running', 'Generating transport documents...');
        const docStart = Date.now();
        
        const { documentService } = await import('@/services/documentService');
        const docRequest = {
          type: 'COMPLETE_PACKAGE' as const,
          dangerousGoods: analysisResponse.results.dangerousGoods.map(dg => ({
            id: dg.id,
            un: dg.un,
            class: dg.class,
            properShippingName: dg.properShippingName,
            quantity: dg.quantity || '1000L',
            weight: dg.weight || '1000kg'
          })),
          shipmentDetails: {
            origin: 'Test Origin',
            destination: 'Test Destination',
            transportMode: 'Sea'
          }
        };

        const docResult = await documentService.generateCompletePackage(docRequest);
        updateTestResult('Document Generation', docResult.success ? 'success' : 'error', 
          docResult.success ? 'Documents generated successfully' : docResult.error || 'Generation failed', 
          docResult, 
          Date.now() - docStart
        );
      } else {
        updateTestResult('Compatibility Check', 'pending', 'Skipped - need multiple DG items');
        updateTestResult('Document Generation', 'pending', 'Skipped - no DG items to process');
      }

    } catch (error) {
      updateTestResult('Test Execution', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setTestResults([]);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'running': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-600';
      case 'running': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manifest Workflow Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Select the SAP PDF file: "PDF DOCUMENT - Grey.pdf"
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline">
                  {selectedFile ? selectedFile.name : 'Choose File'}
                </Button>
              </label>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex justify-between items-center">
            <div>
              {selectedFile && (
                <p className="text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <Button
              onClick={runWorkflowTest}
              disabled={!selectedFile || isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? 'Running Tests...' : 'Run Workflow Test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <h3 className="font-medium">{result.step}</h3>
                        {result.message && (
                          <p className={`text-sm ${getStatusColor(result.status)}`}>
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={result.status === 'success' ? 'default' : 'outline'}>
                        {result.status}
                      </Badge>
                      {result.duration && (
                        <p className="text-xs text-gray-500 mt-1">
                          {result.duration}ms
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        View Details
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
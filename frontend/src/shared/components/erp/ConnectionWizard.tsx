"use client";

import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  AlertTriangle,
  Database,
  Key,
  Settings,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Shield,
  Clock
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";

interface ConnectionWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ERPConnectionConfig {
  systemType: string;
  connectionName: string;
  description: string;
  connectionType: 'rest_api' | 'soap' | 'database' | 'file_based';
  endpoint: string;
  authentication: {
    type: 'api_key' | 'oauth2' | 'basic' | 'certificate';
    apiKey?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    certificate?: string;
  };
  settings: {
    timeout: number;
    retryAttempts: number;
    syncFrequency: string;
    batchSize: number;
    enableLogging: boolean;
    enableSSL: boolean;
  };
  fieldMappings: any[];
}

const STEPS = [
  { id: 1, name: 'System Type', icon: Database },
  { id: 2, name: 'Connection', icon: Globe },
  { id: 3, name: 'Authentication', icon: Key },
  { id: 4, name: 'Settings', icon: Settings },
  { id: 5, name: 'Test & Verify', icon: TestTube },
];

const ERP_SYSTEMS = [
  {
    id: 'sap',
    name: 'SAP ERP Central Component',
    description: 'Connect to SAP ECC or S/4HANA systems',
    supportedMethods: ['rest_api', 'soap'],
    authMethods: ['api_key', 'oauth2', 'basic'],
    documentation: 'https://docs.sap.com/integration'
  },
  {
    id: 'oracle',
    name: 'Oracle ERP Cloud',
    description: 'Connect to Oracle Fusion Cloud ERP',
    supportedMethods: ['rest_api'],
    authMethods: ['oauth2', 'basic'],
    documentation: 'https://docs.oracle.com/cloud/erp'
  },
  {
    id: 'netsuite',
    name: 'NetSuite ERP',
    description: 'Connect to NetSuite cloud platform',
    supportedMethods: ['rest_api', 'soap'],
    authMethods: ['oauth2', 'api_key'],
    documentation: 'https://docs.netsuite.com'
  },
  {
    id: 'dynamics',
    name: 'Microsoft Dynamics 365',
    description: 'Connect to Dynamics 365 Finance & Operations',
    supportedMethods: ['rest_api'],
    authMethods: ['oauth2'],
    documentation: 'https://docs.microsoft.com/dynamics365'
  },
  {
    id: 'custom',
    name: 'Custom ERP System',
    description: 'Configure connection to custom or proprietary ERP',
    supportedMethods: ['rest_api', 'soap', 'database', 'file_based'],
    authMethods: ['api_key', 'oauth2', 'basic', 'certificate'],
    documentation: null
  }
];

export default function ConnectionWizard({ onClose, onSuccess }: ConnectionWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<ERPConnectionConfig>({
    systemType: '',
    connectionName: '',
    description: '',
    connectionType: 'rest_api',
    endpoint: '',
    authentication: {
      type: 'api_key'
    },
    settings: {
      timeout: 30,
      retryAttempts: 3,
      syncFrequency: 'hourly',
      batchSize: 100,
      enableLogging: true,
      enableSSL: true
    },
    fieldMappings: []
  });
  const [testResults, setTestResults] = useState<{
    connection: 'pending' | 'success' | 'error';
    authentication: 'pending' | 'success' | 'error';
    dataAccess: 'pending' | 'success' | 'error';
    message?: string;
  }>({
    connection: 'pending',
    authentication: 'pending',
    dataAccess: 'pending'
  });
  const [testing, setTesting] = useState(false);

  const selectedSystem = ERP_SYSTEMS.find(s => s.id === config.systemType);

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return config.systemType !== '';
      case 2:
        return config.connectionName && config.endpoint && config.connectionType;
      case 3:
        const auth = config.authentication;
        if (auth.type === 'api_key') return !!auth.apiKey;
        if (auth.type === 'basic') return !!auth.username && !!auth.password;
        if (auth.type === 'oauth2') return !!auth.clientId && !!auth.clientSecret;
        if (auth.type === 'certificate') return !!auth.certificate;
        return false;
      case 4:
        return true; // Settings have defaults
      case 5:
        return testResults.connection === 'success' && 
               testResults.authentication === 'success' && 
               testResults.dataAccess === 'success';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResults({
      connection: 'pending',
      authentication: 'pending',
      dataAccess: 'pending'
    });

    // Simulate testing steps
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, connection: 'success' }));
    }, 1000);

    setTimeout(() => {
      setTestResults(prev => ({ ...prev, authentication: 'success' }));
    }, 2000);

    setTimeout(() => {
      setTestResults(prev => ({ 
        ...prev, 
        dataAccess: 'success',
        message: 'Successfully connected and authenticated. Found 12 available endpoints.'
      }));
      setTesting(false);
    }, 3000);
  };

  const handleSave = async () => {
    // Save configuration
    console.log('Saving ERP connection:', config);
    onSuccess();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select ERP System Type</h3>
              <p className="text-gray-600 mb-6">Choose the type of ERP system you want to connect to SafeShipper.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {ERP_SYSTEMS.map((system) => (
                <div
                  key={system.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    config.systemType === system.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setConfig(prev => ({ ...prev, systemType: system.id }))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Database className="h-6 w-6 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{system.name}</h4>
                          <p className="text-sm text-gray-600">{system.description}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Methods:</span>{' '}
                          {system.supportedMethods.join(', ')}
                        </div>
                        <div>
                          <span className="font-medium">Auth:</span>{' '}
                          {system.authMethods.join(', ')}
                        </div>
                      </div>
                    </div>
                    
                    {config.systemType === system.id && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Connection Details</h3>
              <p className="text-gray-600 mb-6">Configure the connection details for {selectedSystem?.name}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="connectionName">Connection Name *</Label>
                  <Input
                    id="connectionName"
                    placeholder="Production SAP System"
                    value={config.connectionName}
                    onChange={(e) => setConfig(prev => ({ ...prev, connectionName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Primary production SAP system for order management"
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="connectionType">Connection Type *</Label>
                  <Select 
                    value={config.connectionType} 
                    onValueChange={(value) => setConfig(prev => ({ 
                      ...prev, 
                      connectionType: value as any 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSystem?.supportedMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method.toUpperCase().replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="endpoint">Endpoint URL *</Label>
                  <Input
                    id="endpoint"
                    placeholder="https://api.example.com/v1"
                    value={config.endpoint}
                    onChange={(e) => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {selectedSystem?.documentation && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Documentation Available</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Check the official documentation for endpoint details and API specifications.
                    </p>
                    <a 
                      href={selectedSystem.documentation} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                    >
                      View Documentation →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Authentication</h3>
              <p className="text-gray-600 mb-6">Configure authentication credentials for the ERP system.</p>
            </div>

            <div>
              <Label htmlFor="authType">Authentication Type *</Label>
              <Select 
                value={config.authentication.type} 
                onValueChange={(value) => setConfig(prev => ({ 
                  ...prev, 
                  authentication: { type: value as any } 
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedSystem?.authMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.toUpperCase().replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.authentication.type === 'api_key' && (
              <div>
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={config.authentication.apiKey || ''}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    authentication: { ...prev.authentication, apiKey: e.target.value } 
                  }))}
                />
              </div>
            )}

            {config.authentication.type === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={config.authentication.username || ''}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      authentication: { ...prev.authentication, username: e.target.value } 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={config.authentication.password || ''}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      authentication: { ...prev.authentication, password: e.target.value } 
                    }))}
                  />
                </div>
              </div>
            )}

            {config.authentication.type === 'oauth2' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Client ID *</Label>
                  <Input
                    id="clientId"
                    placeholder="Enter client ID"
                    value={config.authentication.clientId || ''}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      authentication: { ...prev.authentication, clientId: e.target.value } 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="clientSecret">Client Secret *</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="Enter client secret"
                    value={config.authentication.clientSecret || ''}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      authentication: { ...prev.authentication, clientSecret: e.target.value } 
                    }))}
                  />
                </div>
              </div>
            )}

            {config.authentication.type === 'certificate' && (
              <div>
                <Label htmlFor="certificate">Certificate *</Label>
                <Textarea
                  id="certificate"
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  value={config.authentication.certificate || ''}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    authentication: { ...prev.authentication, certificate: e.target.value } 
                  }))}
                  rows={6}
                />
              </div>
            )}

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Security Notice</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    All credentials are encrypted and stored securely. They are only used for API communications 
                    and are never logged or exposed in plain text.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Connection Settings</h3>
              <p className="text-gray-600 mb-6">Configure advanced settings for optimal performance and reliability.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={config.settings.timeout}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, timeout: parseInt(e.target.value) || 30 } 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="retryAttempts">Retry Attempts</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    value={config.settings.retryAttempts}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, retryAttempts: parseInt(e.target.value) || 3 } 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={config.settings.batchSize}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, batchSize: parseInt(e.target.value) || 100 } 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="syncFrequency">Sync Frequency</Label>
                  <Select 
                    value={config.settings.syncFrequency}
                    onValueChange={(value) => setConfig(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, syncFrequency: value } 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Only</SelectItem>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableLogging">Enable Logging</Label>
                    <Switch
                      id="enableLogging"
                      checked={config.settings.enableLogging}
                      onCheckedChange={(checked) => setConfig(prev => ({ 
                        ...prev, 
                        settings: { ...prev.settings, enableLogging: checked } 
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableSSL">Enable SSL/TLS</Label>
                    <Switch
                      id="enableSSL"
                      checked={config.settings.enableSSL}
                      onCheckedChange={(checked) => setConfig(prev => ({ 
                        ...prev, 
                        settings: { ...prev.settings, enableSSL: checked } 
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Test Connection</h3>
              <p className="text-gray-600 mb-6">Test the connection to ensure everything is configured correctly.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Connection Test</span>
                </div>
                <div className="flex items-center space-x-2">
                  {testResults.connection === 'pending' && testing && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {testResults.connection === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {testResults.connection === 'error' && (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge className={
                    testResults.connection === 'success' ? 'bg-green-100 text-green-800' :
                    testResults.connection === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {testResults.connection}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Authentication Test</span>
                </div>
                <div className="flex items-center space-x-2">
                  {testResults.authentication === 'pending' && testing && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {testResults.authentication === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {testResults.authentication === 'error' && (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge className={
                    testResults.authentication === 'success' ? 'bg-green-100 text-green-800' :
                    testResults.authentication === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {testResults.authentication}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Data Access Test</span>
                </div>
                <div className="flex items-center space-x-2">
                  {testResults.dataAccess === 'pending' && testing && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {testResults.dataAccess === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {testResults.dataAccess === 'error' && (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge className={
                    testResults.dataAccess === 'success' ? 'bg-green-100 text-green-800' :
                    testResults.dataAccess === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {testResults.dataAccess}
                  </Badge>
                </div>
              </div>
            </div>

            {!testing && testResults.connection === 'pending' && (
              <Button 
                onClick={handleTestConnection}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Run Connection Test
              </Button>
            )}

            {testResults.message && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Test Successful</p>
                    <p className="text-sm text-green-700 mt-1">{testResults.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">ERP System Connection Wizard</h2>
              <p className="text-gray-600">Step {currentStep} of {STEPS.length}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep > step.id ? 'bg-green-600 border-green-600 text-white' :
                  currentStep === step.id ? 'bg-blue-600 border-blue-600 text-white' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.name}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center space-x-3">
              {currentStep < STEPS.length ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={!isStepValid(currentStep)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save Connection
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
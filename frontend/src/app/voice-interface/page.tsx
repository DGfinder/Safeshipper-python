// app/voice-interface/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  RefreshCw,
  MessageSquare,
  Brain,
  Zap,
  Activity,
  Settings,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Lightbulb,
  Headphones,
  Command,
  Eye,
  TrendingUp,
  BarChart3,
  Users,
  Truck,
  Package,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { useVoiceInterface } from "@/shared/hooks/useVoiceInterface";

export default function VoiceInterfaceDashboard() {
  const [manualInput, setManualInput] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedTab, setSelectedTab] = useState("interface");

  const {
    session,
    isActive,
    isListening,
    isProcessing,
    speechSupported,
    transcript,
    finalTranscript,
    speechError,
    ttsSupported,
    isSpeaking,
    commandHistory,
    recentCommands,
    analytics,
    capabilities,
    startVoiceInterface,
    stopVoiceInterface,
    startListening,
    stopListening,
    processVoiceInput,
    executeQuickCommand,
    speak,
    stopSpeaking,
    resetTranscript,
    getSuggestedCommands,
    isLoading,
    error,
  } = useVoiceInterface();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      await processVoiceInput(manualInput);
      setManualInput("");
    }
  };

  const handleQuickCommand = (command: string) => {
    processVoiceInput(command);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'requires_clarification': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'shipment_status': return Package;
      case 'find_vehicle': return Truck;
      case 'system_status': return Activity;
      case 'emergency_alert': return AlertTriangle;
      case 'customer_inquiry': return Users;
      case 'generate_report': return BarChart3;
      default: return MessageSquare;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const suggestedCommands = getSuggestedCommands();

  return (
    <AuthGuard>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Voice-Activated Logistics Interface</h1>
            <p className="text-muted-foreground">
              Natural language commands and queries for transport operations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowTutorial(!showTutorial)}
              className="flex items-center space-x-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Tutorial</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>

        {/* System Compatibility Check */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Speech Recognition</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge className={speechSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {speechSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}
                </Badge>
              </div>
              {!speechSupported && (
                <p className="text-xs text-muted-foreground mt-1">
                  Please use Chrome, Edge, or Safari for voice recognition
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Text-to-Speech</CardTitle>
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge className={ttsSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {ttsSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Voice responses {ttsSupported ? 'enabled' : 'disabled'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {session ? `Session: ${session.sessionId.slice(-8)}` : 'No active session'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="interface">Voice Interface</TabsTrigger>
            <TabsTrigger value="commands">Command History</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
          </TabsList>

          <TabsContent value="interface" className="space-y-4">
            {/* Main Voice Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Voice Command Center</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Voice Controls */}
                <div className="flex items-center justify-center space-x-4">
                  {!isActive ? (
                    <Button
                      size="lg"
                      onClick={startVoiceInterface}
                      disabled={!speechSupported}
                      className="flex items-center space-x-2"
                    >
                      <Mic className="h-5 w-5" />
                      <span>Start Voice Interface</span>
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="lg"
                        variant={isListening ? "destructive" : "default"}
                        onClick={isListening ? stopListening : startListening}
                        disabled={isProcessing}
                        className="flex items-center space-x-2"
                      >
                        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={stopVoiceInterface}
                        className="flex items-center space-x-2"
                      >
                        <Square className="h-4 w-4" />
                        <span>End Session</span>
                      </Button>

                      {isSpeaking && (
                        <Button
                          variant="outline"
                          onClick={stopSpeaking}
                          className="flex items-center space-x-2"
                        >
                          <VolumeX className="h-4 w-4" />
                          <span>Stop Speaking</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Indicators */}
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span>Listening</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span>Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span>Speaking</span>
                  </div>
                </div>

                {/* Live Transcript */}
                {(transcript || finalTranscript) && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-2">
                      <Headphones className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Live Transcript</span>
                    </div>
                    <p className="text-gray-800">
                      <span className="font-medium">{finalTranscript}</span>
                      <span className="text-gray-500">{transcript.substring(finalTranscript.length)}</span>
                    </p>
                  </div>
                )}

                {/* Manual Input */}
                <div className="border-t pt-4">
                  <form onSubmit={handleManualSubmit} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Manual Command Input</span>
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Type a command... (e.g., 'Show status of shipment SH-2024-1001')"
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!manualInput.trim() || isLoading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Quick Commands */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Quick Commands</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {suggestedCommands.map((command, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCommand(command)}
                        disabled={isLoading}
                        className="text-left justify-start h-auto p-3"
                      >
                        <Command className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span className="text-xs">{command}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Error Display */}
                {(speechError || error) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Error</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      {speechError || error?.toString() || 'An error occurred'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Command Results */}
            {commandHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Recent Command Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {commandHistory.slice(0, 3).map((command) => {
                      const IconComponent = getIntentIcon(command.intent);
                      return (
                        <div key={command.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-4 w-4" />
                              <span className="font-medium text-sm">{command.originalText}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(command.status)}>
                                {command.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {command.confidence}% confidence
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <strong>Response:</strong> {command.response.content}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(command.timestamp)} • {command.executionTime}ms
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="commands" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Command History</CardTitle>
              </CardHeader>
              <CardContent>
                {commandHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No commands processed yet</p>
                    <p className="text-sm">Start the voice interface to begin</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commandHistory.map((command) => {
                      const IconComponent = getIntentIcon(command.intent);
                      return (
                        <div key={command.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <IconComponent className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="font-medium">{command.originalText}</div>
                                <div className="text-sm text-muted-foreground">
                                  Intent: {command.intent.replace('_', ' ')} • 
                                  Confidence: {command.confidence}% • 
                                  {formatTime(command.timestamp)}
                                </div>
                              </div>
                            </div>
                            <Badge className={getStatusColor(command.status)}>
                              {command.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium">Response:</span>
                              <p className="text-sm text-muted-foreground mt-1">{command.response.content}</p>
                            </div>

                            {command.entities.length > 0 && (
                              <div>
                                <span className="text-sm font-medium">Extracted Entities:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {command.entities.map((entity, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {entity.type}: {entity.value}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {command.response.actions && command.response.actions.length > 0 && (
                              <div>
                                <span className="text-sm font-medium">Actions:</span>
                                <div className="space-y-1 mt-1">
                                  {command.response.actions.map((action, idx) => (
                                    <div key={idx} className="text-xs text-muted-foreground">
                                      • {action.description}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {capabilities.map((capability, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{capability.intent.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{capability.description}</p>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium">Examples:</span>
                          <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                            {capability.examples.map((example, idx) => (
                              <li key={idx}>"{example}"</li>
                            ))}
                          </ul>
                        </div>
                        
                        {capability.requiredEntities.length > 0 && (
                          <div>
                            <span className="text-xs font-medium">Required:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {capability.requiredEntities.map((entity, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {entity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Commands</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalCommands || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.successRate?.toFixed(1) || 0}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.avgConfidence?.toFixed(1) || 0}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.avgExecutionTime?.toFixed(0) || 0}ms</div>
                </CardContent>
              </Card>
            </div>

            {analytics?.popularIntents && analytics.popularIntents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Popular Commands</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.popularIntents}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="intent" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tutorial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5" />
                  <span>Voice Interface Tutorial</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Getting Started</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Click "Start Voice Interface" to begin a session</li>
                    <li>Click "Start Listening" when ready to speak</li>
                    <li>Speak clearly and wait for the system to process</li>
                    <li>Listen to the voice response or read the text output</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Sample Commands</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Shipment Tracking</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>"Where is shipment SH-2024-1001?"</li>
                        <li>"Track my delivery"</li>
                        <li>"Status of shipment to Perth"</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Fleet Management</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>"Find available vehicles"</li>
                        <li>"Where is truck TRK-045?"</li>
                        <li>"Vehicle capacity check"</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">System Status</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>"System health check"</li>
                        <li>"How are operations?"</li>
                        <li>"Show system status"</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Emergency</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>"Emergency alert"</li>
                        <li>"Vehicle breakdown"</li>
                        <li>"Need help with TRK-023"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Tips for Best Results</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Speak clearly and at a normal pace</li>
                    <li>Include specific identifiers (shipment IDs, vehicle numbers)</li>
                    <li>Use natural language - the system understands context</li>
                    <li>Wait for processing to complete before speaking again</li>
                    <li>Use the manual input if voice recognition isn't working</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
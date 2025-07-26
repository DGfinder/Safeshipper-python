"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components/ui/avatar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { MobileNavWrapper } from "@/shared/components/layout/mobile-bottom-nav";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  Clock,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Paperclip,
  Send,
  Phone,
  Mail,
  Building,
  Package,
  Truck,
  Shield,
  Settings,
  FileText,
  Image,
  Archive,
  Flag,
  Tag,
  Users,
  Activity,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Info,
  Bell,
  Bookmark,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Reply,
  Forward,
  ExternalLink,
  Copy,
  Share,
  Zap,
  Database,
  Monitor,
  Globe,
  Code,
  Terminal,
  HelpCircle
} from "lucide-react";

// Mock data for support requests
const mockRequests = [
  {
    id: "REQ-2024-001",
    title: "Shipment Tracking Issue",
    description: "I'm unable to track my shipment SH-2024-001. The tracking page shows an error.",
    category: "technical",
    priority: "high",
    status: "open",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T14:45:00Z",
    assignedTo: "John Support",
    customerName: "Alice Johnson",
    customerEmail: "alice.johnson@company.com",
    attachments: ["screenshot.png", "error_log.txt"],
    messages: [
      {
        id: "1",
        sender: "Alice Johnson",
        role: "customer",
        message: "I'm unable to track my shipment SH-2024-001. The tracking page shows an error.",
        timestamp: "2024-01-15T10:30:00Z",
        attachments: ["screenshot.png"]
      },
      {
        id: "2",
        sender: "John Support",
        role: "support",
        message: "Thank you for contacting us. I can see the issue with the tracking system. We're working on a fix and will update you shortly.",
        timestamp: "2024-01-15T11:15:00Z",
        attachments: []
      },
      {
        id: "3",
        sender: "John Support",
        role: "support",
        message: "The tracking system has been restored. Please try accessing your shipment tracking again.",
        timestamp: "2024-01-15T14:45:00Z",
        attachments: []
      }
    ]
  },
  {
    id: "REQ-2024-002",
    title: "Billing Inquiry",
    description: "I have questions about my January invoice. Some charges seem incorrect.",
    category: "billing",
    priority: "medium",
    status: "in_progress",
    createdAt: "2024-01-14T16:20:00Z",
    updatedAt: "2024-01-15T09:30:00Z",
    assignedTo: "Sarah Finance",
    customerName: "Bob Smith",
    customerEmail: "bob.smith@company.com",
    attachments: ["invoice_january.pdf"],
    messages: [
      {
        id: "1",
        sender: "Bob Smith",
        role: "customer",
        message: "I have questions about my January invoice. Some charges seem incorrect.",
        timestamp: "2024-01-14T16:20:00Z",
        attachments: ["invoice_january.pdf"]
      },
      {
        id: "2",
        sender: "Sarah Finance",
        role: "support",
        message: "I'll review your invoice and get back to you within 24 hours with a detailed explanation.",
        timestamp: "2024-01-15T09:30:00Z",
        attachments: []
      }
    ]
  },
  {
    id: "REQ-2024-003",
    title: "Feature Request: Bulk Upload",
    description: "It would be great to have a bulk upload feature for multiple shipments.",
    category: "feature_request",
    priority: "low",
    status: "closed",
    createdAt: "2024-01-13T14:00:00Z",
    updatedAt: "2024-01-14T11:20:00Z",
    assignedTo: "Mike Product",
    customerName: "Carol Wilson",
    customerEmail: "carol.wilson@company.com",
    attachments: [],
    messages: [
      {
        id: "1",
        sender: "Carol Wilson",
        role: "customer",
        message: "It would be great to have a bulk upload feature for multiple shipments.",
        timestamp: "2024-01-13T14:00:00Z",
        attachments: []
      },
      {
        id: "2",
        sender: "Mike Product",
        role: "support",
        message: "Thank you for the suggestion! This feature is already in our development roadmap and should be available in Q2 2024.",
        timestamp: "2024-01-14T11:20:00Z",
        attachments: []
      }
    ]
  },
  {
    id: "REQ-2024-004",
    title: "Account Access Problem",
    description: "I'm unable to log into my account. Getting authentication errors.",
    category: "account",
    priority: "high",
    status: "pending",
    createdAt: "2024-01-15T08:45:00Z",
    updatedAt: "2024-01-15T08:45:00Z",
    assignedTo: null,
    customerName: "David Brown",
    customerEmail: "david.brown@company.com",
    attachments: ["auth_error.png"],
    messages: [
      {
        id: "1",
        sender: "David Brown",
        role: "customer",
        message: "I'm unable to log into my account. Getting authentication errors.",
        timestamp: "2024-01-15T08:45:00Z",
        attachments: ["auth_error.png"]
      }
    ]
  }
];

const categories = [
  { value: "technical", label: "Technical Support", icon: Settings },
  { value: "billing", label: "Billing & Payments", icon: FileText },
  { value: "account", label: "Account & Access", icon: User },
  { value: "feature_request", label: "Feature Request", icon: Plus },
  { value: "general", label: "General Inquiry", icon: MessageSquare }
];

const priorities = [
  { value: "low", label: "Low", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "medium", label: "Medium", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "high", label: "High", color: "bg-red-50 text-red-700 border-red-200" }
];

const statuses = [
  { value: "open", label: "Open", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "in_progress", label: "In Progress", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "pending", label: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "closed", label: "Closed", color: "bg-gray-50 text-gray-700 border-gray-200" }
];

function CustomerRequestsContent() {
  const { loadTime } = usePerformanceMonitoring('CustomerRequestsPage');
  const { isDark } = useTheme();
  const [requests, setRequests] = useState(mockRequests);
  const [selectedRequest, setSelectedRequest] = useState<typeof mockRequests[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [newRequest, setNewRequest] = useState({
    title: "",
    description: "",
    category: "technical",
    priority: "medium"
  });

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || request.category === filterCategory;
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    const matchesPriority = filterPriority === "all" || request.priority === filterPriority;
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    return statuses.find(s => s.value === status)?.color || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getPriorityColor = (priority: string) => {
    return priorities.find(p => p.value === priority)?.color || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    if (!cat) return <MessageSquare className="h-4 w-4" />;
    const Icon = cat.icon;
    return <Icon className="h-4 w-4" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeSince = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than 1 hour ago';
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedRequest) return;

    const message = {
      id: Date.now().toString(),
      sender: "You",
      role: "customer" as const,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      attachments: []
    };

    setRequests(prev => prev.map(req => 
      req.id === selectedRequest.id 
        ? { ...req, messages: [...req.messages, message], updatedAt: new Date().toISOString() }
        : req
    ));

    setSelectedRequest(prev => prev ? { ...prev, messages: [...prev.messages, message] } : null);
    setNewMessage("");
  };

  const submitNewRequest = () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) return;

    const request = {
      id: `REQ-2024-${String(requests.length + 1).padStart(3, '0')}`,
      title: newRequest.title.trim(),
      description: newRequest.description.trim(),
      category: newRequest.category,
      priority: newRequest.priority,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: null,
      customerName: "You",
      customerEmail: "your.email@company.com",
      attachments: [],
      messages: [
        {
          id: "1",
          sender: "You",
          role: "customer" as const,
          message: newRequest.description.trim(),
          timestamp: new Date().toISOString(),
          attachments: []
        }
      ]
    };

    setRequests(prev => [request, ...prev]);
    setNewRequest({ title: "", description: "", category: "technical", priority: "medium" });
    setShowNewRequestForm(false);
  };

  return (
      <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support Requests</h1>
              <p className="text-gray-600">
                Manage your support tickets and get help from our team
                {loadTime && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Loaded in {loadTime.toFixed(0)}ms)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowNewRequestForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <div className="text-sm text-gray-600">Total Requests</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div className="text-sm text-gray-600">Open</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'open').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'in_progress').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="text-sm text-gray-600">Resolved</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'closed').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Request Form */}
          {showNewRequestForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Create New Support Request</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewRequestForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of your issue"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newRequest.category} onValueChange={(value) => setNewRequest(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={newRequest.priority} onValueChange={(value) => setNewRequest(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(priority => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRequest.description}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of your issue or request"
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewRequestForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitNewRequest}>
                    Submit Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Requests List */}
            <div className="lg:col-span-1 space-y-4">
              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {priorities.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Request Cards */}
              <div className="space-y-2">
                {filteredRequests.map((request) => (
                  <Card 
                    key={request.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedRequest?.id === request.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          {getCategoryIcon(request.category)}
                          <div className="flex-1">
                            <div className="font-medium text-sm">{request.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{request.id}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        <div>Updated {getTimeSince(request.updatedAt)}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{request.messages.length} messages</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Request Details */}
            <div className="lg:col-span-2">
              {selectedRequest ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(selectedRequest.category)}
                          <span>{selectedRequest.title}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{selectedRequest.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(selectedRequest.status)}>
                          {selectedRequest.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(selectedRequest.priority)}>
                          {selectedRequest.priority}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Request Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Created</div>
                          <div className="font-medium">{formatTimestamp(selectedRequest.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Last Updated</div>
                          <div className="font-medium">{formatTimestamp(selectedRequest.updatedAt)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Category</div>
                          <div className="font-medium">{categories.find(c => c.value === selectedRequest.category)?.label}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Assigned To</div>
                          <div className="font-medium">{selectedRequest.assignedTo || 'Unassigned'}</div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="space-y-4">
                        <h4 className="font-semibold">Messages</h4>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {selectedRequest.messages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] ${message.role === 'customer' ? 'order-2' : 'order-1'}`}>
                                <div className={`p-3 rounded-lg ${
                                  message.role === 'customer' 
                                    ? 'bg-blue-100 text-blue-900' 
                                    : 'bg-gray-100 text-gray-900'
                                }`}>
                                  <div className="text-sm">{message.message}</div>
                                  {message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {message.attachments.map((attachment, index) => (
                                        <div key={index} className="flex items-center gap-2 text-xs">
                                          <Paperclip className="h-3 w-3" />
                                          <span>{attachment}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {message.sender} • {formatTimestamp(message.timestamp)}
                                </div>
                              </div>
                              <Avatar className={`h-8 w-8 ${message.role === 'customer' ? 'order-1' : 'order-2'}`}>
                                <AvatarFallback>
                                  {message.sender.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reply Form */}
                      {selectedRequest.status !== 'closed' && (
                        <div className="space-y-3">
                          <h4 className="font-semibold">Reply</h4>
                          <div className="space-y-2">
                            <Textarea
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type your message..."
                              rows={3}
                            />
                            <div className="flex justify-between items-center">
                              <Button variant="outline" size="sm">
                                <Paperclip className="h-4 w-4 mr-2" />
                                Attach File
                              </Button>
                              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Message
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Request</h3>
                    <p className="text-gray-600">
                      Choose a support request from the list to view details and messages.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
      </div>
  );
}

export default function CustomerRequestsPage() {
  return (
    <AuthGuard mode="customer">
      <MobileNavWrapper>
        <div className="min-h-screen bg-surface-background">
          <CustomerRequestsContent />
        </div>
      </MobileNavWrapper>
    </AuthGuard>
  );
}
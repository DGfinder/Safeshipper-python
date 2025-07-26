"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AuthGuard } from "@/components/auth/auth-guard";
import { MobileNavWrapper } from "@/shared/components/layout/mobile-bottom-nav";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
import { 
  useCustomerNotifications, 
  useMarkNotificationRead, 
  useDismissNotification,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  CustomerNotification
} from "@/shared/hooks/useCustomerNotifications";
import { DemoIndicator, ApiStatusIndicator } from "@/shared/components/ui/demo-indicator";
import { customerApiService } from "@/shared/services/customerApiService";
import { useCustomerAccess } from "@/shared/hooks/useCustomerProfile";
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Filter,
  MoreHorizontal,
  Check,
  X,
  Archive,
  Star,
  Trash2,
  RefreshCw,
  Settings,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  User,
  Building,
  Shield,
  Info,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Download,
  Upload,
  Plus,
  Edit,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Globe,
  Zap,
  Database,
  Activity,
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  Bookmark,
  Flag,
  Target,
  Layers,
  Code,
  Terminal,
  HelpCircle
} from "lucide-react";


function CustomerNotificationsContent() {
  const { loadTime } = usePerformanceMonitoring('CustomerNotificationsPage');
  const { isDark } = useTheme();
  const { data: customerAccess } = useCustomerAccess();
  
  // Use the enhanced notification system
  const { data: notifications = [], isLoading, refetch } = useCustomerNotifications();
  const { data: preferences } = useNotificationPreferences();
  const markAsReadMutation = useMarkNotificationRead();
  const dismissMutation = useDismissNotification();
  const updatePreferencesMutation = useUpdateNotificationPreferences();
  
  const [selectedNotification, setSelectedNotification] = useState<CustomerNotification | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [apiStatus, setApiStatus] = useState(customerApiService.getApiStatus());
  
  // Update API status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(customerApiService.getApiStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshData = () => {
    refetch();
  };

  const markAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    // Mark all unread notifications as read
    const unreadNotifications = notifications.filter(n => !n.read);
    unreadNotifications.forEach(notification => {
      markAsReadMutation.mutate(notification.id);
    });
  };

  const deleteNotification = (notificationId: string) => {
    dismissMutation.mutate(notificationId);
  };

  const handleActionClick = (actionUrl?: string, actionLabel?: string) => {
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || notification.type === filterType;
    const matchesRead = filterRead === "all" || 
                       (filterRead === "unread" && !notification.read) ||
                       (filterRead === "read" && notification.read);
    const matchesPriority = filterPriority === "all" || notification.priority === filterPriority;
    return matchesSearch && matchesType && matchesRead && matchesPriority;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "shipment_status":
        return <Package className="h-4 w-4 text-blue-600" />;
      case "shipment_delayed":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "compliance_alert":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "certificate_expiry":
        return <Shield className="h-4 w-4 text-orange-600" />;
      case "system_update":
        return <Settings className="h-4 w-4 text-gray-600" />;
      case "billing":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "document_ready":
        return <FileText className="h-4 w-4 text-purple-600" />;
      case "inspection_required":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "compliance":
        return "bg-red-100 text-red-800";
      case "safety":
        return "bg-orange-100 text-orange-800";
      case "delivery":
        return "bg-blue-100 text-blue-800";
      case "financial":
        return "bg-green-100 text-green-800";
      case "system":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimestamp = (timestamp: string) => {
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

  const updateSetting = (category: string, setting: string, value: any) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      [category]: {
        ...(preferences as any)[category],
        [setting]: value
      }
    };
    
    updatePreferencesMutation.mutate(updatedPreferences);
  };

  return (
      <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <DemoIndicator 
                  type={apiStatus.connected ? 'live' : 'demo'} 
                  className="hidden lg:flex"
                />
              </div>
              <p className="text-gray-600">
                Stay updated on your shipments, compliance alerts, and account activities
                {loadTime && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Loaded in {loadTime.toFixed(0)}ms)
                  </span>
                )}
              </p>
              <ApiStatusIndicator 
                isConnected={apiStatus.connected}
                lastUpdate={apiStatus.lastCheck}
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                <Check className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <div className="text-sm text-gray-600">Total Notifications</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{notifications.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-600" />
                  <div className="text-sm text-gray-600">Unread</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{unreadCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div className="text-sm text-gray-600">High Priority</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => n.priority === "high").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="notifications" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="shipment_status">Shipment Status</SelectItem>
                    <SelectItem value="shipment_delayed">Shipment Delayed</SelectItem>
                    <SelectItem value="compliance_alert">Compliance Alert</SelectItem>
                    <SelectItem value="certificate_expiry">Certificate Expiry</SelectItem>
                    <SelectItem value="document_ready">Document Ready</SelectItem>
                    <SelectItem value="inspection_required">Inspection Required</SelectItem>
                    <SelectItem value="system_update">System Update</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterRead} onValueChange={setFilterRead}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notifications List */}
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      !notification.read ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedNotification(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getTypeIcon(notification.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{notification.title}</h3>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>{formatTimestamp(notification.timestamp)}</span>
                              <Badge className={getPriorityColor(notification.priority)} variant="outline">
                                {notification.priority}
                              </Badge>
                              <Badge className={getCategoryColor(notification.category)} variant="outline">
                                {notification.category}
                              </Badge>
                              {notification.metadata?.severity && (
                                <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                  {notification.metadata.severity}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {(notification.actionUrl || notification.actionLabel) && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleActionClick(notification.actionUrl, notification.actionLabel)}
                          >
                            {notification.actionLabel || 'View Details'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* No notifications */}
              {filteredNotifications.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
                    <p className="text-gray-600">
                      {searchTerm || filterType !== "all" || filterRead !== "all" || filterPriority !== "all" 
                        ? "Try adjusting your filters to see more notifications."
                        : "You're all caught up! Check back later for new notifications."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid gap-6">
                {/* Email Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preferences && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                          <Switch 
                            id="email-enabled" 
                            checked={preferences.email.enabled}
                            onCheckedChange={(checked) => updateSetting('email', 'enabled', checked)}
                          />
                        </div>
                        
                        {preferences.email.enabled && (
                          <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="email-shipment">Shipment Updates</Label>
                              <Switch 
                                id="email-shipment" 
                                checked={preferences.email.shipmentUpdates}
                                onCheckedChange={(checked) => updateSetting('email', 'shipmentUpdates', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="email-compliance">Compliance Alerts</Label>
                              <Switch 
                                id="email-compliance" 
                                checked={preferences.email.complianceAlerts}
                                onCheckedChange={(checked) => updateSetting('email', 'complianceAlerts', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="email-system">System Updates</Label>
                              <Switch 
                                id="email-system" 
                                checked={preferences.email.systemUpdates}
                                onCheckedChange={(checked) => updateSetting('email', 'systemUpdates', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="email-documents">Document Ready</Label>
                              <Switch 
                                id="email-documents" 
                                checked={preferences.email.documentReady}
                                onCheckedChange={(checked) => updateSetting('email', 'documentReady', checked)}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* SMS Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      SMS Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preferences && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                          <Switch 
                            id="sms-enabled" 
                            checked={preferences.sms.enabled}
                            onCheckedChange={(checked) => updateSetting('sms', 'enabled', checked)}
                          />
                        </div>
                        
                        {preferences.sms.enabled && (
                          <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="sms-urgent">Urgent Only</Label>
                              <Switch 
                                id="sms-urgent" 
                                checked={preferences.sms.urgentOnly}
                                onCheckedChange={(checked) => updateSetting('sms', 'urgentOnly', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="sms-compliance">Compliance Alerts</Label>
                              <Switch 
                                id="sms-compliance" 
                                checked={preferences.sms.complianceAlerts}
                                onCheckedChange={(checked) => updateSetting('sms', 'complianceAlerts', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="sms-emergency">Emergency Alerts</Label>
                              <Switch 
                                id="sms-emergency" 
                                checked={preferences.sms.emergencyAlerts}
                                onCheckedChange={(checked) => updateSetting('sms', 'emergencyAlerts', checked)}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Push Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Push Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preferences && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                          <Switch 
                            id="push-enabled" 
                            checked={preferences.push.enabled}
                            onCheckedChange={(checked) => updateSetting('push', 'enabled', checked)}
                          />
                        </div>
                        
                        {preferences.push.enabled && (
                          <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="push-shipment">Shipment Updates</Label>
                              <Switch 
                                id="push-shipment" 
                                checked={preferences.push.shipmentUpdates}
                                onCheckedChange={(checked) => updateSetting('push', 'shipmentUpdates', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="push-compliance">Compliance Alerts</Label>
                              <Switch 
                                id="push-compliance" 
                                checked={preferences.push.complianceAlerts}
                                onCheckedChange={(checked) => updateSetting('push', 'complianceAlerts', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="push-realtime">Real-time Tracking</Label>
                              <Switch 
                                id="push-realtime" 
                                checked={preferences.push.realTimeTracking}
                                onCheckedChange={(checked) => updateSetting('push', 'realTimeTracking', checked)}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preferences && (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="quiet-hours">Quiet Hours</Label>
                            <p className="text-sm text-gray-600">Pause notifications during specified hours</p>
                          </div>
                          <Switch 
                            id="quiet-hours" 
                            checked={preferences.inApp.quietHours.enabled}
                            onCheckedChange={(checked) => updateSetting('inApp', 'quietHours', { ...preferences.inApp.quietHours, enabled: checked })}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-popups">Show Popup Notifications</Label>
                          <Switch 
                            id="show-popups" 
                            checked={preferences.inApp.showPopups}
                            onCheckedChange={(checked) => updateSetting('inApp', 'showPopups', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sound-enabled">Sound Notifications</Label>
                          <Switch 
                            id="sound-enabled" 
                            checked={preferences.inApp.soundEnabled}
                            onCheckedChange={(checked) => updateSetting('inApp', 'soundEnabled', checked)}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
      </div>
  );
}

export default function CustomerNotificationsPage() {
  return (
    <AuthGuard mode="customer">
      <MobileNavWrapper>
        <div className="min-h-screen bg-surface-background">
          <CustomerNotificationsContent />
        </div>
      </MobileNavWrapper>
    </AuthGuard>
  );
}
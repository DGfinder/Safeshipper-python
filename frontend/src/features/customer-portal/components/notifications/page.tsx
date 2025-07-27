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
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { useTheme } from "@/contexts/ThemeContext";
import { usePerformanceMonitoring } from "@/shared/utils/performance";
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

// Mock data for notifications
const mockNotifications = [
  {
    id: "1",
    type: "shipment_status",
    title: "Shipment SH-2024-001 Delivered",
    message: "Your dangerous goods shipment has been successfully delivered to the destination facility.",
    timestamp: "2024-01-15T14:30:00Z",
    read: false,
    priority: "high",
    category: "delivery",
    shipmentId: "SH-2024-001",
    actions: ["View Shipment", "Download POD"]
  },
  {
    id: "2",
    type: "shipment_status",
    title: "Shipment SH-2024-002 In Transit",
    message: "Your shipment is currently in transit and on schedule for delivery tomorrow.",
    timestamp: "2024-01-15T10:15:00Z",
    read: false,
    priority: "medium",
    category: "transit",
    shipmentId: "SH-2024-002",
    actions: ["Track Shipment"]
  },
  {
    id: "3",
    type: "compliance_alert",
    title: "Document Expiration Alert",
    message: "Your dangerous goods training certification expires in 30 days. Please renew to maintain compliance.",
    timestamp: "2024-01-14T16:45:00Z",
    read: true,
    priority: "high",
    category: "compliance",
    actions: ["Renew Certification"]
  },
  {
    id: "4",
    type: "system_update",
    title: "System Maintenance Scheduled",
    message: "SafeShipper will undergo maintenance on January 20th from 2:00 AM to 4:00 AM EST.",
    timestamp: "2024-01-14T09:00:00Z",
    read: true,
    priority: "low",
    category: "system",
    actions: ["View Details"]
  },
  {
    id: "5",
    type: "billing",
    title: "Invoice Available",
    message: "Your invoice for January 2024 is now available for download.",
    timestamp: "2024-01-13T12:00:00Z",
    read: false,
    priority: "medium",
    category: "billing",
    actions: ["Download Invoice", "View Billing"]
  },
  {
    id: "6",
    type: "shipment_delayed",
    title: "Shipment SH-2024-003 Delayed",
    message: "Weather conditions have caused a delay in your shipment. New estimated delivery: January 18th.",
    timestamp: "2024-01-13T08:30:00Z",
    read: true,
    priority: "high",
    category: "delay",
    shipmentId: "SH-2024-003",
    actions: ["View Updated Schedule", "Contact Support"]
  }
];

const mockNotificationSettings = {
  email: {
    enabled: true,
    shipmentUpdates: true,
    deliveryNotifications: true,
    complianceAlerts: true,
    systemUpdates: false,
    billingUpdates: true,
    marketingEmails: false
  },
  sms: {
    enabled: true,
    shipmentUpdates: true,
    deliveryNotifications: true,
    complianceAlerts: true,
    systemUpdates: false,
    emergencyAlerts: true
  },
  push: {
    enabled: true,
    shipmentUpdates: true,
    deliveryNotifications: true,
    complianceAlerts: true,
    systemUpdates: true,
    realTimeTracking: true
  },
  general: {
    timezone: "America/New_York",
    language: "en",
    frequency: "immediate", // immediate, daily, weekly
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "07:00"
    }
  }
};

export default function CustomerNotificationsPage() {
  const { loadTime } = usePerformanceMonitoring('CustomerNotificationsPage');
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [selectedNotification, setSelectedNotification] = useState<typeof mockNotifications[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [settings, setSettings] = useState(mockNotificationSettings);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
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
      case "system_update":
        return <Settings className="h-4 w-4 text-gray-600" />;
      case "billing":
        return <FileText className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev as any)[category],
        [setting]: value
      }
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600">
                Stay updated on your shipments and account activities
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
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{formatTimestamp(notification.timestamp)}</span>
                              <Badge className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
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
                      
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {notification.actions.map((action, index) => (
                            <Button key={index} variant="outline" size="sm">
                              {action}
                            </Button>
                          ))}
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                      <Switch 
                        id="email-enabled" 
                        checked={settings.email.enabled}
                        onCheckedChange={(checked) => updateSetting('email', 'enabled', checked)}
                      />
                    </div>
                    
                    {settings.email.enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-shipment">Shipment Updates</Label>
                          <Switch 
                            id="email-shipment" 
                            checked={settings.email.shipmentUpdates}
                            onCheckedChange={(checked) => updateSetting('email', 'shipmentUpdates', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-delivery">Delivery Notifications</Label>
                          <Switch 
                            id="email-delivery" 
                            checked={settings.email.deliveryNotifications}
                            onCheckedChange={(checked) => updateSetting('email', 'deliveryNotifications', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-compliance">Compliance Alerts</Label>
                          <Switch 
                            id="email-compliance" 
                            checked={settings.email.complianceAlerts}
                            onCheckedChange={(checked) => updateSetting('email', 'complianceAlerts', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-system">System Updates</Label>
                          <Switch 
                            id="email-system" 
                            checked={settings.email.systemUpdates}
                            onCheckedChange={(checked) => updateSetting('email', 'systemUpdates', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-billing">Billing Updates</Label>
                          <Switch 
                            id="email-billing" 
                            checked={settings.email.billingUpdates}
                            onCheckedChange={(checked) => updateSetting('email', 'billingUpdates', checked)}
                          />
                        </div>
                      </div>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                      <Switch 
                        id="sms-enabled" 
                        checked={settings.sms.enabled}
                        onCheckedChange={(checked) => updateSetting('sms', 'enabled', checked)}
                      />
                    </div>
                    
                    {settings.sms.enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sms-shipment">Shipment Updates</Label>
                          <Switch 
                            id="sms-shipment" 
                            checked={settings.sms.shipmentUpdates}
                            onCheckedChange={(checked) => updateSetting('sms', 'shipmentUpdates', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sms-delivery">Delivery Notifications</Label>
                          <Switch 
                            id="sms-delivery" 
                            checked={settings.sms.deliveryNotifications}
                            onCheckedChange={(checked) => updateSetting('sms', 'deliveryNotifications', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sms-compliance">Compliance Alerts</Label>
                          <Switch 
                            id="sms-compliance" 
                            checked={settings.sms.complianceAlerts}
                            onCheckedChange={(checked) => updateSetting('sms', 'complianceAlerts', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sms-emergency">Emergency Alerts</Label>
                          <Switch 
                            id="sms-emergency" 
                            checked={settings.sms.emergencyAlerts}
                            onCheckedChange={(checked) => updateSetting('sms', 'emergencyAlerts', checked)}
                          />
                        </div>
                      </div>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                      <Switch 
                        id="push-enabled" 
                        checked={settings.push.enabled}
                        onCheckedChange={(checked) => updateSetting('push', 'enabled', checked)}
                      />
                    </div>
                    
                    {settings.push.enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="push-shipment">Shipment Updates</Label>
                          <Switch 
                            id="push-shipment" 
                            checked={settings.push.shipmentUpdates}
                            onCheckedChange={(checked) => updateSetting('push', 'shipmentUpdates', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="push-delivery">Delivery Notifications</Label>
                          <Switch 
                            id="push-delivery" 
                            checked={settings.push.deliveryNotifications}
                            onCheckedChange={(checked) => updateSetting('push', 'deliveryNotifications', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="push-compliance">Compliance Alerts</Label>
                          <Switch 
                            id="push-compliance" 
                            checked={settings.push.complianceAlerts}
                            onCheckedChange={(checked) => updateSetting('push', 'complianceAlerts', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="push-realtime">Real-time Tracking</Label>
                          <Switch 
                            id="push-realtime" 
                            checked={settings.push.realTimeTracking}
                            onCheckedChange={(checked) => updateSetting('push', 'realTimeTracking', checked)}
                          />
                        </div>
                      </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={settings.general.timezone} onValueChange={(value) => updateSetting('general', 'timezone', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="frequency">Notification Frequency</Label>
                        <Select value={settings.general.frequency} onValueChange={(value) => updateSetting('general', 'frequency', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                            <SelectItem value="weekly">Weekly Summary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="quiet-hours">Quiet Hours</Label>
                        <p className="text-sm text-gray-600">Pause notifications during specified hours</p>
                      </div>
                      <Switch 
                        id="quiet-hours" 
                        checked={settings.general.quietHours.enabled}
                        onCheckedChange={(checked) => updateSetting('general', 'quietHours', { ...settings.general.quietHours, enabled: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </DashboardLayout>
  );
}
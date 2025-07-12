// app/settings/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Mail,
  Smartphone,
  Globe,
  Key,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function SettingsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mock settings state - in production this would come from the backend
  const [userSettings, setUserSettings] = useState({
    name: "John Dispatcher",
    email: "john@safeshipper.com",
    phone: "+1-555-0123",
    role: "DISPATCHER",
    timezone: "America/Toronto",
    language: "en",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    shipmentUpdates: true,
    inspectionAlerts: true,
    complianceAlerts: true,
    systemMaintenance: false,
  });

  const [systemSettings, setSystemSettings] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    darkMode: false,
    defaultMapView: "standard",
    measurementUnit: "metric",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 480,
    loginNotifications: true,
    passwordExpiry: 90,
  });

  const handleSave = async () => {
    setSaving(true);
    // Save settings to backend
    setTimeout(() => {
      setSaving(false);
      // Show success message
    }, 1000);
  };

  const handleExportData = () => {
    // Export user data
    console.log("Exporting data...");
  };

  const handleImportData = () => {
    // Import user data
    console.log("Importing data...");
  };

  const handleDeleteAccount = () => {
    // Handle account deletion
    console.log("Deleting account...");
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your account and application preferences
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={userSettings.name}
                      onChange={(e) =>
                        setUserSettings({
                          ...userSettings,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userSettings.email}
                      onChange={(e) =>
                        setUserSettings({
                          ...userSettings,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={userSettings.phone}
                      onChange={(e) =>
                        setUserSettings({
                          ...userSettings,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={userSettings.role}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={userSettings.timezone}
                      onChange={(e) =>
                        setUserSettings({
                          ...userSettings,
                          timezone: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-md px-3 py-2"
                    >
                      <option value="America/Toronto">
                        Eastern Time (Toronto)
                      </option>
                      <option value="America/Vancouver">
                        Pacific Time (Vancouver)
                      </option>
                      <option value="America/Winnipeg">
                        Central Time (Winnipeg)
                      </option>
                      <option value="America/Halifax">
                        Atlantic Time (Halifax)
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={userSettings.language}
                      onChange={(e) =>
                        setUserSettings({
                          ...userSettings,
                          language: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-md px-3 py-2"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Delivery Methods</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-gray-600">
                            Receive notifications via email
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">SMS Notifications</p>
                          <p className="text-sm text-gray-600">
                            Receive notifications via SMS
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.smsNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            smsNotifications: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">Push Notifications</p>
                          <p className="text-sm text-gray-600">
                            Receive browser push notifications
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.pushNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notification Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Shipment Updates</p>
                        <p className="text-sm text-gray-600">
                          Status changes, delivery confirmations
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.shipmentUpdates}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            shipmentUpdates: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Inspection Alerts</p>
                        <p className="text-sm text-gray-600">
                          Failed inspections, pending reviews
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.inspectionAlerts}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            inspectionAlerts: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Compliance Alerts</p>
                        <p className="text-sm text-gray-600">
                          Violations, regulatory updates
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.complianceAlerts}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            complianceAlerts: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">System Maintenance</p>
                        <p className="text-sm text-gray-600">
                          Scheduled maintenance, updates
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.systemMaintenance}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            systemMaintenance: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Interface</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto Refresh</p>
                        <p className="text-sm text-gray-600">
                          Automatically refresh data
                        </p>
                      </div>
                      <Switch
                        checked={systemSettings.autoRefresh}
                        onCheckedChange={(checked) =>
                          setSystemSettings({
                            ...systemSettings,
                            autoRefresh: checked,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refresh-interval">
                        Refresh Interval (seconds)
                      </Label>
                      <Input
                        id="refresh-interval"
                        type="number"
                        value={systemSettings.refreshInterval}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            refreshInterval: parseInt(e.target.value),
                          })
                        }
                        disabled={!systemSettings.autoRefresh}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-gray-600">Use dark theme</p>
                      </div>
                      <Switch
                        checked={systemSettings.darkMode}
                        onCheckedChange={(checked) =>
                          setSystemSettings({
                            ...systemSettings,
                            darkMode: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Preferences</h3>
                    <div className="space-y-2">
                      <Label htmlFor="map-view">Default Map View</Label>
                      <select
                        id="map-view"
                        value={systemSettings.defaultMapView}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            defaultMapView: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-md px-3 py-2"
                      >
                        <option value="standard">Standard</option>
                        <option value="satellite">Satellite</option>
                        <option value="terrain">Terrain</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="measurement-unit">Measurement Unit</Label>
                      <select
                        id="measurement-unit"
                        value={systemSettings.measurementUnit}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            measurementUnit: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-md px-3 py-2"
                      >
                        <option value="metric">Metric (km, kg)</option>
                        <option value="imperial">Imperial (mi, lb)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-format">Date Format</Label>
                      <select
                        id="date-format"
                        value={systemSettings.dateFormat}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            dateFormat: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-md px-3 py-2"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-format">Time Format</Label>
                      <select
                        id="time-format"
                        value={systemSettings.timeFormat}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            timeFormat: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-md px-3 py-2"
                      >
                        <option value="24h">24 Hour</option>
                        <option value="12h">12 Hour (AM/PM)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">
                          Add an extra layer of security
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          twoFactorAuth: checked,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">
                      Session Timeout (minutes)
                    </Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          sessionTimeout: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Login Notifications</p>
                      <p className="text-sm text-gray-600">
                        Get notified of new login attempts
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.loginNotifications}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          loginNotifications: checked,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-expiry">
                      Password Expiry (days)
                    </Label>
                    <Input
                      id="password-expiry"
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          passwordExpiry: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Export Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Download a copy of your data including shipments,
                      inspections, and communications.
                    </p>
                    <Button
                      onClick={handleExportData}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Import Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Import data from a previous export or external system.
                    </p>
                    <Button
                      onClick={handleImportData}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import Data
                    </Button>
                  </div>

                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h3 className="text-lg font-medium mb-2 text-red-800">
                      Delete Account
                    </h3>
                    <p className="text-sm text-red-700 mb-4">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                    <Button
                      onClick={handleDeleteAccount}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}

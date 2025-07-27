// app/settings/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Switch } from "@/shared/components/ui/switch";
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
  Clock,
  DollarSign,
  AlertTriangle,
  Info,
  Search,
  X,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { useSettingsStore, TIMEZONE_GROUPS_EXPORT as TIMEZONE_GROUPS, DATE_FORMATS, CURRENCIES, settingsUtils } from "@/shared/stores/settings-store";
import { useAuthStore } from "@/shared/stores/auth-store";

export default function SettingsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Use centralized settings store
  const {
    profile,
    notifications,
    system,
    security,
    demurrage,
    data,
    compliance,
    updateProfile,
    updateNotifications,
    updateSystem,
    updateSecurity,
    updateDemurrage,
    updateData,
    updateCompliance,
    exportSettings,
    importSettings,
    resetSettings,
  } = useSettingsStore();

  // Get user info from auth store for profile initialization
  const { user } = useAuthStore();

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your account and application preferences
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search functionality */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
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
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName || user?.firstName || ""}
                      onChange={(e) =>
                        updateProfile({
                          firstName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName || user?.lastName || ""}
                      onChange={(e) =>
                        updateProfile({
                          lastName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email || user?.email || ""}
                      onChange={(e) =>
                        updateProfile({
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) =>
                        updateProfile({
                          phone: e.target.value,
                        })
                      }
                      placeholder="+61 4XX XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={user?.role || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={profile.timezone}
                      onChange={(e) =>
                        updateProfile({
                          timezone: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-md px-3 py-2"
                    >
                      {Object.entries(TIMEZONE_GROUPS).map(([region, timezones]) => (
                        <optgroup key={region} label={region}>
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={profile.language}
                      onChange={(e) =>
                        updateProfile({
                          language: e.target.value as 'en' | 'fr',
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
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) =>
                          updateNotifications({
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
                        checked={notifications.smsNotifications}
                        onCheckedChange={(checked) =>
                          updateNotifications({
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
                        checked={notifications.pushNotifications}
                        onCheckedChange={(checked) =>
                          updateNotifications({
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
                        checked={notifications.categories.shipmentUpdates}
                        onCheckedChange={(checked) =>
                          updateNotifications({
                            categories: {
                              ...notifications.categories,
                              shipmentUpdates: checked,
                            },
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
                        checked={notifications.categories.inspectionAlerts}
                        onCheckedChange={(checked) =>
                          updateNotifications({
                            categories: {
                              ...notifications.categories,
                              inspectionAlerts: checked,
                            },
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
                        checked={notifications.categories.complianceAlerts}
                        onCheckedChange={(checked) =>
                          updateNotifications({
                            categories: {
                              ...notifications.categories,
                              complianceAlerts: checked,
                            },
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
                        checked={notifications.categories.systemMaintenance}
                        onCheckedChange={(checked) =>
                          updateNotifications({
                            categories: {
                              ...notifications.categories,
                              systemMaintenance: checked,
                            },
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
                        checked={system.autoRefresh}
                        onCheckedChange={(checked) =>
                          updateSystem({
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
                        value={system.refreshInterval}
                        onChange={(e) =>
                          updateSystem({
                            refreshInterval: parseInt(e.target.value),
                          })
                        }
                        disabled={!system.autoRefresh}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-gray-600">Use dark theme</p>
                      </div>
                      <Switch
                        checked={system.theme === 'dark'}
                        onCheckedChange={(checked) =>
                          updateSystem({
                            theme: checked ? 'dark' : 'light',
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
                        value={system.defaultMapView}
                        onChange={(e) =>
                          updateSystem({
                            defaultMapView: e.target.value as 'standard' | 'satellite' | 'terrain',
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
                        value={system.measurementUnit}
                        onChange={(e) =>
                          updateSystem({
                            measurementUnit: e.target.value as 'metric' | 'imperial',
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
                        value={system.dateFormat}
                        onChange={(e) =>
                          updateSystem({
                            dateFormat: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-md px-3 py-2"
                      >
                        {DATE_FORMATS.map((fmt) => (
                          <option key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-format">Time Format</Label>
                      <select
                        id="time-format"
                        value={system.timeFormat}
                        onChange={(e) =>
                          updateSystem({
                            timeFormat: e.target.value as '12h' | '24h',
                          })
                        }
                        className="w-full border border-gray-200 rounded-md px-3 py-2"
                      >
                        <option value="24h">24 Hour</option>
                        <option value="12h">12 Hour (AM/PM)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        id="currency"
                        value={system.currency}
                        onChange={(e) =>
                          updateSystem({
                            currency: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-md px-3 py-2"
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
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
                      checked={security.twoFactorAuth}
                      onCheckedChange={(checked) =>
                        updateSecurity({
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
                      value={security.sessionTimeout}
                      onChange={(e) =>
                        updateSecurity({
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
                      checked={security.loginNotifications}
                      onCheckedChange={(checked) =>
                        updateSecurity({
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
                      value={security.passwordExpiry}
                      onChange={(e) =>
                        updateSecurity({
                          passwordExpiry: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Demurrage Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Enable Demurrage Charges</p>
                        <p className="text-sm text-gray-600">
                          Automatically calculate and apply demurrage charges
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={demurrage.enableDemurrage}
                      onCheckedChange={(checked) =>
                        updateDemurrage({
                          enableDemurrage: checked,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Default Rates (per day)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="standard-rate">Standard Rate</Label>
                        <Input
                          id="standard-rate"
                          type="number"
                          value={demurrage.defaultRates.standard}
                          onChange={(e) =>
                            updateDemurrage({
                              defaultRates: {
                                ...demurrage.defaultRates,
                                standard: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="premium-rate">Premium Rate</Label>
                        <Input
                          id="premium-rate"
                          type="number"
                          value={demurrage.defaultRates.premium}
                          onChange={(e) =>
                            updateDemurrage({
                              defaultRates: {
                                ...demurrage.defaultRates,
                                premium: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hazmat-rate">Hazmat Rate</Label>
                        <Input
                          id="hazmat-rate"
                          type="number"
                          value={demurrage.defaultRates.hazmat}
                          onChange={(e) =>
                            updateDemurrage({
                              defaultRates: {
                                ...demurrage.defaultRates,
                                hazmat: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialized-rate">Specialized Rate</Label>
                        <Input
                          id="specialized-rate"
                          type="number"
                          value={demurrage.defaultRates.specialized}
                          onChange={(e) =>
                            updateDemurrage({
                              defaultRates: {
                                ...demurrage.defaultRates,
                                specialized: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Free Time Allowance (days)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bronze-days">Bronze Tier</Label>
                        <Input
                          id="bronze-days"
                          type="number"
                          value={demurrage.freeTimeAllowance.bronze}
                          onChange={(e) =>
                            updateDemurrage({
                                                            freeTimeAllowance: {
                                ...demurrage.freeTimeAllowance,
                                bronze: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="silver-days">Silver Tier</Label>
                        <Input
                          id="silver-days"
                          type="number"
                          value={demurrage.freeTimeAllowance.silver}
                          onChange={(e) =>
                            updateDemurrage({
                                                            freeTimeAllowance: {
                                ...demurrage.freeTimeAllowance,
                                silver: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gold-days">Gold Tier</Label>
                        <Input
                          id="gold-days"
                          type="number"
                          value={demurrage.freeTimeAllowance.gold}
                          onChange={(e) =>
                            updateDemurrage({
                                                            freeTimeAllowance: {
                                ...demurrage.freeTimeAllowance,
                                gold: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platinum-days">Platinum Tier</Label>
                        <Input
                          id="platinum-days"
                          type="number"
                          value={demurrage.freeTimeAllowance.platinum}
                          onChange={(e) =>
                            updateDemurrage({
                                                            freeTimeAllowance: {
                                ...demurrage.freeTimeAllowance,
                                platinum: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Advanced Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="grace-period">Grace Period (hours)</Label>
                        <Input
                          id="grace-period"
                          type="number"
                          value={demurrage.gracePeriod}
                          onChange={(e) =>
                            updateDemurrage({
                                                            gracePeriod: parseInt(e.target.value),
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weekend-multiplier">Weekend Multiplier</Label>
                        <Input
                          id="weekend-multiplier"
                          type="number"
                          step="0.1"
                          value={demurrage.weekendMultiplier}
                          onChange={(e) =>
                            updateDemurrage({
                                                            weekendMultiplier: parseFloat(e.target.value),
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="at-risk-threshold">At Risk Alert (hours before)</Label>
                        <Input
                          id="at-risk-threshold"
                          type="number"
                          value={demurrage.alertThresholds.atRisk}
                          onChange={(e) =>
                            updateDemurrage({
                                                            alertThresholds: {
                                ...demurrage.alertThresholds,
                                atRisk: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-customer-grace">New Customer Grace (hours)</Label>
                        <Input
                          id="new-customer-grace"
                          type="number"
                          value={demurrage.customRules.newCustomerGracePeriod}
                          onChange={(e) =>
                            updateDemurrage({
                                                            customRules: {
                                ...demurrage.customRules,
                                newCustomerGracePeriod: parseInt(e.target.value),
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Business Rules</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Automatic Calculation</p>
                          <p className="text-sm text-gray-600">
                            Automatically calculate demurrage charges
                          </p>
                        </div>
                        <Switch
                          checked={demurrage.autoCalculation}
                          onCheckedChange={(checked) =>
                            updateDemurrage({
                                                            autoCalculation: checked,
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Business Days Only</p>
                          <p className="text-sm text-gray-600">
                            Count only business days for free time
                          </p>
                        </div>
                        <Switch
                          checked={demurrage.businessDays}
                          onCheckedChange={(checked) =>
                            updateDemurrage({
                                                            businessDays: checked,
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Hazmat Weekend Surcharge</p>
                          <p className="text-sm text-gray-600">
                            Apply surcharge for hazmat on weekends
                          </p>
                        </div>
                        <Switch
                          checked={demurrage.customRules.hazmatWeekendSurcharge}
                          onCheckedChange={(checked) =>
                            updateDemurrage({
                                                            customRules: {
                                ...demurrage.customRules,
                                hazmatWeekendSurcharge: checked,
                              },
                            })
                          }
                          disabled={!demurrage.enableDemurrage}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium text-blue-900">Configuration Summary</h3>
                    </div>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Demurrage charges: {demurrage.enableDemurrage ? 'Enabled' : 'Disabled'}</p>
                      <p>• Standard rate: ${demurrage.defaultRates.standard} {demurrage.currency}/day</p>
                      <p>• Premium customers get {demurrage.freeTimeAllowance.platinum} days free time</p>
                      <p>• Grace period: {demurrage.gracePeriod} hours</p>
                      <p>• Weekend multiplier: {demurrage.weekendMultiplier}x</p>
                      <p>• Tax included: {demurrage.taxConfiguration?.taxIncluded ? 'Yes' : 'No'}</p>
                      <p>• Seasonal adjustments: {demurrage.customRules?.seasonalAdjustments ? 'Enabled' : 'Disabled'}</p>
                    </div>
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

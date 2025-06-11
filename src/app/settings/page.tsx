'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  
  const [companySettings, setCompanySettings] = useState({
    name: 'SafeShipper Transport',
    abn: '12345678901',
    address: '123 Transport Street, Perth WA 6000',
    contactEmail: 'contact@safeshipper.com',
    contactPhone: '+61 8 9000 0000',
    timezone: 'Australia/Perth',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'AUD'
  })

  const [systemSettings, setSystemSettings] = useState({
    units: {
      distance: 'km',
      weight: 'kg',
      volume: 'litres'
    },
    notifications: {
      email: true,
      sms: true,
      push: true,
      tripUpdates: true,
      maintenanceAlerts: true,
      complianceAlerts: true
    },
    compliance: {
      requireDGCertification: true,
      autoSegregationCheck: true,
      mandatoryInspections: true,
      weightLimitAlerts: true
    }
  })

  const tabs = [
    { id: 'company', name: 'Company', icon: '🏢' },
    { id: 'system', name: 'System', icon: '⚙️' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'compliance', name: 'Compliance', icon: '📜' },
    { id: 'security', name: 'Security', icon: '🔐' }
  ]

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving settings...', { companySettings, systemSettings })
    alert('Settings saved successfully!')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Settings</h1>
          <p className="text-gray-600 font-poppins">
            Manage your SafeShipper configuration and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="card">
              <nav className="p-4 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#153F9F] text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="card">
              {activeTab === 'company' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companySettings.name}
                        onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ABN
                      </label>
                      <input
                        type="text"
                        value={companySettings.abn}
                        onChange={(e) => setCompanySettings({...companySettings, abn: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={companySettings.address}
                        onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={companySettings.contactEmail}
                        onChange={(e) => setCompanySettings({...companySettings, contactEmail: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={companySettings.contactPhone}
                        onChange={(e) => setCompanySettings({...companySettings, contactPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">System Preferences</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timezone
                        </label>
                        <select
                          value={companySettings.timezone}
                          onChange={(e) => setCompanySettings({...companySettings, timezone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                        >
                          <option value="Australia/Perth">Perth (AWST)</option>
                          <option value="Australia/Sydney">Sydney (AEST)</option>
                          <option value="Australia/Melbourne">Melbourne (AEST)</option>
                          <option value="Australia/Adelaide">Adelaide (ACST)</option>
                          <option value="Australia/Darwin">Darwin (ACST)</option>
                          <option value="Australia/Brisbane">Brisbane (AEST)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date Format
                        </label>
                        <select
                          value={companySettings.dateFormat}
                          onChange={(e) => setCompanySettings({...companySettings, dateFormat: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Format
                        </label>
                        <select
                          value={companySettings.timeFormat}
                          onChange={(e) => setCompanySettings({...companySettings, timeFormat: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                        >
                          <option value="24h">24 Hour</option>
                          <option value="12h">12 Hour</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Units of Measurement</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Distance
                          </label>
                          <select
                            value={systemSettings.units.distance}
                            onChange={(e) => setSystemSettings({
                              ...systemSettings,
                              units: {...systemSettings.units, distance: e.target.value}
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                          >
                            <option value="km">Kilometers</option>
                            <option value="miles">Miles</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Weight
                          </label>
                          <select
                            value={systemSettings.units.weight}
                            onChange={(e) => setSystemSettings({
                              ...systemSettings,
                              units: {...systemSettings.units, weight: e.target.value}
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                          >
                            <option value="kg">Kilograms</option>
                            <option value="lbs">Pounds</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Volume
                          </label>
                          <select
                            value={systemSettings.units.volume}
                            onChange={(e) => setSystemSettings({
                              ...systemSettings,
                              units: {...systemSettings.units, volume: e.target.value}
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                          >
                            <option value="litres">Litres</option>
                            <option value="gallons">Gallons</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Delivery Methods</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
                          { key: 'sms', label: 'SMS Notifications', desc: 'Receive notifications via SMS' },
                          { key: 'push', label: 'Push Notifications', desc: 'Receive browser push notifications' }
                        ].map(item => (
                          <label key={item.key} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemSettings.notifications[item.key as keyof typeof systemSettings.notifications]}
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notifications: {
                                  ...systemSettings.notifications,
                                  [item.key]: e.target.checked
                                }
                              })}
                              className="h-4 w-4 text-[#153F9F] focus:ring-[#153F9F] border-gray-300 rounded"
                            />
                            <div className="ml-3">
                              <span className="text-sm font-medium text-gray-900">{item.label}</span>
                              <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Notification Types</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'tripUpdates', label: 'Trip Updates', desc: 'Notifications for trip status changes' },
                          { key: 'maintenanceAlerts', label: 'Maintenance Alerts', desc: 'Notifications for vehicle maintenance' },
                          { key: 'complianceAlerts', label: 'Compliance Alerts', desc: 'Notifications for compliance issues' }
                        ].map(item => (
                          <label key={item.key} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemSettings.notifications[item.key as keyof typeof systemSettings.notifications]}
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notifications: {
                                  ...systemSettings.notifications,
                                  [item.key]: e.target.checked
                                }
                              })}
                              className="h-4 w-4 text-[#153F9F] focus:ring-[#153F9F] border-gray-300 rounded"
                            />
                            <div className="ml-3">
                              <span className="text-sm font-medium text-gray-900">{item.label}</span>
                              <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'compliance' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Compliance Settings</h2>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {[
                        { 
                          key: 'requireDGCertification', 
                          label: 'Require DG Certification', 
                          desc: 'Require dangerous goods certification for DG shipments' 
                        },
                        { 
                          key: 'autoSegregationCheck', 
                          label: 'Automatic Segregation Check', 
                          desc: 'Automatically check dangerous goods segregation rules' 
                        },
                        { 
                          key: 'mandatoryInspections', 
                          label: 'Mandatory Inspections', 
                          desc: 'Require vehicle inspections before trip start' 
                        },
                        { 
                          key: 'weightLimitAlerts', 
                          label: 'Weight Limit Alerts', 
                          desc: 'Alert when approaching vehicle weight limits' 
                        }
                      ].map(item => (
                        <label key={item.key} className="flex items-start">
                          <input
                            type="checkbox"
                            checked={systemSettings.compliance[item.key as keyof typeof systemSettings.compliance]}
                            onChange={(e) => setSystemSettings({
                              ...systemSettings,
                              compliance: {
                                ...systemSettings.compliance,
                                [item.key]: e.target.checked
                              }
                            })}
                            className="h-4 w-4 text-[#153F9F] focus:ring-[#153F9F] border-gray-300 rounded mt-1"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-900">{item.label}</span>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <span className="text-yellow-400 text-xl">⚠️</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Security Features Coming Soon
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <ul className="list-disc list-inside space-y-1">
                              <li>Two-factor authentication</li>
                              <li>Password policy configuration</li>
                              <li>Session management</li>
                              <li>API key management</li>
                              <li>Audit logging</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button 
                    type="button"
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSave}
                    className="btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
import PageTemplate from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SettingsPage() {
  const settingsOptions = [
    {
      title: 'General System Configurations',
      description: 'Adjust system-wide settings, user permissions and access controls',
      icon: '🔧',
      href: '/settings/general',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'Regional Compliance & Security',
      description: 'Configure compliance settings per region and security protocols',
      icon: '🌎',
      href: '/settings/regional-compliance',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'API Integrations & Third-Party Tools',
      description: 'Connect external software and manage data source integrations',
      icon: '🔐',
      href: '/settings/api-integrations',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ];

  const systemHealth = [
    { metric: 'System Uptime', value: '99.8%', status: 'excellent' },
    { metric: 'API Response Time', value: '145ms', status: 'good' },
    { metric: 'Active Integrations', value: '12', status: 'active' },
    { metric: 'Security Status', value: 'Secure', status: 'secure' }
  ];

  return (
    <PageTemplate 
      title="🛠️ System Settings"
      description="Configure system-wide settings, integrations and compliance parameters"
    >
      {/* System Health Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {systemHealth.map((health, index) => (
          <Card key={index} className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{health.metric}</p>
                  <p className="text-xl font-bold text-gray-900">{health.value}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  health.status === 'excellent' ? 'bg-green-500' :
                  health.status === 'good' ? 'bg-blue-500' :
                  health.status === 'active' ? 'bg-blue-500' :
                  health.status === 'secure' ? 'bg-green-500' :
                  'bg-gray-500'
                }`}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {settingsOptions.map((option, index) => (
          <Link key={index} href={option.href}>
            <Card className={`cursor-pointer transition-all duration-200 ${option.color} shadow-[0px_4px_18px_rgba(75,70,92,0.1)] hover:shadow-[0px_6px_24px_rgba(75,70,92,0.15)]`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{option.icon}</div>
                  <CardTitle className="font-['Poppins'] font-bold text-[16px] leading-[22px]">
                    {option.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 font-['Poppins'] text-[14px] leading-[20px]">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Configuration Changes */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Recent Configuration Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { change: 'Updated API rate limits for external integrations', user: 'System Admin', time: '2 hours ago', type: 'security' },
              { change: 'Modified regional compliance settings for EU operations', user: 'Compliance Manager', time: '1 day ago', type: 'compliance' },
              { change: 'Added new user permission role: Fleet Supervisor', user: 'HR Administrator', time: '3 days ago', type: 'access' },
              { change: 'Configured backup retention policy', user: 'System Admin', time: '1 week ago', type: 'system' }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  item.type === 'security' ? 'bg-red-500' :
                  item.type === 'compliance' ? 'bg-yellow-500' :
                  item.type === 'access' ? 'bg-blue-500' :
                  'bg-green-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.change}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-500">Changed by: {item.user}</span>
                    <span className="text-xs text-gray-500">{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-[#153F9F] text-white rounded-lg hover:bg-[#1230a0] transition-colors">
              Backup Configuration
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Export Settings
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              View System Logs
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Test Integrations
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Security Audit
            </button>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

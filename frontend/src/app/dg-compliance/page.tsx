import PageTemplate from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function DgCompliancePage() {
  const complianceOptions = [
    {
      title: 'Manifest Search (DG Identification)',
      description: 'Identify dangerous goods in shipment manifests automatically',
      icon: '📑',
      href: '/dg-compliance/manifest-search',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'DG Compatibility Tool',
      description: 'Check if dangerous goods can be transported together safely',
      icon: '✅',
      href: '/dg-compliance/compatibility',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'SDS Database',
      description: 'Find Safety Data Sheets for hazardous materials',
      icon: '📂',
      href: '/dg-compliance/sds-database',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      title: 'Emergency Procedure Guide',
      description: 'Look up emergency response instructions for incidents',
      icon: '📖',
      href: '/dg-compliance/emergency-procedures',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      title: 'DG Transport Compliance Reports',
      description: 'View DG transport violations and risk analysis',
      icon: '🚛',
      href: '/dg-compliance/transport-reports',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    },
    {
      title: 'DG Risk & Violation Alerts',
      description: 'Monitor flagged shipments for compliance risks',
      icon: '⚠️',
      href: '/dg-compliance/risk-alerts',
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
    }
  ];

  const complianceStats = [
    { label: 'Active DG Shipments', value: '47', status: 'compliant' },
    { label: 'Pending Reviews', value: '12', status: 'warning' },
    { label: 'Violations This Month', value: '2', status: 'critical' },
    { label: 'Compliance Rate', value: '97.8%', status: 'excellent' }
  ];

  return (
    <PageTemplate 
      title="📜 DG Compliance"
      description="Dangerous goods compliance management and safety monitoring"
    >
      {/* Compliance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {complianceStats.map((stat, index) => (
          <Card key={index} className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  stat.status === 'compliant' ? 'bg-green-500' :
                  stat.status === 'warning' ? 'bg-yellow-500' :
                  stat.status === 'critical' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {complianceOptions.map((option, index) => (
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

      {/* Recent Compliance Activity */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Recent Compliance Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { type: 'Review', message: 'SDS document approved for UN2796 Sulfuric Acid', time: '1 hour ago', status: 'success' },
              { type: 'Alert', message: 'Segregation violation detected in manifest VOL-12345', time: '3 hours ago', status: 'warning' },
              { type: 'Compliance', message: 'Emergency procedure EPG-0023 updated', time: '5 hours ago', status: 'info' },
              { type: 'Audit', message: 'Monthly compliance audit scheduled', time: '1 day ago', status: 'neutral' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' :
                  activity.status === 'info' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{activity.type}</span>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                  <p className="text-sm text-gray-600">{activity.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

import PageTemplate from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ReportsPage() {
  const reportOptions = [
    {
      title: 'Fleet Performance Reports',
      description: 'Analyze vehicle usage, uptime, efficiency and operational metrics',
      icon: '🚛',
      href: '/reports/fleet-performance',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'Shipment & Logistics Insights',
      description: 'Review delivery success rates, delays and transportation analytics',
      icon: '🚚',
      href: '/reports/logistics-insights',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'DG Compliance & Safety Metrics',
      description: 'Audit dangerous goods handling and regulatory compliance',
      icon: '📈',
      href: '/reports/compliance-metrics',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      title: 'Warehouse & Load Efficiency Analytics',
      description: 'Monitor warehouse loading times and operational bottlenecks',
      icon: '🏢',
      href: '/reports/warehouse-analytics',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      title: 'Demurrage Reports',
      description: 'View demurrage time and cost analysis for deliveries',
      icon: '🕒',
      href: '/reports/demurrage-reports',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    }
  ];

  const reportStats = [
    { label: 'Reports Generated', value: '1,247', period: 'This Month' },
    { label: 'Data Points Analyzed', value: '524K', period: 'Last 30 Days' },
    { label: 'Compliance Score', value: '97.3%', period: 'Current' },
    { label: 'Fleet Efficiency', value: '89.1%', period: 'Average' }
  ];

  return (
    <PageTemplate 
      title="📋 Reports"
      description="Comprehensive analytics and reporting for all aspects of your transport operations"
    >
      {/* Report Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {reportStats.map((stat, index) => (
          <Card key={index} className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-xs text-gray-500">{stat.period}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportOptions.map((option, index) => (
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

      {/* Quick Reports */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Quick Report Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900 mb-1">Daily Operations Summary</h4>
              <p className="text-sm text-gray-600">Generate today's operational overview</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900 mb-1">Weekly Safety Report</h4>
              <p className="text-sm text-gray-600">Compile weekly safety and compliance data</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900 mb-1">Monthly Performance Review</h4>
              <p className="text-sm text-gray-600">Comprehensive monthly performance analysis</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900 mb-1">Custom Date Range</h4>
              <p className="text-sm text-gray-600">Create reports for specific time periods</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900 mb-1">Regulatory Compliance</h4>
              <p className="text-sm text-gray-600">Generate compliance reports for audits</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900 mb-1">Export All Data</h4>
              <p className="text-sm text-gray-600">Download comprehensive data exports</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

import PageTemplate from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function CustomersPage() {
  const customerOptions = [
    {
      title: 'Customer Profiles',
      description: 'Store customer name, contacts, locations and business details',
      icon: '📄',
      href: '/customers/profiles',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'Geofencing & Delivery Zones',
      description: 'Define safe and restricted delivery locations with GPS boundaries',
      icon: '📍',
      href: '/customers/geofencing',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'DG Handling Requirements',
      description: 'Specify dangerous goods restrictions and handling rules per customer',
      icon: '🚛',
      href: '/customers/dg-requirements',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      title: 'Shipment History',
      description: 'View past shipments and delivery records per customer',
      icon: '📁',
      href: '/customers/history',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      title: 'Customer-Specific Compliance Rules',
      description: 'Store custom handling and safety rules for each customer',
      icon: '🔔',
      href: '/customers/compliance-rules',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    },
    {
      title: 'Demurrage & Delivery Constraints',
      description: 'Predefine acceptable wait times and delivery restrictions',
      icon: '⏳',
      href: '/customers/demurrage',
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
    }
  ];

  const customerStats = [
    { label: 'Total Customers', value: '342', status: 'active' },
    { label: 'Active This Month', value: '156', status: 'active' },
    { label: 'New Customers', value: '12', status: 'new' },
    { label: 'Compliance Rate', value: '96.8%', status: 'excellent' }
  ];

  return (
    <PageTemplate 
      title="📂 Customers"
      description="Comprehensive customer management with compliance and delivery zone management"
    >
      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {customerStats.map((stat, index) => (
          <Card key={index} className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  stat.status === 'active' ? 'bg-green-500' :
                  stat.status === 'new' ? 'bg-blue-500' :
                  stat.status === 'excellent' ? 'bg-green-500' :
                  'bg-gray-500'
                }`}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Customer Management Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customerOptions.map((option, index) => (
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

      {/* Recent Customer Activity */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Recent Customer Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { company: 'Acme Chemical Corp', activity: 'New shipment created', location: 'Sydney, NSW', time: '2 hours ago' },
              { company: 'Industrial Solutions Ltd', activity: 'Delivery zone updated', location: 'Melbourne, VIC', time: '4 hours ago' },
              { company: 'Global Logistics Inc', activity: 'DG requirements modified', location: 'Brisbane, QLD', time: '6 hours ago' },
              { company: 'SafeTrans Australia', activity: 'Compliance rules reviewed', location: 'Perth, WA', time: '1 day ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">{activity.company.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.company}</p>
                    <p className="text-sm text-gray-600">{activity.activity}</p>
                    <p className="text-xs text-gray-500">{activity.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

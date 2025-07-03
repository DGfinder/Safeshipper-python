import PageTemplate from '../../components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import Link from 'next/link';

export default function ShipmentsPage() {
  const shipmentOptions = [
    {
      title: 'New Shipment',
      description: 'Create a new shipment with auto-fill from Customer Database',
      icon: '➕',
      href: '/shipments/new',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'Live Map',
      description: 'View all active shipments with real-time tracking and geofencing alerts',
      icon: '📍',
      href: '/shipments/live-map',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'Shipment Management',
      description: 'Access comprehensive shipment workflows and management tools',
      icon: '📦',
      href: '/shipments/management',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ];

  const quickStats = [
    { label: 'Active Shipments', value: '147', change: '+12%' },
    { label: 'In Transit', value: '89', change: '+8%' },
    { label: 'Delivered Today', value: '23', change: '+15%' },
    { label: 'Pending Approval', value: '12', change: '-3%' }
  ];

  return (
    <PageTemplate 
      title="🚚 Shipments"
      description="Manage all your shipments, track deliveries, and oversee transportation operations"
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shipmentOptions.map((option, index) => (
          <Link key={index} href={option.href}>
            <Card className={`cursor-pointer transition-all duration-200 ${option.color} shadow-[0px_4px_18px_rgba(75,70,92,0.1)] hover:shadow-[0px_6px_24px_rgba(75,70,92,0.15)]`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{option.icon}</div>
                  <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
                    {option.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 font-['Poppins'] text-[15px] leading-[22px]">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Recent Shipment Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: 'VOL-873454', status: 'In Transit', location: 'Milano, Italy', time: '2 hours ago' },
              { id: 'VOL-349576', status: 'Delivered', location: 'Brussels, Belgium', time: '4 hours ago' },
              { id: 'VOL-345789', status: 'Loading', location: 'Abu Dhabi, UAE', time: '6 hours ago' },
              { id: 'VOL-456890', status: 'In Transit', location: 'Amsterdam, Netherlands', time: '8 hours ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.id}</p>
                    <p className="text-sm text-gray-600">{activity.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{activity.status}</p>
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

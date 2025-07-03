import PageTemplate from '../../components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import Link from 'next/link';

export default function FleetPage() {
  const fleetOptions = [
    {
      title: 'Vehicle Database',
      description: 'Manage trucks, trailers, and rail carts with complete specifications',
      icon: '🚛',
      href: '/fleet/vehicles',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'GPS Device Monitoring & Alerts',
      description: 'Track GPS connectivity and monitor active vehicles in real-time',
      icon: '📍',
      href: '/fleet/gps-monitoring',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'Fleet & Vehicle Compliance Checks',
      description: 'Ensure vehicles meet DG transport and maintenance standards',
      icon: '🚦',
      href: '/fleet/compliance-checks',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      title: 'Predictive Maintenance',
      description: 'AI-driven fleet health tracking and maintenance scheduling',
      icon: '🔍',
      href: '/fleet/maintenance',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      title: 'Inspection Scheduling',
      description: 'Track and manage upcoming safety inspections and certifications',
      icon: '📅',
      href: '/fleet/inspections',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    }
  ];

  const fleetStats = [
    { label: 'Total Vehicles', value: '87', status: 'active' },
    { label: 'Active on Road', value: '64', status: 'active' },
    { label: 'In Maintenance', value: '8', status: 'maintenance' },
    { label: 'GPS Connectivity', value: '98.5%', status: 'excellent' }
  ];

  return (
    <PageTemplate 
      title="🚛 Fleet & GPS Health"
      description="Comprehensive fleet management and GPS tracking for transport operations"
    >
      {/* Fleet Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {fleetStats.map((stat, index) => (
          <Card key={index} className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  stat.status === 'active' ? 'bg-green-500' :
                  stat.status === 'maintenance' ? 'bg-yellow-500' :
                  stat.status === 'excellent' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fleet Management Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fleetOptions.map((option, index) => (
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

      {/* Fleet Status Dashboard */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Fleet Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Active Vehicles</h4>
              <div className="space-y-2">
                {[
                  { id: 'TRK-001', type: 'Heavy Truck', status: 'En Route', location: 'Sydney-Melbourne' },
                  { id: 'TRK-015', type: 'Trailer', status: 'Loading', location: 'Brisbane Port' },
                  { id: 'TRK-023', type: 'Rail Cart', status: 'In Transit', location: 'Adelaide-Perth' }
                ].map((vehicle, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{vehicle.id}</p>
                      <p className="text-sm text-gray-600">{vehicle.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{vehicle.status}</p>
                      <p className="text-xs text-gray-500">{vehicle.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Maintenance Alerts</h4>
              <div className="space-y-2">
                {[
                  { id: 'TRK-007', issue: 'Scheduled Service Due', priority: 'Medium', due: '3 days' },
                  { id: 'TRK-019', issue: 'Brake Inspection Required', priority: 'High', due: '1 day' },
                  { id: 'TRK-034', issue: 'Tire Rotation Needed', priority: 'Low', due: '1 week' }
                ].map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{alert.id}</p>
                      <p className="text-sm text-gray-600">{alert.issue}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        alert.priority === 'High' ? 'bg-red-100 text-red-800' :
                        alert.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {alert.priority}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">Due: {alert.due}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

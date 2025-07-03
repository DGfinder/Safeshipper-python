import PageTemplate from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ShipmentsManagementPage() {
  const managementOptions = [
    {
      title: 'Shipment Overview',
      description: 'View all shipments in progress with comprehensive status tracking',
      icon: '📜',
      href: '/shipments/management/overview',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'Shipment Details',
      description: 'Drill-down shipment information with complete documentation',
      icon: '📑',
      href: '/shipments/management/details',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'Shipment Tracking',
      description: 'Real-time location tracking and route updates',
      icon: '🚚',
      href: '/shipments/management/tracking',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      title: 'Shipment Documents',
      description: 'Access bills of lading, DG documents, and SDS sheets',
      icon: '📑',
      href: '/shipments/management/documents',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      title: 'Load Planning & Hazard Assessments',
      description: 'Safety and compliance evaluations before loading',
      icon: '⚠️',
      href: '/shipments/management/load-planning',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    },
    {
      title: 'Comments (Instant Messaging)',
      description: 'Chain of responsibility communication system',
      icon: '💬',
      href: '/shipments/management/comments',
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
    },
    {
      title: 'Pre-Unloading & Completion',
      description: 'Shipment finalization and completion workflows',
      icon: '🏁',
      href: '/shipments/management/completion',
      color: 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }
  ];

  return (
    <PageTemplate 
      title="📦 Shipment Management"
      description="Expandable submenu containing shipment-related workflows and management tools"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managementOptions.map((option, index) => (
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
              View All Active Shipments
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Generate Report
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Export Data
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Schedule Inspection
            </button>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

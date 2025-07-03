import PageTemplate from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SafetyPage() {
  const safetyOptions = [
    {
      title: 'Incident Report Submission',
      description: 'Log safety incidents and non-compliance events for investigation',
      icon: '🚨',
      href: '/safety/incident-reports',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    },
    {
      title: 'Hazard Logs & Risk Assessments',
      description: 'Record and analyze safety risks with comprehensive assessments',
      icon: '⚠️',
      href: '/safety/hazard-logs',
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
    },
    {
      title: 'Corrective Actions & Compliance Tracking',
      description: 'Assign and track actions to resolve compliance issues',
      icon: '🔧',
      href: '/safety/corrective-actions',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'Safety Performance Reports',
      description: 'Review safety trends and workplace compliance metrics',
      icon: '📊',
      href: '/safety/performance-reports',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    }
  ];

  const safetyStats = [
    { label: 'Days Without Incident', value: '127', status: 'excellent' },
    { label: 'Open Incident Reports', value: '3', status: 'warning' },
    { label: 'Corrective Actions', value: '8', status: 'active' },
    { label: 'Safety Score', value: '94.2%', status: 'excellent' }
  ];

  return (
    <PageTemplate 
      title="⚠️ Safety & Incidents"
      description="Comprehensive safety management and incident tracking system"
    >
      {/* Safety Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {safetyStats.map((stat, index) => (
          <Card key={index} className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  stat.status === 'excellent' ? 'bg-green-500' :
                  stat.status === 'warning' ? 'bg-yellow-500' :
                  stat.status === 'active' ? 'bg-blue-500' :
                  'bg-red-500'
                }`}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Safety Management Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {safetyOptions.map((option, index) => (
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

      {/* Recent Incidents & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardHeader>
            <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
              Recent Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'INC-2024-001', type: 'Near Miss', description: 'Vehicle proximity alert at loading dock', date: '2 days ago', severity: 'Low' },
                { id: 'INC-2024-002', type: 'Safety Violation', description: 'Improper DG labeling detected', date: '1 week ago', severity: 'Medium' },
                { id: 'INC-2024-003', type: 'Equipment', description: 'Emergency equipment inspection overdue', date: '2 weeks ago', severity: 'High' }
              ].map((incident, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{incident.id}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      incident.severity === 'High' ? 'bg-red-100 text-red-800' :
                      incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{incident.type}</p>
                  <p className="text-sm text-gray-600">{incident.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{incident.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardHeader>
            <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
              Active Corrective Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'CA-001', action: 'Update DG handling procedures', assignee: 'Safety Team', due: 'Tomorrow', progress: 80 },
                { id: 'CA-002', action: 'Conduct driver safety training', assignee: 'HR Department', due: '3 days', progress: 45 },
                { id: 'CA-003', action: 'Install additional safety signage', assignee: 'Facilities', due: '1 week', progress: 20 }
              ].map((action, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{action.id}</span>
                    <span className="text-sm text-gray-600">Due: {action.due}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{action.action}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Assigned to: {action.assignee}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${action.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{action.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}

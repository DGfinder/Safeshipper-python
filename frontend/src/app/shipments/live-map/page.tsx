import PageTemplate from '@/components/layout/PageTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LiveMapPage() {
  const activeShipments = [
    { id: 'SS001', customer: 'Acme Chemical', status: 'In Transit', eta: '2:30 PM', location: 'Sydney, NSW' },
    { id: 'SS002', customer: 'Industrial Solutions', status: 'Loading', eta: '4:15 PM', location: 'Melbourne, VIC' },
    { id: 'SS003', customer: 'Global Logistics', status: 'Delivered', eta: 'Completed', location: 'Brisbane, QLD' },
  ];

  return (
    <PageTemplate 
      title="Live Map (Full-Screen)"
      description="View all active shipments, real-time tracking, geofencing alerts"
      actions={
        <>
          <Button variant="outline">Filter Shipments</Button>
          <Button className="bg-[#153F9F] hover:bg-[#1230a0] text-white">
            Full Screen
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2">
          <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] h-[600px]">
            <CardContent className="p-0 h-full">
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-[#153F9F] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Interactive Map</h3>
                  <p className="text-gray-500">Real-time GPS tracking integration would display here</p>
                  <p className="text-sm text-gray-400 mt-2">Connect with GPS providers: Garmin, TomTom, Samsara</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Shipments Panel */}
        <div>
          <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
            <CardHeader>
              <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
                Active Shipments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeShipments.map((shipment) => (
                <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{shipment.id}</span>
                    <Badge className={
                      shipment.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                      shipment.status === 'Loading' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {shipment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{shipment.customer}</p>
                  <p className="text-sm text-gray-500">{shipment.location}</p>
                  <p className="text-xs text-gray-400 mt-2">ETA: {shipment.eta}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)] mt-6">
            <CardHeader>
              <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
                🚨 Geofencing Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 font-medium text-sm">No active alerts</p>
                <p className="text-red-600 text-xs mt-1">All shipments within authorized zones</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
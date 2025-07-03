import PageTemplate from '../../../components/layout/PageTemplate';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

export default function VehicleDatabasePage() {
  const vehicles = [
    { id: 'TRK001', type: 'Prime Mover', model: 'Kenworth T609', status: 'Active', location: 'Sydney Depot', dgCertified: true },
    { id: 'TRL002', type: 'Trailer', model: 'MaxiTRANS Curtainsider', status: 'Maintenance', location: 'Melbourne Depot', dgCertified: true },
    { id: 'TRK003', type: 'Rigid Truck', model: 'Isuzu FVZ', status: 'Active', location: 'Brisbane Depot', dgCertified: false },
    { id: 'RLC001', type: 'Rail Cart', model: 'Standard Freight Wagon', status: 'Active', location: 'Rail Terminal', dgCertified: true },
  ];

  return (
    <PageTemplate 
      title="Vehicle Database"
      description="Manage trucks, trailers, and rail carts with DG compliance tracking"
      actions={
        <>
          <Button variant="outline">Import Vehicles</Button>
          <Button className="bg-[#153F9F] hover:bg-[#1230a0] text-white">
            Add New Vehicle
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">47</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                🚛
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">DG Certified</p>
                <p className="text-2xl font-bold text-green-600">38</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                ✅
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600">5</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                🔧
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Routes</p>
                <p className="text-2xl font-bold text-blue-600">23</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                📍
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
              Fleet Inventory
            </CardTitle>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search vehicles..."
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option>All Types</option>
                <option>Prime Mover</option>
                <option>Trailer</option>
                <option>Rigid Truck</option>
                <option>Rail Cart</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Vehicle ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Model</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">DG Certified</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900">{vehicle.id}</td>
                    <td className="py-3 px-4 text-gray-700">{vehicle.type}</td>
                    <td className="py-3 px-4 text-gray-700">{vehicle.model}</td>
                    <td className="py-3 px-4">
                      <Badge className={
                        vehicle.status === 'Active' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {vehicle.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{vehicle.location}</td>
                    <td className="py-3 px-4">
                      {vehicle.dgCertified ? (
                        <Badge className="bg-green-100 text-green-800">Certified</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Not Certified</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Track</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardHeader>
            <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
              🚨 Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 font-medium text-sm">TRK003 - DG Certification Expired</p>
                <p className="text-yellow-700 text-xs">Expires: Dec 15, 2023</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 font-medium text-sm">TRL002 - Maintenance Overdue</p>
                <p className="text-red-700 text-xs">Due: Dec 10, 2023</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardHeader>
            <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
              📊 Fleet Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Prime Movers</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-[#153F9F] h-2 rounded-full" style={{width: '78%'}}></div>
                  </div>
                  <span className="text-sm font-medium">78%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Trailers</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
                  </div>
                  <span className="text-sm font-medium">85%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rail Carts</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{width: '62%'}}></div>
                  </div>
                  <span className="text-sm font-medium">62%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
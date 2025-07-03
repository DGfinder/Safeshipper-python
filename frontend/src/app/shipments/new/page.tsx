import PageTemplate from '@/components/layout/PageTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewShipmentPage() {
  return (
    <PageTemplate 
      title="New Shipment"
      description="Create a new shipment with auto-fill from Customer Database"
      actions={
        <Button className="bg-[#153F9F] hover:bg-[#1230a0] text-white">
          Save Shipment
        </Button>
      }
    >
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Shipment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option>Select Customer</option>
                <option>Acme Chemical Corp</option>
                <option>Industrial Solutions Ltd</option>
                <option>Global Logistics Inc</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Origin Location
              </label>
              <input 
                type="text" 
                placeholder="Enter pickup location"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Location
              </label>
              <input 
                type="text" 
                placeholder="Enter delivery location"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Freight Type
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option>Select Freight Type</option>
                <option>Standard Freight</option>
                <option>Dangerous Goods</option>
                <option>Temperature Controlled</option>
                <option>Oversized Load</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea 
              rows={4}
              placeholder="Enter any special handling instructions..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Dangerous Goods Detection</h4>
            <p className="text-yellow-700 text-sm">
              This system will automatically scan for dangerous goods and ensure compliance with Australian Chain-of-Responsibility regulations.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
import PageTemplate from '@/components/layout/PageTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CompatibilityPage() {
  const recentChecks = [
    { id: 1, dg1: 'UN1203 (Gasoline)', dg2: 'UN1230 (Methanol)', result: 'Compatible', risk: 'Low' },
    { id: 2, dg1: 'UN1824 (Sodium hydroxide)', dg2: 'UN1789 (Hydrochloric acid)', result: 'Incompatible', risk: 'High' },
    { id: 3, dg1: 'UN1950 (Aerosols)', dg2: 'UN1266 (Perfume products)', result: 'Compatible', risk: 'Medium' },
  ];

  return (
    <PageTemplate 
      title="DG Compatibility Tool"
      description="Check if dangerous goods can be transported together safely"
      actions={
        <Button className="bg-[#153F9F] hover:bg-[#1230a0] text-white">
          Export Results
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compatibility Checker */}
        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardHeader>
            <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
              Compatibility Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Dangerous Good
              </label>
              <input 
                type="text" 
                placeholder="Enter UN number or search by name (e.g., UN1203)"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Dangerous Good
              </label>
              <input 
                type="text" 
                placeholder="Enter UN number or search by name (e.g., UN1230)"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transport Mode
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option>Road Transport</option>
                <option>Rail Transport</option>
                <option>Sea Transport</option>
                <option>Air Transport</option>
              </select>
            </div>
            
            <Button className="w-full bg-[#153F9F] hover:bg-[#1230a0] text-white">
              Check Compatibility
            </Button>
            
            {/* Sample Result */}
            <Alert className="border-green-300 bg-green-50">
              <AlertDescription className="text-green-800">
                <strong>✅ Compatible:</strong> These dangerous goods can be transported together with standard precautions.
                <br />
                <span className="text-sm">Segregation requirement: Category A (No special requirements)</span>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Recent Checks */}
        <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
          <CardHeader>
            <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
              Recent Compatibility Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentChecks.map((check) => (
                <div key={check.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={
                      check.result === 'Compatible' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }>
                      {check.result}
                    </Badge>
                    <Badge variant="outline" className={
                      check.risk === 'Low' ? 'text-green-600' :
                      check.risk === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                    }>
                      {check.risk} Risk
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{check.dg1}</p>
                  <p className="text-sm text-gray-600">vs {check.dg2}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IMDG Segregation Matrix Reference */}
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            📋 IMDG Segregation Matrix Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded border">
              <strong className="text-green-800">Category A</strong>
              <p className="text-green-700">No special requirements</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded border">
              <strong className="text-yellow-800">Category B</strong>
              <p className="text-yellow-700">Separated by</p>
            </div>
            <div className="bg-orange-50 p-3 rounded border">
              <strong className="text-orange-800">Category C</strong>
              <p className="text-orange-700">Separated from</p>
            </div>
            <div className="bg-red-50 p-3 rounded border">
              <strong className="text-red-800">Category X</strong>
              <p className="text-red-700">Prohibited together</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-4">
            Based on Australian Dangerous Goods Code (ADG Code) and IMDG Code requirements for multimodal transport.
          </p>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
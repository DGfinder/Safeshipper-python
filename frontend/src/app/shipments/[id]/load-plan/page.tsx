// app/shipments/[id]/load-plan/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Truck, 
  Save, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle,
  Loader2,
  AlertTriangle,
  Eye,
  Settings
} from 'lucide-react';
import { useGenerateLoadPlan, useSaveLoadPlan, type LoadPlan, type PlacedItem } from '@/hooks/useLoadPlan';
import { LoadPlanStats } from '@/components/load-planner/LoadPlanStats';
import { AuthGuard } from '@/components/auth/auth-guard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Dynamically import 3D component to avoid SSR issues
const LoadPlanner3D = dynamic(
  () => import('@/components/load-planner/LoadPlanner3D').then(mod => ({ default: mod.LoadPlanner3D })),
  { 
    ssr: false,
    loading: () => (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading 3D load planner...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
);

interface LoadPlanPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function LoadPlanPage({ params }: LoadPlanPageProps) {
  const router = useRouter();
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [loadPlan, setLoadPlan] = useState<LoadPlan | null>(null);
  const [selectedItem, setSelectedItem] = useState<PlacedItem | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const generateLoadPlan = useGenerateLoadPlan();
  const saveLoadPlan = useSaveLoadPlan();

  useEffect(() => {
    params.then(p => setShipmentId(p.id));
  }, [params]);

  const handleGenerateLoadPlan = async () => {
    if (!shipmentId) return;

    try {
      const result = await generateLoadPlan.mutateAsync({
        shipmentId,
        vehicleIds: ['demo-vehicle-1'] // Demo vehicle ID
      });
      setLoadPlan(result);
      setIsSaved(false);
      toast.success('Load plan generated successfully!');
    } catch (error) {
      toast.error('Failed to generate load plan');
      console.error('Load plan generation error:', error);
    }
  };

  const handleSaveLoadPlan = async () => {
    if (!shipmentId || !loadPlan) return;

    try {
      await saveLoadPlan.mutateAsync({
        shipmentId,
        loadPlan
      });
      setIsSaved(true);
      toast.success('Load plan saved and attached to shipment!');
    } catch (error) {
      toast.error('Failed to save load plan');
      console.error('Load plan save error:', error);
    }
  };

  const handleItemSelect = (item: PlacedItem) => {
    setSelectedItem(item);
  };

  if (!shipmentId) {
    return (
      <AuthGuard>
        <div className="p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
            <p className="text-gray-500">Loading shipment...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/shipments/${shipmentId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shipment
              </Button>
            </Link>
            
            <div>
              <h1 className="text-3xl font-bold">3D Load Planning</h1>
              <p className="text-gray-600 mt-1">
                Optimize cargo placement for shipment {shipmentId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loadPlan && (
              <>
                <Button
                  onClick={handleSaveLoadPlan}
                  disabled={saveLoadPlan.isPending || isSaved}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saveLoadPlan.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isSaved ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaved ? 'Saved' : 'Save & Attach to Shipment'}
                </Button>
              </>
            )}
            
            <Button
              onClick={handleGenerateLoadPlan}
              disabled={generateLoadPlan.isPending}
              variant={loadPlan ? "outline" : "default"}
            >
              {generateLoadPlan.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {loadPlan ? 'Regenerate Plan' : 'Generate Load Plan'}
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {isSaved && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Load plan has been saved and attached to the shipment. The loading team can now use this plan for cargo placement.
            </AlertDescription>
          </Alert>
        )}

        {generateLoadPlan.isError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to generate load plan. Please try again or contact support if the issue persists.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {!loadPlan ? (
          /* Getting Started */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Load Plan Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="max-w-md mx-auto space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Package className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Generate 3D Load Plan</h3>
                  <p className="text-gray-600 text-sm">
                    Create an optimized 3D visualization showing how to efficiently load all consignment items into the selected vehicle.
                  </p>
                </div>
                
                <div className="space-y-2 text-sm text-gray-500">
                  <p>✓ Analyzes item dimensions and weights</p>
                  <p>✓ Applies dangerous goods compatibility rules</p>
                  <p>✓ Optimizes for space utilization and stability</p>
                  <p>✓ Provides interactive 3D visualization</p>
                </div>

                <Button
                  onClick={handleGenerateLoadPlan}
                  disabled={generateLoadPlan.isPending}
                  size="lg"
                  className="w-full"
                >
                  {generateLoadPlan.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  Generate Load Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Load Plan Results */
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 3D Visualization - Takes up 2 columns */}
            <div className="xl:col-span-2 space-y-4">
              <LoadPlanner3D
                loadPlan={loadPlan}
                onItemSelect={handleItemSelect}
              />
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Eye className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">Interactive View</p>
                    <p className="text-xs text-gray-500">Rotate, zoom, and inspect</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium">{loadPlan.placed_items.length} Items</p>
                    <p className="text-xs text-gray-500">Successfully placed</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Truck className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-sm font-medium">{loadPlan.efficiency_stats.volume_utilization.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Volume efficiency</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Statistics and Details - 1 column */}
            <div className="space-y-4">
              <LoadPlanStats loadPlan={loadPlan} />
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
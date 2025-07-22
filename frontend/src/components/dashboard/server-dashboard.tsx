import { Suspense } from "react";
import { serverApi, type DashboardStats, type FleetStatus, type RecentShipmentsResponse } from "@/utils/lib/server-api";
import { StatCards } from "./stat-cards";
import { CompanyHeader } from "./company-header";
import { RecentShipmentsTable } from "./recent-shipments-table";
import { OperationalStats } from "./operational-stats";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Loader2 } from "lucide-react";

// Loading skeleton components
function StatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableLoading() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OperationalLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 bg-gray-200 rounded w-1/2" />
                <div className="h-6 bg-gray-200 rounded w-12" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
              <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Server components that fetch data
async function ServerStatsCards() {
  const [stats, fleetStatus] = await Promise.all([
    serverApi.getDashboardStats(),
    serverApi.getFleetStatus()
  ]);
  
  return <StatCards stats={stats} fleetStatus={fleetStatus} />;
}

async function ServerCompanyHeader() {
  const [companyData, fleetStatus] = await Promise.all([
    serverApi.getCompanyMetadata(),
    serverApi.getFleetStatus()
  ]);
  
  return <CompanyHeader company={companyData} fleetStatus={fleetStatus} />;
}

async function ServerRecentShipments() {
  const shipments = await serverApi.getRecentShipments(10);
  return <RecentShipmentsTable shipments={shipments} />;
}

async function ServerOperationalStats() {
  const [inspectionStats, podStats] = await Promise.all([
    serverApi.getInspectionStats(),
    serverApi.getPODStats()
  ]);
  
  return <OperationalStats inspectionStats={inspectionStats} podStats={podStats} />;
}

// Main server dashboard component
export default function ServerDashboard() {
  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </CardContent>
        </Card>
      }>
        <ServerCompanyHeader />
      </Suspense>

      {/* Stats Cards */}
      <Suspense fallback={<StatsLoading />}>
        <ServerStatsCards />
      </Suspense>

      {/* Operational Stats */}
      <Suspense fallback={<OperationalLoading />}>
        <ServerOperationalStats />
      </Suspense>

      {/* Recent Shipments Table */}
      <Suspense fallback={<TableLoading />}>
        <ServerRecentShipments />
      </Suspense>
    </div>
  );
}
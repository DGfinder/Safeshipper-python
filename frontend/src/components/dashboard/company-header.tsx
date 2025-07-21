import type { CompanyMetadata, FleetStatus } from "@/lib/server-api";

interface CompanyHeaderProps {
  company: CompanyMetadata;
  fleetStatus: FleetStatus;
}

export function CompanyHeader({ company, fleetStatus }: CompanyHeaderProps) {
  const activePercentage = Math.round((fleetStatus.active / fleetStatus.total) * 100);
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-blue-100 mt-1">
            {company.description} • {company.location} • {company.fleet_size} Trucks • Established {company.established}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-blue-100">Fleet Status</div>
          <div className="text-xl font-bold">
            {activePercentage}% Active
          </div>
          <div className="text-xs text-blue-200 mt-1">
            {fleetStatus.active}/{fleetStatus.total} vehicles
          </div>
        </div>
      </div>
    </div>
  );
}
/**
 * Live Compliance Monitoring Page
 * Real-time dangerous goods compliance dashboard
 * Replaces simulated compliance monitoring with actual rule-based validation
 */

import { Metadata } from 'next';
import RealTimeComplianceDashboard from '../../components/compliance/real-time-compliance-dashboard';
import { DashboardLayout } from '../../components/layout/dashboard-layout';

export const metadata: Metadata = {
  title: 'Live Compliance Monitoring - SafeShipper',
  description: 'Real-time dangerous goods compliance monitoring and automated rule validation',
  keywords: ['compliance', 'dangerous goods', 'monitoring', 'regulations', 'safety'],
};

export default function ComplianceLivePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <RealTimeComplianceDashboard />
      </div>
    </DashboardLayout>
  );
}

// Force dynamic rendering to ensure real-time updates
export const dynamic = 'force-dynamic';
export const revalidate = 0;
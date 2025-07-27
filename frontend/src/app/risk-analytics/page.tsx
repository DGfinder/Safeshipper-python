/**
 * Predictive Risk Analytics Page
 * Main interface for AI-powered risk assessment and predictive modeling
 */

import { Metadata } from 'next';
import PredictiveRiskDashboard from '../../components/analytics/predictive-risk-dashboard';
import { DashboardLayout } from '../../components/layout/dashboard-layout';

export const metadata: Metadata = {
  title: 'Predictive Risk Analytics - SafeShipper',
  description: 'AI-powered risk assessment and predictive modeling for dangerous goods operations',
  keywords: ['risk analytics', 'predictive modeling', 'AI', 'dangerous goods', 'safety'],
};

export default function RiskAnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PredictiveRiskDashboard />
      </div>
    </DashboardLayout>
  );
}

// Force dynamic rendering for real-time updates
export const dynamic = 'force-dynamic';
export const revalidate = 0;
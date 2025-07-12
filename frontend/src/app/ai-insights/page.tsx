// AI Insights Dashboard Page
// Showcases SafeShipper's innovative AI capabilities beyond ChemAlert
import AIInsightsDashboard from "@/components/dashboard/AIInsightsDashboard";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function AIInsightsPage() {
  return (
    <AuthGuard>
      <AIInsightsDashboard />
    </AuthGuard>
  );
}

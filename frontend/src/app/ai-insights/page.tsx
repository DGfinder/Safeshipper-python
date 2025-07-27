// AI Insights Dashboard Page
// Showcases SafeShipper's innovative AI capabilities beyond ChemAlert
import AIInsightsDashboard from "@/shared/components/charts/AIInsightsDashboard";
import { AuthGuard } from "@/shared/components/common/auth-guard";

export default function AIInsightsPage() {
  return (
    <AuthGuard>
      <AIInsightsDashboard />
    </AuthGuard>
  );
}

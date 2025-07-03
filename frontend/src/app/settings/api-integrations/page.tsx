import PageTemplate from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsApiIntegrationsPage() {
  return (
    <PageTemplate 
      title="Settings Api Integrations"
      description="This page is under development"
    >
      <Card className="shadow-[0px_4px_18px_rgba(75,70,92,0.1)]">
        <CardHeader>
          <CardTitle className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
            Settings Api Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🚧</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Coming Soon
            </h3>
            <p className="text-gray-600">
              This feature is currently under development and will be available in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

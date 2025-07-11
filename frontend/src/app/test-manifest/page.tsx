import { AuthGuard } from '@/components/auth/auth-guard';
import dynamic from 'next/dynamic';

const ManifestWorkflowTest = dynamic(() => import('@/components/testing/ManifestWorkflowTest'), {
  ssr: false,
});

export default function TestManifestPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <ManifestWorkflowTest />
      </div>
    </AuthGuard>
  );
}
"use client";

import { AuthGuard } from "@/shared/components/common/auth-guard";
import dynamic from "next/dynamic";

const ManifestWorkflowTest = dynamic(
  () => import("@/shared/components/testing/ManifestWorkflowTest"),
  {
    ssr: false,
  },
);

export default function TestManifestPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <ManifestWorkflowTest />
      </div>
    </AuthGuard>
  );
}

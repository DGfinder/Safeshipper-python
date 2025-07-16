"use client";

import React from "react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import SDSMobileLookup from "@/shared/components/sds/SDSMobileLookup";

export default function SDSMobilePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-4">
        <SDSMobileLookup />
      </div>
    </AuthGuard>
  );
}
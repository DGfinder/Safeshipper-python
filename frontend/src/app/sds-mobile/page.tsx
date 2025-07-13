"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import SDSMobileLookup from "@/components/sds/SDSMobileLookup";

export default function SDSMobilePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-4">
        <SDSMobileLookup />
      </div>
    </AuthGuard>
  );
}
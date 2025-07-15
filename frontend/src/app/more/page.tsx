'use client';

import React from 'react';
import { MobileNavWrapper, MobileMoreMenu } from '@/components/layout/mobile-bottom-nav';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function MorePage() {
  return (
    <AuthGuard>
      <MobileNavWrapper>
        <div className="min-h-screen bg-gray-50">
          <MobileMoreMenu />
        </div>
      </MobileNavWrapper>
    </AuthGuard>
  );
}
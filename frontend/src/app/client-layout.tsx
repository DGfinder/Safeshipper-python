"use client";

import dynamic from "next/dynamic";

const ClientProviders = dynamic(() => import("./providers"), {
  ssr: false,
});

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientProviders>{children}</ClientProviders>;
}
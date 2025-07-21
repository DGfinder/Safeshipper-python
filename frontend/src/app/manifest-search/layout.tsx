import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manifest Search Plugin | SafeShipper",
  description: "AI-powered PDF manifest analysis for dangerous goods detection and compliance",
  keywords: ["manifest", "dangerous goods", "PDF analysis", "shipping compliance", "hazmat"],
};

export default function ManifestSearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
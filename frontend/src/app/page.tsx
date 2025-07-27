"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page as the default route
    router.push("/login");
  }, [router]);

  // Show a loading state while redirecting
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#153F9F]"></div>
      <p className="mt-4 text-gray-600">Redirecting to login... (Updated)</p>
    </div>
  );
}

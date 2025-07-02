'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
    
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/login')
    } else {
      // Redirect to dashboard if authenticated
      router.push('/dashboard')
    }
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#153F9F] rounded transform rotate-45 flex items-center justify-center mx-auto mb-4">
          <div className="transform -rotate-45">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L22 12L12 22L2 12L12 2Z"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#153F9F] font-poppins mb-2">
          SafeShipper
        </h1>
        <p className="text-gray-600 font-poppins mb-4">
          Loading your freight management platform...
        </p>
        <div className="loading-spinner mx-auto"></div>
      </div>
    </div>
  )
} 
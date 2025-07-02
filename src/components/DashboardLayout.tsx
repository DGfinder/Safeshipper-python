'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Vehicles', href: '/vehicles' },
    { name: 'Users', href: '/users' },
    { name: 'Settings', href: '/settings' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#153F9F' 
          }}>
            SafeShipper
          </div>
          
          <nav style={{ display: 'flex', gap: '2rem' }}>
            {navigation.map((item) => (
              <Link 
                key={item.name}
                href={item.href}
                style={{ 
                  color: '#374151',
                  textDecoration: 'none',
                  fontWeight: '500',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Demo User
            </span>
            <button
              onClick={() => router.push('/login')}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem' 
      }}>
        {children}
      </main>
    </div>
  )
} 
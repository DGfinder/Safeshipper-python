'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  HomeIcon,
  UserIcon,
  TruckIcon,
  MapIcon,
  CubeIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('safeshipper_auth')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden">
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#153F9F] rounded flex items-center justify-center text-white font-bold text-sm">
                  S
                </div>
                <span className="ml-2 text-lg font-bold text-gray-900">SafeShipper</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <SidebarContent pathname={pathname} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center justify-center p-4 border-b">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#153F9F] rounded flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="ml-2 text-lg font-bold text-gray-900">SafeShipper</span>
            </div>
          </div>
          <SidebarContent pathname={pathname} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navbar */}
        <div className="sticky top-0 z-10 flex h-16 bg-white shadow-sm border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#153F9F] lg:hidden"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              {/* Breadcrumb could go here */}
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              {/* Notifications */}
              <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#153F9F]">
                <BellIcon className="w-6 h-6" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#153F9F] rounded-full flex items-center justify-center text-white font-medium text-sm">
                    AU
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-medium text-gray-900">Admin User</div>
                    <div className="text-xs text-gray-500">admin@safeshipper.com</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
      <nav className="mt-5 flex-1 px-2 space-y-6">
        {/* Dashboard */}
        <SidebarItem
          href="/dashboard"
          icon={HomeIcon}
          label="Dashboard"
          isActive={pathname === '/dashboard'}
        />

        {/* Core Management */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Management
          </h3>
          <div className="mt-2 space-y-1">
            <SidebarItem
              href="/users"
              icon={UserIcon}
              label="Users"
              isActive={pathname === '/users'}
            />
            <SidebarItem
              href="/vehicles"
              icon={TruckIcon}
              label="Vehicles"
              isActive={pathname === '/vehicles'}
            />
            <SidebarItem
              href="/live-tracking"
              icon={MapIcon}
              label="Live Tracking"
              isActive={pathname === '/live-tracking'}
            />
          </div>
        </div>

        {/* Operations */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Operations
          </h3>
          <div className="mt-2 space-y-1">
            <SidebarItem
              href="/load-planning"
              icon={CubeIcon}
              label="Load Planning"
              isActive={pathname === '/load-planning'}
            />
            <SidebarItem
              href="/analytics"
              icon={ChartBarIcon}
              label="Analytics"
              isActive={pathname === '/analytics'}
            />
            <SidebarItem
              href="/compliance"
              icon={ShieldCheckIcon}
              label="Compliance"
              isActive={pathname === '/compliance'}
            />
          </div>
        </div>

        {/* System */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            System
          </h3>
          <div className="mt-2 space-y-1">
            <SidebarItem
              href="/settings"
              icon={Cog6ToothIcon}
              label="Settings"
              isActive={pathname === '/settings'}
            />
          </div>
        </div>
      </nav>
    </div>
  )
}

interface SidebarItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
}

function SidebarItem({ href, icon: Icon, label, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`
        group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
        ${isActive
          ? 'bg-[#153F9F] text-white'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
    >
      <Icon
        className={`
          mr-3 flex-shrink-0 h-5 w-5 transition-colors
          ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}
        `}
      />
      {label}
    </Link>
  )
} 
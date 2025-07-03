'use client';

import React, { useState } from 'react';
import {
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentMagnifyingGlassIcon,
  CommandLineIcon,
  MagnifyingGlassIcon,
  CircleStackIcon,
  TruckIcon,
  BellIcon,
  EyeIcon,
  MapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon,
} from '@heroicons/react/24/solid';

// Types for our data
interface StatCard {
  id: string;
  title: string;
  value: string;
  description: string;
  change: string;
  trend: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  borderColor: string;
}

interface ShipmentRow {
  id: string;
  identifier: string;
  origin: string;
  destination: string;
  dangerousGoods: string[];
  hazchemCode: string;
  progress: number;
}

// Sample data
const statCards: StatCard[] = [
  {
    id: '1',
    title: 'Total Shipments',
    value: '2,847',
    description: 'Active shipments in transit',
    change: '+12.5%',
    trend: 'up',
    icon: TruckIcon,
    color: 'rgba(21, 63, 159, 0.08)',
    borderColor: '#153F9F'
  },
  {
    id: '2',
    title: 'Pending Reviews',
    value: '43',
    description: 'Documents requiring approval',
    change: '-8.2%',
    trend: 'down',
    icon: DocumentMagnifyingGlassIcon,
    color: 'rgba(255, 159, 67, 0.08)',
    borderColor: '#FF9F43'
  },
  {
    id: '3',
    title: 'Compliance Rate',
    value: '98.7%',
    description: 'Safety compliance score',
    change: '+2.1%',
    trend: 'up',
    icon: ChartBarIcon,
    color: 'rgba(234, 84, 85, 0.08)',
    borderColor: '#EA5455'
  },
  {
    id: '4',
    title: 'Active Routes',
    value: '156',
    description: 'Currently operating routes',
    change: '+5.3%',
    trend: 'up',
    icon: MapIcon,
    color: 'rgba(0, 207, 232, 0.08)',
    borderColor: '#00CFE8'
  }
];

const shipmentData: ShipmentRow[] = [
  {
    id: '1',
    identifier: 'VOL-873454',
    origin: 'Sicily, Italy',
    destination: 'Tallin, EST',
    dangerousGoods: ['Class 3', 'Class 8'],
    hazchemCode: '3YE',
    progress: 88
  },
  {
    id: '2',
    identifier: 'VOL-349576',
    origin: 'Rotterdam',
    destination: 'Brussels, Belgium',
    dangerousGoods: ['Class 2', 'Class 9'],
    hazchemCode: '3YE',
    progress: 32
  },
  {
    id: '3',
    identifier: 'VOL-345789',
    origin: 'Abu Dhabi, UAE',
    destination: 'Boston, USA',
    dangerousGoods: ['Class 1', 'Class 6'],
    hazchemCode: '3YE',
    progress: 45
  },
  {
    id: '4',
    identifier: 'VOL-456890',
    origin: 'Schipol, Amsterdam',
    destination: 'Changi, Singapore',
    dangerousGoods: ['Class 4', 'Class 7'],
    hazchemCode: '3YE',
    progress: 67
  },
  {
    id: '5',
    identifier: 'VOL-983475',
    origin: 'Cleveland, Ohio, USA',
    destination: 'Cleveland, Ohio, USA',
    dangerousGoods: ['Class 5'],
    hazchemCode: '3YE',
    progress: 8
  }
];

const menuItems = [
  { name: 'Dashboard', icon: HomeIcon, active: true, href: '/dashboard' },
  { name: 'Users', icon: UsersIcon, active: false, href: '/users' }
];

const reportsItems = [
  { name: 'Complete Report', icon: ChartBarIcon, href: '/reports/complete' },
  { name: 'Manifest Search', icon: DocumentMagnifyingGlassIcon, href: '/reports/manifest' },
  { name: 'Compatibility', icon: CommandLineIcon, href: '/reports/compatibility' },
  { name: 'EPG Search', icon: MagnifyingGlassIcon, href: '/reports/epg' }
];

const directoryItems = [
  { name: 'SDS Directory', icon: CircleStackIcon, href: '/directory/sds' },
  { name: 'EPG Directory', icon: CircleStackIcon, href: '/directory/epg' }
];

export default function Dashboard() {
  const [currentPage] = useState(1);

  return (
    <div className="min-h-screen bg-[#F8F7FA]">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-[260px] bg-white shadow-md min-h-screen">
          {/* Logo */}
          <div className="flex justify-center items-center p-6 border-b border-gray-100">
            <div className="text-xl font-bold text-[#153F9F]">
              SafeShipper
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            {/* Main Menu */}
            <div className="mb-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2 rounded-md mb-1 transition-colors ${
                      item.active
                        ? 'bg-gradient-to-r from-[#153F9F] to-[rgba(21,63,159,0.7)] text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
            </div>

            {/* Reports Section */}
            <div className="mb-6">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Reports
              </div>
              {reportsItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2 rounded-md mb-1 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
            </div>

            {/* Directory Section */}
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Directory
              </div>
              {directoryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2 rounded-md mb-1 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search (Ctrl+/)"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative p-2">
                  <BellIcon className="w-6 h-6 text-gray-600" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#EA5455] rounded-full text-white text-xs flex items-center justify-center">
                    4
                  </span>
                </button>
                <div className="w-10 h-10 bg-[#153F9F] rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">JD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className={`bg-white rounded-lg p-6 shadow-sm ${
                    index === 0 ? 'border-b-4' : ''
                  }`}
                  style={index === 0 ? { borderBottomColor: card.borderColor } : {}}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: card.color }}
                    >
                      <Icon className="w-6 h-6" style={{ color: card.borderColor }} />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 text-sm">{card.description}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {card.change}
                      </span>
                      <span className="text-gray-500 text-xs">this month</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Review Analytics */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Customer Reviews</h3>
                  <p className="text-sm text-gray-600">Weekly review analytics</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  +12.5%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-[#153F9F]">4.89</span>
                    <StarIcon className="w-6 h-6 text-[#153F9F]" />
                  </div>
                  <p className="text-gray-600 font-semibold">Total 187 reviews</p>
                  <p className="text-gray-500">All reviews are from genuine customers</p>
                  <span className="px-3 py-1 bg-blue-100 text-[#153F9F] rounded text-sm font-medium">
                    +5 This week
                  </span>
                </div>
                <div className="w-px h-32 bg-gray-200"></div>
                <div className="space-y-3 flex-1 ml-6">
                  {[
                    { stars: 5, count: 124, width: '80%' },
                    { stars: 4, count: 40, width: '30%' },
                    { stars: 3, count: 12, width: '19%' },
                    { stars: 2, count: 7, width: '9%' },
                    { stars: 1, count: 2, width: '5%' }
                  ].map((item) => (
                    <div key={item.stars} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-12">{item.stars} Star</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-[#153F9F] h-2 rounded-full"
                          style={{ width: item.width }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Earning Reports */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Earning Reports</h3>
                  <p className="text-sm text-gray-600">Monthly revenue breakdown</p>
                </div>
                <button className="px-4 py-2 bg-blue-50 text-[#153F9F] rounded-lg font-medium flex items-center gap-2">
                  2023
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#153F9F"
                      strokeWidth="8"
                      strokeDasharray="502"
                      strokeDashoffset="125"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">78%</span>
                    <span className="text-gray-600">Total Growth</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4">
                {[
                  { label: 'Earnings', color: '#2884C7' },
                  { label: 'Profit', color: '#538DD2' },
                  { label: 'Expense', color: '#7EA4DD' },
                  { label: 'Growth', color: '#A9BFE9' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Shipments in Transit</h3>
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Identifier',
                      'Origin',
                      'Destination',
                      'Dangerous Goods',
                      'Hazchem Code',
                      'Progress',
                      'Actions'
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-2">
                          {header}
                          <div className="flex flex-col">
                            <ChevronUpIcon className="w-3 h-3 text-gray-400" />
                            <ChevronDownIcon className="w-3 h-3 text-gray-400 -mt-1" />
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shipmentData.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <TruckIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <span className="font-semibold text-gray-900">
                            {shipment.identifier}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {shipment.origin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {shipment.destination}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex -space-x-2">
                          {shipment.dangerousGoods.slice(0, 3).map((_, index) => (
                            <div
                              key={index}
                              className="w-8 h-8 bg-gray-300 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium"
                            >
                              DG
                            </div>
                          ))}
                          {shipment.dangerousGoods.length > 3 && (
                            <div className="w-8 h-8 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium">
                              +{shipment.dangerousGoods.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {shipment.hazchemCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#153F9F] h-2 rounded-full"
                              style={{ width: `${shipment.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12">
                            {shipment.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button className="text-gray-400 hover:text-gray-600">
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MapIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing 1 to 5 of 100 entries
              </p>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                  Previous
                </button>
                <button className="px-3 py-2 bg-[#153F9F] text-white rounded-md text-sm font-medium">
                  1
                </button>
                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                  2
                </button>
                <button className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium">
                  3
                </button>
                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                  4
                </button>
                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                  5
                </button>
                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              © 2023, made with ❤️ by SafeShipper Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';

import React, { useEffect } from 'react';
import { 
  Truck, 
  FileSearch, 
  BarChart3, 
  MapPin, 
  Eye, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useDashboardStore } from '@/stores/dashboard-store';

// Types for our data (keeping for future use)
// interface StatCard {
//   id: string;
//   title: string;
//   value: string;
//   description: string;
//   change: string;
//   trend: string;
//   icon: React.ComponentType<{ className?: string; color?: string }>;
//   color: string;
//   borderColor: string;
// }

interface ShipmentRow {
  id: string;
  identifier: string;
  origin: string;
  destination: string;
  dangerousGoods: string[];
  hazchemCode: string;
  progress: number;
}

// Sample data for shipments table

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


export default function Dashboard() {
  const { stats, error, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Update stat cards with real data
  const statCardsData = [
    {
      id: '1',
      title: 'Total Shipments',
      value: stats.totalShipments.toLocaleString(),
      description: 'Active shipments in transit',
      change: '+12.5%',
      trend: 'up',
      icon: Truck,
      color: 'rgba(21, 63, 159, 0.08)',
      borderColor: '#153F9F'
    },
    {
      id: '2',
      title: 'Pending Reviews',
      value: stats.pendingReviews.toString(),
      description: 'Documents requiring approval',
      change: '-8.2%',
      trend: 'down',
      icon: FileSearch,
      color: 'rgba(255, 159, 67, 0.08)',
      borderColor: '#FF9F43'
    },
    {
      id: '3',
      title: 'Compliance Rate',
      value: `${stats.complianceRate}%`,
      description: 'Safety compliance score',
      change: '+2.1%',
      trend: 'up',
      icon: BarChart3,
      color: 'rgba(234, 84, 85, 0.08)',
      borderColor: '#EA5455'
    },
    {
      id: '4',
      title: 'Active Routes',
      value: stats.activeRoutes.toString(),
      description: 'Currently operating routes',
      change: '+5.3%',
      trend: 'up',
      icon: MapPin,
      color: 'rgba(0, 207, 232, 0.08)',
      borderColor: '#00CFE8'
    }
  ];

  if (error) {
    console.warn('Dashboard error:', error);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCardsData.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={card.id} className={index === 0 ? 'border-b-4' : ''} style={index === 0 ? { borderBottomColor: card.borderColor } : {}}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: card.color }}
                    >
                      <Icon className="w-6 h-6" color={card.borderColor} />
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
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Review Analytics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Reviews</CardTitle>
                  <CardDescription>Weekly review analytics</CardDescription>
                </div>
                <Badge variant="success">+12.5%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-[#153F9F]">4.89</span>
                    <Star className="w-6 h-6 text-[#153F9F] fill-current" />
                  </div>
                  <p className="text-gray-600 font-semibold">Total 187 reviews</p>
                  <p className="text-gray-500">All reviews are from genuine customers</p>
                  <Badge variant="info">+5 This week</Badge>
                </div>
                <div className="w-px h-32 bg-gray-200"></div>
                <div className="space-y-3 flex-1 ml-6">
                  {[
                    { stars: 5, count: 124, width: 80 },
                    { stars: 4, count: 40, width: 30 },
                    { stars: 3, count: 12, width: 19 },
                    { stars: 2, count: 7, width: 9 },
                    { stars: 1, count: 2, width: 5 }
                  ].map((item) => (
                    <div key={item.stars} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-12">{item.stars} Star</span>
                      <div className="flex-1">
                        <Progress value={item.width} className="h-2" />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earning Reports */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Earning Reports</CardTitle>
                  <CardDescription>Monthly revenue breakdown</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  2023
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Shipments Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Shipments in Transit</CardTitle>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                            <ChevronDown className="w-3 h-3 text-gray-400 -mt-1" />
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
                            <Truck className="w-5 h-5 text-gray-600" />
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
                          {shipment.dangerousGoods.slice(0, 3).map((dg, index) => (
                            <Badge key={index} variant="secondary" className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white">
                              DG
                            </Badge>
                          ))}
                          {shipment.dangerousGoods.length > 3 && (
                            <Badge variant="outline" className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white">
                              +{shipment.dangerousGoods.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {shipment.hazchemCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Progress value={shipment.progress} className="flex-1" />
                          <span className="text-sm text-gray-600 w-12">
                            {shipment.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <MapPin className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-700">
                Showing 1 to 5 of 100 entries
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Previous
                </Button>
                <Button size="sm">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  4
                </Button>
                <Button variant="outline" size="sm">
                  5
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 
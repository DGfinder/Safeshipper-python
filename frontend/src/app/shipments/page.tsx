'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  MapPin,
  Calendar,
  Truck,
  User,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Link from 'next/link';

// Mock shipment data
const generateMockShipments = () => [
  {
    id: 'SS-001-2024',
    trackingNumber: 'SS-001-2024',
    client: 'Global Manufacturing Inc.',
    route: 'Sydney → Melbourne',
    weight: '12,360 KG',
    distance: '1172 km',
    status: 'IN_TRANSIT',
    dangerousGoods: [
      { class: '5.1', count: 12 },
      { class: '3', count: 8 }
    ],
    progress: 65,
    estimatedDelivery: '2024-01-15',
    driver: 'John Smith',
    vehicle: 'VIC-123-ABC'
  },
  {
    id: 'SS-002-2024',
    trackingNumber: 'SS-002-2024',
    client: 'Chemical Solutions Ltd.',
    route: 'Brisbane → Perth',
    weight: '8,450 KG',
    distance: '3,290 km',
    status: 'READY_FOR_DISPATCH',
    dangerousGoods: [
      { class: '8', count: 15 },
      { class: '6.1', count: 5 }
    ],
    progress: 0,
    estimatedDelivery: '2024-01-18',
    driver: 'Sarah Johnson',
    vehicle: 'QLD-456-DEF'
  },
  {
    id: 'SS-003-2024',
    trackingNumber: 'SS-003-2024',
    client: 'Pharma Corp Australia',
    route: 'Adelaide → Darwin',
    weight: '5,780 KG',
    distance: '1,534 km',
    status: 'DELIVERED',
    dangerousGoods: [
      { class: '2.1', count: 20 }
    ],
    progress: 100,
    estimatedDelivery: '2024-01-12',
    driver: 'Mike Wilson',
    vehicle: 'SA-789-GHI'
  },
  {
    id: 'SS-004-2024',
    trackingNumber: 'SS-004-2024',
    client: 'Industrial Chemicals Inc.',
    route: 'Melbourne → Sydney',
    weight: '15,200 KG',
    distance: '878 km',
    status: 'PLANNING',
    dangerousGoods: [
      { class: '4.1', count: 25 },
      { class: '5.1', count: 10 },
      { class: '8', count: 7 }
    ],
    progress: 15,
    estimatedDelivery: '2024-01-20',
    driver: null,
    vehicle: null
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'IN_TRANSIT':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'READY_FOR_DISPATCH':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'PLANNING':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'DELIVERED':
      return <CheckCircle className="h-4 w-4" />;
    case 'IN_TRANSIT':
      return <Truck className="h-4 w-4" />;
    case 'READY_FOR_DISPATCH':
      return <Clock className="h-4 w-4" />;
    case 'PLANNING':
      return <Edit className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    '1': 'bg-orange-500',
    '2.1': 'bg-red-500',
    '2.2': 'bg-green-500',
    '2.3': 'bg-blue-500',
    '3': 'bg-red-600',
    '4.1': 'bg-yellow-500',
    '4.2': 'bg-blue-600',
    '4.3': 'bg-blue-400',
    '5.1': 'bg-yellow-600',
    '5.2': 'bg-yellow-700',
    '6.1': 'bg-purple-500',
    '6.2': 'bg-purple-600',
    '7': 'bg-yellow-400',
    '8': 'bg-gray-600',
    '9': 'bg-gray-500'
  };
  return colors[dgClass] || 'bg-gray-400';
};

export default function ShipmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dgFilter, setDgFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const shipments = generateMockShipments();

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.route.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    
    const matchesDG = dgFilter === 'all' || 
                     (dgFilter === 'with_dg' && shipment.dangerousGoods.length > 0) ||
                     (dgFilter === 'without_dg' && shipment.dangerousGoods.length === 0);

    return matchesSearch && matchesStatus && matchesDG;
  });

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
            <p className="text-gray-600">Manage and track all your dangerous goods shipments</p>
          </div>
          <div className="flex gap-3">
            <Link href="/shipments/manifest-upload">
              <Button variant="outline" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Upload Manifest
              </Button>
            </Link>
            <Link href="/shipments/create">
              <Button className="flex items-center gap-2 bg-[#153F9F] hover:bg-[#153F9F]/90">
                <Plus className="h-4 w-4" />
                Create Shipment
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search shipments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="READY_FOR_DISPATCH">Ready for Dispatch</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dgFilter} onValueChange={setDgFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Dangerous Goods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shipments</SelectItem>
                  <SelectItem value="with_dg">With Dangerous Goods</SelectItem>
                  <SelectItem value="without_dg">Without Dangerous Goods</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredShipments.length} of {shipments.length} shipments
          </p>
        </div>

        {/* Shipments Grid */}
        <div className="grid gap-6">
          {filteredShipments.map((shipment) => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Left Section - Main Info */}
                  <div className="flex items-center gap-6">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">{shipment.trackingNumber}</h3>
                        <Badge className={`${getStatusColor(shipment.status)} flex items-center gap-1`}>
                          {getStatusIcon(shipment.status)}
                          {shipment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-gray-600 font-medium">{shipment.client}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {shipment.route}
                        </span>
                        <span>{shipment.weight}</span>
                        <span>{shipment.distance}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Section - Dangerous Goods & Progress */}
                  <div className="flex items-center gap-6">
                    {/* Dangerous Goods */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-2">Dangerous Goods</p>
                      <div className="flex gap-1">
                        {shipment.dangerousGoods.length > 0 ? (
                          shipment.dangerousGoods.map((dg, index) => (
                            <div key={index} className="relative">
                              <div className={`w-8 h-8 ${getDGClassColor(dg.class)} rounded flex items-center justify-center text-white text-xs font-bold`}>
                                {dg.class}
                              </div>
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {dg.count}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="text-center min-w-[120px]">
                      <p className="text-xs text-gray-500 mb-2">Progress</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${shipment.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{shipment.progress}%</span>
                    </div>
                  </div>

                  {/* Right Section - Driver & Actions */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm">
                        <p className="text-gray-500">Driver:</p>
                        <p className="font-medium">{shipment.driver || 'Unassigned'}</p>
                      </div>
                      <div className="text-sm mt-2">
                        <p className="text-gray-500">Vehicle:</p>
                        <p className="font-medium">{shipment.vehicle || 'TBD'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/shipments/${shipment.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Estimated Delivery */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Estimated Delivery: {new Date(shipment.estimatedDelivery).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredShipments.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search criteria or create a new shipment.</p>
              <Link href="/shipments/create">
                <Button className="bg-[#153F9F] hover:bg-[#153F9F]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Shipment
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
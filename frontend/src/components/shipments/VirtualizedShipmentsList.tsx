'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { VirtualScrollContainer, InfiniteVirtualScroll } from '@/shared/components/ui/virtual-scroll';
import { ResponsiveTable, type TableColumn, type TableAction } from '@/shared/components/ui/responsive-table';
import { ShipmentMobileCard } from '@/shared/components/ui/mobile-cards';
import { usePerformanceMonitoring } from '@/shared/utils/performance';
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
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';

// Enhanced shipment interface
interface Shipment {
  id: string;
  identifier: string;
  customer: string;
  origin: string;
  destination: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';
  progress: number;
  dangerous_goods: string[];
  hazchem_code?: string;
  weight: string;
  estimated_delivery: string;
  created_at: string;
  driver?: string;
  vehicle?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

// Generate mock shipments for testing
const generateMockShipments = (count: number = 10000): Shipment[] => {
  const customers = [
    'Global Manufacturing Inc.',
    'Chemical Solutions Ltd.',
    'Pharma Corp Australia',
    'Industrial Chemicals Inc.',
    'Mining Resources Co.',
    'Agricultural Supplies Ltd.',
    'Energy Solutions Group',
    'Construction Materials Inc.',
  ];

  const origins = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Darwin', 'Hobart', 'Canberra'];
  const destinations = ['Melbourne', 'Sydney', 'Perth', 'Brisbane', 'Darwin', 'Adelaide', 'Hobart', 'Canberra'];
  const statuses: Shipment['status'][] = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED'];
  const priorities: Shipment['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const dangerousGoods = [
    ['Class 1', 'Class 2'],
    ['Class 3', 'Class 8'],
    ['Class 4', 'Class 5'],
    ['Class 6', 'Class 9'],
    ['Class 7'],
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `SS-${(i + 1).toString().padStart(6, '0')}-2024`,
    identifier: `SS-${(i + 1).toString().padStart(6, '0')}-2024`,
    customer: customers[Math.floor(Math.random() * customers.length)],
    origin: origins[Math.floor(Math.random() * origins.length)],
    destination: destinations[Math.floor(Math.random() * destinations.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    progress: Math.floor(Math.random() * 100),
    dangerous_goods: dangerousGoods[Math.floor(Math.random() * dangerousGoods.length)],
    hazchem_code: `${Math.floor(Math.random() * 9) + 1}${['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)]}`,
    weight: `${Math.floor(Math.random() * 20000) + 1000} KG`,
    estimated_delivery: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    driver: ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Davis', 'David Brown'][Math.floor(Math.random() * 5)],
    vehicle: `${['NSW', 'VIC', 'QLD', 'SA', 'WA'][Math.floor(Math.random() * 5)]}-${Math.floor(Math.random() * 999) + 100}-${['ABC', 'DEF', 'GHI', 'JKL', 'MNO'][Math.floor(Math.random() * 5)]}`,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
  }));
};

interface VirtualizedShipmentsListProps {
  onShipmentSelect?: (shipment: Shipment) => void;
}

export function VirtualizedShipmentsList({ onShipmentSelect }: VirtualizedShipmentsListProps) {
  const { loadTime } = usePerformanceMonitoring('VirtualizedShipmentsList');
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Simulate loading shipments
  useEffect(() => {
    const loadInitialShipments = async () => {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const initialShipments = generateMockShipments(1000);
      setShipments(initialShipments);
      setFilteredShipments(initialShipments);
      setLoading(false);
    };

    loadInitialShipments();
  }, []);

  // Filter shipments based on search and filters
  useEffect(() => {
    let filtered = shipments;

    if (searchTerm) {
      filtered = filtered.filter(shipment =>
        shipment.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.destination.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(shipment => shipment.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(shipment => shipment.priority === priorityFilter);
    }

    setFilteredShipments(filtered);
  }, [shipments, searchTerm, statusFilter, priorityFilter]);

  // Simulate loading more shipments
  const loadMoreShipments = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const moreShipments = generateMockShipments(500);
    setShipments(prev => [...prev, ...moreShipments]);
    
    // Simulate reaching end of data
    if (shipments.length >= 5000) {
      setHasMore(false);
    }
    
    setIsLoadingMore(false);
  };

  // Define table columns
  const columns: TableColumn<Shipment>[] = [
    {
      key: 'identifier',
      label: 'Shipment ID',
      priority: 'high',
      render: (shipment) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{shipment.identifier}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      priority: 'high',
      render: (shipment) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="truncate max-w-[150px]">{shipment.customer}</span>
        </div>
      ),
    },
    {
      key: 'route',
      label: 'Route',
      priority: 'high',
      render: (shipment) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-gray-500" />
          <span className="truncate">{shipment.origin}</span>
          <ArrowRight className="h-3 w-3 text-gray-400" />
          <span className="truncate">{shipment.destination}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      priority: 'high',
      render: (shipment) => {
        const statusColors = {
          PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
          DELIVERED: 'bg-green-50 text-green-700 border-green-200',
          DELAYED: 'bg-orange-50 text-orange-700 border-orange-200',
          CANCELLED: 'bg-red-50 text-red-700 border-red-200',
        };

        const statusIcons = {
          PENDING: Clock,
          IN_TRANSIT: Truck,
          DELIVERED: CheckCircle,
          DELAYED: AlertTriangle,
          CANCELLED: X,
        };

        const StatusIcon = statusIcons[shipment.status];

        return (
          <Badge variant="outline" className={statusColors[shipment.status]}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {shipment.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'progress',
      label: 'Progress',
      priority: 'medium',
      render: (shipment) => (
        <div className="w-24">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>{shipment.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${shipment.progress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'dangerous_goods',
      label: 'Dangerous Goods',
      priority: 'medium',
      render: (shipment) => (
        <div className="flex gap-1 flex-wrap">
          {shipment.dangerous_goods.slice(0, 2).map((dg, index) => (
            <Badge key={index} variant="outline" className="text-xs bg-orange-50 text-orange-700">
              {dg}
            </Badge>
          ))}
          {shipment.dangerous_goods.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{shipment.dangerous_goods.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      priority: 'low',
      render: (shipment) => {
        const priorityColors = {
          LOW: 'bg-gray-50 text-gray-700 border-gray-200',
          MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
          HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
          URGENT: 'bg-red-50 text-red-700 border-red-200',
        };

        return (
          <Badge variant="outline" className={priorityColors[shipment.priority]}>
            {shipment.priority}
          </Badge>
        );
      },
    },
    {
      key: 'estimated_delivery',
      label: 'Est. Delivery',
      priority: 'low',
      render: (shipment) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3 w-3 text-gray-500" />
          <span>{new Date(shipment.estimated_delivery).toLocaleDateString()}</span>
        </div>
      ),
    },
  ];

  // Define table actions
  const actions: TableAction<Shipment>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (shipment) => {
        console.log('View shipment:', shipment);
        onShipmentSelect?.(shipment);
      },
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (shipment) => {
        console.log('Edit shipment:', shipment);
      },
    },
    {
      label: 'Track',
      icon: MapPin,
      onClick: (shipment) => {
        console.log('Track shipment:', shipment);
      },
    },
  ];

  const getStatusCounts = () => {
    return {
      total: filteredShipments.length,
      pending: filteredShipments.filter(s => s.status === 'PENDING').length,
      inTransit: filteredShipments.filter(s => s.status === 'IN_TRANSIT').length,
      delivered: filteredShipments.filter(s => s.status === 'DELIVERED').length,
      delayed: filteredShipments.filter(s => s.status === 'DELAYED').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-600">
            Manage and track all dangerous goods shipments
            {loadTime && <span className="ml-2 text-xs text-gray-400">(Loaded in {loadTime.toFixed(0)}ms)</span>}
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{statusCounts.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-2xl font-bold">{statusCounts.inTransit}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">{statusCounts.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delayed</p>
                <p className="text-2xl font-bold">{statusCounts.delayed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search shipments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DELAYED">Delayed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Virtual Scrolling Table */}
      <Card>
        <CardContent className="p-0">
          <InfiniteVirtualScroll
            items={filteredShipments}
            itemHeight={72}
            height={600}
            hasNextPage={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreShipments}
            renderItem={(shipment, index) => (
              <div className="p-4 border-b last:border-b-0 hover:bg-gray-50">
                <ShipmentMobileCard
                  item={shipment}
                  actions={actions}
                />
              </div>
            )}
            loading={loading}
            loadingComponent={
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            }
            emptyComponent={
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No shipments found</p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
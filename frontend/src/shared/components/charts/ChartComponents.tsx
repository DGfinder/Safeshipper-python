'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Scatter,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useAccessibility } from '@/shared/services/AccessibilityContext';
import { cn } from '@/lib/utils';
import { QuickExport } from '@/shared/components/ui/export-dialog';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Maximize2,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  Shield,
  FileText,
} from 'lucide-react';

// Chart color palette - logistics themed
const COLORS = {
  primary: ['#153F9F', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
  success: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  warning: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  danger: ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  neutral: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
};

// Chart data generators for logistics
const generateShipmentTrendData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(month => ({
    month,
    shipments: Math.floor(Math.random() * 500) + 200,
    dangerous: Math.floor(Math.random() * 100) + 50,
    completed: Math.floor(Math.random() * 450) + 180,
    delayed: Math.floor(Math.random() * 30) + 10,
  }));
};

const generateFleetUtilizationData = () => {
  const days = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
  return days.map(day => ({
    day,
    utilization: Math.floor(Math.random() * 40) + 60,
    maintenance: Math.floor(Math.random() * 10) + 5,
    available: Math.floor(Math.random() * 30) + 70,
  }));
};

const generateComplianceData = () => [
  { category: 'DG Classification', score: 95, target: 98 },
  { category: 'Documentation', score: 92, target: 95 },
  { category: 'Packaging', score: 88, target: 90 },
  { category: 'Labeling', score: 94, target: 95 },
  { category: 'Training', score: 90, target: 92 },
  { category: 'Emergency Prep', score: 85, target: 88 },
];

const generateIncidentData = () => [
  { type: 'Spill', count: 3, severity: 'Medium' },
  { type: 'Leak', count: 7, severity: 'Low' },
  { type: 'Fire', count: 1, severity: 'High' },
  { type: 'Equipment', count: 12, severity: 'Low' },
  { type: 'Documentation', count: 5, severity: 'Medium' },
];

const generateRoutePerformanceData = () => {
  const routes = ['Route A', 'Route B', 'Route C', 'Route D', 'Route E'];
  return routes.map(route => ({
    route,
    onTime: Math.floor(Math.random() * 30) + 70,
    delayed: Math.floor(Math.random() * 20) + 10,
    cancelled: Math.floor(Math.random() * 10) + 2,
    avgDelay: Math.floor(Math.random() * 120) + 30, // minutes
  }));
};

// Base chart component with accessibility and responsive features
interface BaseChartProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  height?: number;
  loading?: boolean;
  error?: string;
}

function BaseChart({
  title,
  description,
  children,
  actions,
  className,
  height = 300,
  loading = false,
  error,
}: BaseChartProps) {
  const { preferences } = useAccessibility();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-600">
            <AlertTriangle className="h-8 w-8 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: height }}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// Shipment Trends Line Chart
export function ShipmentTrendsChart({ className }: { className?: string }) {
  const [data] = useState(generateShipmentTrendData());
  const [timeRange, setTimeRange] = useState('12M');

  const handleExportComplete = (success: boolean, message: string) => {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  return (
    <BaseChart
      title="Shipment Trends"
      description="Monthly shipment volume and dangerous goods trends"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {timeRange}
          </Button>
          <QuickExport
            format="csv"
            timeRange={timeRange}
            selectedCharts={['shipments']}
            onExportComplete={handleExportComplete}
          />
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="shipments"
            stroke={COLORS.primary[1]}
            strokeWidth={2}
            name="Total Shipments"
          />
          <Line
            type="monotone"
            dataKey="dangerous"
            stroke={COLORS.warning[1]}
            strokeWidth={2}
            name="Dangerous Goods"
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke={COLORS.success[1]}
            strokeWidth={2}
            name="Completed"
          />
          <Line
            type="monotone"
            dataKey="delayed"
            stroke={COLORS.danger[1]}
            strokeWidth={2}
            name="Delayed"
          />
        </LineChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}

// Fleet Utilization Area Chart
export function FleetUtilizationChart({ className }: { className?: string }) {
  const [data] = useState(generateFleetUtilizationData());

  const handleExportComplete = (success: boolean, message: string) => {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  return (
    <BaseChart
      title="Fleet Utilization"
      description="Daily fleet utilization and availability trends"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <QuickExport
            format="csv"
            timeRange="30d"
            selectedCharts={['fleet']}
            onExportComplete={handleExportComplete}
          />
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="utilization"
            stackId="1"
            stroke={COLORS.primary[1]}
            fill={COLORS.primary[1]}
            name="Utilization %"
          />
          <Area
            type="monotone"
            dataKey="maintenance"
            stackId="1"
            stroke={COLORS.warning[1]}
            fill={COLORS.warning[1]}
            name="Maintenance %"
          />
          <Area
            type="monotone"
            dataKey="available"
            stackId="1"
            stroke={COLORS.success[1]}
            fill={COLORS.success[1]}
            name="Available %"
          />
        </AreaChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}

// Compliance Score Radar Chart
export function ComplianceRadarChart({ className }: { className?: string }) {
  const [data] = useState(generateComplianceData());

  return (
    <BaseChart
      title="Compliance Scores"
      description="Current compliance scores across all categories"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            Overall: 91%
          </Badge>
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="category" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar
            name="Current Score"
            dataKey="score"
            stroke={COLORS.primary[1]}
            fill={COLORS.primary[1]}
            fillOpacity={0.3}
          />
          <Radar
            name="Target Score"
            dataKey="target"
            stroke={COLORS.success[1]}
            fill={COLORS.success[1]}
            fillOpacity={0.1}
          />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}

// Incident Distribution Pie Chart
export function IncidentDistributionChart({ className }: { className?: string }) {
  const [data] = useState(generateIncidentData());

  return (
    <BaseChart
      title="Incident Distribution"
      description="Types of incidents reported this month"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-orange-600">
            28 Total
          </Badge>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}

// Route Performance Bar Chart
export function RoutePerformanceChart({ className }: { className?: string }) {
  const [data] = useState(generateRoutePerformanceData());

  const handleExportComplete = (success: boolean, message: string) => {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  return (
    <BaseChart
      title="Route Performance"
      description="On-time delivery performance by route"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Truck className="h-4 w-4 mr-2" />
            Routes
          </Button>
          <QuickExport
            format="csv"
            timeRange="30d"
            selectedCharts={['routes']}
            onExportComplete={handleExportComplete}
          />
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="route" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="onTime" fill={COLORS.success[1]} name="On Time" />
          <Bar dataKey="delayed" fill={COLORS.warning[1]} name="Delayed" />
          <Bar dataKey="cancelled" fill={COLORS.danger[1]} name="Cancelled" />
        </BarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}

// Real-time Metrics Composed Chart
export function RealTimeMetricsChart({ className }: { className?: string }) {
  const [data, setData] = useState(generateFleetUtilizationData());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => prev.map(item => ({
        ...item,
        utilization: Math.max(0, Math.min(100, item.utilization + (Math.random() - 0.5) * 10)),
        maintenance: Math.max(0, Math.min(20, item.maintenance + (Math.random() - 0.5) * 2)),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <BaseChart
      title="Real-Time Fleet Metrics"
      description="Live updates of fleet performance indicators"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600">Live</span>
          </div>
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="utilization" fill={COLORS.primary[1]} name="Utilization %" />
          <Line
            type="monotone"
            dataKey="maintenance"
            stroke={COLORS.warning[1]}
            strokeWidth={2}
            name="Maintenance %"
          />
          <ReferenceLine y={80} stroke={COLORS.success[1]} strokeDasharray="5 5" />
        </ComposedChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}

// Key Performance Indicators Grid
export function KPIGrid({ className }: { className?: string }) {
  const kpis = [
    {
      title: 'Total Shipments',
      value: '2,847',
      change: '+12.5%',
      trend: 'up',
      icon: Package,
      color: 'blue',
    },
    {
      title: 'On-Time Delivery',
      value: '94.2%',
      change: '+2.1%',
      trend: 'up',
      icon: CheckCircle,
      color: 'green',
    },
    {
      title: 'Fleet Utilization',
      value: '87.3%',
      change: '-1.2%',
      trend: 'down',
      icon: Truck,
      color: 'orange',
    },
    {
      title: 'Compliance Score',
      value: '91.0%',
      change: '+0.8%',
      trend: 'up',
      icon: Shield,
      color: 'green',
    },
    {
      title: 'Active Incidents',
      value: '7',
      change: '-3',
      trend: 'down',
      icon: AlertTriangle,
      color: 'red',
    },
    {
      title: 'Avg Response Time',
      value: '1.2h',
      change: '-0.3h',
      trend: 'down',
      icon: Clock,
      color: 'green',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isPositive = kpi.trend === 'up';
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={kpi.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    kpi.color === 'blue' && 'bg-blue-100 text-blue-600',
                    kpi.color === 'green' && 'bg-green-100 text-green-600',
                    kpi.color === 'orange' && 'bg-orange-100 text-orange-600',
                    kpi.color === 'red' && 'bg-red-100 text-red-600'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-sm',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}>
                  <TrendIcon className="h-4 w-4" />
                  <span>{kpi.change}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Export all chart components
export {
  BaseChart,
  COLORS,
  generateShipmentTrendData,
  generateFleetUtilizationData,
  generateComplianceData,
  generateIncidentData,
  generateRoutePerformanceData,
};
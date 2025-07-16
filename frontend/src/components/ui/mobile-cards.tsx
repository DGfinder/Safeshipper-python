'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  MoreHorizontal,
  ChevronRight,
  Activity,
  Shield,
  Zap,
  FileText,
  Phone,
  Mail,
  Navigation,
  Fuel,
  Weight,
  Boxes,
  Route,
  Timer
} from 'lucide-react';

// Shipment mobile card
interface ShipmentMobileCardProps {
  item: any;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  actions?: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: (item: any) => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
}

export function ShipmentMobileCard({
  item,
  selectable,
  selected,
  onSelectionChange,
  actions
}: ShipmentMobileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_transit':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'delayed':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_transit':
        return <Activity className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'delayed':
        return <AlertTriangle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  return (
    <Card className="mb-3 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectionChange}
                className="mt-1"
              />
            )}
            
            <div className="flex-1 min-w-0">
              {/* Primary Info */}
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{item.identifier}</span>
                <Badge variant="outline" className={getStatusColor(item.status)}>
                  {getStatusIcon(item.status)}
                  <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
                </Badge>
              </div>

              {/* Route Info */}
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{item.origin}</span>
                <ChevronRight className="h-3 w-3 text-gray-400" />
                <span className="truncate">{item.destination}</span>
              </div>

              {/* Progress Bar */}
              {item.progress !== undefined && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dangerous Goods */}
              {item.dangerous_goods && item.dangerous_goods.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <div className="flex gap-1 flex-wrap">
                    {item.dangerous_goods.slice(0, 3).map((dg: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {dg}
                      </Badge>
                    ))}
                    {item.dangerous_goods.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.dangerous_goods.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Expandable Details */}
              {!expanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="h-auto p-0 text-xs text-gray-500"
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  More details
                </Button>
              )}

              {expanded && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100">
                  {item.customer && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Customer:</span>
                      <span className="text-xs">{item.customer}</span>
                    </div>
                  )}
                  
                  {item.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Created:</span>
                      <span className="text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {item.estimated_delivery && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">ETA:</span>
                      <span className="text-xs">{new Date(item.estimated_delivery).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {item.hazchem_code && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Hazchem:</span>
                      <Badge variant="outline" className="text-xs">
                        {item.hazchem_code}
                      </Badge>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(false)}
                    className="h-auto p-0 text-xs text-gray-500"
                  >
                    Less details
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {actions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'ghost'}
                  size="sm"
                  onClick={() => action.onClick(item)}
                  className="h-8 w-8 p-0"
                  title={action.label}
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                </Button>
              ))}
              
              {actions.length > 2 && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Fleet/Vehicle mobile card
export function VehicleMobileCard({
  item,
  selectable,
  selected,
  onSelectionChange,
  actions
}: ShipmentMobileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_transit':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'maintenance':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'offline':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="mb-3 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectionChange}
                className="mt-1"
              />
            )}
            
            <div className="flex-1 min-w-0">
              {/* Primary Info */}
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{item.registration_number}</span>
                <Badge variant="outline" className={getStatusColor(item.status)}>
                  <Activity className="h-3 w-3 mr-1" />
                  <span className="capitalize">{item.status.replace('_', ' ')}</span>
                </Badge>
              </div>

              {/* Driver Info */}
              {item.assigned_driver && (
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{item.assigned_driver.name}</span>
                </div>
              )}

              {/* Location Info */}
              {item.location && (
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-mono">
                    {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${item.location_is_fresh ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                  >
                    {item.location_is_fresh ? 'Fresh' : 'Stale'}
                  </Badge>
                </div>
              )}

              {/* Active Shipment */}
              {item.active_shipment && (
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-gray-600">
                    {item.active_shipment.tracking_number}
                  </span>
                </div>
              )}

              {/* Expandable Details */}
              {!expanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="h-auto p-0 text-xs text-gray-500"
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  More details
                </Button>
              )}

              {expanded && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Vehicle Type:</span>
                    <span className="text-xs">{item.vehicle_type}</span>
                  </div>
                  
                  {item.company && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Company:</span>
                      <span className="text-xs">{item.company.name}</span>
                    </div>
                  )}
                  
                  {item.assigned_driver && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Driver Email:</span>
                      <span className="text-xs">{item.assigned_driver.email}</span>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(false)}
                    className="h-auto p-0 text-xs text-gray-500"
                  >
                    Less details
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {actions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'ghost'}
                  size="sm"
                  onClick={() => action.onClick(item)}
                  className="h-8 w-8 p-0"
                  title={action.label}
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                </Button>
              ))}
              
              {actions.length > 2 && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Manifest/Dangerous Goods mobile card
export function ManifestMobileCard({
  item,
  selectable,
  selected,
  onSelectionChange,
  actions
}: ShipmentMobileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getDGClassColor = (dgClass: string) => {
    const colors: { [key: string]: string } = {
      '1.1D': 'bg-orange-500',
      '5.1': 'bg-yellow-600',
      '3': 'bg-red-600',
      '4.1': 'bg-yellow-500',
      '6.1': 'bg-purple-600',
      '8': 'bg-gray-600',
    };
    return colors[dgClass] || 'bg-gray-400';
  };

  return (
    <Card className={`mb-3 transition-all duration-200 hover:shadow-md ${item.skipped ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectionChange}
                disabled={item.skipped}
                className="mt-1"
              />
            )}
            
            <div className="flex-1 min-w-0">
              {/* Primary Info */}
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-orange-600" />
                <Badge variant="outline" className="font-semibold">
                  {item.un}
                </Badge>
                {item.skipped && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    Skipped
                  </Badge>
                )}
              </div>

              {/* Shipping Name */}
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {item.properShippingName}
                </span>
              </div>

              {/* Hazard Class */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${getDGClassColor(item.class)}`}
                  >
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-sm font-semibold">Class {item.class}</span>
                </div>
                
                {item.subHazard && (
                  <Badge variant="outline" className="text-xs">
                    Sub: {item.subHazard}
                  </Badge>
                )}
              </div>

              {/* Quantity and Weight */}
              <div className="flex items-center gap-4 mb-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Boxes className="h-4 w-4" />
                  <span>{item.quantity}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Weight className="h-4 w-4" />
                  <span>{item.weight}</span>
                </div>
              </div>

              {/* Expandable Details */}
              {!expanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="h-auto p-0 text-xs text-gray-500"
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  More details
                </Button>
              )}

              {expanded && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Packing Group:</span>
                    <span className="text-xs">{item.packingGroup}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Container Type:</span>
                    <span className="text-xs">{item.typeOfContainer}</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(false)}
                    className="h-auto p-0 text-xs text-gray-500"
                  >
                    Less details
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {actions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'ghost'}
                  size="sm"
                  onClick={() => action.onClick(item)}
                  className="h-8 w-8 p-0"
                  title={action.label}
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                </Button>
              ))}
              
              {actions.length > 2 && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// User mobile card
export function UserMobileCard({
  item,
  selectable,
  selected,
  onSelectionChange,
  actions
}: ShipmentMobileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'operator':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'driver':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="mb-3 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectionChange}
                className="mt-1"
              />
            )}
            
            <div className="flex-1 min-w-0">
              {/* Primary Info */}
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{item.username}</span>
                <Badge variant="outline" className={getRoleColor(item.role)}>
                  {item.role}
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mb-2">
                {item.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{item.email}</span>
                  </div>
                )}
                
                {item.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{item.phone}</span>
                  </div>
                )}
              </div>

              {/* Status */}
              {item.is_active !== undefined && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={item.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              )}

              {/* Expandable Details */}
              {!expanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="h-auto p-0 text-xs text-gray-500"
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  More details
                </Button>
              )}

              {expanded && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100">
                  {item.first_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">First Name:</span>
                      <span className="text-xs">{item.first_name}</span>
                    </div>
                  )}
                  
                  {item.last_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Last Name:</span>
                      <span className="text-xs">{item.last_name}</span>
                    </div>
                  )}
                  
                  {item.last_login && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Last Login:</span>
                      <span className="text-xs">{new Date(item.last_login).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(false)}
                    className="h-auto p-0 text-xs text-gray-500"
                  >
                    Less details
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {actions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'ghost'}
                  size="sm"
                  onClick={() => action.onClick(item)}
                  className="h-8 w-8 p-0"
                  title={action.label}
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                </Button>
              ))}
              
              {actions.length > 2 && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
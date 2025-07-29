"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  MessageSquare,
  Reply,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
  Package,
  User,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MapPin,
  Truck,
  Eye,
  Send,
  ExternalLink
} from 'lucide-react';

interface ShipmentFeedback {
  id: string;
  tracking_number: string;
  customer_name: string;
  delivery_success_score: number;
  performance_category: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  submitted_at: string;
  has_manager_response: boolean;
  responded_at?: string;
  responded_by_name?: string;
  was_on_time: boolean;
  was_complete_and_undamaged: boolean;
  was_driver_professional: boolean;
  feedback_notes?: string;
  manager_response?: string;
  shipment_details: {
    tracking_number: string;
    customer_name: string;
    carrier_name: string;
    status: string;
    actual_delivery_date?: string;
    assigned_driver?: string;
  };
}

interface FilterState {
  search: string;
  performance_category: string;
  has_response: string;
  date_from: string;
  date_to: string;
  assigned_driver: string;
}

interface FeedbackManagementInterfaceProps {
  companyId?: string;
  userRole: 'ADMIN' | 'MANAGER' | 'CUSTOMER' | 'DRIVER';
}

const FeedbackManagementInterface: React.FC<FeedbackManagementInterfaceProps> = ({
  companyId,
  userRole
}) => {
  const [feedbackList, setFeedbackList] = useState<ShipmentFeedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<ShipmentFeedback | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    performance_category: '',
    has_response: '',
    date_from: '',
    date_to: '',
    assigned_driver: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [responseLoading, setResponseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Mock data for development
  const mockFeedback: ShipmentFeedback[] = [
    {
      id: '1',
      tracking_number: 'SS1234567890AB',
      customer_name: 'ACME Chemicals Ltd',
      delivery_success_score: 66.7,
      performance_category: 'NEEDS_IMPROVEMENT',
      submitted_at: '2024-01-15T10:30:00Z',
      has_manager_response: false,
      was_on_time: false,
      was_complete_and_undamaged: true,
      was_driver_professional: true,
      feedback_notes: 'Delivery was 2 hours late, but driver was professional and goods were intact.',
      shipment_details: {
        tracking_number: 'SS1234567890AB',
        customer_name: 'ACME Chemicals Ltd',
        carrier_name: 'SafeShipper Express',
        status: 'DELIVERED',
        actual_delivery_date: '2024-01-15T08:30:00Z',
        assigned_driver: 'John Smith'
      }
    },
    {
      id: '2',
      tracking_number: 'SS2345678901BC',
      customer_name: 'Industrial Solutions Pty',
      delivery_success_score: 100,
      performance_category: 'EXCELLENT',
      submitted_at: '2024-01-14T14:15:00Z',
      has_manager_response: true,
      responded_at: '2024-01-14T16:20:00Z',
      responded_by_name: 'Sarah Johnson',
      was_on_time: true,
      was_complete_and_undamaged: true,
      was_driver_professional: true,
      feedback_notes: 'Perfect delivery! Driver was on time and very professional.',
      manager_response: 'Thank you for the positive feedback. We\'ll make sure to recognize John for his excellent service.',
      shipment_details: {
        tracking_number: 'SS2345678901BC',
        customer_name: 'Industrial Solutions Pty',
        carrier_name: 'SafeShipper Express',
        status: 'DELIVERED',
        actual_delivery_date: '2024-01-14T09:00:00Z',
        assigned_driver: 'Mike Wilson'
      }
    },
    {
      id: '3',
      tracking_number: 'SS3456789012CD',
      customer_name: 'Chemical Manufacturing Co',
      delivery_success_score: 33.3,
      performance_category: 'POOR',
      submitted_at: '2024-01-13T11:45:00Z',
      has_manager_response: true,
      responded_at: '2024-01-13T13:30:00Z',
      responded_by_name: 'David Brown',
      was_on_time: false,
      was_complete_and_undamaged: false,
      was_driver_professional: true,
      feedback_notes: 'Late delivery and one container was damaged. However, driver handled the situation professionally.',
      manager_response: 'We apologize for the damage and delay. We have initiated an investigation and will provide compensation. Driver training has been scheduled.',
      shipment_details: {
        tracking_number: 'SS3456789012CD',
        customer_name: 'Chemical Manufacturing Co',
        carrier_name: 'SafeShipper Express',
        status: 'DELIVERED',
        actual_delivery_date: '2024-01-13T11:00:00Z',
        assigned_driver: 'Tom Davis'
      }
    }
  ];

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For development, use mock data
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Apply mock filtering
        let filtered = mockFeedback;
        if (filters.search) {
          filtered = filtered.filter(f => 
            f.tracking_number.toLowerCase().includes(filters.search.toLowerCase()) ||
            f.customer_name.toLowerCase().includes(filters.search.toLowerCase())
          );
        }
        if (filters.performance_category) {
          filtered = filtered.filter(f => f.performance_category === filters.performance_category);
        }
        if (filters.has_response === 'true') {
          filtered = filtered.filter(f => f.has_manager_response);
        } else if (filters.has_response === 'false') {
          filtered = filtered.filter(f => !f.has_manager_response);
        }
        
        setFeedbackList(filtered);
        setTotalCount(filtered.length);
        return;
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      queryParams.append('page', currentPage.toString());
      queryParams.append('page_size', itemsPerPage.toString());

      const response = await fetch(`/api/v1/shipments/feedback/?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback data');
      }

      const data = await response.json();
      setFeedbackList(data.results || data);
      setTotalCount(data.count || data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
      // Fallback to mock data
      setFeedbackList(mockFeedback);
      setTotalCount(mockFeedback.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [filters, currentPage]);

  const handleAddResponse = async () => {
    if (!selectedFeedback || !responseText.trim()) return;

    setResponseLoading(true);
    try {
      const response = await fetch(`/api/v1/shipments/feedback/${selectedFeedback.id}/add_response/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          response_text: responseText.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add response');
      }

      const data = await response.json();
      
      // Update the feedback in the list
      setFeedbackList(prev => 
        prev.map(f => 
          f.id === selectedFeedback.id 
            ? { 
                ...f, 
                has_manager_response: true,
                manager_response: responseText.trim(),
                responded_at: new Date().toISOString(),
                responded_by_name: 'Current User' // Would be actual user name from context
              }
            : f
        )
      );

      setShowResponseDialog(false);
      setResponseText('');
      setSelectedFeedback(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add response');
    } finally {
      setResponseLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      queryParams.append('format', format);

      const response = await fetch(`/api/v1/shipments/feedback/export_data/?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getPerformanceBadge = (category: string, score: number) => {
    const variants = {
      'EXCELLENT': 'default',
      'GOOD': 'secondary',
      'NEEDS_IMPROVEMENT': 'outline',
      'POOR': 'destructive'
    } as const;

    return (
      <Badge variant={variants[category as keyof typeof variants] || 'outline'}>
        {category.replace('_', ' ')} ({score}%)
      </Badge>
    );
  };

  const canAddResponse = userRole === 'ADMIN' || userRole === 'MANAGER';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading feedback...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage customer feedback and responses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFeedback()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tracking number, customer..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Performance</label>
              <Select
                value={filters.performance_category}
                onValueChange={(value) => setFilters(prev => ({ ...prev, performance_category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="NEEDS_IMPROVEMENT">Needs Improvement</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Response Status</label>
              <Select
                value={filters.has_response}
                onValueChange={(value) => setFilters(prev => ({ ...prev, has_response: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Feedback" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Feedback</SelectItem>
                  <SelectItem value="true">Has Response</SelectItem>
                  <SelectItem value="false">No Response</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Feedback List</CardTitle>
            <Badge variant="outline">
              {totalCount} total responses
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackList.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      <div className="font-medium">
                        {feedback.tracking_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {feedback.shipment_details.assigned_driver}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {feedback.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {feedback.shipment_details.carrier_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">
                          {feedback.delivery_success_score}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(feedback.performance_category, feedback.delivery_success_score)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(feedback.submitted_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(feedback.submitted_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {feedback.has_manager_response ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Responded</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600">Pending</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Feedback Details</DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {/* Shipment Info */}
                              <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2">Shipment Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Tracking:</span>
                                    <span className="ml-2 font-medium">{feedback.tracking_number}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Customer:</span>
                                    <span className="ml-2">{feedback.customer_name}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Driver:</span>
                                    <span className="ml-2">{feedback.shipment_details.assigned_driver}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Delivered:</span>
                                    <span className="ml-2">
                                      {feedback.shipment_details.actual_delivery_date 
                                        ? new Date(feedback.shipment_details.actual_delivery_date).toLocaleDateString()
                                        : 'N/A'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Feedback Details */}
                              <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2">Customer Feedback</h4>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>On-time delivery</span>
                                    </div>
                                    <Badge variant={feedback.was_on_time ? "default" : "secondary"}>
                                      {feedback.was_on_time ? "Yes" : "No"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Package className="h-4 w-4" />
                                      <span>Complete & undamaged</span>
                                    </div>
                                    <Badge variant={feedback.was_complete_and_undamaged ? "default" : "secondary"}>
                                      {feedback.was_complete_and_undamaged ? "Yes" : "No"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>Professional driver</span>
                                    </div>
                                    <Badge variant={feedback.was_driver_professional ? "default" : "secondary"}>
                                      {feedback.was_driver_professional ? "Yes" : "No"}
                                    </Badge>
                                  </div>
                                  
                                  {feedback.feedback_notes && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                      <p className="text-sm font-medium text-gray-700 mb-1">Customer Comments:</p>
                                      <p className="text-sm text-gray-600 italic">"{feedback.feedback_notes}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Manager Response */}
                              {feedback.has_manager_response && feedback.manager_response && (
                                <div className="border rounded-lg p-4">
                                  <h4 className="font-medium mb-2">Manager Response</h4>
                                  <div className="p-3 bg-blue-50 rounded-md">
                                    <p className="text-sm text-blue-800">"{feedback.manager_response}"</p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                                      <span>By: {feedback.responded_by_name}</span>
                                      <span>•</span>
                                      <span>
                                        {feedback.responded_at 
                                          ? new Date(feedback.responded_at).toLocaleString()
                                          : 'N/A'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {canAddResponse && !feedback.has_manager_response && (
                          <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedFeedback(feedback)}
                              >
                                <Reply className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Manager Response</DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                  Responding to feedback for {selectedFeedback?.tracking_number}
                                </p>
                                
                                <Textarea
                                  placeholder="Enter your internal response..."
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  rows={4}
                                  maxLength={2000}
                                />
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {responseText.length}/2000 characters
                                  </span>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowResponseDialog(false);
                                        setResponseText('');
                                        setSelectedFeedback(null);
                                      }}
                                      disabled={responseLoading}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleAddResponse}
                                      disabled={!responseText.trim() || responseLoading}
                                    >
                                      {responseLoading ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                      )}
                                      Send Response
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Showing {Math.min(feedbackList.length, itemsPerPage)} of {totalCount} results
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={feedbackList.length < itemsPerPage}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackManagementInterface;
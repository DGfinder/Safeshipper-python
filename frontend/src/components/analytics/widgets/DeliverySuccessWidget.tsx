"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/shared/components/ui/select";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  Package,
  User,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { usePermissions } from "@/shared/contexts/PermissionContext";

interface FeedbackAnalytics {
  period: string;
  start_date: string;
  end_date: string;
  total_feedback_count: number;
  delivery_success_score: number;
  feedback_breakdown: {
    on_time: { percentage: number; count: number };
    complete_undamaged: { percentage: number; count: number };
    driver_professional: { percentage: number; count: number };
  };
  feedback_summary_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  trends: Array<{
    date?: string;
    week_start?: string;
    week_end?: string;
    feedback_count: number;
    success_score: number;
  }>;
  top_feedback_notes: Array<{
    tracking_number: string;
    submitted_at: string;
    notes: string;
    success_score: number;
  }>;
  message?: string;
}

interface DeliverySuccessWidgetProps {
  className?: string;
  showDetailedView?: boolean;
}

const DeliverySuccessWidget: React.FC<DeliverySuccessWidgetProps> = ({
  className = "",
  showDetailedView = false,
}) => {
  const { can } = usePermissions();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [showDetails, setShowDetails] = useState(showDetailedView);

  // Check if user has permission to view analytics
  if (!can("shipments.analytics.view")) {
    return null;
  }

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<FeedbackAnalytics>({
    queryKey: ["shipment-feedback-analytics", selectedPeriod],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/shipments/feedback-analytics/?period=${selectedPeriod}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch feedback analytics");
      }

      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4" />;
    if (score >= 60) return <TrendingDown className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const formatPeriodLabel = (period: string) => {
    switch (period) {
      case "week": return "This Week";
      case "month": return "This Month";
      case "quarter": return "This Quarter";
      case "year": return "This Year";
      default: return "This Month";
    }
  };

  const getSummaryBadgeColor = (summary: string) => {
    switch (summary) {
      case "excellent": return "bg-green-100 text-green-800";
      case "good": return "bg-blue-100 text-blue-800";
      case "fair": return "bg-yellow-100 text-yellow-800";
      case "poor": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Delivery Success Score
            </CardTitle>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Delivery Success Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load feedback analytics. Please try again.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Delivery Success Score
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Customer satisfaction metrics for {formatPeriodLabel(selectedPeriod).toLowerCase()}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {analytics.total_feedback_count === 0 ? (
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              {analytics.message || "No feedback data available for the selected period."}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Main Score Display */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-3 p-4 rounded-lg border ${getScoreColor(analytics.delivery_success_score)}`}>
                {getScoreIcon(analytics.delivery_success_score)}
                <div>
                  <div className="text-3xl font-bold">
                    {analytics.delivery_success_score}%
                  </div>
                  <div className="text-sm font-medium">
                    Success Score
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Based on {analytics.total_feedback_count} customer responses
              </p>
            </div>

            {/* Breakdown Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                <div className="text-lg font-semibold text-blue-600">
                  {analytics.feedback_breakdown.on_time.percentage}%
                </div>
                <div className="text-xs text-gray-600">On Time</div>
                <div className="text-xs text-gray-500">
                  {analytics.feedback_breakdown.on_time.count} responses
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Package className="h-5 w-5 mx-auto mb-2 text-green-600" />
                <div className="text-lg font-semibold text-green-600">
                  {analytics.feedback_breakdown.complete_undamaged.percentage}%
                </div>
                <div className="text-xs text-gray-600">Complete</div>
                <div className="text-xs text-gray-500">
                  {analytics.feedback_breakdown.complete_undamaged.count} responses
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                <div className="text-lg font-semibold text-purple-600">
                  {analytics.feedback_breakdown.driver_professional.percentage}%
                </div>
                <div className="text-xs text-gray-600">Professional</div>
                <div className="text-xs text-gray-500">
                  {analytics.feedback_breakdown.driver_professional.count} responses
                </div>
              </div>
            </div>

            {/* Feedback Distribution */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-3">
                Feedback Distribution
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(analytics.feedback_summary_distribution).map(([summary, count]) => (
                  <div key={summary} className="text-center">
                    <Badge className={`${getSummaryBadgeColor(summary)} mb-1`}>
                      {count}
                    </Badge>
                    <div className="text-xs text-gray-600 capitalize">
                      {summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggle Details View */}
            {!showDetailedView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                {showDetails ? "Hide Details" : "Show Details"}
                <ChevronRight className={`h-4 w-4 ml-2 transition-transform ${showDetails ? "rotate-90" : ""}`} />
              </Button>
            )}

            {/* Detailed View */}
            {(showDetails || showDetailedView) && (
              <div className="space-y-4 pt-4 border-t">
                {/* Recent Feedback Notes */}
                {analytics.top_feedback_notes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Recent Customer Comments
                    </h4>
                    <div className="space-y-2">
                      {analytics.top_feedback_notes.slice(0, 3).map((note, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-blue-600">
                              {note.tracking_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {note.success_score}%
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(note.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-700 italic">"{note.notes}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Period Info */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {analytics.start_date} to {analytics.end_date}
                  </span>
                  <span>
                    {analytics.total_feedback_count} total responses
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliverySuccessWidget;
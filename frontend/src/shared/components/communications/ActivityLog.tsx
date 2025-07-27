// components/communications/ActivityLog.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  MessageSquare,
  Send,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Camera,
  FileText,
  MapPin,
  Settings,
  Loader2,
} from "lucide-react";
import { useShipmentEvents, useAddShipmentEvent } from "@/shared/hooks/useShipmentsReal";
import { formatDistanceToNow } from "date-fns";

interface ActivityLogProps {
  shipmentId: string;
  className?: string;
}

interface ShipmentEvent {
  id: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
  };
  event_type: string;
  details: string;
  priority?: string;
  attachment_url?: string;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "COMMENT":
      return <MessageSquare className="h-4 w-4" />;
    case "STATUS_CHANGE":
      return <Settings className="h-4 w-4" />;
    case "INSPECTION":
      return <CheckCircle className="h-4 w-4" />;
    case "LOCATION_UPDATE":
      return <MapPin className="h-4 w-4" />;
    case "PHOTO_UPLOAD":
      return <Camera className="h-4 w-4" />;
    case "DOCUMENT_UPLOAD":
      return <FileText className="h-4 w-4" />;
    case "ALERT":
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case "COMMENT":
      return "text-blue-600 bg-blue-100";
    case "STATUS_CHANGE":
      return "text-green-600 bg-green-100";
    case "INSPECTION":
      return "text-purple-600 bg-purple-100";
    case "LOCATION_UPDATE":
      return "text-orange-600 bg-orange-100";
    case "ALERT":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return "bg-red-100 text-red-800 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "NORMAL":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "LOW":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function ActivityLog({ shipmentId, className }: ActivityLogProps) {
  const [newComment, setNewComment] = useState("");

  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useShipmentEvents(shipmentId);
  const addEventMutation = useAddShipmentEvent();

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addEventMutation.mutateAsync({
        shipment_id: shipmentId,
        event_type: "COMMENT",
        details: newComment.trim(),
      });

      setNewComment("");
      refetch(); // Refresh the events list
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load activity log. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity Log
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment or update..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={addEventMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!newComment.trim() || addEventMutation.isPending}
              size="sm"
            >
              {addEventMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>

        {/* Events List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 mx-auto mb-2 text-gray-400 animate-spin" />
              <p className="text-gray-500 text-sm">Loading activity log...</p>
            </div>
          ) : events && events.length > 0 ? (
            events.map((event: ShipmentEvent) => (
              <div key={event.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start gap-3">
                  {/* Event Icon */}
                  <div
                    className={`p-2 rounded-full ${getEventColor(event.event_type)}`}
                  >
                    {getEventIcon(event.event_type)}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {event.user.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.user.role}
                        </Badge>
                        {event.priority && event.priority !== "NORMAL" && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(event.priority)}`}
                          >
                            {event.priority}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(event.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      {event.details}
                    </p>

                    {event.attachment_url && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          View Attachment
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs text-gray-400">
                Comments and updates will appear here
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-3">
          <div className="flex gap-2 text-xs">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              <Camera className="h-3 w-3 mr-1" />
              Add Photo
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              <FileText className="h-3 w-3 mr-1" />
              Upload Document
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Report Issue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Activity Log Component
 * Displays and manages shipment communication and events
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import {apiService} from '../services/api';

interface ActivityLogProps {
  shipmentId: string;
  style?: any;
}

interface ShipmentEvent {
  id: string;
  event_type: string;
  title: string;
  details: string;
  timestamp: string;
  user_display_name: string;
  user_role_display: string;
  priority: string;
  is_recent: boolean;
  is_internal: boolean;
  is_automated: boolean;
  attachment_url?: string;
  inspection_details?: any;
}

const ActivityLog: React.FC<ActivityLogProps> = ({shipmentId, style}) => {
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const queryClient = useQueryClient();

  // Fetch events
  const {
    data: events,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['shipmentEvents', shipmentId],
    queryFn: () => apiService.getShipmentEvents(shipmentId),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: (comment: string) => apiService.postComment(shipmentId, comment),
    onSuccess: () => {
      setNewComment('');
      setIsPostingComment(false);
      queryClient.invalidateQueries({queryKey: ['shipmentEvents', shipmentId]});
      Toast.show({
        type: 'success',
        text1: 'Comment Posted',
        text2: 'Your comment has been added to the activity log',
      });
    },
    onError: (error) => {
      setIsPostingComment(false);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to post comment. Please try again.',
      });
    },
  });

  const handlePostComment = () => {
    const comment = newComment.trim();
    if (!comment) {
      Alert.alert('Empty Comment', 'Please enter a comment before posting.');
      return;
    }

    setIsPostingComment(true);
    postCommentMutation.mutate(comment);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'COMMENT':
        return '💬';
      case 'STATUS_CHANGE':
        return '📦';
      case 'INSPECTION':
        return '🔍';
      case 'LOCATION_UPDATE':
        return '📍';
      case 'DOCUMENT_UPLOAD':
        return '📄';
      case 'PHOTO_UPLOAD':
        return '📷';
      case 'DELIVERY_UPDATE':
        return '🚚';
      case 'ALERT':
        return '⚠️';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '📋';
    }
  };

  const getEventTypeDisplay = (eventType: string) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#ef4444';
      case 'HIGH':
        return '#f59e0b';
      case 'NORMAL':
        return '#6b7280';
      case 'LOW':
        return '#9ca3af';
      default:
        return '#6b7280';
    }
  };

  const renderEventItem = ({item: event}: {item: ShipmentEvent}) => (
    <View style={styles.eventItem}>
      <View style={styles.eventHeader}>
        <View style={styles.eventIconContainer}>
          <Text style={styles.eventIcon}>{getEventIcon(event.event_type)}</Text>
          {event.priority !== 'NORMAL' && (
            <View
              style={[
                styles.priorityIndicator,
                {backgroundColor: getPriorityColor(event.priority)},
              ]}
            />
          )}
        </View>

        <View style={styles.eventContent}>
          <View style={styles.eventTitleRow}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventTimestamp}>{formatTimestamp(event.timestamp)}</Text>
          </View>

          <Text style={styles.eventDetails}>{event.details}</Text>

          <View style={styles.eventMeta}>
            <Text style={styles.eventUser}>
              {event.user_display_name} • {event.user_role_display}
            </Text>
            {event.is_automated && (
              <View style={styles.automatedBadge}>
                <Text style={styles.automatedText}>Auto</Text>
              </View>
            )}
            {event.is_recent && (
              <View style={styles.recentBadge}>
                <Text style={styles.recentText}>New</Text>
              </View>
            )}
          </View>

          {event.inspection_details && (
            <View style={styles.inspectionDetails}>
              <Text style={styles.inspectionLabel}>
                Inspection: {event.inspection_details.inspection_type}
              </Text>
              <Text style={styles.inspectionResult}>
                Result: {event.inspection_details.overall_result || 'In Progress'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (isError) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load activity log</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Log</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refetch()}
          disabled={isRefetching}>
          <Text style={styles.refreshButtonText}>
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          editable={!isPostingComment}
        />
        <TouchableOpacity
          style={[
            styles.postButton,
            (!newComment.trim() || isPostingComment) && styles.postButtonDisabled,
          ]}
          onPress={handlePostComment}
          disabled={!newComment.trim() || isPostingComment}>
          <Text
            style={[
              styles.postButtonText,
              (!newComment.trim() || isPostingComment) && styles.postButtonTextDisabled,
            ]}>
            {isPostingComment ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      ) : (
        <FlatList
          data={events || []}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          style={styles.eventsList}
          contentContainerStyle={styles.eventsListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                Events and comments will appear here as they happen
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'flex-end',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  postButtonTextDisabled: {
    color: '#9ca3af',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    paddingBottom: 16,
  },
  eventItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  eventIcon: {
    fontSize: 20,
  },
  priorityIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventContent: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  eventTimestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  eventDetails: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventUser: {
    fontSize: 12,
    color: '#6b7280',
  },
  automatedBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  automatedText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  recentBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recentText: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '600',
  },
  inspectionDetails: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  inspectionLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  inspectionResult: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default ActivityLog;
/**
 * Shipment Detail Screen
 * Displays detailed information about a specific shipment
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRoute, useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {apiService, Shipment, ConsignmentItem} from '../services/api';

type RouteParams = {
  shipmentId: string;
};

type NavigationProp = any;

const StatusBadge: React.FC<{status: string}> = ({status}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY_FOR_DISPATCH':
        return '#3B82F6';
      case 'IN_TRANSIT':
        return '#10B981';
      case 'OUT_FOR_DELIVERY':
        return '#F59E0B';
      case 'DELIVERED':
        return '#059669';
      case 'EXCEPTION':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <View style={[styles.statusBadge, {backgroundColor: getStatusColor(status)}]}>
      <Text style={styles.statusText}>{getStatusText(status)}</Text>
    </View>
  );
};

const ConsignmentItemCard: React.FC<{item: ConsignmentItem}> = ({item}) => {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDescription}>{item.description}</Text>
        {item.is_dangerous_good && (
          <View style={styles.dgBadge}>
            <Text style={styles.dgBadgeText}>⚠️ DG</Text>
          </View>
        )}
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemDetail}>Quantity: {item.quantity}</Text>
        {item.weight_kg && (
          <Text style={styles.itemDetail}>Weight: {item.weight_kg} kg</Text>
        )}
      </View>

      {item.dangerous_good_entry && (
        <View style={styles.dgDetails}>
          <Text style={styles.dgTitle}>Dangerous Goods Information:</Text>
          <Text style={styles.dgInfo}>UN {item.dangerous_good_entry.un_number}</Text>
          <Text style={styles.dgInfo}>{item.dangerous_good_entry.proper_shipping_name}</Text>
          <Text style={styles.dgInfo}>Class {item.dangerous_good_entry.hazard_class}</Text>
          {item.dangerous_good_entry.packing_group && (
            <Text style={styles.dgInfo}>PG {item.dangerous_good_entry.packing_group}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const StatusUpdateButton: React.FC<{
  currentStatus: string;
  onStatusUpdate: (newStatus: string) => void;
  isUpdating: boolean;
}> = ({currentStatus, onStatusUpdate, isUpdating}) => {
  const getNextStatuses = (current: string): Array<{value: string; label: string}> => {
    switch (current) {
      case 'READY_FOR_DISPATCH':
        return [{value: 'IN_TRANSIT', label: '🚛 Start Transit'}];
      case 'IN_TRANSIT':
        return [
          {value: 'OUT_FOR_DELIVERY', label: '📦 Out for Delivery'},
          {value: 'EXCEPTION', label: '⚠️ Report Issue'},
        ];
      case 'OUT_FOR_DELIVERY':
        return [
          {value: 'DELIVERED', label: '✅ Mark Delivered'},
          {value: 'EXCEPTION', label: '⚠️ Report Issue'},
        ];
      default:
        return [];
    }
  };

  const nextStatuses = getNextStatuses(currentStatus);

  if (nextStatuses.length === 0) {
    return null;
  }

  const handleStatusPress = (newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Are you sure you want to update the shipment status?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Update', onPress: () => onStatusUpdate(newStatus)},
      ]
    );
  };

  return (
    <View style={styles.statusButtonsContainer}>
      <Text style={styles.statusButtonsTitle}>Update Status:</Text>
      {nextStatuses.map(status => (
        <TouchableOpacity
          key={status.value}
          style={[styles.statusButton, isUpdating && styles.statusButtonDisabled]}
          onPress={() => handleStatusPress(status.value)}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.statusButtonText}>{status.label}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const ShipmentDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const {shipmentId} = route.params as RouteParams;

  const {
    data: shipment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => apiService.getShipmentDetail(shipmentId),
  });

  const statusUpdateMutation = useMutation({
    mutationFn: (newStatus: string) => 
      apiService.updateShipmentStatus(shipmentId, newStatus),
    onSuccess: (updatedShipment) => {
      // Update the cached data
      queryClient.setQueryData(['shipment', shipmentId], updatedShipment);
      queryClient.invalidateQueries({queryKey: ['driver-shipments']});
      
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: 'Shipment status has been updated successfully',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error instanceof Error ? error.message : 'Failed to update status',
      });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusUpdate = (newStatus: string) => {
    statusUpdateMutation.mutate(newStatus);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading shipment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !shipment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Shipment</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Shipment not found'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Info */}
        <View style={styles.section}>
          <View style={styles.mainHeader}>
            <View>
              <Text style={styles.trackingNumber}>{shipment.tracking_number}</Text>
              {shipment.reference_number && (
                <Text style={styles.referenceNumber}>
                  Ref: {shipment.reference_number}
                </Text>
              )}
            </View>
            <StatusBadge status={shipment.status} />
          </View>
        </View>

        {/* Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          <View style={styles.locationInfo}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>🏭 From:</Text>
              <Text style={styles.locationText}>{shipment.origin_location}</Text>
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>🏪 To:</Text>
              <Text style={styles.locationText}>{shipment.destination_location}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timelineInfo}>
            <View style={styles.timelineRow}>
              <Text style={styles.timelineLabel}>Estimated Pickup:</Text>
              <Text style={styles.timelineValue}>
                {formatDate(shipment.estimated_pickup_date)}
              </Text>
            </View>
            {shipment.actual_pickup_date && (
              <View style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>Actual Pickup:</Text>
                <Text style={styles.timelineValue}>
                  {formatDate(shipment.actual_pickup_date)}
                </Text>
              </View>
            )}
            <View style={styles.timelineRow}>
              <Text style={styles.timelineLabel}>Estimated Delivery:</Text>
              <Text style={styles.timelineValue}>
                {formatDate(shipment.estimated_delivery_date)}
              </Text>
            </View>
            {shipment.actual_delivery_date && (
              <View style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>Actual Delivery:</Text>
                <Text style={styles.timelineValue}>
                  {formatDate(shipment.actual_delivery_date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer & Carrier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.partiesInfo}>
            <View style={styles.partyRow}>
              <Text style={styles.partyLabel}>Customer:</Text>
              <Text style={styles.partyValue}>{shipment.customer.name}</Text>
            </View>
            <View style={styles.partyRow}>
              <Text style={styles.partyLabel}>Carrier:</Text>
              <Text style={styles.partyValue}>{shipment.carrier.name}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Info */}
        {shipment.assigned_vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleText}>
                {shipment.assigned_vehicle.registration_number} ({shipment.assigned_vehicle.vehicle_type})
              </Text>
            </View>
          </View>
        )}

        {/* Instructions */}
        {shipment.instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <Text style={styles.instructionsText}>{shipment.instructions}</Text>
          </View>
        )}

        {/* Consignment Items */}
        {shipment.consignment_items && shipment.consignment_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Items ({shipment.consignment_items.length})
            </Text>
            {shipment.consignment_items.map(item => (
              <ConsignmentItemCard key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* Status Update Buttons */}
        <StatusUpdateButton
          currentStatus={shipment.status}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={statusUpdateMutation.isPending}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackingNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  referenceNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationInfo: {
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    width: 80,
  },
  locationText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  timelineInfo: {
    gap: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  partiesInfo: {
    gap: 8,
  },
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partyLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  partyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  vehicleInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  dgBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dgBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B91C1C',
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  itemDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  dgDetails: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  dgTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  dgInfo: {
    fontSize: 11,
    color: '#92400E',
  },
  statusButtonsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusButtonsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  statusButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 32,
  },
});
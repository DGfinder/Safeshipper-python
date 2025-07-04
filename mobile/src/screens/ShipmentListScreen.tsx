/**
 * Shipment List Screen
 * Displays list of shipments assigned to the driver
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';

import {apiService, Shipment} from '../services/api';
import {useAuth} from '../context/AuthContext';
import {useLocation} from '../context/LocationContext';

type NavigationProp = any; // Would be properly typed in a real app

const StatusBadge: React.FC<{status: string}> = ({status}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY_FOR_DISPATCH':
        return '#3B82F6'; // Blue
      case 'IN_TRANSIT':
        return '#10B981'; // Green
      case 'OUT_FOR_DELIVERY':
        return '#F59E0B'; // Amber
      case 'DELIVERED':
        return '#059669'; // Emerald
      case 'EXCEPTION':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
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

const ShipmentCard: React.FC<{shipment: Shipment; onPress: () => void}> = ({
  shipment,
  onPress,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasDangerousGoods = shipment.consignment_items?.some(
    item => item.is_dangerous_good
  ) || false;

  return (
    <TouchableOpacity style={styles.shipmentCard} onPress={onPress}>
      <View style={styles.cardHeader}>
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

      <View style={styles.cardContent}>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>From:</Text>
          <Text style={styles.locationText}>{shipment.origin_location}</Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>To:</Text>
          <Text style={styles.locationText}>{shipment.destination_location}</Text>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Customer:</Text>
            <Text style={styles.metaValue}>{shipment.customer.name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Pickup:</Text>
            <Text style={styles.metaValue}>
              {formatDate(shipment.estimated_pickup_date)}
            </Text>
          </View>
        </View>

        {hasDangerousGoods && (
          <View style={styles.dangerousGoodsWarning}>
            <Text style={styles.dangerousGoodsText}>⚠️ Contains Dangerous Goods</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const ShipmentListScreen: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const navigation = useNavigation<NavigationProp>();
  const {user, logout} = useAuth();
  const {isTracking, startTracking, stopTracking} = useLocation();

  const {
    data: shipments = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['driver-shipments', selectedStatus],
    queryFn: () => apiService.getDriverShipments(selectedStatus || undefined),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const statusFilters = [
    {key: '', label: 'All'},
    {key: 'READY_FOR_DISPATCH', label: 'Ready'},
    {key: 'IN_TRANSIT', label: 'In Transit'},
    {key: 'OUT_FOR_DELIVERY', label: 'Delivering'},
  ];

  const handleShipmentPress = (shipment: Shipment) => {
    navigation.navigate('ShipmentDetail', {shipmentId: shipment.id});
  };

  const handleLocationToggle = async () => {
    try {
      if (isTracking) {
        await stopTracking();
      } else {
        await startTracking();
      }
    } catch (error) {
      console.error('Error toggling location tracking:', error);
    }
  };

  const renderShipment = ({item}: {item: Shipment}) => (
    <ShipmentCard
      shipment={item}
      onPress={() => handleShipmentPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Shipments</Text>
      <Text style={styles.emptyStateText}>
        {selectedStatus 
          ? `No shipments with status "${selectedStatus.replace(/_/g, ' ')}"`
          : 'No shipments assigned to you at the moment'
        }
      </Text>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Shipments</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
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
        <View>
          <Text style={styles.greeting}>Hello, {user?.first_name}!</Text>
          <Text style={styles.subtitle}>Your assigned shipments</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.locationButton, isTracking && styles.locationButtonActive]}
            onPress={handleLocationToggle}
          >
            <Text style={[styles.locationButtonText, isTracking && styles.locationButtonTextActive]}>
              {isTracking ? '📍 ON' : '📍 OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === item.key && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus(item.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === item.key && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Shipments List */}
      {isLoading && !isRefetching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading shipments...</Text>
        </View>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={item => item.id}
          renderItem={renderShipment}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#2563EB']}
            />
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  locationButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  locationButtonTextActive: {
    color: '#FFFFFF',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EF4444',
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  shipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  referenceNumber: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardContent: {
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
    width: 50,
  },
  locationText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 2,
  },
  dangerousGoodsWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  dangerousGoodsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
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
});
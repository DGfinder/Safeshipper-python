/**
 * POD History Screen
 * Shows completed PODs with photos and signatures for review
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';

import {apiService, PODDetailsResponse} from '../services/api';

type RouteParams = {
  shipmentId: string;
  shipmentTrackingNumber: string;
};

const PODHistoryScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {shipmentId, shipmentTrackingNumber} = route.params as RouteParams;

  // Fetch POD details
  const {
    data: podData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pod-details', shipmentId],
    queryFn: () => apiService.getPODDetails(shipmentId),
    retry: 2,
  });

  const handlePhotoPress = (photoUrl: string, fileName: string) => {
    Alert.alert(
      'Photo Details',
      `Photo: ${fileName}\n\nOptions:`,
      [
        {text: 'View Fullscreen', onPress: () => {/* TODO: Implement fullscreen view */}},
        {text: 'Share', onPress: () => {/* TODO: Implement photo sharing */}},
        {text: 'Cancel', style: 'cancel'},
      ]
    );
  };

  const handleSignaturePress = (signatureUrl: string) => {
    Alert.alert(
      'Digital Signature',
      'View recipient signature',
      [
        {text: 'View Fullscreen', onPress: () => {/* TODO: Implement fullscreen view */}},
        {text: 'OK'},
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>POD Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading POD details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !podData?.has_pod) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>POD Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No POD Found</Text>
          <Text style={styles.errorText}>
            {error ? 'Failed to load POD details' : 'No proof of delivery exists for this shipment'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pod = podData.pod_details!;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proof of Delivery</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shipment Info */}
        <View style={styles.shipmentInfo}>
          <Text style={styles.shipmentTitle}>Delivery Completed</Text>
          <Text style={styles.shipmentNumber}>Tracking: {pod.shipment.tracking_number}</Text>
          <Text style={styles.customerName}>Customer: {pod.shipment.customer_name}</Text>
          <Text style={styles.deliveryDate}>
            Delivered: {new Date(pod.delivered_at).toLocaleString()}
          </Text>
        </View>

        {/* Delivery Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recipient:</Text>
            <Text style={styles.detailValue}>{pod.recipient_name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivered By:</Text>
            <Text style={styles.detailValue}>{pod.delivered_by.name}</Text>
          </View>

          {pod.delivery_location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{pod.delivery_location}</Text>
            </View>
          )}

          {pod.delivery_notes && (
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.detailValue}>{pod.delivery_notes}</Text>
            </View>
          )}
        </View>

        {/* Digital Signature */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Digital Signature</Text>
          <TouchableOpacity 
            style={styles.signatureContainer}
            onPress={() => handleSignaturePress(pod.recipient_signature_url)}>
            <Image 
              source={{uri: pod.recipient_signature_url}} 
              style={styles.signatureImage}
              resizeMode="contain"
            />
            <Text style={styles.signatureCaption}>
              Tap to view full signature
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delivery Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Delivery Photos ({pod.photo_count})
          </Text>
          
          {pod.photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {pod.photos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoContainer}
                  onPress={() => handlePhotoPress(photo.image_url, photo.file_name)}>
                  <Image 
                    source={{uri: photo.thumbnail_url || photo.image_url}} 
                    style={styles.photoImage}
                  />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoIndex}>{index + 1}</Text>
                  </View>
                  {photo.file_size_mb && (
                    <Text style={styles.photoSize}>
                      {photo.file_size_mb}MB
                    </Text>
                  )}
                  {photo.caption && (
                    <Text style={styles.photoCaption} numberOfLines={2}>
                      {photo.caption}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noPhotos}>
              <Text style={styles.noPhotosText}>No photos were captured</Text>
            </View>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>POD ID</Text>
              <Text style={styles.metadataValue}>{pod.id.slice(-8)}</Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Status</Text>
              <Text style={[styles.metadataValue, styles.statusDelivered]}>
                {pod.shipment.status}
              </Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Driver Email</Text>
              <Text style={styles.metadataValue}>{pod.delivered_by.email}</Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Processing Time</Text>
              <Text style={styles.metadataValue}>
                {new Date(pod.delivered_at).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Balance for back button
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  shipmentInfo: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  shipmentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  shipmentNumber: {
    fontSize: 16,
    color: '#2563eb',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailColumn: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  signatureContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signatureImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  signatureCaption: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    width: '48%',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndex: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  photoSize: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  photoCaption: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  noPhotos: {
    alignItems: 'center',
    padding: 32,
  },
  noPhotosText: {
    fontSize: 16,
    color: '#6b7280',
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metadataItem: {
    width: '48%',
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  statusDelivered: {
    color: '#10b981',
    fontWeight: '600',
  },
});

export default PODHistoryScreen;
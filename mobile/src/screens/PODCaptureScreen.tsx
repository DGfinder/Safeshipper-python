/**
 * Proof of Delivery Capture Screen
 * Allows drivers to capture signature and photos for delivery confirmation
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import {apiService, PODSubmissionData, PODResponse} from '../services/api';
import {cameraService, PhotoResult} from '../services/camera';
import SignatureCapture from '../components/SignatureCapture';
import EmergencyButton from '../components/EmergencyButton';

type RouteParams = {
  shipmentId: string;
  shipmentTrackingNumber: string;
  customerName?: string;
};

// Using PODSubmissionData type from API service

const PODCaptureScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {shipmentId, shipmentTrackingNumber, customerName} = route.params as RouteParams;

  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoResult[]>([]);
  const [showSignatureCapture, setShowSignatureCapture] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Submit POD mutation with enhanced processing
  const submitPODMutation = useMutation({
    mutationFn: (podData: PODSubmissionData) => 
      apiService.submitPOD(shipmentId, podData),
    onSuccess: (response: PODResponse) => {
      queryClient.invalidateQueries({queryKey: ['shipments']});
      queryClient.invalidateQueries({queryKey: ['shipment', shipmentId]});
      
      // Show success message with processing details
      const successMessage = `Delivery confirmed! ${response.photos_processed} photos processed${
        response.validation_warnings.length > 0 ? ' (warnings noted)' : ''
      }`;
      
      Toast.show({
        type: 'success',
        text1: 'Delivery Confirmed',
        text2: successMessage,
      });
      
      // Show warnings if any
      if (response.validation_warnings.length > 0) {
        setTimeout(() => {
          Alert.alert(
            'Processing Complete',
            `POD submitted successfully with ${response.validation_warnings.length} warning(s):\n\n${response.validation_warnings.join('\n')}`,
            [{text: 'OK'}]
          );
        }, 1500);
      }
      
      // Navigate back to shipment list or detail
      navigation.reset({
        index: 0,
        routes: [{name: 'ShipmentList' as never}],
      });
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      
      // Enhanced error handling
      const errorMessage = error?.response?.data?.error || 'Failed to submit proof of delivery';
      const validationErrors = error?.response?.data?.validation_errors || [];
      
      let errorText = errorMessage;
      if (validationErrors.length > 0) {
        errorText += `\n\nIssues found:\n${validationErrors.join('\n')}`;
      }
      
      Toast.show({
        type: 'error',
        text1: 'Delivery Failed',
        text2: errorMessage,
      });
      
      // Show detailed error if validation issues
      if (validationErrors.length > 0) {
        setTimeout(() => {
          Alert.alert('Validation Errors', errorText, [{text: 'OK'}]);
        }, 1000);
      }
    },
  });

  const handleTakePhoto = async () => {
    const photo = await cameraService.takePhoto({
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    });

    if (photo) {
      setPhotos(prev => [...prev, photo]);
      Toast.show({
        type: 'success',
        text1: 'Photo Added',
        text2: `${photos.length + 1} photo(s) captured`,
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPhotos(prev => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSignatureCapture = (signature: string) => {
    // Remove data URL prefix if present
    const base64Data = signature.replace(/^data:image\/[a-z]+;base64,/, '');
    setSignatureBase64(base64Data);
    setShowSignatureCapture(false);
    
    Toast.show({
      type: 'success',
      text1: 'Signature Captured',
      text2: 'Digital signature has been recorded',
    });
  };

  const validateAndSubmit = () => {
    // Validation
    if (!recipientName.trim()) {
      Alert.alert('Missing Information', 'Please enter the recipient name.');
      return;
    }

    if (!signatureBase64) {
      Alert.alert('Missing Signature', 'Please capture the recipient signature.');
      return;
    }

    if (photos.length === 0) {
      Alert.alert(
        'No Photos',
        'At least one delivery photo is recommended. Do you want to continue without photos?',
        [
          {text: 'Take Photo', style: 'cancel', onPress: handleTakePhoto},
          {text: 'Continue', onPress: submitPOD},
        ]
      );
      return;
    }

    submitPOD();
  };

  // Real-time validation check
  const validateCurrentData = async () => {
    if (!recipientName.trim()) return; // Don't validate if no recipient name yet
    
    const podData: PODSubmissionData = {
      recipient_name: recipientName.trim(),
      delivery_notes: deliveryNotes.trim(),
      delivery_location: deliveryLocation.trim(),
      signature_file: signatureBase64 || '',
      photos_data: photos.map(photo => ({
        image_url: photo.uri,
        file_name: photo.fileName,
        file_size: photo.fileSize,
        caption: '',
      })),
    };

    try {
      const validation = await apiService.validatePODData(shipmentId, podData);
      setValidationWarnings(validation.data_validation.warnings || []);
    } catch (error) {
      // Silently fail for real-time validation
      console.log('Real-time validation failed:', error);
    }
  };

  // Use effect to validate data as user types
  React.useEffect(() => {
    const timer = setTimeout(validateCurrentData, 1000); // Debounce validation
    return () => clearTimeout(timer);
  }, [recipientName, deliveryNotes, deliveryLocation, signatureBase64, photos]);

  const submitPOD = () => {
    setIsSubmitting(true);

    const podData: PODSubmissionData = {
      recipient_name: recipientName.trim(),
      delivery_notes: deliveryNotes.trim(),
      delivery_location: deliveryLocation.trim(),
      signature_file: signatureBase64!,
      photos_data: photos.map(photo => ({
        image_url: photo.uri,
        file_name: photo.fileName,
        file_size: photo.fileSize,
        caption: '',
      })),
    };

    submitPODMutation.mutate(podData);
  };

  if (showSignatureCapture) {
    return (
      <SafeAreaView style={styles.container}>
        <SignatureCapture
          onSignatureCapture={handleSignatureCapture}
          onCancel={() => setShowSignatureCapture(false)}
          recipientName={recipientName}
        />
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
          disabled={isSubmitting}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proof of Delivery</Text>
        <EmergencyButton
          shipmentId={shipmentId}
          shipmentTrackingNumber={shipmentTrackingNumber}
          size="small"
          style={styles.emergencyButton}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shipment Info */}
        <View style={styles.shipmentInfo}>
          <Text style={styles.shipmentTitle}>Completing Delivery</Text>
          <Text style={styles.shipmentNumber}>Tracking: {shipmentTrackingNumber}</Text>
          {customerName && (
            <Text style={styles.customerName}>Customer: {customerName}</Text>
          )}
        </View>

        {/* Recipient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipient Information</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Recipient Name *</Text>
            <TextInput
              style={styles.textInput}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Enter recipient's full name"
              maxLength={100}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Delivery Location</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              placeholder="Specific delivery location (optional)"
              maxLength={200}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Delivery Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="Any additional notes about the delivery..."
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Digital Signature *</Text>
          {signatureBase64 ? (
            <View style={styles.signaturePreview}>
              <Image 
                source={{uri: `data:image/png;base64,${signatureBase64}`}} 
                style={styles.signatureImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.retakeSignatureButton}
                onPress={() => setShowSignatureCapture(true)}
                disabled={isSubmitting}>
                <Text style={styles.retakeSignatureText}>Retake Signature</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureSignatureButton}
              onPress={() => setShowSignatureCapture(true)}
              disabled={isSubmitting}>
              <Text style={styles.captureSignatureText}>Capture Signature</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <View style={styles.photosHeader}>
            <Text style={styles.sectionTitle}>Delivery Photos ({photos.length})</Text>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleTakePhoto}
              disabled={isSubmitting}>
              <Text style={styles.addPhotoText}>+ Add Photo</Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 ? (
            <FlatList
              horizontal
              data={photos}
              renderItem={({item: photo, index}) => (
                <View style={styles.photoItem}>
                  <Image source={{uri: photo.uri}} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                    disabled={isSubmitting}>
                    <Text style={styles.removePhotoText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(_, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosList}
            />
          ) : (
            <View style={styles.noPhotos}>
              <Text style={styles.noPhotosText}>No photos captured yet</Text>
              <Text style={styles.noPhotosSubtext}>
                Take photos of the delivered items and delivery location
              </Text>
            </View>
          )}
        </View>

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <View style={styles.warningsContainer}>
            <Text style={styles.warningsTitle}>⚠️ Recommendations:</Text>
            {validationWarnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Important:</Text>
          <Text style={styles.instructionsText}>
            • Ensure the recipient's name is spelled correctly{'\n'}
            • Capture a clear signature from the recipient{'\n'}
            • Take photos showing the delivered items{'\n'}
            • Once submitted, this cannot be changed
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={validateAndSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Complete Delivery</Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  emergencyButton: {
    marginRight: 8,
  },
  content: {
    flex: 1,
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
    color: '#1f2937',
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
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  signaturePreview: {
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  retakeSignatureButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  retakeSignatureText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  captureSignatureButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureSignatureText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addPhotoText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  photosList: {
    paddingVertical: 8,
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noPhotos: {
    alignItems: 'center',
    padding: 32,
  },
  noPhotosText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  warningsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef7cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b45309',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#b45309',
    lineHeight: 20,
    marginBottom: 4,
  },
  instructions: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  submitContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PODCaptureScreen;
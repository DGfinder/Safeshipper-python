/**
 * Inspection Screen
 * Allows drivers and loaders to perform hazard inspections with photo capture
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRoute, useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {apiService} from '../services/api';
import {cameraService, PhotoResult} from '../services/camera';

type RouteParams = {
  shipmentId: string;
  inspectionType?: string;
};

interface InspectionItem {
  id: string;
  description: string;
  category: string;
  is_mandatory: boolean;
  result?: 'PASS' | 'FAIL' | 'N/A';
  notes?: string;
  corrective_action?: string;
  photos?: any[];
}

interface Inspection {
  id: string;
  shipment: string;
  inspection_type: string;
  status: string;
  overall_result?: string;
  notes: string;
  items: InspectionItem[];
}

const InspectionScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {shipmentId, inspectionType = 'PRE_TRIP'} = route.params as RouteParams;

  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inspection template
  const {data: templates, isLoading: templatesLoading} = useQuery({
    queryKey: ['inspectionTemplates', inspectionType],
    queryFn: () => apiService.getInspectionTemplates(inspectionType),
  });

  // Fetch existing inspection if any
  const {data: existingInspection, isLoading: inspectionLoading} = useQuery({
    queryKey: ['shipmentInspections', shipmentId],
    queryFn: () => apiService.getShipmentInspections(shipmentId),
  });

  // Initialize inspection
  useEffect(() => {
    if (templates && templates.length > 0 && !currentInspection) {
      const template = templates[0];
      const items: InspectionItem[] = template.template_items.map((item: any) => ({
        id: item.id,
        description: item.description,
        category: item.category,
        is_mandatory: item.is_mandatory,
        result: undefined,
        notes: '',
        corrective_action: '',
        photos: [],
      }));
      
      setInspectionItems(items);
    }
  }, [templates, currentInspection]);

  const createInspectionMutation = useMutation({
    mutationFn: (data: any) => apiService.createInspection(data),
    onSuccess: (inspection) => {
      setCurrentInspection(inspection);
      Toast.show({
        type: 'success',
        text1: 'Inspection Created',
        text2: 'Starting inspection checklist',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create inspection',
      });
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: ({id, data}: {id: string; data: any}) => apiService.updateInspection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['shipmentInspections', shipmentId]});
      Toast.show({
        type: 'success',
        text1: 'Inspection Updated',
        text2: 'Inspection completed successfully',
      });
      navigation.goBack();
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save inspection',
      });
    },
  });

  const startInspection = async () => {
    if (!templates || templates.length === 0) {
      Alert.alert('Error', 'No inspection template available');
      return;
    }

    const template = templates[0];
    const inspectionData = {
      shipment: shipmentId,
      inspection_type: inspectionType,
      notes: `Created from template: ${template.name}`,
      items_data: inspectionItems.map(item => ({
        description: item.description,
        category: item.category,
        is_mandatory: item.is_mandatory,
      })),
    };

    createInspectionMutation.mutate(inspectionData);
  };

  const updateItemResult = (result: 'PASS' | 'FAIL' | 'N/A') => {
    const updatedItems = [...inspectionItems];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      result,
    };
    setInspectionItems(updatedItems);
  };

  const updateItemNotes = (notes: string) => {
    const updatedItems = [...inspectionItems];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      notes,
    };
    setInspectionItems(updatedItems);
  };

  const takePhoto = async () => {
    const photo = await cameraService.takePhoto({
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    });

    if (photo) {
      const updatedItems = [...inspectionItems];
      updatedItems[currentItemIndex] = {
        ...updatedItems[currentItemIndex],
        photos: [...(updatedItems[currentItemIndex].photos || []), photo],
      };
      setInspectionItems(updatedItems);
      
      Toast.show({
        type: 'success',
        text1: 'Photo Added',
        text2: 'Photo captured successfully',
      });
    }
  };

  const removePhoto = (photoIndex: number) => {
    const updatedItems = [...inspectionItems];
    const currentItem = updatedItems[currentItemIndex];
    currentItem.photos = currentItem.photos?.filter((_, index) => index !== photoIndex) || [];
    setInspectionItems(updatedItems);
  };

  const nextItem = () => {
    if (currentItemIndex < inspectionItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const previousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const completeInspection = () => {
    if (!currentInspection) {
      Alert.alert('Error', 'No active inspection');
      return;
    }

    // Check if all mandatory items have results
    const incompleteMandatory = inspectionItems.filter(
      item => item.is_mandatory && !item.result
    );

    if (incompleteMandatory.length > 0) {
      Alert.alert(
        'Incomplete Inspection',
        `Please complete all mandatory items (${incompleteMandatory.length} remaining)`,
        [{text: 'OK'}]
      );
      return;
    }

    const failedItems = inspectionItems.filter(item => item.result === 'FAIL');
    const overallResult = failedItems.length > 0 ? 'FAIL' : 'PASS';

    const updateData = {
      status: 'COMPLETED',
      overall_result: overallResult,
      items: inspectionItems.map(item => ({
        id: item.id,
        result: item.result,
        notes: item.notes,
        corrective_action: item.corrective_action,
        checked_at: new Date().toISOString(),
      })),
    };

    setIsSubmitting(true);
    updateInspectionMutation.mutate({
      id: currentInspection.id,
      data: updateData,
    });
  };

  if (templatesLoading || inspectionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading inspection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentInspection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.startContainer}>
          <Text style={styles.title}>Start Inspection</Text>
          <Text style={styles.subtitle}>
            {inspectionType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          <Text style={styles.description}>
            This inspection includes {inspectionItems.length} checklist items.
            You'll be able to mark each item as pass/fail and attach photos for any issues.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={startInspection}
            disabled={createInspectionMutation.isPending}>
            <Text style={styles.startButtonText}>
              {createInspectionMutation.isPending ? 'Starting...' : 'Start Inspection'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentItem = inspectionItems[currentItemIndex];
  if (!currentItem) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Item {currentItemIndex + 1} of {inspectionItems.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {width: `${((currentItemIndex + 1) / inspectionItems.length) * 100}%`},
            ]}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Current Item */}
        <View style={styles.itemContainer}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemCategory}>{currentItem.category}</Text>
            {currentItem.is_mandatory && (
              <View style={styles.mandatoryBadge}>
                <Text style={styles.mandatoryText}>Required</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.itemDescription}>{currentItem.description}</Text>

          {/* Result Buttons */}
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Inspection Result:</Text>
            <View style={styles.resultButtons}>
              {['PASS', 'FAIL', 'N/A'].map((result) => (
                <TouchableOpacity
                  key={result}
                  style={[
                    styles.resultButton,
                    currentItem.result === result && styles.resultButtonActive,
                    result === 'PASS' && styles.passButton,
                    result === 'FAIL' && styles.failButton,
                    result === 'N/A' && styles.naButton,
                  ]}
                  onPress={() => updateItemResult(result as any)}>
                  <Text
                    style={[
                      styles.resultButtonText,
                      currentItem.result === result && styles.resultButtonTextActive,
                    ]}>
                    {result}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Photos */}
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={styles.photoLabel}>Photos ({currentItem.photos?.length || 0})</Text>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Text style={styles.photoButtonText}>+ Add Photo</Text>
              </TouchableOpacity>
            </View>
            
            {currentItem.photos && currentItem.photos.length > 0 && (
              <FlatList
                horizontal
                data={currentItem.photos}
                renderItem={({item: photo, index}) => (
                  <View style={styles.photoItem}>
                    <Image source={{uri: photo.uri}} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => removePhoto(index)}>
                      <Text style={styles.photoRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                keyExtractor={(_, index) => index.toString()}
                showsHorizontalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentItemIndex === 0 && styles.navButtonDisabled]}
          onPress={previousItem}
          disabled={currentItemIndex === 0}>
          <Text style={[styles.navButtonText, currentItemIndex === 0 && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        {currentItemIndex === inspectionItems.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.completeButton]}
            onPress={completeInspection}
            disabled={isSubmitting}>
            <Text style={styles.completeButtonText}>
              {isSubmitting ? 'Saving...' : 'Complete Inspection'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={nextItem}>
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#2563eb',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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
  headerSpacer: {
    width: 60,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  itemContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCategory: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  mandatoryBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mandatoryText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 18,
    color: '#1f2937',
    lineHeight: 26,
    marginBottom: 24,
  },
  resultContainer: {
    marginBottom: 24,
  },
  resultLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 12,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  resultButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  passButton: {
    // Add specific styling if needed
  },
  failButton: {
    // Add specific styling if needed
  },
  naButton: {
    // Add specific styling if needed
  },
  resultButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  resultButtonTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  photoSection: {
    marginTop: 8,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  photoButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  photoButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  navButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InspectionScreen;
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
import Toast from 'react-native-toast-message';
import {useFocusEffect} from '@react-navigation/native';

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
  photos?: PhotoResult[];
  checked_at?: string;
  has_photos?: boolean;
  photos_count?: number;
}

interface SafetyRecommendation {
  type: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface DangerousGoodsAnalysis {
  has_dangerous_goods: boolean;
  total_dg_items: number;
  hazard_classes: string[];
  special_requirements: string[];
}

interface Inspection {
  id: string;
  shipment_id: string;
  shipment_tracking: string;
  inspection_type: string;
  inspection_type_display: string;
  status: string;
  overall_result?: string;
  started_at: string;
  completed_at?: string;
  notes: string;
  items: InspectionItem[];
  items_count: number;
  mandatory_items_count: number;
  completed_items_count: number;
  failed_items_count: number;
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
  const [safetyRecommendations, setSafetyRecommendations] = useState<SafetyRecommendation[]>([]);
  const [dangerousGoodsInfo, setDangerousGoodsInfo] = useState<DangerousGoodsAnalysis | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

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

  // Initialize inspection from template
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
        photos_count: 0,
        has_photos: false
      }));
      
      setInspectionItems(items);
      
      // Set dangerous goods info if available in template
      if (template.dangerous_goods_analysis) {
        setDangerousGoodsInfo(template.dangerous_goods_analysis);
      }
    }
  }, [templates, currentInspection]);

  // Auto-save current item when switching items
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (currentInspection && inspectionItems[currentItemIndex]?.result) {
          autoSaveCurrentItem();
        }
      };
    }, [currentInspection, currentItemIndex, inspectionItems])
  );

  const createInspectionMutation = useMutation({
    mutationFn: (data: {template_id: string; shipment_id: string}) => 
      apiService.createInspectionFromTemplate(data.template_id, data.shipment_id),
    onSuccess: (response) => {
      if (response.success) {
        setCurrentInspection(response.inspection);
        setInspectionItems(response.inspection.items);
        
        // Set dangerous goods info if provided
        if (response.dangerous_goods_items > 0) {
          Toast.show({
            type: 'info',
            text1: 'Dangerous Goods Detected',
            text2: `${response.dangerous_goods_items} specialized items added`,
            visibilityTime: 4000,
          });
        }
        
        Toast.show({
          type: 'success',
          text1: 'Inspection Started',
          text2: `${response.items_count} items to check`,
        });
      } else {
        throw new Error(response.error || 'Failed to create inspection');
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to create inspection',
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({item_id, item_data}: {item_id: string; item_data: any}) => 
      apiService.updateInspectionItem(item_id, item_data),
    onSuccess: (response) => {
      if (response.success) {
        // Update local state with response data
        const updatedItems = [...inspectionItems];
        const itemIndex = updatedItems.findIndex(item => item.id === response.item_id);
        if (itemIndex !== -1) {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            ...response.item_data
          };
          setInspectionItems(updatedItems);
        }
        
        // Show safety recommendations if any
        if (response.safety_recommendations?.length > 0) {
          setSafetyRecommendations(response.safety_recommendations.map(rec => ({
            type: 'SAFETY_ALERT',
            message: rec,
            severity: 'HIGH' as const
          })));
        }
        
        if (response.photos_processed > 0) {
          Toast.show({
            type: 'success',
            text1: 'Item Updated',
            text2: `${response.photos_processed} photos processed`,
          });
        }
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update item',
      });
    },
  });

  const completeInspectionMutation = useMutation({
    mutationFn: (completion_data: any) => 
      apiService.completeInspection(currentInspection!.id, completion_data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({queryKey: ['shipmentInspections', shipmentId]});
        
        const summary = response.completion_summary;
        Toast.show({
          type: response.overall_result === 'PASS' ? 'success' : 'error',
          text1: `Inspection ${response.overall_result}`,
          text2: `${summary.passed_items}/${summary.total_items} items passed`,
          visibilityTime: 4000,
        });
        
        // Show safety alerts if any
        if (response.safety_alerts?.length > 0) {
          Alert.alert(
            'Safety Alert',
            `${response.safety_alerts.length} safety issues detected. Review required.`,
            [{text: 'OK'}]
          );
        }
        
        navigation.goBack();
      } else {
        throw new Error(response.error || 'Failed to complete inspection');
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to complete inspection',
      });
    },
  });

  const startInspection = async () => {
    if (!templates || templates.length === 0) {
      Alert.alert('Error', 'No inspection template available');
      return;
    }

    const template = templates[0];
    createInspectionMutation.mutate({
      template_id: template.id,
      shipment_id: shipmentId
    });
  };

  const autoSaveCurrentItem = async () => {
    if (!currentInspection || currentItemIndex >= inspectionItems.length) return;
    
    const currentItem = inspectionItems[currentItemIndex];
    if (!currentItem.result) return;
    
    const itemData = {
      result: currentItem.result,
      notes: currentItem.notes || '',
      corrective_action: currentItem.corrective_action || '',
      photos_data: currentItem.photos?.map(photo => ({
        image_data: photo.base64 || '',
        file_name: photo.fileName || `photo_${Date.now()}.jpg`,
        caption: ''
      })) || []
    };
    
    updateItemMutation.mutate({
      item_id: currentItem.id,
      item_data: itemData
    });
  };

  const updateItemResult = (result: 'PASS' | 'FAIL' | 'N/A') => {
    const updatedItems = [...inspectionItems];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      result,
      checked_at: new Date().toISOString()
    };
    setInspectionItems(updatedItems);
    
    // Clear previous safety recommendations
    setSafetyRecommendations([]);
    
    // Auto-save the item result immediately
    setTimeout(() => autoSaveCurrentItem(), 500);
  };

  const updateItemNotes = (notes: string) => {
    const updatedItems = [...inspectionItems];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      notes,
    };
    setInspectionItems(updatedItems);
  };
  
  const updateItemCorrectiveAction = (corrective_action: string) => {
    const updatedItems = [...inspectionItems];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      corrective_action,
    };
    setInspectionItems(updatedItems);
  };

  const takePhoto = async () => {
    setIsProcessingPhoto(true);
    
    try {
      const photo = await cameraService.takePhoto({
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      if (photo) {
        const updatedItems = [...inspectionItems];
        const currentItem = updatedItems[currentItemIndex];
        
        updatedItems[currentItemIndex] = {
          ...currentItem,
          photos: [...(currentItem.photos || []), photo],
          photos_count: (currentItem.photos_count || 0) + 1,
          has_photos: true
        };
        setInspectionItems(updatedItems);
        
        // If item has result, auto-save with new photo
        if (currentItem.result) {
          const itemData = {
            result: currentItem.result,
            notes: currentItem.notes || '',
            corrective_action: currentItem.corrective_action || '',
            photos_data: updatedItems[currentItemIndex].photos?.map(p => ({
              image_data: p.base64 || '',
              file_name: p.fileName || `photo_${Date.now()}.jpg`,
              caption: ''
            })) || []
          };
          
          updateItemMutation.mutate({
            item_id: currentItem.id,
            item_data: itemData
          });
        } else {
          Toast.show({
            type: 'success',
            text1: 'Photo Captured',
            text2: 'Photo saved locally - will upload when item is completed',
          });
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Failed to capture photo',
      });
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const removePhoto = (photoIndex: number) => {
    const updatedItems = [...inspectionItems];
    const currentItem = updatedItems[currentItemIndex];
    currentItem.photos = currentItem.photos?.filter((_, index) => index !== photoIndex) || [];
    setInspectionItems(updatedItems);
  };

  const nextItem = () => {
    // Auto-save current item before moving
    if (inspectionItems[currentItemIndex]?.result) {
      autoSaveCurrentItem();
    }
    
    if (currentItemIndex < inspectionItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      // Clear safety recommendations when switching items
      setSafetyRecommendations([]);
    }
  };

  const previousItem = () => {
    // Auto-save current item before moving
    if (inspectionItems[currentItemIndex]?.result) {
      autoSaveCurrentItem();
    }
    
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      // Clear safety recommendations when switching items
      setSafetyRecommendations([]);
    }
  };

  const completeInspection = () => {
    if (!currentInspection) {
      Alert.alert('Error', 'No active inspection');
      return;
    }

    // Auto-save current item first
    if (inspectionItems[currentItemIndex]?.result) {
      autoSaveCurrentItem();
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
      )
      return;
    }

    const failedItems = inspectionItems.filter(item => item.result === 'FAIL');
    const passedItems = inspectionItems.filter(item => item.result === 'PASS');
    
    const completionData = {
      final_notes: `Inspection completed: ${passedItems.length} passed, ${failedItems.length} failed`
    };

    Alert.alert(
      'Complete Inspection',
      `${passedItems.length} items passed, ${failedItems.length} failed.\n\nProceed to complete?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: () => {
            setIsSubmitting(true);
            completeInspectionMutation.mutate(completionData);
          }
        }
      ]
    );
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
            {dangerousGoodsInfo?.has_dangerous_goods && (
              <Text style={styles.dangerousGoodsNotice}>
                \n\nDangerous goods detected - additional safety checks will be included.
              </Text>
            )}
          </Text>
          
          {dangerousGoodsInfo?.has_dangerous_goods && (
            <View style={styles.dangerousGoodsInfo}>
              <Text style={styles.dangerousGoodsTitle}>Dangerous Goods Information</Text>
              <Text style={styles.dangerousGoodsText}>
                Hazard Classes: {dangerousGoodsInfo.hazard_classes.join(', ')}
              </Text>
              <Text style={styles.dangerousGoodsText}>
                Items: {dangerousGoodsInfo.total_dg_items}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.startButton}
            onPress={startInspection}
            disabled={createInspectionMutation.isPending}>
            {createInspectionMutation.isPending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.startButtonText}>Start Inspection</Text>
            )}
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
          
          {/* Safety Recommendations */}
          {safetyRecommendations.length > 0 && (
            <View style={styles.safetyRecommendations}>
              <Text style={styles.safetyTitle}>⚠️ Safety Recommendations</Text>
              {safetyRecommendations.map((rec, index) => (
                <Text key={index} style={[
                  styles.safetyText,
                  rec.severity === 'HIGH' && styles.safetyHigh,
                  rec.severity === 'MEDIUM' && styles.safetyMedium
                ]}>
                  • {rec.message}
                </Text>
              ))}
            </View>
          )}

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
              <TouchableOpacity 
                style={[styles.photoButton, isProcessingPhoto && styles.photoButtonDisabled]} 
                onPress={takePhoto}
                disabled={isProcessingPhoto}>
                {isProcessingPhoto ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <Text style={styles.photoButtonText}>+ Add Photo</Text>
                )}
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
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.completeButtonText}>Complete Inspection</Text>
            )}
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
  dangerousGoodsNotice: {
    color: '#dc2626',
    fontWeight: '600',
  },
  dangerousGoodsInfo: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  dangerousGoodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  dangerousGoodsText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
  safetyRecommendations: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 12,
  },
  safetyText: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 6,
    lineHeight: 20,
  },
  safetyHigh: {
    fontWeight: '600',
  },
  safetyMedium: {
    fontWeight: '500',
  },
  photoButtonDisabled: {
    opacity: 0.6,
  },
});

export default InspectionScreen;
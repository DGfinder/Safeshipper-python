import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Button, 
  Card, 
  Searchbar, 
  List, 
  Portal, 
  Modal, 
  Surface,
  IconButton,
  ProgressBar,
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { DangerousGood, PhAnalysisResult } from '../../types/DangerousGoods';
import { ApiService } from '../../services/ApiService';
import { HazardIcon } from '../../components/HazardIcon';

const AlkalineOrAcidScreen: React.FC = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<DangerousGood | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DangerousGood[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [phAnalysis, setPhAnalysis] = useState<PhAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const searchMaterials = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await ApiService.searchDangerousGoods(query);
      if (response.success) {
        setSearchResults(response.data?.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const selectMaterial = (material: DangerousGood) => {
    setSelectedMaterial(material);
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
    analyzePhLevel(material);
  };

  const analyzePhLevel = async (material: DangerousGood) => {
    setIsAnalyzing(true);
    try {
      const response = await ApiService.analyzePhLevel(material.id);
      if (response.success && response.data) {
        setPhAnalysis(response.data);
      } else {
        Alert.alert('Error', 'Failed to analyze pH level');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze pH level');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPhColor = (phValue: number) => {
    if (phValue < 7) return '#FF3B30'; // Acidic - Red
    if (phValue > 7) return '#007AFF'; // Alkaline - Blue
    return '#34C759'; // Neutral - Green
  };

  const getPhCategory = (phValue: number) => {
    if (phValue < 3) return 'Strongly Acidic';
    if (phValue < 6) return 'Acidic';
    if (phValue < 8) return 'Neutral';
    if (phValue < 11) return 'Alkaline';
    return 'Strongly Alkaline';
  };

  const getPhIcon = (phValue: number) => {
    if (phValue < 7) return 'flask-empty';
    if (phValue > 7) return 'flask';
    return 'flask-outline';
  };

  const PhScale = ({ phValue }: { phValue: number }) => {
    const position = (phValue / 14) * 100;
    
    return (
      <View style={styles.phScaleContainer}>
        <Text style={styles.phScaleTitle}>pH Scale</Text>
        <View style={styles.phScale}>
          <View style={styles.phGradient} />
          <View style={[styles.phIndicator, { left: `${position}%` }]}>
            <View style={[styles.phMarker, { backgroundColor: getPhColor(phValue) }]} />
            <Text style={styles.phValue}>{phValue.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.phLabels}>
          <Text style={styles.phLabel}>0</Text>
          <Text style={styles.phLabel}>7</Text>
          <Text style={styles.phLabel}>14</Text>
        </View>
        <View style={styles.phCategories}>
          <Text style={[styles.phCategoryLabel, { color: '#FF3B30' }]}>Acidic</Text>
          <Text style={[styles.phCategoryLabel, { color: '#34C759' }]}>Neutral</Text>
          <Text style={[styles.phCategoryLabel, { color: '#007AFF' }]}>Alkaline</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="ph" size={48} color="#007AFF" />
          <Text style={styles.title}>pH Analysis</Text>
          <Text style={styles.subtitle}>
            Analyze acidity/alkalinity and get segregation guidelines
          </Text>
        </View>

        <View style={styles.materialSection}>
          <Card 
            style={styles.materialCard} 
            onPress={() => setShowModal(true)}
          >
            <Card.Content style={styles.cardContent}>
              {selectedMaterial ? (
                <View style={styles.materialInfo}>
                  <View style={styles.materialHeader}>
                    <Text style={styles.unNumber}>UN{selectedMaterial.un_number}</Text>
                    <HazardIcon hazardClass={selectedMaterial.hazard_class} size={24} />
                  </View>
                  <Text style={styles.materialName} numberOfLines={2}>
                    {selectedMaterial.proper_shipping_name}
                  </Text>
                  <View style={styles.hazardChips}>
                    <Chip mode="outlined" compact>
                      Class {selectedMaterial.hazard_class}
                    </Chip>
                    {selectedMaterial.packing_group && (
                      <Chip mode="outlined" compact>
                        PG {selectedMaterial.packing_group}
                      </Chip>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyMaterial}>
                  <MaterialCommunityIcons 
                    name="flask-outline" 
                    size={48} 
                    color="#8E8E93" 
                  />
                  <Text style={styles.emptyText}>Select Material for pH Analysis</Text>
                  <Text style={styles.emptySubtext}>
                    Tap to search dangerous goods
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>

        {isAnalyzing && (
          <Card style={styles.loadingCard}>
            <Card.Content>
              <View style={styles.loadingContent}>
                <Text style={styles.loadingText}>Analyzing pH Level...</Text>
                <ProgressBar indeterminate style={styles.progressBar} />
              </View>
            </Card.Content>
          </Card>
        )}

        {phAnalysis && (
          <View style={styles.analysisSection}>
            <Card style={styles.resultCard}>
              <Card.Content>
                <View style={styles.resultHeader}>
                  <MaterialCommunityIcons
                    name={getPhIcon(phAnalysis.ph_value)}
                    size={32}
                    color={getPhColor(phAnalysis.ph_value)}
                  />
                  <View style={styles.resultTitleSection}>
                    <Text style={[
                      styles.resultTitle,
                      { color: getPhColor(phAnalysis.ph_value) }
                    ]}>
                      {getPhCategory(phAnalysis.ph_value)}
                    </Text>
                    <Text style={styles.phValueLarge}>
                      pH {phAnalysis.ph_value.toFixed(1)}
                    </Text>
                  </View>
                </View>

                <PhScale phValue={phAnalysis.ph_value} />

                <Text style={styles.analysisDescription}>
                  {phAnalysis.description}
                </Text>
              </Card.Content>
            </Card>

            {phAnalysis.segregation_requirements.length > 0 && (
              <Card style={styles.segregationCard}>
                <Card.Content>
                  <Text style={styles.segregationTitle}>Segregation Requirements</Text>
                  {phAnalysis.segregation_requirements.map((req, index) => (
                    <View key={index} style={styles.segregationItem}>
                      <MaterialCommunityIcons 
                        name="alert-circle-outline" 
                        size={20} 
                        color="#FF9500" 
                      />
                      <Text style={styles.segregationText}>{req}</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}

            {phAnalysis.safety_recommendations.length > 0 && (
              <Card style={styles.safetyCard}>
                <Card.Content>
                  <Text style={styles.safetyTitle}>Safety Recommendations</Text>
                  {phAnalysis.safety_recommendations.map((rec, index) => (
                    <View key={index} style={styles.safetyItem}>
                      <MaterialCommunityIcons 
                        name="shield-check-outline" 
                        size={20} 
                        color="#34C759" 
                      />
                      <Text style={styles.safetyText}>{rec}</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Material</Text>
              <IconButton
                icon="close"
                onPress={() => setShowModal(false)}
              />
            </View>
            
            <Searchbar
              placeholder="Search dangerous goods..."
              value={searchQuery}
              onChangeText={(query) => {
                setSearchQuery(query);
                searchMaterials(query);
              }}
              style={styles.searchBar}
            />

            <ScrollView style={styles.searchResults}>
              {searchResults.map((material) => (
                <List.Item
                  key={material.id}
                  title={`UN${material.un_number} - ${material.proper_shipping_name}`}
                  description={`Class ${material.hazard_class}${material.packing_group ? ` | PG ${material.packing_group}` : ''}`}
                  left={() => <HazardIcon hazardClass={material.hazard_class} size={40} />}
                  onPress={() => selectMaterial(material)}
                  style={styles.searchResultItem}
                />
              ))}
            </ScrollView>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  materialSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  cardContent: {
    paddingVertical: 20,
  },
  materialInfo: {
    alignItems: 'center',
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  unNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  materialName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  hazardChips: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyMaterial: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
  },
  analysisSection: {
    paddingHorizontal: 20,
  },
  resultCard: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  resultTitleSection: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  phValueLarge: {
    fontSize: 24,
    fontWeight: '600',
    color: '#8E8E93',
  },
  phScaleContainer: {
    marginBottom: 20,
  },
  phScaleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  phScale: {
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    position: 'relative',
    marginBottom: 8,
  },
  phGradient: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'linear-gradient(90deg, #FF3B30 0%, #34C759 50%, #007AFF 100%)',
  },
  phIndicator: {
    position: 'absolute',
    top: -8,
    alignItems: 'center',
    transform: [{ translateX: -12 }],
  },
  phMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  phValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    elevation: 2,
  },
  phLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  phCategories: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phCategoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  analysisDescription: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
  },
  segregationCard: {
    marginBottom: 16,
    backgroundColor: '#FFF9E6',
    elevation: 2,
  },
  segregationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    marginBottom: 12,
  },
  segregationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  segregationText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  safetyCard: {
    marginBottom: 16,
    backgroundColor: '#F0FFF4',
    elevation: 2,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 12,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  safetyText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  modalContainer: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  searchBar: {
    margin: 16,
    elevation: 0,
    backgroundColor: '#F2F2F7',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchResultItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
});

export default AlkalineOrAcidScreen;
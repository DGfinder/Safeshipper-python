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
  Chip,
  IconButton,
  DataTable,
  Surface
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { DangerousGood, CompatibilityResult } from '../../types/DangerousGoods';
import { ApiService } from '../../services/ApiService';
import { HazardIcon } from '../../components/HazardIcon';

const CompareCompatibilityScreen: React.FC = () => {
  const [selectedMaterials, setSelectedMaterials] = useState<DangerousGood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DangerousGood[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [compatibilityMatrix, setCompatibilityMatrix] = useState<{[key: string]: {[key: string]: CompatibilityResult}}>({});
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

  const addMaterial = (material: DangerousGood) => {
    if (selectedMaterials.find(m => m.id === material.id)) {
      Alert.alert('Already Added', 'This material is already in your comparison list');
      return;
    }

    if (selectedMaterials.length >= 6) {
      Alert.alert('Maximum Reached', 'You can compare up to 6 materials at a time');
      return;
    }

    setSelectedMaterials([...selectedMaterials, material]);
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMaterial = (materialId: string) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.id !== materialId));
    // Clear matrix when materials change
    setCompatibilityMatrix({});
  };

  const analyzeCompatibility = async () => {
    if (selectedMaterials.length < 2) {
      Alert.alert('Error', 'Please select at least 2 materials to compare');
      return;
    }

    setIsAnalyzing(true);
    const newMatrix: {[key: string]: {[key: string]: CompatibilityResult}} = {};

    try {
      // Generate all pairs and check compatibility
      for (let i = 0; i < selectedMaterials.length; i++) {
        for (let j = i + 1; j < selectedMaterials.length; j++) {
          const material1 = selectedMaterials[i];
          const material2 = selectedMaterials[j];
          
          const response = await ApiService.checkCompatibility(material1.id, material2.id);
          
          if (response.success && response.data) {
            if (!newMatrix[material1.id]) newMatrix[material1.id] = {};
            if (!newMatrix[material2.id]) newMatrix[material2.id] = {};
            
            newMatrix[material1.id][material2.id] = response.data;
            newMatrix[material2.id][material1.id] = response.data;
          }
        }
      }
      
      setCompatibilityMatrix(newMatrix);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze compatibility');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCompatibilityColor = (level: string) => {
    switch (level) {
      case 'compatible': return '#34C759';
      case 'caution': return '#FF9500';
      case 'incompatible': return '#FF3B30';
      default: return '#F2F2F7';
    }
  };

  const getCompatibilitySymbol = (level: string) => {
    switch (level) {
      case 'compatible': return '✓';
      case 'caution': return '!';
      case 'incompatible': return '✗';
      default: return '-';
    }
  };

  const clearAll = () => {
    setSelectedMaterials([]);
    setCompatibilityMatrix({});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="matrix" size={48} color="#007AFF" />
          <Text style={styles.title}>Compare Compatibility</Text>
          <Text style={styles.subtitle}>
            Analyze multiple dangerous goods in a compatibility matrix
          </Text>
        </View>

        <View style={styles.materialsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Selected Materials ({selectedMaterials.length}/6)</Text>
            <Button
              mode="contained"
              onPress={() => setShowModal(true)}
              style={styles.addButton}
              compact
            >
              Add Material
            </Button>
          </View>

          {selectedMaterials.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons 
                  name="plus-circle-outline" 
                  size={48} 
                  color="#8E8E93" 
                />
                <Text style={styles.emptyText}>No materials selected</Text>
                <Text style={styles.emptySubtext}>
                  Tap "Add Material" to start building your comparison matrix
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.materialsList}>
              {selectedMaterials.map((material, index) => (
                <Card key={material.id} style={styles.materialCard}>
                  <Card.Content style={styles.materialContent}>
                    <View style={styles.materialInfo}>
                      <View style={styles.materialHeader}>
                        <Text style={styles.materialIndex}>{index + 1}</Text>
                        <HazardIcon hazardClass={material.hazard_class} size={20} />
                        <Text style={styles.unNumber}>UN{material.un_number}</Text>
                      </View>
                      <Text style={styles.materialName} numberOfLines={2}>
                        {material.proper_shipping_name}
                      </Text>
                      <View style={styles.materialChips}>
                        <Chip mode="outlined" compact textStyle={styles.chipText}>
                          Class {material.hazard_class}
                        </Chip>
                        {material.packing_group && (
                          <Chip mode="outlined" compact textStyle={styles.chipText}>
                            PG {material.packing_group}
                          </Chip>
                        )}
                      </View>
                    </View>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => removeMaterial(material.id)}
                      style={styles.removeButton}
                    />
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
        </View>

        {selectedMaterials.length >= 2 && (
          <View style={styles.actionsSection}>
            <Button
              mode="contained"
              onPress={analyzeCompatibility}
              loading={isAnalyzing}
              disabled={isAnalyzing}
              style={styles.analyzeButton}
              contentStyle={styles.buttonContent}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Compatibility Matrix'}
            </Button>

            <Button
              mode="outlined"
              onPress={clearAll}
              style={styles.clearButton}
            >
              Clear All
            </Button>
          </View>
        )}

        {Object.keys(compatibilityMatrix).length > 0 && (
          <View style={styles.matrixSection}>
            <Text style={styles.matrixTitle}>Compatibility Matrix</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.matrixContainer}>
                <DataTable style={styles.dataTable}>
                  <DataTable.Header>
                    <DataTable.Title style={styles.headerCell}></DataTable.Title>
                    {selectedMaterials.map((material, index) => (
                      <DataTable.Title key={material.id} style={styles.headerCell}>
                        <Text style={styles.headerText}>{index + 1}</Text>
                      </DataTable.Title>
                    ))}
                  </DataTable.Header>

                  {selectedMaterials.map((material1, index1) => (
                    <DataTable.Row key={material1.id}>
                      <DataTable.Cell style={styles.headerCell}>
                        <Text style={styles.headerText}>{index1 + 1}</Text>
                      </DataTable.Cell>
                      {selectedMaterials.map((material2, index2) => (
                        <DataTable.Cell key={material2.id} style={styles.matrixCell}>
                          {index1 === index2 ? (
                            <Surface style={[styles.compatibilityIndicator, { backgroundColor: '#F2F2F7' }]}>
                              <Text style={styles.compatibilityText}>-</Text>
                            </Surface>
                          ) : (
                            <Surface style={[
                              styles.compatibilityIndicator,
                              { 
                                backgroundColor: getCompatibilityColor(
                                  compatibilityMatrix[material1.id]?.[material2.id]?.compatibility_level || 'unknown'
                                )
                              }
                            ]}>
                              <Text style={[
                                styles.compatibilityText,
                                { color: compatibilityMatrix[material1.id]?.[material2.id]?.compatibility_level === 'compatible' ? '#FFFFFF' : '#000000' }
                              ]}>
                                {getCompatibilitySymbol(
                                  compatibilityMatrix[material1.id]?.[material2.id]?.compatibility_level || 'unknown'
                                )}
                              </Text>
                            </Surface>
                          )}
                        </DataTable.Cell>
                      ))}
                    </DataTable.Row>
                  ))}
                </DataTable>
              </View>
            </ScrollView>

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Legend:</Text>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <Surface style={[styles.legendIndicator, { backgroundColor: '#34C759' }]}>
                    <Text style={[styles.legendText, { color: '#FFFFFF' }]}>✓</Text>
                  </Surface>
                  <Text style={styles.legendLabel}>Compatible</Text>
                </View>
                <View style={styles.legendItem}>
                  <Surface style={[styles.legendIndicator, { backgroundColor: '#FF9500' }]}>
                    <Text style={styles.legendText}>!</Text>
                  </Surface>
                  <Text style={styles.legendLabel}>Caution</Text>
                </View>
                <View style={styles.legendItem}>
                  <Surface style={[styles.legendIndicator, { backgroundColor: '#FF3B30' }]}>
                    <Text style={styles.legendText}>✗</Text>
                  </Surface>
                  <Text style={styles.legendLabel}>Incompatible</Text>
                </View>
              </View>
            </View>
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
              <Text style={styles.modalTitle}>Add Material</Text>
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
                  onPress={() => addMaterial(material)}
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
  materialsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  addButton: {
    borderRadius: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
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
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  materialsList: {
    gap: 12,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  materialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  materialInfo: {
    flex: 1,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  materialIndex: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  unNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  materialName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
    lineHeight: 18,
  },
  materialChips: {
    flexDirection: 'row',
    gap: 6,
  },
  chipText: {
    fontSize: 11,
  },
  removeButton: {
    margin: 0,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  analyzeButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  clearButton: {
    borderRadius: 12,
  },
  matrixSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  matrixTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  matrixContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  dataTable: {
    backgroundColor: 'transparent',
  },
  headerCell: {
    justifyContent: 'center',
    minWidth: 50,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
  },
  matrixCell: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  compatibilityIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  compatibilityText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  legend: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    alignItems: 'center',
    gap: 8,
  },
  legendIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  legendText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  legendLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
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

export default CompareCompatibilityScreen;
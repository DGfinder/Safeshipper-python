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
  Surface,
  IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { DangerousGood, CompatibilityResult } from '../../types/DangerousGoods';
import { ApiService } from '../../services/ApiService';
import { HazardIcon } from '../../components/HazardIcon';

const CheckCompatibilityScreen: React.FC = () => {
  const [material1, setMaterial1] = useState<DangerousGood | null>(null);
  const [material2, setMaterial2] = useState<DangerousGood | null>(null);
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [searchResults1, setSearchResults1] = useState<DangerousGood[]>([]);
  const [searchResults2, setSearchResults2] = useState<DangerousGood[]>([]);
  const [showModal1, setShowModal1] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const searchMaterials = async (query: string, setResults: (results: DangerousGood[]) => void) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    try {
      const response = await ApiService.searchDangerousGoods(query);
      if (response.success) {
        setResults(response.data?.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const selectMaterial = (material: DangerousGood, slot: 1 | 2) => {
    if (slot === 1) {
      setMaterial1(material);
      setShowModal1(false);
      setSearchQuery1('');
      setSearchResults1([]);
    } else {
      setMaterial2(material);
      setShowModal2(false);
      setSearchQuery2('');
      setSearchResults2([]);
    }
  };

  const checkCompatibility = async () => {
    if (!material1 || !material2) {
      Alert.alert('Error', 'Please select both materials to check compatibility');
      return;
    }

    setIsChecking(true);
    try {
      const response = await ApiService.checkCompatibility(material1.id, material2.id);
      if (response.success && response.data) {
        setCompatibilityResult(response.data);
      } else {
        Alert.alert('Error', 'Failed to check compatibility');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check compatibility');
    } finally {
      setIsChecking(false);
    }
  };

  const getCompatibilityColor = (level: string) => {
    switch (level) {
      case 'compatible': return '#34C759';
      case 'caution': return '#FF9500';
      case 'incompatible': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getCompatibilityIcon = (level: string) => {
    switch (level) {
      case 'compatible': return 'check-circle';
      case 'caution': return 'alert-circle';
      case 'incompatible': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const clearAll = () => {
    setMaterial1(null);
    setMaterial2(null);
    setCompatibilityResult(null);
  };

  const MaterialCard = ({ material, onPress, slot }: { 
    material: DangerousGood | null; 
    onPress: () => void; 
    slot: number;
  }) => (
    <Card style={styles.materialCard} onPress={onPress}>
      <Card.Content style={styles.cardContent}>
        {material ? (
          <View style={styles.materialInfo}>
            <View style={styles.materialHeader}>
              <Text style={styles.unNumber}>UN{material.un_number}</Text>
              <HazardIcon hazardClass={material.hazard_class} size={24} />
            </View>
            <Text style={styles.materialName} numberOfLines={2}>
              {material.proper_shipping_name}
            </Text>
            <View style={styles.hazardChips}>
              <Chip mode="outlined" compact>
                Class {material.hazard_class}
              </Chip>
              {material.packing_group && (
                <Chip mode="outlined" compact>
                  PG {material.packing_group}
                </Chip>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyMaterial}>
            <MaterialCommunityIcons 
              name="plus-circle-outline" 
              size={48} 
              color="#8E8E93" 
            />
            <Text style={styles.emptyText}>Select Material {slot}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Check Compatibility</Text>
          <Text style={styles.subtitle}>
            Select two dangerous goods to check their compatibility
          </Text>
        </View>

        <View style={styles.materialsSection}>
          <MaterialCard 
            material={material1} 
            onPress={() => setShowModal1(true)} 
            slot={1}
          />
          
          <View style={styles.vsContainer}>
            <Surface style={styles.vsCircle}>
              <Text style={styles.vsText}>VS</Text>
            </Surface>
          </View>
          
          <MaterialCard 
            material={material2} 
            onPress={() => setShowModal2(true)} 
            slot={2}
          />
        </View>

        <View style={styles.actionsSection}>
          <Button
            mode="contained"
            onPress={checkCompatibility}
            disabled={!material1 || !material2 || isChecking}
            loading={isChecking}
            style={styles.checkButton}
            contentStyle={styles.buttonContent}
          >
            Check Compatibility
          </Button>

          {(material1 || material2) && (
            <Button
              mode="outlined"
              onPress={clearAll}
              style={styles.clearButton}
            >
              Clear All
            </Button>
          )}
        </View>

        {compatibilityResult && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons
                  name={getCompatibilityIcon(compatibilityResult.compatibility_level)}
                  size={32}
                  color={getCompatibilityColor(compatibilityResult.compatibility_level)}
                />
                <Text style={[
                  styles.resultTitle,
                  { color: getCompatibilityColor(compatibilityResult.compatibility_level) }
                ]}>
                  {compatibilityResult.compatibility_level.toUpperCase()}
                </Text>
              </View>
              
              <Text style={styles.resultDescription}>
                {compatibilityResult.description}
              </Text>

              {compatibilityResult.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                  {compatibilityResult.recommendations.map((rec, index) => (
                    <Text key={index} style={styles.recommendationItem}>
                      • {rec}
                    </Text>
                  ))}
                </View>
              )}

              {compatibilityResult.segregation_distance && (
                <View style={styles.segregationSection}>
                  <Text style={styles.segregationTitle}>
                    Required Segregation Distance:
                  </Text>
                  <Text style={styles.segregationDistance}>
                    {compatibilityResult.segregation_distance}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Material 1 Search Modal */}
      <Portal>
        <Modal
          visible={showModal1}
          onDismiss={() => setShowModal1(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select First Material</Text>
              <IconButton
                icon="close"
                onPress={() => setShowModal1(false)}
              />
            </View>
            
            <Searchbar
              placeholder="Search dangerous goods..."
              value={searchQuery1}
              onChangeText={(query) => {
                setSearchQuery1(query);
                searchMaterials(query, setSearchResults1);
              }}
              style={styles.searchBar}
            />

            <ScrollView style={styles.searchResults}>
              {searchResults1.map((material) => (
                <List.Item
                  key={material.id}
                  title={`UN${material.un_number} - ${material.proper_shipping_name}`}
                  description={`Class ${material.hazard_class}${material.packing_group ? ` | PG ${material.packing_group}` : ''}`}
                  left={() => <HazardIcon hazardClass={material.hazard_class} size={40} />}
                  onPress={() => selectMaterial(material, 1)}
                  style={styles.searchResultItem}
                />
              ))}
            </ScrollView>
          </View>
        </Modal>
      </Portal>

      {/* Material 2 Search Modal */}
      <Portal>
        <Modal
          visible={showModal2}
          onDismiss={() => setShowModal2(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Second Material</Text>
              <IconButton
                icon="close"
                onPress={() => setShowModal2(false)}
              />
            </View>
            
            <Searchbar
              placeholder="Search dangerous goods..."
              value={searchQuery2}
              onChangeText={(query) => {
                setSearchQuery2(query);
                searchMaterials(query, setSearchResults2);
              }}
              style={styles.searchBar}
            />

            <ScrollView style={styles.searchResults}>
              {searchResults2.map((material) => (
                <List.Item
                  key={material.id}
                  title={`UN${material.un_number} - ${material.proper_shipping_name}`}
                  description={`Class ${material.hazard_class}${material.packing_group ? ` | PG ${material.packing_group}` : ''}`}
                  left={() => <HazardIcon hazardClass={material.hazard_class} size={40} />}
                  onPress={() => selectMaterial(material, 2)}
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
  materialCard: {
    marginBottom: 16,
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
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  vsCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  checkButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  clearButton: {
    borderRadius: 12,
  },
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  resultDescription: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 16,
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 4,
  },
  segregationSection: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
  },
  segregationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  segregationDistance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
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

export default CheckCompatibilityScreen;
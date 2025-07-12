/**
 * SDS Screen - Safety Data Sheets search and display
 * Matches the design from the mobile app screenshots
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from 'react-native-voice';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DangerousGood, SearchResult } from '../../types/DangerousGoods';
import { apiService } from '../../services/ApiService';
import { SDSStackParamList } from '../../navigation/AppNavigator';
import HazardIcon from '../../components/HazardIcon';
import SearchEmptyState from '../../components/SearchEmptyState';

type NavigationProp = NativeStackNavigationProp<SDSStackParamList, 'SDSMain'>;

const { width } = Dimensions.get('window');

interface SDSScreenState {
  searchQuery: string;
  searchResults: DangerousGood[];
  recentSearches: DangerousGood[];
  isSearching: boolean;
  isListening: boolean;
  hasSearched: boolean;
  totalCount: number;
  page: number;
  hasMore: boolean;
}

const SDSScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
  const [state, setState] = useState<SDSScreenState>({
    searchQuery: '',
    searchResults: [],
    recentSearches: [],
    isSearching: false,
    isListening: false,
    hasSearched: false,
    totalCount: 0,
    page: 1,
    hasMore: false,
  });

  useEffect(() => {
    loadRecentSearches();
    setupVoiceRecognition();
    
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const loadRecentSearches = async () => {
    try {
      const response = await apiService.getRecentSearches();
      if (response.success && response.data) {
        setState(prev => ({ ...prev, recentSearches: response.data! }));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const setupVoiceRecognition = () => {
    Voice.onSpeechStart = () => setState(prev => ({ ...prev, isListening: true }));
    Voice.onSpeechEnd = () => setState(prev => ({ ...prev, isListening: false }));
    Voice.onSpeechResults = (result) => {
      const transcript = result.value?.[0] || '';
      setState(prev => ({ ...prev, searchQuery: transcript, isListening: false }));
      if (transcript.trim()) {
        performSearch(transcript);
      }
    };
    Voice.onSpeechError = (error) => {
      setState(prev => ({ ...prev, isListening: false }));
      Alert.alert('Voice Recognition Error', 'Please try again or type your search.');
    };
  };

  const performSearch = useCallback(async (query: string, page: number = 1, append: boolean = false) => {
    if (!query.trim()) return;

    setState(prev => ({ 
      ...prev, 
      isSearching: true,
      ...(page === 1 ? { searchResults: [] } : {})
    }));

    try {
      const response = await apiService.searchDangerousGoods(query, undefined, page, 20);
      
      if (response.success && response.data) {
        const { items, totalCount, hasMore } = response.data;
        
        setState(prev => ({
          ...prev,
          searchResults: append ? [...prev.searchResults, ...items] : items,
          totalCount,
          hasMore,
          page,
          hasSearched: true,
          isSearching: false,
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isSearching: false,
          hasSearched: true,
          searchResults: []
        }));
        
        if (!response.fromCache) {
          Alert.alert('Search Error', response.error || 'Failed to search materials');
        }
      }
    } catch (error) {
      setState(prev => ({ ...prev, isSearching: false, hasSearched: true }));
      Alert.alert('Error', 'Failed to perform search. Please try again.');
    }
  }, []);

  const handleSearch = (text: string) => {
    setState(prev => ({ ...prev, searchQuery: text }));
    
    if (text.trim().length >= 2) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        performSearch(text);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const startVoiceRecognition = async () => {
    try {
      await Voice.start('en-US');
    } catch (error) {
      Alert.alert('Voice Recognition', 'Voice recognition is not available on this device.');
    }
  };

  const loadMoreResults = () => {
    if (state.hasMore && !state.isSearching && state.searchQuery.trim()) {
      performSearch(state.searchQuery, state.page + 1, true);
    }
  };

  const handleMaterialPress = async (material: DangerousGood) => {
    // Add to recent searches
    await apiService.addToRecentSearches(material);
    
    // Navigate to material detail
    navigation.navigate('MaterialDetail', {
      materialId: material.id,
      materialName: material.properShippingName,
    });
  };

  const renderMaterialItem = ({ item }: { item: DangerousGood }) => (
    <TouchableOpacity
      style={styles.materialItem}
      onPress={() => handleMaterialPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.materialContent}>
        <View style={styles.materialInfo}>
          <Text style={styles.materialName} numberOfLines={2}>
            {item.properShippingName}
          </Text>
          <Text style={styles.hazardClass}>Class: {item.hazardClass}</Text>
          
          <View style={styles.materialDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>UN Name:</Text>
              <Text style={styles.detailValue}>{item.unNumber}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Material Number:</Text>
              <Text style={styles.detailValue}>{item.unNumber}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.hazardIconContainer}>
          <HazardIcon 
            hazardClass={item.hazardClass}
            size={60}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (state.isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (!state.hasSearched) {
      return (
        <SearchEmptyState
          title="Start typing"
          subtitle="Start typing and we will select a list of SDS of your request"
          onSuggestedSearch={(query) => handleSearch(query)}
        />
      );
    }

    if (state.searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search-off" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search terms or check spelling
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#8E8E93"
            value={state.searchQuery}
            onChangeText={handleSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            style={[
              styles.voiceButton,
              state.isListening && styles.voiceButtonActive
            ]}
            onPress={startVoiceRecognition}
            disabled={state.isListening}
          >
            <Icon 
              name={state.isListening ? "mic" : "mic-none"} 
              size={20} 
              color={state.isListening ? "#007AFF" : "#8E8E93"} 
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="tune" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.cameraButton}>
        <Icon name="camera-alt" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={state.searchResults}
        renderItem={renderMaterialItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreResults}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          state.isSearching && state.searchResults.length > 0 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 0,
  },
  voiceButton: {
    padding: 4,
    marginLeft: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
  },
  filterButton: {
    width: 36,
    height: 36,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    marginLeft: 12,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  materialItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  materialContent: {
    flexDirection: 'row',
    padding: 16,
  },
  materialInfo: {
    flex: 1,
    marginRight: 12,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  hazardClass: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  materialDetails: {
    flexDirection: 'row',
  },
  detailItem: {
    flex: 1,
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hazardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default SDSScreen;
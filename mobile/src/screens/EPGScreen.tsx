/**
 * EPG Screen
 * Displays emergency procedure guides with search and filter functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EPGStackParamList } from '../navigation/AppNavigator';

import { apiService } from '../services/apiService';
import { EmergencyProcedureGuide, EPGSearchFilters } from '../types/EPG';
import EPGCard from '../components/EPGCard';
import EPGSearchFilter from '../components/EPGSearchFilter';

type EPGScreenNavigationProp = NativeStackNavigationProp<EPGStackParamList, 'EPGMain'>;

const EPGScreen: React.FC = () => {
  const navigation = useNavigation<EPGScreenNavigationProp>();
  const [epgs, setEpgs] = useState<EmergencyProcedureGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EPGSearchFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEPGs = useCallback(async (
    page: number = 1, 
    query: string = '', 
    searchFilters: EPGSearchFilters = {},
    isRefresh: boolean = false
  ) => {
    try {
      if (page === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      let response;
      if (query.trim()) {
        // Use search endpoint for queries
        response = await apiService.searchEmergencyProcedureGuides(query, searchFilters);
      } else {
        // Use regular list endpoint with filters
        response = await apiService.getEmergencyProcedureGuides(searchFilters, page, 20);
      }

      if (response.success && response.data) {
        const newEpgs = response.data.results || [];
        
        if (page === 1 || isRefresh) {
          setEpgs(newEpgs);
        } else {
          setEpgs(prev => [...prev, ...newEpgs]);
        }
        
        setHasNextPage(!!response.data.next);
        setCurrentPage(page);
      } else {
        // Try to load from offline data if API fails
        if (page === 1 && !query.trim() && Object.keys(searchFilters).length === 0) {
          const offlineResponse = await apiService.getOfflineData();
          if (offlineResponse.success && offlineResponse.data?.emergencyProcedureGuides) {
            setEpgs(offlineResponse.data.emergencyProcedureGuides);
            setHasNextPage(false);
            setCurrentPage(1);
            return;
          }
        }
        throw new Error(response.error || 'Failed to load EPGs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load EPGs';
      setError(errorMessage);
      if (page === 1) {
        const alertMessage = errorMessage + '\n\nTry checking your internet connection.';
        Alert.alert('Error', alertMessage);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEPGs(1, searchQuery, filters);
  }, []);

  const handleSearch = useCallback((query: string, searchFilters: EPGSearchFilters) => {
    setSearchQuery(query);
    setFilters(searchFilters);
    setCurrentPage(1);
    loadEPGs(1, query, searchFilters);
  }, [loadEPGs]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    setCurrentPage(1);
    loadEPGs(1, '', {});
  }, [loadEPGs]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEPGs(1, searchQuery, filters, true);
  }, [loadEPGs, searchQuery, filters]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      loadEPGs(currentPage + 1, searchQuery, filters);
    }
  }, [loadEPGs, loadingMore, hasNextPage, currentPage, searchQuery, filters]);

  const handleEPGPress = useCallback((epg: EmergencyProcedureGuide) => {
    // Navigate to EPG detail screen
    navigation.navigate('EPGDetail', { epgId: epg.id });
  }, [navigation]);

  const renderEPGCard = useCallback(({ item }: { item: EmergencyProcedureGuide }) => (
    <EPGCard epg={item} onPress={handleEPGPress} />
  ), [handleEPGPress]);

  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>
          {searchQuery || Object.keys(filters).length > 0 
            ? 'No EPGs Found' 
            : 'No Emergency Procedure Guides Available'
          }
        </Text>
        <Text style={styles.emptyStateSubtitle}>
          {searchQuery || Object.keys(filters).length > 0
            ? 'Try adjusting your search or filters'
            : 'Emergency procedure guides will appear here when available'
          }
        </Text>
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color="#3B82F6" />
        <Text style={styles.loadingFooterText}>Loading more EPGs...</Text>
      </View>
    );
  };

  if (loading && epgs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EPGSearchFilter
          onSearch={handleSearch}
          onClearFilters={handleClearFilters}
          loading={loading}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading Emergency Procedure Guides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={epgs}
        renderItem={renderEPGCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <EPGSearchFilter
            onSearch={handleSearch}
            onClearFilters={handleClearFilters}
            loading={loading}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderLoadingFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={epgs.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingFooterText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default EPGScreen;
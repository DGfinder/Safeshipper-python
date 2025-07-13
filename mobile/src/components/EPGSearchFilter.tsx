/**
 * EPG Search and Filter Component
 * Provides search and filter functionality for Emergency Procedure Guides
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { EPGSearchFilters } from '../types/EPG';

interface EPGSearchFilterProps {
  onSearch: (query: string, filters: EPGSearchFilters) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

const hazardClasses = [
  { value: '1', label: 'Class 1 - Explosives' },
  { value: '2', label: 'Class 2 - Gases' },
  { value: '3', label: 'Class 3 - Flammable Liquids' },
  { value: '4', label: 'Class 4 - Flammable Solids' },
  { value: '5', label: 'Class 5 - Oxidizing Substances' },
  { value: '6', label: 'Class 6 - Toxic Substances' },
  { value: '7', label: 'Class 7 - Radioactive Materials' },
  { value: '8', label: 'Class 8 - Corrosive Substances' },
  { value: '9', label: 'Class 9 - Miscellaneous' },
];

const severityLevels = [
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' },
  { value: 'CRITICAL', label: 'Critical Risk' },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const emergencyTypes = [
  { value: 'FIRE', label: 'Fire' },
  { value: 'SPILL', label: 'Spill' },
  { value: 'EXPOSURE', label: 'Exposure' },
  { value: 'TRANSPORT_ACCIDENT', label: 'Transport Accident' },
  { value: 'CONTAINER_DAMAGE', label: 'Container Damage' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'MULTI_HAZARD', label: 'Multi Hazard' },
];

const EPGSearchFilter: React.FC<EPGSearchFilterProps> = ({
  onSearch,
  onClearFilters,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EPGSearchFilters>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (searchQuery.trim()) {
      setSearchLoading(true);
      debounceRef.current = setTimeout(() => {
        onSearch(searchQuery, filters);
        setSearchLoading(false);
      }, 500);
    } else if (searchQuery === '') {
      // Clear search immediately when input is empty
      onSearch('', filters);
      setSearchLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, filters, onSearch]);

  const handleSearch = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchLoading(true);
    onSearch(searchQuery, filters);
    setSearchLoading(false);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({});
    onClearFilters();
  };

  const updateFilter = (key: keyof EPGSearchFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== undefined && value !== '').length;
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search EPGs by title, UN number, or hazard class..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.searchButton, (loading || searchLoading) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading || searchLoading}
        >
          {(loading || searchLoading) ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.searchButtonText}>🔍</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, getActiveFiltersCount() > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Text style={[styles.filterButtonText, getActiveFiltersCount() > 0 && styles.filterButtonTextActive]}>
            🔧 Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
          </Text>
        </TouchableOpacity>

        {getActiveFiltersCount() > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter EPGs</Text>
            <TouchableOpacity onPress={() => {
              setShowFilters(false);
              handleSearch();
            }}>
              <Text style={styles.modalApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Hazard Class Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Hazard Class</Text>
              {hazardClasses.map((hazardClass) => (
                <TouchableOpacity
                  key={hazardClass.value}
                  style={[
                    styles.filterOption,
                    filters.hazard_class === hazardClass.value && styles.filterOptionSelected
                  ]}
                  onPress={() => updateFilter('hazard_class', 
                    filters.hazard_class === hazardClass.value ? undefined : hazardClass.value
                  )}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.hazard_class === hazardClass.value && styles.filterOptionTextSelected
                  ]}>
                    {hazardClass.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Severity Level Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Severity Level</Text>
              {severityLevels.map((severity) => (
                <TouchableOpacity
                  key={severity.value}
                  style={[
                    styles.filterOption,
                    filters.severity_level === severity.value && styles.filterOptionSelected
                  ]}
                  onPress={() => updateFilter('severity_level', 
                    filters.severity_level === severity.value ? undefined : severity.value
                  )}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.severity_level === severity.value && styles.filterOptionTextSelected
                  ]}>
                    {severity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.filterOption,
                    filters.status === status.value && styles.filterOptionSelected
                  ]}
                  onPress={() => updateFilter('status', 
                    filters.status === status.value ? undefined : status.value
                  )}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.status === status.value && styles.filterOptionTextSelected
                  ]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Emergency Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Emergency Type</Text>
              {emergencyTypes.map((emergencyType) => (
                <TouchableOpacity
                  key={emergencyType.value}
                  style={[
                    styles.filterOption,
                    filters.emergency_type === emergencyType.value && styles.filterOptionSelected
                  ]}
                  onPress={() => updateFilter('emergency_type', 
                    filters.emergency_type === emergencyType.value ? undefined : emergencyType.value
                  )}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.emergency_type === emergencyType.value && styles.filterOptionTextSelected
                  ]}>
                    {emergencyType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Due for Review Filter */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filters.due_for_review && styles.filterOptionSelected
                ]}
                onPress={() => updateFilter('due_for_review', !filters.due_for_review)}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.due_for_review && styles.filterOptionTextSelected
                ]}>
                  Only show EPGs due for review
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  searchButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  filterButtonActive: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#3B82F6',
  },
  clearButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#EF4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalApplyText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginTop: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default EPGSearchFilter;
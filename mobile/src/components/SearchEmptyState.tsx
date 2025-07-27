/**
 * SearchEmptyState Component
 * Displays empty state with suggestions when no search has been performed
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SearchEmptyStateProps {
  title: string;
  subtitle: string;
  onSuggestedSearch?: (query: string) => void;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'Ammonium nitrate',
  'Paint',
  'Batteries',
  'Gasoline',
  'Acetone',
  'Hydrogen peroxide',
];

const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  title,
  subtitle,
  onSuggestedSearch,
  suggestions = DEFAULT_SUGGESTIONS,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name="description" size={64} color="#C7C7CC" />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      
      {onSuggestedSearch && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Popular searches:</Text>
          <View style={styles.suggestionsList}>
            {suggestions.slice(0, 6).map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => onSuggestedSearch(suggestion)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.tipContainer}>
        <Icon name="lightbulb-outline" size={20} color="#8E8E93" />
        <Text style={styles.tipText}>
          Tip: You can search by UN number, chemical name, or common name
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  suggestionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  tipText: {
    fontSize: 14,
    color: '#6C7B7F',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default SearchEmptyState;
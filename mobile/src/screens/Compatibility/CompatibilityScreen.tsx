/**
 * Compatibility Screen - Main compatibility checking hub
 * Matches the design from the mobile app screenshots
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CompatibilityStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<CompatibilityStackParamList, 'CompatibilityMain'>;

interface CompatibilityOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: keyof CompatibilityStackParamList;
}

const compatibilityOptions: CompatibilityOption[] = [
  {
    id: 'check',
    title: 'Check compatibility',
    description: 'Lorem ipsum dolor sit amet, consectetur',
    icon: 'layers',
    color: '#007AFF',
    route: 'CheckCompatibility',
  },
  {
    id: 'compare',
    title: 'Compare compatibility',
    description: 'Lorem ipsum dolor sit amet, consectetur',
    icon: 'compare',
    color: '#007AFF',
    route: 'CompareCompatibility',
  },
  {
    id: 'ph',
    title: 'Alkaline or Acid',
    description: 'Lorem ipsum dolor sit amet, consectetur',
    icon: 'science',
    color: '#007AFF',
    route: 'AlkalineOrAcid',
  },
];

const CompatibilityScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleOptionPress = (route: keyof CompatibilityStackParamList) => {
    navigation.navigate(route as any);
  };

  const renderOption = (option: CompatibilityOption) => (
    <TouchableOpacity
      key={option.id}
      style={[styles.optionCard, { backgroundColor: option.color }]}
      onPress={() => handleOptionPress(option.route)}
      activeOpacity={0.8}
    >
      <View style={styles.optionContent}>
        <View style={styles.iconContainer}>
          <Icon name={option.icon} size={32} color="#FFFFFF" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Compatibility Tools</Text>
          <Text style={styles.subtitle}>
            Choose a tool to check dangerous goods compatibility and safety requirements
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {compatibilityOptions.map(renderOption)}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Icon name="info-outline" size={24} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Safety First</Text>
              <Text style={styles.infoText}>
                Always verify compatibility results with current regulations and safety data sheets. 
                These tools provide guidance based on standard segregation tables.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Checks</Text>
          <View style={styles.recentPlaceholder}>
            <Icon name="history" size={48} color="#C7C7CC" />
            <Text style={styles.placeholderText}>No recent compatibility checks</Text>
            <Text style={styles.placeholderSubtext}>
              Your recent compatibility checks will appear here
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  recentSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  recentPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#C7C7CC',
    marginTop: 12,
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});

export default CompatibilityScreen;
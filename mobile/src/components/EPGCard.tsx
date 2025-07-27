/**
 * EPG Card Component
 * Displays emergency procedure guide information in a card format
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { EmergencyProcedureGuide } from '../types/EPG';

interface EPGCardProps {
  epg: EmergencyProcedureGuide;
  onPress: (epg: EmergencyProcedureGuide) => void;
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'LOW':
      return '#10B981';
    case 'MEDIUM':
      return '#F59E0B';
    case 'HIGH':
      return '#EF4444';
    case 'CRITICAL':
      return '#DC2626';
    default:
      return '#6B7280';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
      return '#10B981';
    case 'DRAFT':
      return '#F59E0B';
    case 'UNDER_REVIEW':
      return '#3B82F6';
    case 'ARCHIVED':
      return '#6B7280';
    default:
      return '#6B7280';
  }
};

const EPGCard: React.FC<EPGCardProps> = ({ epg, onPress }) => {
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(epg)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View 
        style={[
          styles.card,
          {
            transform: [{ scale: scaleValue }]
          }
        ]}
      >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.epgNumber}>{epg.epg_number}</Text>
          <View style={styles.badges}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(epg.status) }]}>
              <Text style={styles.badgeText}>{epg.status_display}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(epg.severity_level) }]}>
              <Text style={styles.badgeText}>{epg.severity_level_display}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {epg.title}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.hazardInfo}>
          <Text style={styles.hazardLabel}>Primary Hazard Class:</Text>
          <Text style={styles.hazardValue}>Class {epg.hazard_class}</Text>
        </View>
        
        {epg.subsidiary_risks.length > 0 && (
          <View style={styles.hazardInfo}>
            <Text style={styles.hazardLabel}>Subsidiary Risks:</Text>
            <Text style={styles.hazardValue}>
              {epg.subsidiary_risks.map(risk => `Class ${risk}`).join(', ')}
            </Text>
          </View>
        )}

        <View style={styles.emergencyTypes}>
          <Text style={styles.emergencyTypesLabel}>Emergency Types:</Text>
          <View style={styles.emergencyTypesContainer}>
            {epg.emergency_types.slice(0, 3).map((type, index) => (
              <View key={index} style={styles.emergencyTypePill}>
                <Text style={styles.emergencyTypeText}>
                  {type.replace(/_/g, ' ')}
                </Text>
              </View>
            ))}
            {epg.emergency_types.length > 3 && (
              <View style={styles.emergencyTypePill}>
                <Text style={styles.emergencyTypeText}>
                  +{epg.emergency_types.length - 3} more
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Version {epg.version} • Updated {new Date(epg.updated_at).toLocaleDateString()}
        </Text>
        {epg.is_due_for_review && (
          <Text style={styles.reviewWarning}>⚠️ Due for Review</Text>
        )}
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  epgNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 22,
  },
  content: {
    marginBottom: 12,
  },
  hazardInfo: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  hazardLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 120,
  },
  hazardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  emergencyTypes: {
    marginTop: 8,
  },
  emergencyTypesLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  emergencyTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emergencyTypePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyTypeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewWarning: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
});

export default EPGCard;
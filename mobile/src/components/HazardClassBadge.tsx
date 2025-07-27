/**
 * Hazard Class Badge Component
 * Displays hazard class information with appropriate styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HazardClassBadgeProps {
  hazardClass: string;
  subsidiaryRisks?: string[];
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const getHazardClassColor = (hazardClass: string): { background: string; text: string } => {
  const classNumber = hazardClass.split('.')[0]; // Handle cases like "2.1", "2.2", etc.
  
  switch (classNumber) {
    case '1':
      return { background: '#FF4444', text: '#FFFFFF' }; // Red - Explosives
    case '2':
      return { background: '#00AA00', text: '#FFFFFF' }; // Green - Gases
    case '3':
      return { background: '#FF0000', text: '#FFFFFF' }; // Red - Flammable Liquids
    case '4':
      return { background: '#FF8800', text: '#FFFFFF' }; // Orange - Flammable Solids
    case '5':
      return { background: '#FFAA00', text: '#000000' }; // Yellow - Oxidizing Substances
    case '6':
      return { background: '#8800FF', text: '#FFFFFF' }; // Purple - Toxic Substances
    case '7':
      return { background: '#FFFF00', text: '#000000' }; // Yellow - Radioactive
    case '8':
      return { background: '#000000', text: '#FFFFFF' }; // Black - Corrosive
    case '9':
      return { background: '#666666', text: '#FFFFFF' }; // Gray - Miscellaneous
    default:
      return { background: '#999999', text: '#FFFFFF' }; // Default gray
  }
};

const getHazardClassName = (hazardClass: string): string => {
  const classNumber = hazardClass.split('.')[0];
  
  switch (classNumber) {
    case '1': return 'Explosives';
    case '2': return 'Gases';
    case '3': return 'Flammable Liquids';
    case '4': return 'Flammable Solids';
    case '5': return 'Oxidizing Substances';
    case '6': return 'Toxic Substances';
    case '7': return 'Radioactive';
    case '8': return 'Corrosive';
    case '9': return 'Miscellaneous';
    default: return 'Unknown';
  }
};

const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
        classText: { fontSize: 10, fontWeight: '600' },
        nameText: { fontSize: 8 },
        subsidiaryContainer: { marginTop: 2, gap: 2 },
        subsidiaryBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
        subsidiaryText: { fontSize: 8, fontWeight: '500' },
      };
    case 'large':
      return {
        container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
        classText: { fontSize: 16, fontWeight: '700' },
        nameText: { fontSize: 12 },
        subsidiaryContainer: { marginTop: 6, gap: 4 },
        subsidiaryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
        subsidiaryText: { fontSize: 10, fontWeight: '600' },
      };
    default: // medium
      return {
        container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
        classText: { fontSize: 12, fontWeight: '600' },
        nameText: { fontSize: 10 },
        subsidiaryContainer: { marginTop: 4, gap: 3 },
        subsidiaryBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
        subsidiaryText: { fontSize: 9, fontWeight: '500' },
      };
  }
};

const HazardClassBadge: React.FC<HazardClassBadgeProps> = ({
  hazardClass,
  subsidiaryRisks = [],
  size = 'medium',
  style
}) => {
  const colors = getHazardClassColor(hazardClass);
  const className = getHazardClassName(hazardClass);
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={[style]}>
      {/* Primary Hazard Class */}
      <View
        style={[
          sizeStyles.container,
          {
            backgroundColor: colors.background,
            alignItems: 'center',
          }
        ]}
      >
        <Text style={[sizeStyles.classText, { color: colors.text }]}>
          Class {hazardClass}
        </Text>
        {size !== 'small' && (
          <Text style={[sizeStyles.nameText, { color: colors.text, opacity: 0.9 }]}>
            {className}
          </Text>
        )}
      </View>

      {/* Subsidiary Risks */}
      {subsidiaryRisks.length > 0 && (
        <View style={[sizeStyles.subsidiaryContainer, { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {subsidiaryRisks.map((risk, index) => {
            const riskColors = getHazardClassColor(risk);
            return (
              <View
                key={index}
                style={[
                  sizeStyles.subsidiaryBadge,
                  {
                    backgroundColor: riskColors.background,
                    opacity: 0.8,
                  }
                ]}
              >
                <Text style={[sizeStyles.subsidiaryText, { color: riskColors.text }]}>
                  {risk}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default HazardClassBadge;
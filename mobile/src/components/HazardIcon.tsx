/**
 * HazardIcon Component
 * Displays UN dangerous goods diamond symbols based on hazard class
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Polygon, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface HazardIconProps {
  hazardClass: string;
  size?: number;
  style?: any;
}

interface HazardClassConfig {
  backgroundColor: string;
  textColor: string;
  symbol?: string;
  topText?: string;
  bottomText: string;
  borderColor?: string;
}

const hazardClassConfigs: { [key: string]: HazardClassConfig } = {
  '1': {
    backgroundColor: '#FF9500',
    textColor: '#000000',
    symbol: '💥',
    topText: 'EXPLOSIVE',
    bottomText: '1',
    borderColor: '#FF7700',
  },
  '1.1': {
    backgroundColor: '#FF9500',
    textColor: '#000000',
    symbol: '💥',
    topText: 'EXPLOSIVE',
    bottomText: '1.1',
    borderColor: '#FF7700',
  },
  '1.2': {
    backgroundColor: '#FF9500',
    textColor: '#000000',
    symbol: '💥',
    topText: 'EXPLOSIVE',
    bottomText: '1.2',
    borderColor: '#FF7700',
  },
  '1.3': {
    backgroundColor: '#FF9500',
    textColor: '#000000',
    symbol: '💥',
    topText: 'EXPLOSIVE',
    bottomText: '1.3',
    borderColor: '#FF7700',
  },
  '1.4': {
    backgroundColor: '#FF9500',
    textColor: '#000000',
    symbol: '💥',
    topText: 'EXPLOSIVE',
    bottomText: '1.4',
    borderColor: '#FF7700',
  },
  '1.5': {
    backgroundColor: '#FF9500',
    textColor: '#000000',
    symbol: '💥',
    topText: 'EXPLOSIVE',
    bottomText: '1.5',
    borderColor: '#FF7700',
  },
  '1.6': {
    backgroundColor: '#FF9500',
    textColor: '#000000',
    symbol: '💥',
    topText: 'EXPLOSIVE',
    bottomText: '1.6',
    borderColor: '#FF7700',
  },
  '2.1': {
    backgroundColor: '#FF3B30',
    textColor: '#FFFFFF',
    symbol: '🔥',
    topText: 'FLAMMABLE GAS',
    bottomText: '2',
  },
  '2.2': {
    backgroundColor: '#30D158',
    textColor: '#000000',
    topText: 'NON-FLAMMABLE',
    bottomText: '2',
  },
  '2.3': {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    symbol: '☠️',
    topText: 'POISON GAS',
    bottomText: '2',
    borderColor: '#000000',
  },
  '3': {
    backgroundColor: '#FF3B30',
    textColor: '#FFFFFF',
    symbol: '🔥',
    topText: 'FLAMMABLE LIQUID',
    bottomText: '3',
  },
  '4.1': {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    symbol: '🔥',
    topText: 'FLAMMABLE SOLID',
    bottomText: '4',
    borderColor: '#FF3B30',
  },
  '4.2': {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    symbol: '🔥',
    topText: 'SPONTANEOUSLY',
    bottomText: '4',
    borderColor: '#FF3B30',
  },
  '4.3': {
    backgroundColor: '#007AFF',
    textColor: '#FFFFFF',
    symbol: '🔥',
    topText: 'DANGEROUS WHEN WET',
    bottomText: '4',
  },
  '5.1': {
    backgroundColor: '#FFCC00',
    textColor: '#000000',
    symbol: '🔥',
    topText: 'OXIDIZER',
    bottomText: '5.1',
  },
  '5.2': {
    backgroundColor: '#FFCC00',
    textColor: '#000000',
    topText: 'ORGANIC PEROXIDE',
    bottomText: '5.2',
  },
  '6.1': {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    symbol: '☠️',
    topText: 'POISON',
    bottomText: '6',
    borderColor: '#000000',
  },
  '6.2': {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    symbol: '☣️',
    topText: 'INFECTIOUS SUBSTANCE',
    bottomText: '6',
    borderColor: '#000000',
  },
  '7': {
    backgroundColor: '#FFCC00',
    textColor: '#000000',
    symbol: '☢️',
    topText: 'RADIOACTIVE',
    bottomText: '7',
  },
  '8': {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    topText: 'CORROSIVE',
    bottomText: '8',
    borderColor: '#000000',
  },
  '9': {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    topText: 'MISCELLANEOUS',
    bottomText: '9',
    borderColor: '#000000',
  },
};

const HazardIcon: React.FC<HazardIconProps> = ({ 
  hazardClass, 
  size = 60, 
  style 
}) => {
  const config = hazardClassConfigs[hazardClass] || hazardClassConfigs['9'];
  const diamondSize = size;
  const centerX = diamondSize / 2;
  const centerY = diamondSize / 2;
  const radius = diamondSize / 2 - 2;

  // Diamond points
  const points = `${centerX},2 ${diamondSize-2},${centerY} ${centerX},${diamondSize-2} 2,${centerY}`;

  return (
    <View style={[styles.container, { width: diamondSize, height: diamondSize }, style]}>
      <Svg width={diamondSize} height={diamondSize}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={config.backgroundColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={config.backgroundColor} stopOpacity="0.8" />
          </LinearGradient>
        </Defs>
        
        {/* Diamond shape */}
        <Polygon
          points={points}
          fill="url(#gradient)"
          stroke={config.borderColor || config.backgroundColor}
          strokeWidth="2"
        />
        
        {/* Top text */}
        {config.topText && (
          <SvgText
            x={centerX}
            y={centerY - (size > 40 ? 12 : 8)}
            fontSize={size > 40 ? "8" : "6"}
            fontWeight="bold"
            fill={config.textColor}
            textAnchor="middle"
            letterSpacing="0.5"
          >
            {config.topText}
          </SvgText>
        )}
        
        {/* Symbol */}
        {config.symbol && (
          <SvgText
            x={centerX}
            y={centerY + (size > 40 ? 2 : 1)}
            fontSize={size > 40 ? "16" : "12"}
            fill={config.textColor}
            textAnchor="middle"
          >
            {config.symbol}
          </SvgText>
        )}
        
        {/* Bottom text (class number) */}
        <SvgText
          x={centerX}
          y={centerY + (size > 40 ? 16 : 12)}
          fontSize={size > 40 ? "12" : "10"}
          fontWeight="bold"
          fill={config.textColor}
          textAnchor="middle"
        >
          {config.bottomText}
        </SvgText>
      </Svg>
    </View>
  );
};

// Alternative implementation using Image for actual UN diamond images
export const HazardIconImage: React.FC<HazardIconProps> = ({ 
  hazardClass, 
  size = 60, 
  style 
}) => {
  const getImageSource = (hazardClass: string) => {
    // These would be actual UN diamond images stored in assets
    const imageMap: { [key: string]: any } = {
      '1': require('../assets/hazard-icons/class-1.png'),
      '1.1': require('../assets/hazard-icons/class-1-1.png'),
      '1.2': require('../assets/hazard-icons/class-1-2.png'),
      '1.3': require('../assets/hazard-icons/class-1-3.png'),
      '1.4': require('../assets/hazard-icons/class-1-4.png'),
      '1.5': require('../assets/hazard-icons/class-1-5.png'),
      '1.6': require('../assets/hazard-icons/class-1-6.png'),
      '2.1': require('../assets/hazard-icons/class-2-1.png'),
      '2.2': require('../assets/hazard-icons/class-2-2.png'),
      '2.3': require('../assets/hazard-icons/class-2-3.png'),
      '3': require('../assets/hazard-icons/class-3.png'),
      '4.1': require('../assets/hazard-icons/class-4-1.png'),
      '4.2': require('../assets/hazard-icons/class-4-2.png'),
      '4.3': require('../assets/hazard-icons/class-4-3.png'),
      '5.1': require('../assets/hazard-icons/class-5-1.png'),
      '5.2': require('../assets/hazard-icons/class-5-2.png'),
      '6.1': require('../assets/hazard-icons/class-6-1.png'),
      '6.2': require('../assets/hazard-icons/class-6-2.png'),
      '7': require('../assets/hazard-icons/class-7.png'),
      '8': require('../assets/hazard-icons/class-8.png'),
      '9': require('../assets/hazard-icons/class-9.png'),
    };

    return imageMap[hazardClass] || imageMap['9'];
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={getImageSource(hazardClass)}
        style={{
          width: size,
          height: size,
          resizeMode: 'contain',
        }}
        defaultSource={require('../assets/hazard-icons/class-9.png')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HazardIcon;
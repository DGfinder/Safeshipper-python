/**
 * Emergency Button Component
 * Quick access emergency button for embedding in driver screens
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

interface EmergencyButtonProps {
  shipmentId?: string;
  shipmentTrackingNumber?: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  shipmentId,
  shipmentTrackingNumber,
  size = 'medium',
  style,
}) => {
  const navigation = useNavigation();
  const [isPressed, setIsPressed] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleEmergencyPress = () => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate([0, 100]);
    } else {
      Vibration.vibrate(100);
    }

    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Confirm emergency activation
    Alert.alert(
      '🚨 EMERGENCY ACTIVATION',
      'This will start the emergency response system. Are you experiencing a genuine emergency?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'YES - EMERGENCY',
          style: 'destructive',
          onPress: () => {
            if (shipmentId && shipmentTrackingNumber) {
              navigation.navigate('EmergencyActivation' as never, {
                shipmentId,
                shipmentTrackingNumber,
              } as never);
            } else {
              Alert.alert(
                'No Active Shipment',
                'Please select a shipment first or use the main emergency system.',
                [{text: 'OK'}]
              );
            }
          },
        },
      ]
    );
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: styles.emergencyButtonSmall,
          text: styles.emergencyTextSmall,
          icon: styles.emergencyIconSmall,
        };
      case 'large':
        return {
          button: styles.emergencyButtonLarge,
          text: styles.emergencyTextLarge,
          icon: styles.emergencyIconLarge,
        };
      default:
        return {
          button: styles.emergencyButtonMedium,
          text: styles.emergencyTextMedium,
          icon: styles.emergencyIconMedium,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Animated.View
      style={[
        styles.emergencyContainer,
        {
          transform: [
            {scale: Animated.multiply(pulseAnim, scaleAnim)},
          ],
        },
        style,
      ]}>
      <TouchableOpacity
        style={[styles.emergencyButton, sizeStyles.button]}
        onPress={handleEmergencyPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        activeOpacity={0.8}>
        <Text style={[styles.emergencyIcon, sizeStyles.icon]}>🚨</Text>
        <Text style={[styles.emergencyText, sizeStyles.text]}>
          EMERGENCY
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  emergencyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyButton: {
    backgroundColor: '#dc2626',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#dc2626',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  emergencyButtonSmall: {
    width: 60,
    height: 60,
  },
  emergencyButtonMedium: {
    width: 80,
    height: 80,
  },
  emergencyButtonLarge: {
    width: 120,
    height: 120,
  },
  emergencyIcon: {
    color: '#ffffff',
    marginBottom: 2,
  },
  emergencyIconSmall: {
    fontSize: 16,
  },
  emergencyIconMedium: {
    fontSize: 20,
  },
  emergencyIconLarge: {
    fontSize: 32,
  },
  emergencyText: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emergencyTextSmall: {
    fontSize: 8,
    lineHeight: 10,
  },
  emergencyTextMedium: {
    fontSize: 10,
    lineHeight: 12,
  },
  emergencyTextLarge: {
    fontSize: 14,
    lineHeight: 16,
  },
});

export default EmergencyButton;
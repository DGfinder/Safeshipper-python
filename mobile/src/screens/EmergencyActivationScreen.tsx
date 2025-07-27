/**
 * Emergency Activation Screen
 * Multi-step emergency activation with comprehensive safeguards
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useMutation} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';

import {apiService} from '../services/api';

type RouteParams = {
  shipmentId: string;
  shipmentTrackingNumber: string;
};

type EmergencyType = 
  | 'EMERGENCY_FIRE'
  | 'EMERGENCY_SPILL' 
  | 'EMERGENCY_ACCIDENT'
  | 'EMERGENCY_MEDICAL'
  | 'EMERGENCY_SECURITY'
  | 'EMERGENCY_MECHANICAL'
  | 'EMERGENCY_WEATHER'
  | 'EMERGENCY_OTHER';

interface EmergencyOption {
  type: EmergencyType;
  label: string;
  description: string;
  color: string;
  icon: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
}

const EMERGENCY_OPTIONS: EmergencyOption[] = [
  {
    type: 'EMERGENCY_FIRE',
    label: 'Fire',
    description: 'Vehicle fire or cargo ignition',
    color: '#dc2626',
    icon: '🔥',
  },
  {
    type: 'EMERGENCY_SPILL',
    label: 'Chemical Spill',
    description: 'Dangerous goods leak or spill',
    color: '#7c2d12',
    icon: '☢️',
  },
  {
    type: 'EMERGENCY_ACCIDENT',
    label: 'Vehicle Accident',
    description: 'Traffic accident or collision',
    color: '#b45309',
    icon: '💥',
  },
  {
    type: 'EMERGENCY_MEDICAL',
    label: 'Medical Emergency',
    description: 'Driver medical emergency',
    color: '#be123c',
    icon: '🚑',
  },
  {
    type: 'EMERGENCY_SECURITY',
    label: 'Security Threat',
    description: 'Theft, hijacking, or threat',
    color: '#6b21a8',
    icon: '🚨',
  },
  {
    type: 'EMERGENCY_MECHANICAL',
    label: 'Mechanical Breakdown',
    description: 'Vehicle breakdown on dangerous goods transport',
    color: '#1f2937',
    icon: '⚙️',
  },
  {
    type: 'EMERGENCY_WEATHER',
    label: 'Weather Emergency',
    description: 'Severe weather affecting transport',
    color: '#0f766e',
    icon: '⛈️',
  },
  {
    type: 'EMERGENCY_OTHER',
    label: 'Other Emergency',
    description: 'Other emergency situation',
    color: '#4338ca',
    icon: '⚠️',
  },
];

type ActivationStep = 'select_type' | 'initiate' | 'confirm' | 'activate' | 'complete';

const EmergencyActivationScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {shipmentId, shipmentTrackingNumber} = route.params as RouteParams;

  // State management
  const [step, setStep] = useState<ActivationStep>('select_type');
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<EmergencyType | null>(null);
  const [activationToken, setActivationToken] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [confirmText, setConfirmText] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [severityLevel, setSeverityLevel] = useState<string>('MEDIUM');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Pulse animation for emergency buttons
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (step === 'select_type') {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1);
    }
    
    return () => pulse.stop();
  }, [step, pulseAnim]);

  const getCurrentLocation = async () => {
    try {
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Location Permission Required',
          text2: 'Location access is needed for emergency response',
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Try to get reverse geocoding for address
      try {
        const addressResult = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (addressResult.length > 0) {
          const addr = addressResult[0];
          locationData.address = `${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        }
      } catch (e) {
        // Geocoding failed, continue without address
      }

      setLocationData(locationData);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: 'Could not get current location',
      });
    }
  };

  // API Mutations
  const initiateMutation = useMutation({
    mutationFn: (emergencyType: EmergencyType) =>
      apiService.post('/compliance/emergency/initiate/', {
        shipment_id: shipmentId,
        emergency_type: emergencyType,
      }),
    onSuccess: (data) => {
      setActivationToken(data.activation_token);
      setCountdown(data.timeout_seconds);
      setStep('confirm');
      
      // Vibrate to indicate activation started
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 250, 250, 250]);
      } else {
        Vibration.vibrate(250);
      }
      
      Toast.show({
        type: 'warning',
        text1: 'Emergency Activation Started',
        text2: `You have ${data.timeout_seconds} seconds to complete activation`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to initiate emergency';
      
      if (error.response?.status === 429) {
        // Cooldown period
        Alert.alert(
          'Emergency Cooldown',
          errorMessage,
          [{text: 'OK'}]
        );
      } else if (error.response?.status === 403 && error.response?.data?.emergency_disabled) {
        // Too many false alarms
        Alert.alert(
          'Emergency Disabled',
          errorMessage,
          [{text: 'Contact Support', onPress: () => navigation.goBack()}]
        );
      } else {
        Toast.show({
          type: 'error',
          text1: 'Emergency Initiation Failed',
          text2: errorMessage,
        });
      }
      setIsLoading(false);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      apiService.post('/compliance/emergency/confirm/', {
        activation_token: activationToken,
        pin: pin,
        confirm_text: confirmText,
      }),
    onSuccess: () => {
      setStep('activate');
      Toast.show({
        type: 'success',
        text1: 'Emergency Confirmed',
        text2: 'Proceed to final activation step',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to confirm emergency';
      
      // Shake animation for error
      Animated.sequence([
        Animated.timing(shakeAnim, {toValue: 10, duration: 100, useNativeDriver: true}),
        Animated.timing(shakeAnim, {toValue: -10, duration: 100, useNativeDriver: true}),
        Animated.timing(shakeAnim, {toValue: 10, duration: 100, useNativeDriver: true}),
        Animated.timing(shakeAnim, {toValue: 0, duration: 100, useNativeDriver: true}),
      ]).start();
      
      Toast.show({
        type: 'error',
        text1: 'Confirmation Failed',
        text2: errorMessage,
      });
      setIsLoading(false);
    },
  });

  const activateMutation = useMutation({
    mutationFn: () =>
      apiService.post('/compliance/emergency/activate/', {
        activation_token: activationToken,
        location: locationData,
        notes: additionalNotes,
        severity_level: severityLevel,
      }),
    onSuccess: (data) => {
      setStep('complete');
      
      // Strong vibration for emergency activation
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 500, 250, 500, 250, 500]);
      } else {
        Vibration.vibrate([0, 500, 250, 500, 250, 500]);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Emergency Activated',
        text2: 'Emergency services and management have been notified',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to activate emergency';
      Toast.show({
        type: 'error',
        text1: 'Emergency Activation Failed',
        text2: errorMessage,
      });
      setIsLoading(false);
    },
  });

  const handleEmergencyTypeSelect = (emergencyType: EmergencyType) => {
    Alert.alert(
      'Confirm Emergency Type',
      `Are you sure you want to initiate a ${EMERGENCY_OPTIONS.find(o => o.type === emergencyType)?.label} emergency?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Initiate Emergency',
          style: 'destructive',
          onPress: () => {
            setSelectedEmergencyType(emergencyType);
            setIsLoading(true);
            setStep('initiate');
            initiateMutation.mutate(emergencyType);
          },
        },
      ]
    );
  };

  const handleConfirmEmergency = () => {
    if (!pin.trim()) {
      Toast.show({
        type: 'error',
        text1: 'PIN Required',
        text2: 'Please enter your emergency PIN',
      });
      return;
    }

    if (confirmText.toUpperCase() !== 'EMERGENCY') {
      Toast.show({
        type: 'error',
        text1: 'Confirmation Required',
        text2: 'You must type "EMERGENCY" to confirm',
      });
      return;
    }

    setIsLoading(true);
    confirmMutation.mutate();
  };

  const handleActivateEmergency = () => {
    Alert.alert(
      'FINAL CONFIRMATION',
      'This will activate the emergency response system and notify emergency services. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel', onPress: () => setIsLoading(false)},
        {
          text: 'ACTIVATE EMERGENCY',
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            activateMutation.mutate();
          },
        },
      ]
    );
  };

  const renderEmergencyTypeSelection = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Emergency Type</Text>
        <Text style={styles.headerSubtitle}>
          Shipment: {shipmentTrackingNumber}
        </Text>
      </View>

      <View style={styles.emergencyOptions}>
        {EMERGENCY_OPTIONS.map((option) => (
          <Animated.View
            key={option.type}
            style={[
              styles.emergencyOptionContainer,
              {transform: [{scale: pulseAnim}]},
            ]}>
            <TouchableOpacity
              style={[styles.emergencyOption, {borderColor: option.color}]}
              onPress={() => handleEmergencyTypeSelect(option.type)}
              activeOpacity={0.7}>
              <View style={styles.emergencyOptionContent}>
                <Text style={styles.emergencyIcon}>{option.icon}</Text>
                <View style={styles.emergencyOptionText}>
                  <Text style={[styles.emergencyLabel, {color: option.color}]}>
                    {option.label}
                  </Text>
                  <Text style={styles.emergencyDescription}>
                    {option.description}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderConfirmStep = () => (
    <Animated.View
      style={[styles.content, {transform: [{translateX: shakeAnim}]}]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Confirm Emergency</Text>
        <Text style={styles.headerSubtitle}>
          {EMERGENCY_OPTIONS.find(o => o.type === selectedEmergencyType)?.label} Emergency
        </Text>
        {countdown > 0 && (
          <Text style={styles.countdown}>
            Time remaining: {countdown}s
          </Text>
        )}
      </View>

      <View style={styles.confirmSection}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Emergency PIN *</Text>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter 4-digit PIN"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            autoFocus
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Type "EMERGENCY" to confirm *</Text>
          <TextInput
            style={styles.textInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type EMERGENCY in capitals"
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleConfirmEmergency}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Emergency</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderActivateStep = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Final Activation</Text>
        <Text style={styles.headerSubtitle}>
          {EMERGENCY_OPTIONS.find(o => o.type === selectedEmergencyType)?.label} Emergency
        </Text>
      </View>

      <View style={styles.activateSection}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Additional details about the emergency..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Severity Level</Text>
          <View style={styles.severityOptions}>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'CATASTROPHIC'].map((severity) => (
              <TouchableOpacity
                key={severity}
                style={[
                  styles.severityOption,
                  severityLevel === severity && styles.severityOptionSelected,
                ]}
                onPress={() => setSeverityLevel(severity)}>
                <Text
                  style={[
                    styles.severityOptionText,
                    severityLevel === severity && styles.severityOptionTextSelected,
                  ]}>
                  {severity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {locationData && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Current Location:</Text>
            <Text style={styles.locationText}>
              {locationData.address || 
                `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.activateButton,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleActivateEmergency}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.activateButtonText}>ACTIVATE EMERGENCY</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.content}>
      <View style={styles.completeHeader}>
        <Text style={styles.completeIcon}>🚨</Text>
        <Text style={styles.completeTitle}>Emergency Activated</Text>
        <Text style={styles.completeSubtitle}>
          Emergency services and management have been notified
        </Text>
      </View>

      <View style={styles.nextStepsContainer}>
        <Text style={styles.nextStepsTitle}>Next Steps:</Text>
        <Text style={styles.nextStepsText}>
          • Emergency services are being contacted{'\n'}
          • Management and schedulers have been notified{'\n'}
          • Emergency response guide has been prepared{'\n'}
          • Stay safe and await further instructions
        </Text>
      </View>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.navigate('ShipmentList' as never)}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={step === 'activate' || step === 'complete'}>
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        
        {step !== 'complete' && (
          <Text style={styles.stepIndicator}>
            Step {step === 'select_type' ? '1' : step === 'confirm' ? '2' : '3'} of 3
          </Text>
        )}
      </View>

      {/* Content based on step */}
      {step === 'select_type' && renderEmergencyTypeSelection()}
      {step === 'initiate' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.loadingText}>Initiating emergency activation...</Text>
        </View>
      )}
      {step === 'confirm' && renderConfirmStep()}
      {step === 'activate' && renderActivateStep()}
      {step === 'complete' && renderCompleteStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  countdown: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 10,
  },
  emergencyOptions: {
    flex: 1,
  },
  emergencyOptionContainer: {
    marginBottom: 16,
  },
  emergencyOption: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emergencyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  emergencyOptionText: {
    flex: 1,
  },
  emergencyLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  confirmSection: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pinInput: {
    borderWidth: 2,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  confirmButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  activateSection: {
    flex: 1,
  },
  severityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  severityOptionSelected: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  severityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  severityOptionTextSelected: {
    color: '#ffffff',
  },
  locationInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activateButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  activateButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  completeHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  nextStepsContainer: {
    backgroundColor: '#fef3c7',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 30,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 12,
  },
  nextStepsText: {
    fontSize: 16,
    color: '#92400e',
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});

export default EmergencyActivationScreen;
/**
 * Emergency False Alarm Screen
 * Allows drivers to quickly mark accidental emergency activations as false alarms
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useMutation} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import {apiService} from '../services/api';

type RouteParams = {
  emergencyId: string;
  emergencyType: string;
};

const COMMON_FALSE_ALARM_REASONS = [
  'Accidentally pressed emergency button',
  'Phone was in pocket and button was pressed',
  'Testing the emergency system',
  'Mistook emergency button for another button',
  'Child or passenger pressed the button',
  'Button pressed during equipment handling',
  'System malfunction or glitch',
  'Training or demonstration purposes',
];

const EmergencyFalseAlarmScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {emergencyId, emergencyType} = route.params as RouteParams;

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const falseAlarmMutation = useMutation({
    mutationFn: (reason: string) =>
      apiService.post('/compliance/emergency/false-alarm/', {
        emergency_id: emergencyId,
        reason: reason,
      }),
    onSuccess: (data) => {
      Toast.show({
        type: 'success',
        text1: 'False Alarm Reported',
        text2: 'Emergency has been marked as a false alarm',
      });

      // Show warning if approaching daily limit
      if (data.false_alarm_count >= 2) {
        Alert.alert(
          'False Alarm Warning',
          `This is your ${data.false_alarm_count}${data.false_alarm_count === 2 ? 'nd' : 'rd'} false alarm today. ` +
          'After 3 false alarms, emergency activation will be temporarily disabled. ' +
          'Please be more careful when using the emergency system.',
          [
            {
              text: 'I Understand',
              onPress: () => navigation.navigate('ShipmentList' as never),
            },
          ]
        );
      } else {
        navigation.navigate('ShipmentList' as never);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to mark false alarm';
      Toast.show({
        type: 'error',
        text1: 'False Alarm Failed',
        text2: errorMessage,
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmitFalseAlarm = () => {
    const reason = selectedReason || customReason.trim();
    
    if (!reason) {
      Toast.show({
        type: 'error',
        text1: 'Reason Required',
        text2: 'Please select or enter a reason for the false alarm',
      });
      return;
    }

    Alert.alert(
      'Confirm False Alarm',
      'Are you sure this emergency activation was a false alarm? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Mark as False Alarm',
          style: 'destructive',
          onPress: () => {
            setIsSubmitting(true);
            falseAlarmMutation.mutate(reason);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>False Alarm Report</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Info */}
        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyTitle}>Emergency Activation</Text>
          <Text style={styles.emergencyType}>
            Type: {emergencyType.replace('EMERGENCY_', '').replace('_', ' ')}
          </Text>
          <Text style={styles.emergencyId}>ID: {emergencyId}</Text>
        </View>

        {/* Warning */}
        <View style={styles.warningContainer}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Important Notice</Text>
          <Text style={styles.warningText}>
            Only mark this as a false alarm if the emergency activation was genuinely accidental. 
            False alarms impact emergency response and may result in temporary suspension of emergency features.
          </Text>
        </View>

        {/* Reason Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for False Alarm</Text>
          
          {COMMON_FALSE_ALARM_REASONS.map((reason, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.reasonOption,
                selectedReason === reason && styles.reasonOptionSelected,
              ]}
              onPress={() => {
                setSelectedReason(reason);
                setCustomReason(''); // Clear custom reason when selecting predefined
              }}
              disabled={isSubmitting}>
              <View style={styles.radioButton}>
                {selectedReason === reason && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <Text style={[
                styles.reasonText,
                selectedReason === reason && styles.reasonTextSelected,
              ]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Custom Reason */}
          <TouchableOpacity
            style={[
              styles.reasonOption,
              customReason.trim() && styles.reasonOptionSelected,
            ]}
            onPress={() => {
              setSelectedReason(''); // Clear selected reason when focusing custom
            }}
            disabled={isSubmitting}>
            <View style={styles.radioButton}>
              {customReason.trim() && (
                <View style={styles.radioButtonSelected} />
              )}
            </View>
            <Text style={[
              styles.reasonText,
              customReason.trim() && styles.reasonTextSelected,
            ]}>
              Other (specify below)
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[
              styles.customReasonInput,
              customReason.trim() && styles.customReasonInputActive,
            ]}
            value={customReason}
            onChangeText={(text) => {
              setCustomReason(text);
              if (text.trim()) {
                setSelectedReason(''); // Clear selected reason when typing custom
              }
            }}
            placeholder="Enter specific reason for false alarm..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={200}
            editable={!isSubmitting}
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>What happens next:</Text>
          <Text style={styles.instructionsText}>
            • This emergency will be marked as resolved{'\n'}
            • Emergency services will be notified to stand down{'\n'}
            • Management will receive a false alarm notification{'\n'}
            • Your false alarm count will be updated{'\n'}
            • After 3 false alarms per day, emergency features may be temporarily disabled
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitFalseAlarm}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Mark as False Alarm</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  emergencyInfo: {
    backgroundColor: '#fef2f2',
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  emergencyType: {
    fontSize: 16,
    color: '#7f1d1d',
    marginBottom: 4,
  },
  emergencyId: {
    fontSize: 14,
    color: '#991b1b',
    fontFamily: 'monospace',
  },
  warningContainer: {
    backgroundColor: '#fffbeb',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    backgroundColor: '#f3f4f6',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  reasonTextSelected: {
    color: '#1f2937',
    fontWeight: '500',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    marginTop: 8,
    height: 80,
    textAlignVertical: 'top',
  },
  customReasonInputActive: {
    borderColor: '#2563eb',
    backgroundColor: '#f8fafc',
  },
  instructions: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  submitContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default EmergencyFalseAlarmScreen;
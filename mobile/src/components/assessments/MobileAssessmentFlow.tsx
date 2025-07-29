"use client";

import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { RadioButton } from '@/components/ui/RadioButton';
import { Checkbox } from '@/components/ui/Checkbox';
import { CameraView } from '@/components/ui/CameraView';
import { LocationTracker } from '@/components/ui/LocationTracker';
import { 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Eye,
  Target
} from 'lucide-react-native';
import { useAssessmentCompletion } from '@/hooks/useHazardAssessments';
import { usePermissions } from '@/contexts/PermissionContext';
import { AntiCheatingSystem, useAntiCheating } from './AntiCheatingSystem';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface MobileAssessmentFlowProps {
  assessmentId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface AssessmentQuestion {
  id: string;
  text: string;
  question_type: 'YES_NO_NA' | 'PASS_FAIL_NA' | 'TEXT' | 'NUMERIC';
  help_text?: string;
  is_required: boolean;
  is_photo_required_on_fail: boolean;
  is_comment_required_on_fail: boolean;
  is_critical_failure: boolean;
  section_title: string;
  order: number;
}

interface AssessmentAnswer {
  question_id: string;
  answer_value: string;
  comment?: string;
  photo_uri?: string;
  photo_metadata?: {
    timestamp: string;
    gps_latitude?: number;
    gps_longitude?: number;
    location_accuracy?: number;
    device_info: string;
  };
  is_override?: boolean;
  override_reason?: string;
}

export function MobileAssessmentFlow({ 
  assessmentId, 
  onComplete, 
  onCancel 
}: MobileAssessmentFlowProps) {
  const { can } = usePermissions();
  const {
    currentStep,
    setCurrentStep,
    answers,
    saveAnswer,
    completeAssessment,
    isSaving,
    isCompleting
  } = useAssessmentCompletion(assessmentId);

  // Anti-cheating system integration
  const {
    startQuestionTiming,
    endQuestionTiming,
    recordInteraction,
    securitySystemRef
  } = useAntiCheating(assessmentId);

  // State management
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<AssessmentAnswer | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [securityViolations, setSecurityViolations] = useState<any[]>([]);
  const [securityMetadata, setSecurityMetadata] = useState<any>(null);

  // Location tracking
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    initializeAssessment();
    startLocationTracking();
    
    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
    };
  }, [assessmentId]);

  const initializeAssessment = async () => {
    try {
      // Fetch assessment details and questions
      // This would typically come from your API
      const mockAssessment = {
        id: assessmentId,
        shipment_tracking: 'SHP-2024-001',
        template_name: 'Pre-Transport Safety Check',
        sections: [
          {
            id: 'section-1',
            title: 'Vehicle Inspection',
            questions: [
              {
                id: 'q1',
                text: 'Are all lights functioning properly?',
                question_type: 'YES_NO_NA',
                help_text: 'Check headlights, taillights, brake lights, and turn signals',
                is_required: true,
                is_photo_required_on_fail: true,
                is_comment_required_on_fail: true,
                is_critical_failure: false,
                section_title: 'Vehicle Inspection',
                order: 1
              },
              {
                id: 'q2',
                text: 'Are emergency equipment items present and accessible?',
                question_type: 'YES_NO_NA',
                help_text: 'Fire extinguisher, first aid kit, emergency triangles',
                is_required: true,
                is_photo_required_on_fail: true,
                is_comment_required_on_fail: true,
                is_critical_failure: true,
                section_title: 'Vehicle Inspection',
                order: 2
              },
              {
                id: 'q3',
                text: 'Vehicle registration number',
                question_type: 'TEXT',
                help_text: 'Enter the vehicle registration/license plate number',
                is_required: true,
                is_photo_required_on_fail: false,
                is_comment_required_on_fail: false,
                is_critical_failure: false,
                section_title: 'Vehicle Inspection',
                order: 3
              }
            ]
          },
          {
            id: 'section-2',
            title: 'Documentation Check',
            questions: [
              {
                id: 'q4',
                text: 'Is the dangerous goods manifest complete?',
                question_type: 'PASS_FAIL_NA',
                help_text: 'Check all required fields are filled and signed',
                is_required: true,
                is_photo_required_on_fail: true,
                is_comment_required_on_fail: true,
                is_critical_failure: true,
                section_title: 'Documentation Check',
                order: 4
              },
              {
                id: 'q5',
                text: 'Are safety placards properly displayed?',
                question_type: 'YES_NO_NA',
                help_text: 'Verify correct placards for transported dangerous goods',
                is_required: true,
                is_photo_required_on_fail: true,
                is_comment_required_on_fail: false,
                is_critical_failure: false,
                section_title: 'Documentation Check',
                order: 5
              }
            ]
          }
        ]
      };

      // Flatten questions from all sections
      const allQuestions = mockAssessment.sections.flatMap(section => section.questions);
      
      setAssessment(mockAssessment);
      setQuestions(allQuestions);
      
      // Initialize first question
      if (allQuestions.length > 0) {
        setCurrentAnswer({
          question_id: allQuestions[0].id,
          answer_value: ''
        });
        
        // Start timing for first question
        startQuestionTiming(allQuestions[0].id);
      }
    } catch (error) {
      console.error('Failed to initialize assessment:', error);
      Alert.alert('Error', 'Failed to load assessment. Please try again.');
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for assessments.');
        return;
      }

      // Get initial location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setCurrentLocation(location);

      // Start watching location changes
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          setCurrentLocation(location);
        }
      );
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  const handleAnswerChange = (value: string) => {
    if (!currentAnswer) return;
    
    // Record interaction for anti-cheating
    recordInteraction('TOUCH');
    
    setCurrentAnswer(prev => ({
      ...prev!,
      answer_value: value
    }));
  };

  const handleCommentChange = (comment: string) => {
    if (!currentAnswer) return;
    
    // Record interaction for anti-cheating
    recordInteraction('KEYSTROKE');
    
    setCurrentAnswer(prev => ({
      ...prev!,
      comment
    }));
  };

  const handlePhotoCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
        exif: true
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Create photo metadata
        const photoMetadata = {
          timestamp: new Date().toISOString(),
          gps_latitude: currentLocation?.coords.latitude,
          gps_longitude: currentLocation?.coords.longitude,
          location_accuracy: currentLocation?.coords.accuracy,
          device_info: `${Platform.OS} ${Platform.Version}`
        };

        setCurrentAnswer(prev => ({
          ...prev!,
          photo_uri: asset.uri,
          photo_metadata: photoMetadata
        }));

        setIsPhotoModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const validateCurrentAnswer = (): boolean => {
    if (!currentAnswer || !questions[currentStep]) return false;
    
    const question = questions[currentStep];
    const answer = currentAnswer;

    // Check if answer is provided for required questions
    if (question.is_required && !answer.answer_value) {
      Alert.alert('Required Field', 'This question requires an answer.');
      return false;
    }

    // Check for failure conditions
    const isFailure = ['no', 'fail'].includes(answer.answer_value.toLowerCase());
    
    if (isFailure && !answer.is_override) {
      // Check if photo is required on failure
      if (question.is_photo_required_on_fail && !answer.photo_uri) {
        Alert.alert('Photo Required', 'A photo is required for "No" or "Fail" answers.');
        return false;
      }

      // Check if comment is required on failure
      if (question.is_comment_required_on_fail && !answer.comment) {
        Alert.alert('Comment Required', 'A comment is required for "No" or "Fail" answers.');
        return false;
      }

      // Check for critical failure
      if (question.is_critical_failure && can('hazard.assessment.override.request')) {
        Alert.alert(
          'Critical Failure Detected',
          'This is a critical safety item. Do you need to request an override?',
          [
            { text: 'Request Override', onPress: () => setOverrideModalOpen(true) },
            { text: 'Continue', style: 'cancel' }
          ]
        );
      }
    }

    return true;
  };

  const handleNextQuestion = async () => {
    if (!validateCurrentAnswer()) return;

    try {
      // End timing for current question
      endQuestionTiming();
      
      // Save current answer with security metadata
      const answerWithMetadata = {
        ...currentAnswer!,
        security_metadata: securityMetadata
      };
      await saveAnswer(answerWithMetadata.question_id, answerWithMetadata);

      if (currentStep < questions.length - 1) {
        // Move to next question
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        
        // Initialize next answer
        setCurrentAnswer({
          question_id: questions[nextStep].id,
          answer_value: answers[questions[nextStep].id]?.answer_value || ''
        });
        
        // Start timing for next question
        startQuestionTiming(questions[nextStep].id);
      } else {
        // Assessment complete
        await handleCompleteAssessment();
      }
    } catch (error) {
      console.error('Failed to save answer:', error);
      Alert.alert('Error', 'Failed to save answer. Please try again.');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentStep > 0) {
      // End timing for current question
      endQuestionTiming();
      
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // Load previous answer
      const prevAnswer = answers[questions[prevStep].id];
      setCurrentAnswer({
        question_id: questions[prevStep].id,
        answer_value: prevAnswer?.answer_value || '',
        comment: prevAnswer?.comment,
        photo_uri: prevAnswer?.photo_uri,
        photo_metadata: prevAnswer?.photo_metadata
      });
      
      // Start timing for previous question
      startQuestionTiming(questions[prevStep].id);
    }
  };

  const handleCompleteAssessment = async () => {
    try {
      Alert.alert(
        'Complete Assessment',
        'Are you sure you want to complete this assessment? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Complete', 
            onPress: async () => {
              // End timing for final question
              endQuestionTiming();
              
              // Complete assessment with security metadata
              await completeAssessment();
              onComplete();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to complete assessment:', error);
      Alert.alert('Error', 'Failed to complete assessment. Please try again.');
    }
  };

  const handleOverrideRequest = async () => {
    if (!overrideReason.trim()) {
      Alert.alert('Override Reason Required', 'Please provide a reason for the override request.');
      return;
    }

    setCurrentAnswer(prev => ({
      ...prev!,
      is_override: true,
      override_reason: overrideReason
    }));

    setOverrideModalOpen(false);
    setOverrideReason('');
  };

  const handleSecurityViolation = (violation: any) => {
    setSecurityViolations(prev => [...prev, violation]);
    
    // Log violation for backend processing
    console.warn('Security violation detected:', violation);
  };

  const handleSecurityMetadataUpdate = (metadata: any) => {
    setSecurityMetadata(metadata);
  };

  const renderQuestionInput = () => {
    if (!questions[currentStep] || !currentAnswer) return null;
    
    const question = questions[currentStep];
    const { question_type } = question;

    switch (question_type) {
      case 'YES_NO_NA':
        return (
          <View className="space-y-3">
            {['Yes', 'No', 'N/A'].map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => handleAnswerChange(option)}
                className={`p-4 border rounded-lg ${
                  currentAnswer.answer_value === option 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300'
                }`}
              >
                <View className="flex-row items-center">
                  <RadioButton 
                    selected={currentAnswer.answer_value === option}
                    onSelect={() => handleAnswerChange(option)}
                  />
                  <Text className="ml-3 text-base">{option}</Text>
                  {option === 'Yes' && <CheckCircle className="ml-auto h-5 w-5 text-green-600" />}
                  {option === 'No' && <XCircle className="ml-auto h-5 w-5 text-red-600" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'PASS_FAIL_NA':
        return (
          <View className="space-y-3">
            {['Pass', 'Fail', 'N/A'].map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => handleAnswerChange(option)}
                className={`p-4 border rounded-lg ${
                  currentAnswer.answer_value === option 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300'
                }`}
              >
                <View className="flex-row items-center">
                  <RadioButton 
                    selected={currentAnswer.answer_value === option}
                    onSelect={() => handleAnswerChange(option)}
                  />
                  <Text className="ml-3 text-base">{option}</Text>
                  {option === 'Pass' && <CheckCircle className="ml-auto h-5 w-5 text-green-600" />}
                  {option === 'Fail' && <XCircle className="ml-auto h-5 w-5 text-red-600" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'TEXT':
        return (
          <Input
            value={currentAnswer.answer_value}
            onChangeText={handleAnswerChange}
            placeholder="Enter your answer..."
            multiline={true}
            numberOfLines={3}
            className="text-base"
          />
        );

      case 'NUMERIC':
        return (
          <Input
            value={currentAnswer.answer_value}
            onChangeText={handleAnswerChange}
            placeholder="Enter a number..."
            keyboardType="numeric"
            className="text-base"
          />
        );

      default:
        return null;
    }
  };

  const renderAdditionalInputs = () => {
    if (!questions[currentStep] || !currentAnswer) return null;
    
    const question = questions[currentStep];
    const isFailure = ['no', 'fail'].includes(currentAnswer.answer_value.toLowerCase());
    
    return (
      <View className="space-y-4">
        {/* Comment Input */}
        {(question.is_comment_required_on_fail && isFailure) || currentAnswer.comment ? (
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Comments {question.is_comment_required_on_fail && isFailure && '(Required)'}
            </Text>
            <Input
              value={currentAnswer.comment || ''}
              onChangeText={handleCommentChange}
              placeholder="Add your comments..."
              multiline={true}
              numberOfLines={3}
            />
          </View>
        )}

        {/* Photo Capture */}
        {(question.is_photo_required_on_fail && isFailure) || currentAnswer.photo_uri ? (
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Photo Evidence {question.is_photo_required_on_fail && isFailure && '(Required)'}
            </Text>
            
            {currentAnswer.photo_uri ? (
              <View className="space-y-2">
                <View className="h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <Image 
                    source={{ uri: currentAnswer.photo_uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <Button
                  variant="outline"
                  onPress={() => setIsPhotoModalOpen(true)}
                  className="flex-row items-center"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  <Text>Retake Photo</Text>
                </Button>
              </View>
            ) : (
              <Button
                onPress={() => setIsPhotoModalOpen(true)}
                className="flex-row items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg"
              >
                <Camera className="h-6 w-6 mr-2 text-gray-400" />
                <Text className="text-gray-600">Tap to take photo</Text>
              </Button>
            )}
          </View>
        )}

        {/* Override Request */}
        {currentAnswer.is_override && (
          <View className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <View className="flex-row items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              <Text className="font-medium text-orange-800">Override Requested</Text>
            </View>
            <Text className="text-sm text-orange-700">{currentAnswer.override_reason}</Text>
          </View>
        )}
      </View>
    );
  };

  if (!assessment || questions.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-lg text-gray-600">Loading assessment...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onCancel}>
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </TouchableOpacity>
          <View className="flex-1 mx-4">
            <Text className="text-lg font-semibold text-center">{assessment.template_name}</Text>
            <Text className="text-sm text-gray-600 text-center">{assessment.shipment_tracking}</Text>
          </View>
          <View className="flex-row items-center">
            <Clock className="h-4 w-4 text-gray-500 mr-1" />
            <Text className="text-sm text-gray-600">
              {Math.floor((Date.now() - startTime.getTime()) / 60000)}m
            </Text>
          </div>
        </View>
        
        {/* Progress Bar */}
        <View className="mt-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs text-gray-600">
              Question {currentStep + 1} of {questions.length}
            </Text>
            <Text className="text-xs text-gray-600">{Math.round(progress)}%</Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full">
            <View 
              className="h-2 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4">
        <Card className="mb-4">
          <View className="p-4">
            {/* Section Badge */}
            <Badge variant="outline" className="self-start mb-3">
              {currentQuestion.section_title}
            </Badge>

            {/* Question */}
            <Text className="text-lg font-semibold mb-2">{currentQuestion.text}</Text>
            
            {/* Help Text */}
            {currentQuestion.help_text && (
              <View className="flex-row items-start p-3 bg-blue-50 rounded-lg mb-4">
                <Eye className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                <Text className="text-sm text-blue-800 flex-1">{currentQuestion.help_text}</Text>
              </View>
            )}

            {/* Critical Failure Warning */}
            {currentQuestion.is_critical_failure && (
              <View className="flex-row items-center p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <Text className="text-sm text-red-800 flex-1">
                  This is a critical safety item. Failure may require manager override.
                </Text>
              </View>
            )}

            {/* Required Indicator */}
            {currentQuestion.is_required && (
              <View className="flex-row items-center mb-4">
                <Target className="h-4 w-4 text-orange-500 mr-1" />
                <Text className="text-sm text-orange-700">Required</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Answer Input */}
        <Card className="mb-4">
          <View className="p-4">
            <Text className="text-base font-medium mb-3">Your Answer</Text>
            {renderQuestionInput()}
          </View>
        </Card>

        {/* Additional Inputs */}
        {renderAdditionalInputs()}

        {/* Anti-Cheating Security System */}
        <AntiCheatingSystem
          ref={securitySystemRef}
          assessmentId={assessmentId}
          onViolationDetected={handleSecurityViolation}
          onMetadataUpdate={handleSecurityMetadataUpdate}
          minimumTimePerQuestion={3}
          maximumTimePerQuestion={600}
          requiredLocationAccuracy={20}
          enableScreenshotDetection={true}
          enableAppSwitchDetection={true}
        />

        {/* Location Info */}
        {currentLocation && (
          <Card className="mb-4">
            <View className="p-4">
              <View className="flex-row items-center mb-2">
                <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                <Text className="text-sm font-medium text-gray-700">Current Location</Text>
              </View>
              <Text className="text-xs text-gray-600">
                {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
              </Text>
              <Text className="text-xs text-gray-500">
                Accuracy: ±{Math.round(currentLocation.coords.accuracy || 0)}m
              </Text>
            </View>
          </Card>
        )}

        {/* Security Violations Warning */}
        {securityViolations.length > 0 && (
          <Card className="mb-4">
            <View className="p-4 bg-red-50 border border-red-200">
              <View className="flex-row items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <Text className="text-sm font-medium text-red-800">Security Alerts</Text>
              </View>
              <Text className="text-xs text-red-700">
                {securityViolations.length} security event(s) detected. This assessment may be flagged for review.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="bg-white border-t border-gray-200 p-4">
        <View className="flex-row justify-between">
          <Button
            variant="outline"
            onPress={handlePreviousQuestion}
            disabled={currentStep === 0}
            className="flex-1 mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <Text>Previous</Text>
          </Button>
          
          <Button
            onPress={handleNextQuestion}
            disabled={isSaving || isCompleting}
            className="flex-1 ml-2"
          >
            {isSaving || isCompleting ? (
              <Text>Saving...</Text>
            ) : currentStep === questions.length - 1 ? (
              <>
                <Send className="h-4 w-4 mr-2" />
                <Text>Complete</Text>
              </>
            ) : (
              <>
                <Text>Next</Text>
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </View>
      </View>

      {/* Photo Modal */}
      {isPhotoModalOpen && (
        <CameraView
          isVisible={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          onCapture={handlePhotoCapture}
        />
      )}

      {/* Override Modal */}
      {overrideModalOpen && (
        <Modal
          visible={overrideModalOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setOverrideModalOpen(false)}
        >
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
            <Card className="w-full max-w-md">
              <View className="p-6">
                <Text className="text-lg font-semibold mb-4">Request Override</Text>
                <Text className="text-sm text-gray-600 mb-4">
                  This question failed a critical safety check. Please provide a reason for requesting an override.
                </Text>
                
                <Input
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  placeholder="Reason for override request..."
                  multiline={true}
                  numberOfLines={4}
                  className="mb-4"
                />
                
                <View className="flex-row justify-end space-x-2">
                  <Button
                    variant="outline"
                    onPress={() => setOverrideModalOpen(false)}
                    className="flex-1 mr-2"
                  >
                    <Text>Cancel</Text>
                  </Button>
                  <Button
                    onPress={handleOverrideRequest}
                    className="flex-1 ml-2"
                  >
                    <Text>Request Override</Text>
                  </Button>
                </View>
              </View>
            </Card>
          </View>
        </Modal>
      )}
    </View>
  );
}
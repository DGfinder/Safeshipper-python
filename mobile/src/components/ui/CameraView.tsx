"use client";

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Dimensions } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { 
  X, 
  Camera as CameraIcon, 
  RotateCcw, 
  Flash, 
  FlashOff,
  CheckCircle,
  RefreshCw
} from 'lucide-react-native';
import { Button } from './Button';

interface CameraViewProps {
  isVisible: boolean;
  onClose: () => void;
  onCapture: (photoUri: string) => void;
}

export function CameraView({ isVisible, onClose, onCapture }: CameraViewProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);

  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: true,
          skipProcessing: false,
        });
        
        setPreviewUri(photo.uri);
      } catch (error) {
        console.error('Failed to take picture:', error);
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const confirmPhoto = () => {
    if (previewUri) {
      onCapture(previewUri);
      setPreviewUri(null);
      onClose();
    }
  };

  const retakePhoto = () => {
    setPreviewUri(null);
  };

  const toggleCameraType = () => {
    setType(current => 
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const toggleFlash = () => {
    setFlashMode(current => 
      current === Camera.Constants.FlashMode.off 
        ? Camera.Constants.FlashMode.on 
        : Camera.Constants.FlashMode.off
    );
  };

  if (hasPermission === null) {
    return (
      <Modal visible={isVisible} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black">
          <Text className="text-white text-lg">Requesting camera permissions...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={isVisible} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black p-6">
          <View className="bg-white rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold mb-4 text-center">Camera Permission Required</Text>
            <Text className="text-gray-600 mb-6 text-center">
              This app needs access to your camera to take photos for assessments.
            </Text>
            <View className="flex-row space-x-3">
              <Button variant="outline" onPress={onClose} className="flex-1">
                <Text>Cancel</Text>
              </Button>
              <Button 
                onPress={async () => {
                  const { status } = await Camera.requestCameraPermissionsAsync();
                  setHasPermission(status === 'granted');
                }} 
                className="flex-1"
              >
                <Text>Grant Permission</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View className="flex-1 bg-black">
        {previewUri ? (
          // Photo Preview Mode
          <View className="flex-1">
            <Image 
              source={{ uri: previewUri }}
              className="flex-1"
              resizeMode="contain"
            />
            
            {/* Preview Controls */}
            <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-6">
              <View className="flex-row justify-center space-x-4">
                <TouchableOpacity
                  onPress={retakePhoto}
                  className="bg-gray-600 rounded-full p-4 flex-row items-center"
                >
                  <RefreshCw className="h-6 w-6 text-white mr-2" />
                  <Text className="text-white font-medium">Retake</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={confirmPhoto}
                  className="bg-green-600 rounded-full p-4 flex-row items-center"
                >
                  <CheckCircle className="h-6 w-6 text-white mr-2" />
                  <Text className="text-white font-medium">Use Photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => {
                setPreviewUri(null);
                onClose();
              }}
              className="absolute top-12 right-4 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="h-6 w-6 text-white" />
            </TouchableOpacity>
          </View>
        ) : (
          // Camera Mode
          <View className="flex-1">
            <Camera
              ref={cameraRef}
              style={{ flex: 1 }}
              type={type}
              flashMode={flashMode}
              ratio="4:3"
            >
              {/* Top Controls */}
              <View className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-4 pt-12">
                <View className="flex-row justify-between items-center">
                  <TouchableOpacity
                    onPress={onClose}
                    className="bg-black bg-opacity-50 rounded-full p-2"
                  >
                    <X className="h-6 w-6 text-white" />
                  </TouchableOpacity>

                  <Text className="text-white font-medium">Take Photo</Text>

                  <TouchableOpacity
                    onPress={toggleFlash}
                    className="bg-black bg-opacity-50 rounded-full p-2"
                  >
                    {flashMode === Camera.Constants.FlashMode.off ? (
                      <FlashOff className="h-6 w-6 text-white" />
                    ) : (
                      <Flash className="h-6 w-6 text-yellow-400" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Focus Area */}
              <View className="flex-1 justify-center items-center">
                <View className="w-64 h-64 border-2 border-white border-opacity-50 rounded-lg">
                  <View className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white" />
                  <View className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white" />
                  <View className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white" />
                  <View className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white" />
                </View>
                <Text className="text-white text-sm mt-4 text-center px-8">
                  Position the camera to capture clear evidence
                </Text>
              </View>

              {/* Bottom Controls */}
              <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-6">
                <View className="flex-row justify-between items-center">
                  {/* Camera Flip Button */}
                  <TouchableOpacity
                    onPress={toggleCameraType}
                    className="bg-black bg-opacity-50 rounded-full p-4"
                  >
                    <RotateCcw className="h-6 w-6 text-white" />
                  </TouchableOpacity>

                  {/* Capture Button */}
                  <TouchableOpacity
                    onPress={takePicture}
                    disabled={isCapturing}
                    className="bg-white rounded-full p-1"
                  >
                    <View className={`w-16 h-16 rounded-full border-4 border-gray-300 items-center justify-center ${
                      isCapturing ? 'bg-gray-400' : 'bg-white'
                    }`}>
                      {isCapturing ? (
                        <View className="w-8 h-8 bg-red-500 rounded" />
                      ) : (
                        <CameraIcon className="h-8 w-8 text-gray-600" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Placeholder for balance */}
                  <View className="w-14 h-14" />
                </View>

                {/* Instructions */}
                <Text className="text-white text-xs text-center mt-4 opacity-75">
                  Tap the button above to capture photo evidence
                </Text>
              </View>

              {/* Guidelines Overlay */}
              <View className="absolute inset-0 pointer-events-none">
                {/* Rule of thirds grid */}
                <View className="flex-1 opacity-20">
                  {/* Vertical lines */}
                  <View className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                  <View className="absolute right-1/3 top-0 bottom-0 w-px bg-white" />
                  {/* Horizontal lines */}
                  <View className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                  <View className="absolute bottom-1/3 left-0 right-0 h-px bg-white" />
                </View>
              </View>
            </Camera>
          </View>
        )}
      </View>
    </Modal>
  );
}
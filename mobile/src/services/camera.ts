// mobile/src/services/camera.ts
import {launchCamera, launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {PermissionsAndroid, Platform, Alert} from 'react-native';
import {PERMISSIONS, request, check, RESULTS} from 'react-native-permissions';

export interface PhotoResult {
  uri: string;
  fileName: string;
  fileSize: number;
  type: string;
  base64?: string;
}

export interface CameraOptions {
  quality?: number;
  allowsEditing?: boolean;
  includeBase64?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

class CameraService {
  /**
   * Request camera permissions for the current platform
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'SafeShipper Camera Permission',
            message: 'SafeShipper needs access to your camera to take inspection photos and capture proof of delivery.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Check if camera permission is already granted
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        return result;
      } else {
        const result = await check(PERMISSIONS.IOS.CAMERA);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Take a photo using the device camera
   */
  async takePhoto(options: CameraOptions = {}): Promise<PhotoResult | null> {
    try {
      // Check and request permission if needed
      let hasPermission = await this.checkCameraPermission();
      if (!hasPermission) {
        hasPermission = await this.requestCameraPermission();
        if (!hasPermission) {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in your device settings to take photos.',
            [{text: 'OK'}]
          );
          return null;
        }
      }

      return new Promise((resolve) => {
        const cameraOptions = {
          mediaType: 'photo' as MediaType,
          quality: options.quality || 0.8,
          includeBase64: options.includeBase64 || false,
          maxWidth: options.maxWidth || 1920,
          maxHeight: options.maxHeight || 1080,
        };

        launchCamera(cameraOptions, (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorMessage) {
            resolve(null);
            return;
          }

          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            resolve({
              uri: asset.uri!,
              fileName: asset.fileName || `photo_${Date.now()}.jpg`,
              fileSize: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
              base64: asset.base64,
            });
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  }

  /**
   * Select a photo from the device's photo library
   */
  async selectFromLibrary(options: CameraOptions = {}): Promise<PhotoResult | null> {
    try {
      return new Promise((resolve) => {
        const libraryOptions = {
          mediaType: 'photo' as MediaType,
          quality: options.quality || 0.8,
          includeBase64: options.includeBase64 || false,
          maxWidth: options.maxWidth || 1920,
          maxHeight: options.maxHeight || 1080,
        };

        launchImageLibrary(libraryOptions, (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorMessage) {
            resolve(null);
            return;
          }

          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            resolve({
              uri: asset.uri!,
              fileName: asset.fileName || `photo_${Date.now()}.jpg`,
              fileSize: asset.fileSize || 0,
              type: asset.type || 'image/jpeg',
              base64: asset.base64,
            });
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error selecting photo from library:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
      return null;
    }
  }

  /**
   * Show action sheet to choose between camera and photo library
   */
  async selectPhoto(options: CameraOptions = {}): Promise<PhotoResult | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo:',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await this.takePhoto(options);
              resolve(result);
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await this.selectFromLibrary(options);
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        {cancelable: true}
      );
    });
  }

  /**
   * Take multiple photos for inspection or POD
   */
  async takeMultiplePhotos(
    maxPhotos: number = 5,
    options: CameraOptions = {}
  ): Promise<PhotoResult[]> {
    const photos: PhotoResult[] = [];

    for (let i = 0; i < maxPhotos; i++) {
      const continuePrompt = i === 0 
        ? 'Take Photo' 
        : `Take Photo ${i + 1} (${photos.length}/${maxPhotos} taken)`;

      const result = await new Promise<PhotoResult | null>((resolve) => {
        Alert.alert(
          'Photo Capture',
          photos.length === 0 
            ? 'Take your first photo' 
            : `You have taken ${photos.length} photo(s). Take another?`,
          [
            {
              text: continuePrompt,
              onPress: async () => {
                const photo = await this.selectPhoto(options);
                resolve(photo);
              },
            },
            {
              text: photos.length === 0 ? 'Cancel' : 'Done',
              style: photos.length === 0 ? 'cancel' : 'default',
              onPress: () => resolve(null),
            },
          ],
          {cancelable: false}
        );
      });

      if (result) {
        photos.push(result);
      } else {
        break; // User chose to stop or cancel
      }
    }

    return photos;
  }

  /**
   * Prepare photo data for upload to the backend
   */
  preparePhotoForUpload(photo: PhotoResult): FormData {
    const formData = new FormData();
    
    formData.append('image_file', {
      uri: photo.uri,
      type: photo.type,
      name: photo.fileName,
    } as any);
    
    formData.append('file_name', photo.fileName);
    formData.append('file_size', photo.fileSize.toString());
    
    return formData;
  }

  /**
   * Convert photo to base64 for signature embedding
   */
  async convertToBase64(photo: PhotoResult): Promise<string | null> {
    try {
      if (photo.base64) {
        return photo.base64;
      }

      // If base64 not included, retake with base64 option
      const photoWithBase64 = await this.takePhoto({
        ...photo,
        includeBase64: true,
      });

      return photoWithBase64?.base64 || null;
    } catch (error) {
      console.error('Error converting photo to base64:', error);
      return null;
    }
  }
}

// Export singleton instance
export const cameraService = new CameraService();
export default cameraService;
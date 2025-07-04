# SafeShipper Mobile Driver App

A React Native mobile application for SafeShipper drivers to manage shipments and provide real-time location tracking.

## Features

### Core Functionality
- **Driver Authentication**: Secure JWT-based login with role validation
- **Shipment Management**: View assigned shipments with detailed information
- **Real-time Location Tracking**: Background GPS tracking with automatic server updates
- **Status Updates**: Update shipment status during transport lifecycle
- **Dangerous Goods Handling**: Special indicators and information for hazardous materials

### Technical Features
- **Secure Storage**: JWT tokens stored securely using react-native-keychain
- **Background Location**: Continuous GPS tracking even when app is backgrounded
- **Offline Support**: Local caching with React Query for offline functionality
- **Permission Management**: Automatic location permission requests
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Architecture

### Backend Integration
- **API Base URL**: Configurable for development/production
- **Authentication**: JWT tokens with automatic refresh
- **Real-time Updates**: Location data sent to `/api/v1/tracking/update-location/`
- **Shipment Data**: Retrieved from `/api/v1/shipments/my-shipments/`

### Key Dependencies
- **React Native 0.72.6**: Latest stable React Native version
- **React Navigation**: Native stack navigation
- **TanStack Query**: Server state management and caching
- **Background Geolocation**: Continuous location tracking
- **React Native Keychain**: Secure token storage
- **Zustand**: Lightweight state management

## Installation

### Prerequisites
- Node.js >= 16
- React Native development environment
- Android Studio (for Android)
- Xcode (for iOS)

### Setup
```bash
# Install dependencies
npm install

# iOS specific setup
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Configuration

### Environment Variables
The app automatically detects development vs production:
- **Development**: `http://10.0.2.2:8000/api/v1` (Android emulator)
- **Production**: `https://api.safeshipper.com/api/v1`

### Permissions
The app requires the following permissions:
- **Location (Fine)**: For GPS tracking
- **Location (Background)**: For continuous tracking
- **Internet**: For API communication

## Usage

### Driver Workflow
1. **Login**: Driver enters email and password
2. **View Shipments**: See all assigned shipments with filters
3. **Select Shipment**: Tap to view detailed information
4. **Update Status**: Change shipment status during transport
5. **Location Tracking**: Automatic background location updates

### Status Transitions
- `READY_FOR_DISPATCH` → `IN_TRANSIT`
- `IN_TRANSIT` → `OUT_FOR_DELIVERY`
- `OUT_FOR_DELIVERY` → `DELIVERED`
- Any status → `EXCEPTION` (for issues)

## Security

### Authentication
- JWT tokens stored in device keychain/encrypted storage
- Automatic token refresh on API calls
- Role-based access (DRIVER role required)

### Location Privacy
- Location data only sent when driver is logged in
- GPS tracking can be manually controlled by driver
- Location updates include accuracy and timestamp

### Data Protection
- All API communication over HTTPS
- Sensitive data not stored in plain text
- Automatic logout on authentication failure

## Performance

### Location Tracking
- **Update Frequency**: Every 30 seconds or 10 meters movement
- **Battery Optimization**: Intelligent location filtering
- **Network Efficiency**: Minimal data payload (~200 bytes per update)

### Caching Strategy
- **Shipment Data**: Cached for 5 minutes
- **Background Refresh**: Every 30 seconds for active data
- **Offline Support**: Last known data available without network

## Troubleshooting

### Common Issues

#### Location Not Working
1. Check location permissions in device settings
2. Ensure GPS is enabled
3. Grant "Allow all the time" permission for background tracking

#### Login Failed
1. Verify backend server is running
2. Check network connectivity
3. Ensure user has DRIVER role in backend

#### App Crashes
1. Check React Native environment setup
2. Verify all dependencies are installed
3. Clear Metro cache: `npx react-native start --reset-cache`

### Development Tips
- Use React Native Flipper for debugging
- Check Metro bundler logs for JavaScript errors
- Use Android Studio/Xcode for native debugging

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Test on both iOS and Android
4. Submit pull request for review

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Functional components with hooks

## Production Deployment

### Android
```bash
# Generate signed APK
cd android
./gradlew assembleRelease
```

### iOS
```bash
# Archive for App Store
cd ios
xcodebuild archive -workspace SafeShipper.xcworkspace -scheme SafeShipper
```

### Environment Configuration
- Update API base URL for production
- Configure proper signing certificates
- Test location permissions on physical devices
- Verify background app refresh is enabled

## Support

For technical support or feature requests, contact the SafeShipper development team.

## License

Copyright © 2024 SafeShipper. All rights reserved.
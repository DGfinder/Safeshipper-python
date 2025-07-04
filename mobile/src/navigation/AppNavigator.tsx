/**
 * App Navigator
 * Main navigation structure for the app
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAuth} from '../context/AuthContext';
import {LoginScreen} from '../screens/LoginScreen';
import {ShipmentListScreen} from '../screens/ShipmentListScreen';
import {ShipmentDetailScreen} from '../screens/ShipmentDetailScreen';

export type RootStackParamList = {
  Login: undefined;
  ShipmentList: undefined;
  ShipmentDetail: {shipmentId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const {isAuthenticated} = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="ShipmentList" component={ShipmentListScreen} />
          <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
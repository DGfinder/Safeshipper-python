/**
 * App Navigator
 * Main navigation structure for SafeShipper dangerous goods management app
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from 'react-native-paper';

// Import screens (to be created)
import HomeScreen from '../screens/HomeScreen';
import TripsScreen from '../screens/TripsScreen';
import SDSScreen from '../screens/SDS/SDSScreen';
import EPGScreen from '../screens/EPGScreen';
import CompatibilityScreen from '../screens/Compatibility/CompatibilityScreen';
import CheckCompatibilityScreen from '../screens/Compatibility/CheckCompatibilityScreen';
import CompareCompatibilityScreen from '../screens/Compatibility/CompareCompatibilityScreen';
import AlkalineOrAcidScreen from '../screens/Compatibility/AlkalineOrAcidScreen';
import CompatibilityResultScreen from '../screens/Compatibility/CompatibilityResultScreen';
import MaterialDetailScreen from '../screens/SDS/MaterialDetailScreen';

// Type definitions for navigation
export type RootStackParamList = {
  Home: undefined;
  Trips: undefined;
  SDS: undefined;
  EPG: undefined;
  Compatibility: undefined;
};

export type SDSStackParamList = {
  SDSMain: undefined;
  MaterialDetail: { materialId: string; materialName: string };
};

export type CompatibilityStackParamList = {
  CompatibilityMain: undefined;
  CheckCompatibility: undefined;
  CompareCompatibility: undefined;
  AlkalineOrAcid: undefined;
  CompatibilityResult: { 
    materials: any[];
    resultType: 'check' | 'compare' | 'ph';
    result?: any;
  };
};

// Stack Navigators
const HomeStack = createNativeStackNavigator();
const TripsStack = createNativeStackNavigator();
const SDSStack = createNativeStackNavigator<SDSStackParamList>();
const EPGStack = createNativeStackNavigator();
const CompatibilityStack = createNativeStackNavigator<CompatibilityStackParamList>();

// Tab Navigator
const Tab = createBottomTabNavigator<RootStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function TripsStackNavigator() {
  return (
    <TripsStack.Navigator>
      <TripsStack.Screen 
        name="TripsMain" 
        component={TripsScreen} 
        options={{ headerShown: false }}
      />
    </TripsStack.Navigator>
  );
}

function SDSStackNavigator() {
  return (
    <SDSStack.Navigator>
      <SDSStack.Screen 
        name="SDSMain" 
        component={SDSScreen} 
        options={{ 
          title: 'SDS',
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <SDSStack.Screen 
        name="MaterialDetail" 
        component={MaterialDetailScreen} 
        options={{ 
          title: 'Material Details',
          headerBackTitle: 'Back'
        }}
      />
    </SDSStack.Navigator>
  );
}

function EPGStackNavigator() {
  return (
    <EPGStack.Navigator>
      <EPGStack.Screen 
        name="EPGMain" 
        component={EPGScreen} 
        options={{ headerShown: false }}
      />
    </EPGStack.Navigator>
  );
}

function CompatibilityStackNavigator() {
  return (
    <CompatibilityStack.Navigator>
      <CompatibilityStack.Screen 
        name="CompatibilityMain" 
        component={CompatibilityScreen} 
        options={{ 
          title: 'Compatibility',
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <CompatibilityStack.Screen 
        name="CheckCompatibility" 
        component={CheckCompatibilityScreen} 
        options={{ 
          title: 'Check compatibility',
          headerBackTitle: 'Back'
        }}
      />
      <CompatibilityStack.Screen 
        name="CompareCompatibility" 
        component={CompareCompatibilityScreen} 
        options={{ 
          title: 'Compare compatibility',
          headerBackTitle: 'Back'
        }}
      />
      <CompatibilityStack.Screen 
        name="AlkalineOrAcid" 
        component={AlkalineOrAcidScreen} 
        options={{ 
          title: 'Alkaline or Acid',
          headerBackTitle: 'Back'
        }}
      />
      <CompatibilityStack.Screen 
        name="CompatibilityResult" 
        component={CompatibilityResultScreen} 
        options={{ 
          title: 'Result',
          headerBackTitle: 'Back'
        }}
      />
    </CompatibilityStack.Navigator>
  );
}

function TabNavigator() {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Trips':
              iconName = 'local-shipping';
              break;
            case 'SDS':
              iconName = 'security';
              break;
            case 'EPG':
              iconName = 'description';
              break;
            case 'Compatibility':
              iconName = 'compare';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Trips" 
        component={TripsStackNavigator}
        options={{ tabBarLabel: 'Trips' }}
      />
      <Tab.Screen 
        name="SDS" 
        component={SDSStackNavigator}
        options={{ tabBarLabel: 'SDS' }}
      />
      <Tab.Screen 
        name="EPG" 
        component={EPGStackNavigator}
        options={{ tabBarLabel: 'EPG' }}
      />
      <Tab.Screen 
        name="Compatibility" 
        component={CompatibilityStackNavigator}
        options={{ tabBarLabel: 'Comp.' }}
      />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
};
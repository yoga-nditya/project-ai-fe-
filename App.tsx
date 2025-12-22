import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './screens/Onboardingscreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import DocumentPreviewScreen from './screens/DocumentPreviewScreen';
import HistoryScreen from './screens/HistoryScreen';
import DocumentsScreen from './screens/DocumentsScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Home: undefined;
  Chat: { taskType: string; historyId?: number; autoStart?: boolean }; // ✅ tambah autoStart
  DocumentPreview: {
    documentUrl: string;
    documentTitle: string;
    pdfUrl?: string;
  };
  History: undefined;
  Documents: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen
          name="DocumentPreview"
          component={DocumentPreviewScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';

import SplashView from './SplashView'; 

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
  Chat: { taskType: string; historyId?: number; autoStart?: boolean };
  DocumentPreview: {
    documentUrl: string;
    documentTitle: string;
    pdfUrl?: string;
  };
  History: undefined;
  Documents: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let timer: any;

    (async () => {
      try {
        await SplashScreen.hideAsync();
        timer = setTimeout(() => {
          setAppReady(true);
        }, 3000);
      } catch {
        setAppReady(true);
      }
    })();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!appReady) return <SplashView />;

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

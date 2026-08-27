import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// 🔔 Manejador de notificaciones FCM en segundo plano y estado KILLED (app cerrada)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM Background/Killed] Notificación recibida:', remoteMessage.notification?.title);
  
  // Programar notificación visual y sonora local de alta prioridad
  await Notifications.scheduleNotificationAsync({
    content: {
      title: remoteMessage.notification?.title || '🔔 ¡NUEVO PEDIDO DE YOGUR!',
      body: remoteMessage.notification?.body || 'Un cliente acaba de realizar una orden',
      sound: 'default',
      vibrate: [0, 500, 200, 500, 200, 1000],
    },
    trigger: null,
  });
});

// Configuración global de alertas locales de Expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 3000,
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

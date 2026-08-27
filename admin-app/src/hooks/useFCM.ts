import { useEffect } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { api } from '../api/client';

export const NOTIFICATION_CHANNEL_ID = 'pedidos_abuela_urgente';

export const useFCM = (onOrderReceived?: () => void) => {
  useEffect(() => {
    const setupFCM = async () => {
      try {
        // 1. Configurar canal de notificación nativo en Android (Alta prioridad)
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
            name: 'Pedidos Urgentes Yogures Alba',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 200, 500, 200, 1000],
            lightColor: '#FF4081',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            bypassDnd: true,
          });
        }

        // 2. Solicitar permisos nativos de Firebase Messaging
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          // 3. Obtener token nativo y sincronizarlo silenciosamente con Render
          const token = await messaging().getToken();
          if (token) {
            console.log('[FCM Native] Token obtenido:', token.substring(0, 20) + '...');
            await api.registrarTokenFCM(token);
          }
        }
      } catch (err) {
        console.error('[FCM Native] Error inicializando FCM:', err);
      }
    };

    setupFCM();

    // 4. Listener cuando se refresca el token FCM
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      try {
        console.log('[FCM Native] Token refrescado:', newToken.substring(0, 20) + '...');
        await api.registrarTokenFCM(newToken);
      } catch (err) {
        console.error('[FCM Native] Error enviando token refrescado:', err);
      }
    });

    // 5. Listener de mensajes en primer plano (Foreground)
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('[FCM Foreground] Pedido recibido:', remoteMessage.notification?.title);
      
      // Vibración de alerta fuerte
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Mostrar notificación local visible
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || '🔔 ¡NUEVO PEDIDO!',
          body: remoteMessage.notification?.body || 'Tienes un nuevo pedido de yogur',
          sound: 'default',
          vibrate: [0, 500, 200, 500],
        },
        trigger: null,
      });

      if (onOrderReceived) {
        onOrderReceived();
      }
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeOnMessage();
    };
  }, [onOrderReceived]);
};


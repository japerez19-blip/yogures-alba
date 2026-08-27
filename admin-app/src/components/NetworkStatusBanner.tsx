import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const NetworkStatusBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ SIN CONEXIÓN A INTERNET - VERIFICANDO...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B91C1C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});


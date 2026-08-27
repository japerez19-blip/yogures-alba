import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { BigButton } from '../components/BigButton';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!password.trim()) {
      Alert.alert('Atención', 'Por favor ingresa la contraseña de la abuela');
      return;
    }
    setLoading(true);
    const success = await login(password.trim());
    setLoading(false);
    if (!success) {
      Alert.alert('Error', 'Contraseña incorrecta. Inténtalo de nuevo.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>🍓</Text>
          <Text style={styles.title}>Yogures Alba</Text>
          <Text style={styles.subtitle}>Panel Administrativo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>CONTRASEÑA DE ACCESO:</Text>
          <TextInput
            style={styles.input}
            placeholder="Escribe la clave aquí..."
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />

          <BigButton
            title="INGRESAR AL PANEL"
            variant="primary"
            loading={loading}
            onPress={handleLogin}
            style={styles.loginBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF1F2',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#9F1239',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#FECDD3',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '900',
    color: '#374151',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  input: {
    height: 68,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 24,
  },
  loginBtn: {
    marginTop: 8,
  },
});


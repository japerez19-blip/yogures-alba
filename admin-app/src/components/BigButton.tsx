import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface BigButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const BigButton: React.FC<BigButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const handlePress = async () => {
    if (disabled || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const getBackgroundColor = () => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'success':
        return '#059669'; // Verde oscuro de alto contraste
      case 'danger':
        return '#DC2626'; // Rojo vibrante
      case 'secondary':
        return '#4B5563'; // Gris carbón
      case 'primary':
      default:
        return '#E11D48'; // Rosado frambuesa Yogures Alba
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 68,
    minWidth: 68,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  text: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});


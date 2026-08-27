import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useOrders } from '../hooks/useOrders';
import { NetworkStatusBanner } from '../components/NetworkStatusBanner';
import * as Haptics from 'expo-haptics';

// Lista de sabores conocidos y estándar del catálogo
const PRODUCTOS_CATALOGO = [
  { id: 1, sabor: 'Fresa', tamano: 'Pequeño', emoji: '🍓' },
  { id: 2, sabor: 'Fresa', tamano: 'Grande', emoji: '🍓' },
  { id: 3, sabor: 'Durazno', tamano: 'Pequeño', emoji: '🍑' },
  { id: 4, sabor: 'Durazno', tamano: 'Grande', emoji: '🍑' },
  { id: 5, sabor: 'Piña', tamano: 'Pequeño', emoji: '🍍' },
  { id: 6, sabor: 'Piña', tamano: 'Grande', emoji: '🍍' },
  { id: 7, sabor: 'Natural', tamano: 'Pequeño', emoji: '🥛' },
  { id: 8, sabor: 'Natural', tamano: 'Grande', emoji: '🥛' },
  { id: 9, sabor: 'Guanábana', tamano: 'Pequeño', emoji: '🍈' },
  { id: 10, sabor: 'Guanábana', tamano: 'Grande', emoji: '🍈' },
];

export const StockScreen: React.FC = () => {
  const { agotados, actualizarStock, isActualizandoStock, refetch, isLoading } = useOrders();

  const handleAdjust = async (id: number, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actualizarStock({ id, delta });
  };

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBanner />

      <View style={styles.header}>
        <Text style={styles.title}>INVENTARIO Y STOCK</Text>
        <Text style={styles.subtitle}>
          Control rápido de disponibilidad de yogures
        </Text>
      </View>

      <FlatList
        data={PRODUCTOS_CATALOGO}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={['#E11D48']}
            tintColor="#E11D48"
          />
        }
        renderItem={({ item }) => {
          const itemKey = `${item.sabor} (${item.tamano})`;
          const isAgotado = agotados.includes(itemKey);

          return (
            <View
              style={[
                styles.itemCard,
                isAgotado ? styles.cardAgotado : styles.cardDisponible,
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.textContainer}>
                  <Text style={styles.saborText}>{item.sabor}</Text>
                  <Text style={styles.tamanoText}>{item.tamano.toUpperCase()}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isAgotado ? styles.pillAgotado : styles.pillDisponible,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isAgotado ? styles.textAgotado : styles.textDisponible,
                      ]}
                    >
                      {isAgotado ? '❌ AGOTADO' : '✅ DISPONIBLE'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.controls}>
                {/* Botón Reducir Stock */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isActualizandoStock}
                  style={[styles.stepBtn, styles.stepBtnMinus]}
                  onPress={() => handleAdjust(item.id, -1)}
                >
                  <Text style={styles.stepBtnText}>- 1</Text>
                </TouchableOpacity>

                {/* Botón Aumentar Stock */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isActualizandoStock}
                  style={[styles.stepBtn, styles.stepBtnPlus]}
                  onPress={() => handleAdjust(item.id, 1)}
                >
                  <Text style={styles.stepBtnText}>+ 1</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 3,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardDisponible: {
    borderColor: '#E5E7EB',
  },
  cardAgotado: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF5F5',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 44,
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  saborText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  tamanoText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  pillDisponible: {
    backgroundColor: '#D1FAE5',
  },
  pillAgotado: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '900',
  },
  textDisponible: {
    color: '#047857',
  },
  textAgotado: {
    color: '#B91C1C',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  stepBtnMinus: {
    backgroundColor: '#EF4444',
  },
  stepBtnPlus: {
    backgroundColor: '#10B981',
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

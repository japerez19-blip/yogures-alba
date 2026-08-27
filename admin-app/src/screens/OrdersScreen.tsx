import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useOrders } from '../hooks/useOrders';
import { useFCM } from '../hooks/useFCM';
import { OrderCard } from '../components/OrderCard';
import { NetworkStatusBanner } from '../components/NetworkStatusBanner';

export const OrdersScreen: React.FC = () => {
  const {
    pedidos,
    isLoading,
    isRefetching,
    refetch,
    despacharPedido,
    isDespachando,
  } = useOrders();

  // FCM listener para auto-refrescar cuando llegue un push
  useFCM(() => {
    refetch();
  });

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBanner />

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>PEDIDOS ENTRANTES</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{pedidos.length}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {pedidos.length === 1
            ? '1 pedido pendiente de entrega'
            : `${pedidos.length} pedidos pendientes de entrega`}
        </Text>
      </View>

      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={refetch}
            colors={['#E11D48']}
            tintColor="#E11D48"
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            pedido={item}
            onDespachar={despacharPedido}
            isDespachando={isDespachando}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>¡TODO AL DÍA!</Text>
              <Text style={styles.emptySubtitle}>
                No hay pedidos pendientes en este momento.
              </Text>
            </View>
          ) : null
        }
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.5,
  },
  counterBadge: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#059669',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 26,
  },
});

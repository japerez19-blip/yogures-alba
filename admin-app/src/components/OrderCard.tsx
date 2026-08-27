import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BigButton } from './BigButton';
import { PedidoItem } from '../api/client';

interface OrderCardProps {
  pedido: PedidoItem;
  onDespachar: (id: number) => void;
  isDespachando?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  pedido,
  onDespachar,
  isDespachando = false,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>#{pedido.id}</Text>
        </View>
        <Text style={styles.clienteText}>{pedido.cliente}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.descripcionLabel}>PRODUCTOS SOLICITADOS:</Text>
        <Text style={styles.descripcionText}>{pedido.descripcion}</Text>
      </View>

      <View style={styles.footer}>
        <BigButton
          title="✅ DESPACHAR / LISTO"
          variant="success"
          loading={isDespachando}
          onPress={() => onDespachar(pedido.id)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  clienteText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    flex: 1,
  },
  body: {
    backgroundColor: '#FFF1F2',
    padding: 16,
    borderRadius: 16,
    marginBottom: 18,
    borderLeftWidth: 6,
    borderLeftColor: '#E11D48',
  },
  descripcionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9F1239',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  descripcionText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 32,
  },
  footer: {
    marginTop: 4,
  },
});


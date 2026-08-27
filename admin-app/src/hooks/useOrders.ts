import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { api, PedidosResponse } from '../api/client';

export const useOrders = () => {
  const queryClient = useQueryClient();

  // Escuchar cambios de red para refrescar de inmediato al reconectar
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Consulta de pedidos con polling cada 8 segundos
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useQuery<PedidosResponse>({
    queryKey: ['pedidos'],
    queryFn: api.getPedidosPendientes,
    refetchInterval: 8000,
    staleTime: 4000,
    retry: 3,
  });

  // Mutación para despachar pedido
  const despacharMutation = useMutation({
    mutationFn: (id: number) => api.despacharPedido(id),
    onMutate: async (id) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await queryClient.cancelQueries({ queryKey: ['pedidos'] });
      const previousData = queryClient.getQueryData<PedidosResponse>(['pedidos']);

      if (previousData) {
        queryClient.setQueryData<PedidosResponse>(['pedidos'], {
          ...previousData,
          pedidos: previousData.pedidos.filter((p) => p.id !== id),
        });
      }
      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['pedidos'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });

  // Mutación para actualizar stock de productos
  const actualizarStockMutation = useMutation({
    mutationFn: ({ id, delta }: { id: number; delta: number }) =>
      api.actualizarStock(id, delta),
    onMutate: async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });

  return {
    pedidos: data?.pedidos || [],
    agotados: data?.agotados || [],
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
    despacharPedido: despacharMutation.mutate,
    isDespachando: despacharMutation.isPending,
    actualizarStock: actualizarStockMutation.mutate,
    isActualizandoStock: actualizarStockMutation.isPending,
  };
};


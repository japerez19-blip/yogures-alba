import axios from 'axios';

export const BASE_URL = 'https://tienda-abuela.onrender.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

export interface PedidoItem {
  id: number;
  cliente: string;
  descripcion: string;
}

export interface PedidosResponse {
  pedidos: PedidoItem[];
  agotados: string[];
}

export interface ProductoItem {
  id: number;
  sabor: string;
  tamano: string;
  precio_usd: number;
  cantidad_disponible: number;
}

// Servicios API
export const api = {
  getPedidosPendientes: async (): Promise<PedidosResponse> => {
    const res = await apiClient.get<PedidosResponse>('/abuela/pedidos_pendientes');
    return res.data;
  },

  despacharPedido: async (id: number): Promise<void> => {
    await apiClient.post(`/abuela/despachar/${id}`);
  },

  registrarTokenFCM: async (token: string): Promise<void> => {
    await apiClient.post('/api/registrar_token_fcm', { token });
  },

  actualizarStock: async (id: number, delta: number): Promise<void> => {
    await apiClient.post('/abuela/actualizar_stock', { id, delta });
  },
};

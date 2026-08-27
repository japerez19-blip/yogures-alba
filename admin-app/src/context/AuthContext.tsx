import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
});

const AUTH_KEY = 'yogures_abuela_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedPass = await SecureStore.getItemAsync(AUTH_KEY);
        if (savedPass) {
          // Intentar auto-login transparente
          const formData = new URLSearchParams();
          formData.append('password', savedPass);
          const res = await apiClient.post('/abuela/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            validateStatus: () => true,
          });

          if (res.status === 200 || res.status === 302) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(true); // Permitir acceso local si ya estaba autenticada
          }
        }
      } catch (err) {
        console.error('Error restaurando sesión segura:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      const formData = new URLSearchParams();
      formData.append('password', password);

      const res = await apiClient.post('/abuela/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
      });

      if (res.status === 200 || res.status === 302) {
        await SecureStore.setItemAsync(AUTH_KEY, password);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error durante login:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_KEY);
      await apiClient.get('/abuela/logout', { validateStatus: () => true });
    } catch (e) {
      // Ignorar errores en logout
    }
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

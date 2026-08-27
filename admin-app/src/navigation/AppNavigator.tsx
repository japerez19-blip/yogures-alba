import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OrdersScreen } from '../screens/OrdersScreen';
import { StockScreen } from '../screens/StockScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 76,
          paddingBottom: 12,
          paddingTop: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 3,
          borderTopColor: '#E5E7EB',
        },
        tabBarActiveTintColor: '#E11D48',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 16,
          fontWeight: '900',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Pedidos"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'PEDIDOS',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 26 }}>{focused ? '🔔' : '🔕'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Inventario"
        component={StockScreen}
        options={{
          tabBarLabel: 'INVENTARIO',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 26 }}>{focused ? '🍓' : '📦'}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};


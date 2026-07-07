import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home';
import AddExpense from '../screens/AddExpense';
import Reports from '../screens/Reports';
import Settings from '../screens/Settings';
import TransactionDetail from '../screens/TransactionDetail';
import Chatbot from '../screens/Chatbot';
import { typography } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { Home as HomeIcon, PlusCircle, PieChart, Settings as SettingsIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.hairline,
        },
        tabBarLabelStyle: {
          ...typography.captionMono,
          fontSize: 10,
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={Home} 
        options={{ tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="Add" 
        component={AddExpense} 
        options={{ tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="Reports" 
        component={Reports} 
        options={{ tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="Settings" 
        component={Settings} 
        options={{ tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} /> }} 
      />
    </Tab.Navigator>
  );
};

export const AppStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen 
        name="TransactionDetail" 
        component={TransactionDetail} 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Chatbot" 
        component={Chatbot} 
        options={{ presentation: 'modal' }} 
      />
    </Stack.Navigator>
  );
};

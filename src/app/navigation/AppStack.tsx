import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Home from '../screens/Home';
import AddExpense from '../screens/AddExpense';
import Reports from '../screens/Reports';
import Settings from '../screens/Settings';
import Transactions from '../screens/Transactions';
import TransactionDetail from '../screens/TransactionDetail';
import Budgets from '../screens/Budgets';
import RecurringExpenses from '../screens/RecurringExpenses';
import Chatbot from '../screens/Chatbot';
import { Sidebar } from './Sidebar';
import { typography } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { Home as HomeIcon, PlusCircle, PieChart, Settings as SettingsIcon, History as HistoryIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ Icon, focused, colors }: any) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.5)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const iconScaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.5,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: focused ? 1.15 : 1, // Dynamic bounce scale for the icon
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      })
    ]).start();
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[
        styles.pill,
        {
          backgroundColor: `${colors.primary}1F`,
          opacity: opacityAnim,
          transform: [{ scaleX: scaleAnim }],
        }
      ]} />
      <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
        <Icon color={focused ? colors.primary : colors.mute} size={22} />
      </Animated.View>
    </View>
  );
};

const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade', // Crossfade animation on tab switch
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.hairline,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          ...typography.captionMono,
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={Home} 
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={HomeIcon} focused={focused} colors={colors} /> }} 
      />
      <Tab.Screen 
        name="Transactions" 
        component={Transactions} 
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={HistoryIcon} focused={focused} colors={colors} /> }} 
      />
      <Tab.Screen 
        name="Add" 
        component={AddExpense} 
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={PlusCircle} focused={focused} colors={colors} /> }} 
      />
      <Tab.Screen 
        name="Reports" 
        component={Reports} 
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={PieChart} focused={focused} colors={colors} /> }} 
      />
      <Tab.Screen 
        name="Settings" 
        component={Settings} 
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={SettingsIcon} focused={focused} colors={colors} /> }} 
      />
    </Tab.Navigator>
  );
};

export const AppStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      
      <Stack.Screen 
        name="Sidebar" 
        component={Sidebar} 
        options={{ 
          presentation: 'transparentModal',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' }
        }} 
      />
      
      <Stack.Screen 
        name="TransactionDetail" 
        component={TransactionDetail} 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Budgets" 
        component={Budgets} 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="RecurringExpenses" 
        component={RecurringExpenses} 
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

const styles = StyleSheet.create({
  iconContainer: {
    width: 64,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    position: 'absolute',
    width: 64,
    height: 32,
    borderRadius: 16,
  },
});

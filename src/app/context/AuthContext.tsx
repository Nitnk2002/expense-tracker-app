import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/apiClient';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  login: (accessToken: string, refreshToken: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  userId: null,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        if (token) {
          setIsLoggedIn(true);
          setUserId(storedUserId);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Error reading token:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  const login = async (accessToken: string, refreshToken: string, newUserId: string) => {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('userId', newUserId);
    setUserId(newUserId);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('Failed to clear AsyncStorage', e);
    }
    setUserId(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

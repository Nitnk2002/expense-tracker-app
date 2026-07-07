import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors, getTypography } from '../theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextData {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
  typography: ReturnType<typeof getTypography>;
}

export const ThemeContext = createContext<ThemeContextData>({
  themeMode: 'system',
  setThemeMode: () => {},
  isDarkMode: false,
  toggleTheme: () => {},
  colors: lightColors,
  typography: getTypography(lightColors),
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setMode] = useState<ThemeMode>('system');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_mode');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setMode(savedTheme);
        } else {
          // Backwards compatibility with old '@dark_mode' key
          const oldSavedTheme = await AsyncStorage.getItem('@dark_mode');
          if (oldSavedTheme !== null) {
            setMode(oldSavedTheme === 'true' ? 'dark' : 'light');
          }
        }
      } catch (error) {
        console.warn('Error loading theme:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setMode(mode);
      await AsyncStorage.setItem('@theme_mode', mode);
    } catch (error) {
      console.warn('Error saving theme mode:', error);
    }
  };

  const isDarkMode = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const toggleTheme = async () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  const currentColors = isDarkMode ? darkColors : lightColors;
  const currentTypography = getTypography(currentColors);

  // Avoid flashing incorrect theme before async storage loads
  if (!isInitialized) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDarkMode, toggleTheme, colors: currentColors, typography: currentTypography }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

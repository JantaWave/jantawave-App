import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    icon: string;
  };
}

// JS object for non-tailwind components (Charts, Icons props)
const Colors = {
  primary: '#2196F3',
  light: {
    background: '#ffffff',
    card: '#f8f9fa',
    text: '#0f172a',
    border: '#e2e8f0',
    icon: '#475569',
  },
  dark: {
    background: '#0a0a0a',
    card: '#171717',
    text: '#f8fafc',
    border: '#262626',
    icon: '#cbd5e1',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useNativeColorScheme();
  const { colorScheme, setColorScheme } = useNativeWindColorScheme(); // NativeWind hook
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load saved theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');
        if (savedTheme) {
          handleThemeChange(savedTheme as ThemeMode);
        } else {
          handleThemeChange('system');
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      }
    };
    loadTheme();
  }, []);

  // Handle System Changes
  useEffect(() => {
    if (themeMode === 'system') {
      setColorScheme(systemScheme || 'light');
    }
  }, [systemScheme, themeMode]);

  const handleThemeChange = async (newMode: ThemeMode) => {
    setThemeModeState(newMode);
    await AsyncStorage.setItem('app-theme', newMode);

    if (newMode === 'system') {
      setColorScheme(systemScheme || 'light');
    } else {
      setColorScheme(newMode);
    }
  };

  const isDark = colorScheme === 'dark';
  const activeColors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        setThemeMode: handleThemeChange,
        colors: { ...activeColors, primary: Colors.primary },
      }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={activeColors.background} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
};

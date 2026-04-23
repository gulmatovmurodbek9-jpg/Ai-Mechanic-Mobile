import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = '@ai_mechanic/theme';

interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  danger: string;
  success: string;
  warning: string;
}

const LIGHT: ThemeColors = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  text: '#0F1728',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  primary: '#2256D8',
  primarySoft: '#F0F4FF',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

const DARK: ThemeColors = {
  bg: '#0B1220',
  surface: '#111B2E',
  surfaceAlt: '#0F1B3D',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#1E293B',
  primary: '#3B82F6',
  primarySoft: '#1E293B',
  danger: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: LIGHT,
  toggle: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') setModeState(saved);
      } catch {}
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const colors = mode === 'dark' ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

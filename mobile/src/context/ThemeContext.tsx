import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceCard: string;
  surfaceBorder: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  danger: string;
  warning: string;
  success: string;
  chipBg: string;
  bottomNavBg: string;
}

export const darkColors: ThemeColors = {
  bg: '#0A192F',
  surface: '#0F2444',
  surfaceCard: '#132B52',
  surfaceBorder: '#1E3A6D',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  accent: '#0D9488',
  accentLight: '#14B8A6',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  chipBg: '#173663',
  bottomNavBg: '#0A182E',
};

export const lightColors: ThemeColors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceCard: '#F1F5F9',
  surfaceBorder: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#1E3A8A',
  primaryLight: '#2563EB',
  accent: '#0D9488',
  accentLight: '#0F766E',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#059669',
  chipBg: '#E2E8F0',
  bottomNavBg: '#FFFFFF',
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  colors: lightColors,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('docuvault_theme') as ThemeMode) || (localStorage.getItem('digivault_theme') as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('docuvault_theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const colors = mode === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

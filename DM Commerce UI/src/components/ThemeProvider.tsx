import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Theme, AppSettings } from '../types';

interface ThemeContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  themeClasses: {
    bg: string;
    panel: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    hover: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfigs = {
  sunset: {
    bg: 'bg-gradient-to-br from-orange-50 to-pink-50',
    panel: 'bg-white/80 backdrop-blur-sm border-orange-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-orange-200',
    accent: 'bg-orange-500 hover:bg-orange-600',
    hover: 'hover:bg-orange-50'
  },
  sky: {
    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    panel: 'bg-white/80 backdrop-blur-sm border-blue-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-blue-200',
    accent: 'bg-blue-500 hover:bg-blue-600',
    hover: 'hover:bg-blue-50'
  },
  dark: {
    bg: 'bg-gray-900',
    panel: 'bg-gray-800/90 backdrop-blur-sm border-gray-700',
    text: 'text-gray-100',
    textSecondary: 'text-gray-400',
    border: 'border-gray-700',
    accent: 'bg-indigo-600 hover:bg-indigo-700',
    hover: 'hover:bg-gray-700'
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'sunset',
    showEmojis: true,
    autoReply: true,
    deliveryFee: 4.9,
    etaDays: 2
  });

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const themeClasses = themeConfigs[settings.theme];

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, themeClasses }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
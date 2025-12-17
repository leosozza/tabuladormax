import { useState, useEffect } from 'react';

export type TelemarketingTheme = 
  | 'theme-light' 
  | 'theme-light-blue' 
  | 'theme-light-purple'
  | 'theme-dark' 
  | 'theme-dark-blue' 
  | 'theme-dark-purple';

export interface ThemeOption {
  id: TelemarketingTheme;
  name: string;
  icon: string;
  isDark: boolean;
  preview: {
    bg: string;
    primary: string;
  };
}

export const TELEMARKETING_THEMES: ThemeOption[] = [
  { 
    id: 'theme-light', 
    name: 'Claro Padrão', 
    icon: '☀️', 
    isDark: false,
    preview: { bg: '#ffffff', primary: '#0d9488' }
  },
  { 
    id: 'theme-light-blue', 
    name: 'Azul Claro', 
    icon: '🔵', 
    isDark: false,
    preview: { bg: '#f8fafc', primary: '#3b82f6' }
  },
  { 
    id: 'theme-light-purple', 
    name: 'Roxo Claro', 
    icon: '🟣', 
    isDark: false,
    preview: { bg: '#faf5ff', primary: '#8b5cf6' }
  },
  { 
    id: 'theme-dark', 
    name: 'Escuro Padrão', 
    icon: '🌙', 
    isDark: true,
    preview: { bg: '#1e293b', primary: '#14b8a6' }
  },
  { 
    id: 'theme-dark-blue', 
    name: 'Azul Escuro', 
    icon: '🔷', 
    isDark: true,
    preview: { bg: '#0f172a', primary: '#60a5fa' }
  },
  { 
    id: 'theme-dark-purple', 
    name: 'Roxo Escuro', 
    icon: '💜', 
    isDark: true,
    preview: { bg: '#1e1b2e', primary: '#a78bfa' }
  },
];

const STORAGE_KEY = 'telemarketing_theme';

export const useTelemarketingTheme = () => {
  const [theme, setThemeState] = useState<TelemarketingTheme>(() => {
    if (typeof window === 'undefined') return 'theme-light';
    return (localStorage.getItem(STORAGE_KEY) as TelemarketingTheme) || 'theme-light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remover todas as classes de tema
    TELEMARKETING_THEMES.forEach(t => root.classList.remove(t.id));
    
    // Adicionar a classe do tema atual
    root.classList.add(theme);
    
    // Adicionar/remover classe .dark para temas escuros
    const themeConfig = TELEMARKETING_THEMES.find(t => t.id === theme);
    const isDark = themeConfig?.isDark ?? false;
    root.classList.toggle('dark', isDark);
    
    // Salvar no localStorage
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: TelemarketingTheme) => {
    setThemeState(newTheme);
  };

  const currentTheme = TELEMARKETING_THEMES.find(t => t.id === theme);

  return { 
    theme, 
    setTheme, 
    themes: TELEMARKETING_THEMES,
    currentTheme,
    isDark: currentTheme?.isDark ?? false
  };
};

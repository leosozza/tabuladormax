
import { useState, useEffect } from 'react';

export type Theme = 
  | 'corporate'
  | 'analytics'
  | 'medical'
  | 'presentation'
  | 'dark-pro';

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('maxfama_theme') as Theme;
    return ['corporate', 'analytics', 'medical', 'presentation', 'dark-pro'].includes(savedTheme) 
      ? savedTheme 
      : 'corporate';
  });

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Remove todas as classes de tema existentes
    root.className = root.className.replace(/theme-\w+(-\w+)?/g, '');
    root.classList.remove('dark');
    
    // Aplica o novo tema
    switch (theme) {
      case 'dark-pro':
        root.classList.add('theme-dark-pro');
        break;
      default:
        root.classList.add(`theme-${theme}`);
        break;
    }
    
    setCurrentTheme(theme);
    localStorage.setItem('maxfama_theme', theme);
  };

  const getThemeName = (theme: Theme): string => {
    const themeNames: Record<Theme, string> = {
      corporate: 'Corporate',
      analytics: 'Analytics',
      medical: 'Medical',
      presentation: 'Apresentação',
      'dark-pro': 'Dark Pro'
    };
    return themeNames[theme] || theme;
  };

  const getChartColors = (theme: Theme): string[] => {
    const chartColorsByTheme: Record<Theme, string[]> = {
      corporate: [
        'hsl(220, 50%, 55%)',
        'hsl(210, 45%, 60%)',
        'hsl(200, 40%, 65%)',
        'hsl(190, 35%, 70%)',
        'hsl(180, 30%, 75%)'
      ],
      analytics: [
        'hsl(260, 100%, 65%)',
        'hsl(200, 100%, 60%)',
        'hsl(120, 100%, 50%)',
        'hsl(30, 100%, 55%)',
        'hsl(0, 100%, 65%)'
      ],
      medical: [
        'hsl(250, 80%, 65%)',
        'hsl(270, 75%, 60%)',
        'hsl(290, 70%, 65%)',
        'hsl(310, 65%, 70%)',
        'hsl(200, 70%, 60%)'
      ],
      presentation: [
        'hsl(210, 85%, 60%)',
        'hsl(160, 80%, 50%)',
        'hsl(40, 90%, 55%)',
        'hsl(320, 75%, 65%)',
        'hsl(20, 85%, 60%)'
      ],
      'dark-pro': [
        'hsl(180, 100%, 50%)',
        'hsl(280, 100%, 70%)',
        'hsl(120, 100%, 60%)',
        'hsl(60, 100%, 65%)',
        'hsl(0, 100%, 70%)'
      ]
    };
    
    return chartColorsByTheme[theme] || chartColorsByTheme.corporate;
  };

  // Aplica o tema inicial quando o hook é montado
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  return {
    currentTheme,
    applyTheme,
    getThemeName,
    getChartColors
  };
};

import { useEffect } from 'react';
import { useSettingsStore } from '../store';
import { getTheme } from '../lib/themes';
import type { ThemeColors } from '../types';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { activeTheme, theme: mode } = useSettingsStore((s) => ({
    activeTheme: s.settings.activeTheme,
    theme: s.settings.theme,
  }));

  useEffect(() => {
    const currentTheme = getTheme(activeTheme);
    const variant = mode === 'light' ? currentTheme.light : currentTheme.dark;
    
    applyThemeColors(variant.colors);
    
    // Update data-theme attribute for CSS
    document.documentElement.setAttribute('data-theme', mode);
  }, [activeTheme, mode]);

  return <>{children}</>;
};

// Helper function to apply theme colors as CSS variables
function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement;
  
  // Background colors
  root.style.setProperty('--bg-primary', colors.bgPrimary);
  root.style.setProperty('--bg-surface', colors.bgSurface);
  root.style.setProperty('--bg-elevated', colors.bgElevated);
  root.style.setProperty('--bg-hover', colors.bgHover);
  root.style.setProperty('--bg-input', colors.bgInput);
  root.style.setProperty('--bg-inset', colors.bgInset);
  
  // Text colors
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-faint', colors.textFaint);
  
  // Border colors
  root.style.setProperty('--border-color', colors.borderColor);
  root.style.setProperty('--border-input', colors.borderInput);
  root.style.setProperty('--border-subtle', colors.borderSubtle);
  
  // Shadows
  root.style.setProperty('--shadow-sm', colors.shadowSm);
  root.style.setProperty('--shadow-md', colors.shadowMd);
  root.style.setProperty('--shadow-lg', colors.shadowLg);
  
  // Accent colors
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-bg', colors.accentBg);
  root.style.setProperty('--accent-text', colors.accentText);
  
  // UI elements
  root.style.setProperty('--overlay', colors.overlay);
  root.style.setProperty('--scrollbar', colors.scrollbar);
  root.style.setProperty('--scrollbar-hover', colors.scrollbarHover);
  root.style.setProperty('--code-bg', colors.codeBg);
  root.style.setProperty('--code-text', colors.codeText);
}

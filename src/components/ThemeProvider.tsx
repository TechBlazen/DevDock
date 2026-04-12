import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { getTheme } from '../lib/themes';
import type { ThemeColors } from '../types';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Admin-level theme (which theme pack to use)
  const activeTheme = useSettingsStore((s) => s.settings.activeTheme);
  // User-level preference (dark / light / system)
  const { prefs } = useUserPreferences();
  const mode = prefs.theme;

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedMode: 'dark' | 'light' =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const currentTheme = getTheme(activeTheme);
    const variant = resolvedMode === 'light' ? currentTheme.light : currentTheme.dark;

    applyThemeColors(variant.colors);

    // Apply theme font if specified
    const root = document.documentElement;
    if (currentTheme.fontFamily) {
      root.style.setProperty('--font-family', currentTheme.fontFamily);
      root.style.fontFamily = currentTheme.fontFamily;
    } else {
      root.style.removeProperty('--font-family');
      root.style.fontFamily = '';
    }
    if (currentTheme.fontSize) {
      root.style.fontSize = currentTheme.fontSize;
    } else {
      root.style.fontSize = '';
    }

    // Update data-theme attribute for CSS
    document.documentElement.setAttribute('data-theme', resolvedMode);
  }, [activeTheme, resolvedMode]);

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

  // Navigation
  root.style.setProperty('--nav-active-bg', colors.navActiveBg);
  root.style.setProperty('--nav-active-indicator', colors.navActiveIndicator);
  root.style.setProperty('--nav-hover-bg', colors.navHoverBg);

  // Header & Footer
  root.style.setProperty('--header-shadow', colors.headerShadow);
  root.style.setProperty('--footer-bg', colors.footerBg);
  root.style.setProperty('--footer-text', colors.footerText);

  // Buttons
  root.style.setProperty('--btn-hover-bg', colors.btnHoverBg);
  root.style.setProperty('--btn-active-bg', colors.btnActiveBg);
  root.style.setProperty('--btn-radius', colors.btnRadius);

  // Tooltip
  root.style.setProperty('--tooltip-bg', colors.tooltipBg);
  root.style.setProperty('--tooltip-text', colors.tooltipText);
}

import { useEffect, useState, useCallback } from 'react';
import { useUserPreferences } from './useUserPreferences';

export function useTheme() {
  const { prefs, update } = useUserPreferences();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', prefs.accentColor);
    // Generate a subtle background tint from the accent
    const isCurrentDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const accentBg = isCurrentDark
      ? `${prefs.accentColor}1f`  // ~12% opacity
      : `${prefs.accentColor}18`; // ~9% opacity
    document.documentElement.style.setProperty('--accent-bg', accentBg);
    document.documentElement.style.setProperty('--accent-text', prefs.accentColor);
  }, [prefs.accentColor, resolvedTheme]);

  const setTheme = useCallback((theme: 'dark' | 'light' | 'system') => {
    update({ theme });
  }, [update]);

  return { resolvedTheme, setTheme };
}

import type { Theme, ThemeColors } from '../types';

// Default Theme (current look and feel)
const defaultLightColors: ThemeColors = {
  // Background colors
  bgPrimary: '#f0f2f5',
  bgSurface: '#ffffff',
  bgElevated: '#ffffff',
  bgHover: '#f8f9fa',
  bgInput: '#ffffff',
  bgInset: '#fafafa',
  
  // Text colors
  textPrimary: '#1a1a2e',
  textSecondary: '#555',
  textMuted: '#999',
  textFaint: '#bbb',
  
  // Border colors
  borderColor: '#e0e0e0',
  borderInput: '#ccc',
  borderSubtle: '#eee',
  
  // Shadows
  shadowSm: '0 1px 3px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.1)',
  shadowLg: '0 20px 60px rgba(0,0,0,0.15)',
  
  // Accent
  accent: '#005DAA',
  accentBg: '#e8f0fe',
  accentText: '#005DAA',
  
  // UI elements
  overlay: 'rgba(0,0,0,0.4)',
  scrollbar: 'rgba(0,0,0,0.12)',
  scrollbarHover: 'rgba(0,0,0,0.2)',
  codeBg: 'rgba(42,111,255,0.08)',
  codeText: 'rgba(42,111,255,0.9)',
};

const defaultDarkColors: ThemeColors = {
  // Background colors
  bgPrimary: '#0f1117',
  bgSurface: '#1a1d27',
  bgElevated: '#222633',
  bgHover: '#2a2d3a',
  bgInput: '#1a1d27',
  bgInset: '#151820',
  
  // Text colors
  textPrimary: '#e8eaed',
  textSecondary: '#9aa0a6',
  textMuted: '#6b7280',
  textFaint: '#4b5563',
  
  // Border colors
  borderColor: '#2d3040',
  borderInput: '#3d4050',
  borderSubtle: '#252836',
  
  // Shadows
  shadowSm: '0 1px 3px rgba(0,0,0,0.3)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.4)',
  shadowLg: '0 20px 60px rgba(0,0,0,0.5)',
  
  // Accent
  accent: '#4a9eff',
  accentBg: 'rgba(74,158,255,0.12)',
  accentText: '#4a9eff',
  
  // UI elements
  overlay: 'rgba(0,0,0,0.6)',
  scrollbar: 'rgba(255,255,255,0.1)',
  scrollbarHover: 'rgba(255,255,255,0.2)',
  codeBg: 'rgba(74,158,255,0.12)',
  codeText: '#7cb8ff',
};

// Engineer Workbench Theme (Costco style)
const engineerWorkbenchLightColors: ThemeColors = {
  // Background colors - Clean white with Costco blue accents
  bgPrimary: '#f5f7fa',
  bgSurface: '#ffffff',
  bgElevated: '#ffffff',
  bgHover: '#f0f4f8',
  bgInput: '#ffffff',
  bgInset: '#f8fafc',
  
  // Text colors - Professional dark grays
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textFaint: '#cbd5e1',
  
  // Border colors - Subtle borders
  borderColor: '#e2e8f0',
  borderInput: '#cbd5e1',
  borderSubtle: '#f1f5f9',
  
  // Shadows - Softer shadows
  shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.08)',
  shadowLg: '0 20px 50px rgba(0,0,0,0.12)',
  
  // Accent - Costco blue
  accent: '#0071CE',
  accentBg: '#e6f2ff',
  accentText: '#0071CE',
  
  // UI elements
  overlay: 'rgba(0,0,0,0.35)',
  scrollbar: 'rgba(0,0,0,0.1)',
  scrollbarHover: 'rgba(0,0,0,0.18)',
  codeBg: 'rgba(0,113,206,0.08)',
  codeText: 'rgba(0,113,206,0.85)',
};

const engineerWorkbenchDarkColors: ThemeColors = {
  // Background colors - Deep blues with Costco heritage
  bgPrimary: '#0a1628',
  bgSurface: '#162338',
  bgElevated: '#1e2d45',
  bgHover: '#243549',
  bgInput: '#162338',
  bgInset: '#0d1a2d',
  
  // Text colors - Cool whites and blues
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textFaint: '#475569',
  
  // Border colors
  borderColor: '#1e3a5f',
  borderInput: '#2a4766',
  borderSubtle: '#1a2e47',
  
  // Shadows
  shadowSm: '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.5)',
  shadowLg: '0 20px 60px rgba(0,0,0,0.6)',
  
  // Accent - Brighter Costco blue for dark mode
  accent: '#3b9aff',
  accentBg: 'rgba(59,154,255,0.15)',
  accentText: '#60a5fa',
  
  // UI elements
  overlay: 'rgba(0,0,0,0.7)',
  scrollbar: 'rgba(255,255,255,0.08)',
  scrollbarHover: 'rgba(255,255,255,0.15)',
  codeBg: 'rgba(59,154,255,0.15)',
  codeText: '#93c5fd',
};

// Theme definitions
export const DEFAULT_THEME: Theme = {
  id: 'default',
  name: 'Default',
  description: 'The original DevDock look and feel with modern aesthetics',
  author: 'DevDock Team',
  light: {
    mode: 'light',
    colors: defaultLightColors,
  },
  dark: {
    mode: 'dark',
    colors: defaultDarkColors,
  },
};

export const ENGINEER_WORKBENCH_THEME: Theme = {
  id: 'engineer-workbench',
  name: 'Engineer Workbench',
  description: 'Professional theme inspired by Costco Engineer Workbench',
  author: 'Costco Technology',
  light: {
    mode: 'light',
    colors: engineerWorkbenchLightColors,
  },
  dark: {
    mode: 'dark',
    colors: engineerWorkbenchDarkColors,
  },
};

// Registry of all available themes
export const THEMES: Record<string, Theme> = {
  'default': DEFAULT_THEME,
  'engineer-workbench': ENGINEER_WORKBENCH_THEME,
};

// Helper function to get theme by ID
export const getTheme = (id: string): Theme => {
  return THEMES[id] || DEFAULT_THEME;
};

// Helper function to get all theme IDs
export const getThemeIds = (): string[] => {
  return Object.keys(THEMES);
};

// Helper function to get all themes as array
export const getAllThemes = (): Theme[] => {
  return Object.values(THEMES);
};

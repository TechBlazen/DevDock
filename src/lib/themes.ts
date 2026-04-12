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

  navActiveBg: '#e8f0fe',
  navActiveIndicator: '#005DAA',
  navHoverBg: '#f0f0f0',
  headerShadow: 'none',
  footerBg: 'var(--bg-surface)',
  footerText: 'var(--text-muted)',
  btnHoverBg: '#f0f0f0',
  btnActiveBg: '#e0e0e0',
  btnRadius: '9999px',
  tooltipBg: '#333',
  tooltipText: '#fff',
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

  navActiveBg: 'rgba(74,158,255,0.12)',
  navActiveIndicator: '#4a9eff',
  navHoverBg: '#2a2d3a',
  headerShadow: 'none',
  footerBg: 'var(--bg-surface)',
  footerText: 'var(--text-muted)',
  btnHoverBg: '#2a2d3a',
  btnActiveBg: '#353845',
  btnRadius: '9999px',
  tooltipBg: '#e8eaed',
  tooltipText: '#1a1a2e',
};

// Engineer Workbench Theme (Costco Backstage style)
const engineerWorkbenchLightColors: ThemeColors = {
  // Background colors - Clean white, matching Costco Backstage
  bgPrimary: '#ffffff',
  bgSurface: '#ffffff',
  bgElevated: '#ffffff',
  bgHover: '#FAFAFA',
  bgInput: '#F4F5F5',
  bgInset: '#F4F5F5',

  // Text colors - Costco dark navy
  textPrimary: '#172B48',
  textSecondary: '#002242',
  textMuted: '#64686C',
  textFaint: '#AFAFAF',

  // Border colors - Light greys from Costco palette
  borderColor: '#EEEEEE',
  borderInput: '#CCCCCC',
  borderSubtle: '#F4F5F5',

  // Shadows - Subtle corporate shadows
  shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
  shadowMd: '0 2px 4px rgba(0,0,0,0.1)',
  shadowLg: '0 4px 12px rgba(0,0,0,0.15)',

  // Accent - Costco primary blue #005DAB
  accent: '#005DAB',
  accentBg: '#F4F9FF',
  accentText: '#005DAB',

  // UI elements
  overlay: 'rgba(0,34,66,0.60)',
  scrollbar: 'rgba(0,0,0,0.1)',
  scrollbarHover: 'rgba(0,0,0,0.18)',
  codeBg: '#F4F5F5',
  codeText: '#002242',

  // Costco Backstage navigation
  navActiveBg: '#FAFAFA',
  navActiveIndicator: '#005DAB',
  navHoverBg: '#EAEAEA',

  // Costco header & footer
  headerShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)',
  footerBg: '#0074CC',
  footerText: '#ffffff',

  // Costco buttons - border-radius 3px, light blue hover
  btnHoverBg: '#F4F9FF',
  btnActiveBg: '#E9F1FB',
  btnRadius: '3px',

  // Costco tooltip
  tooltipBg: '#313335',
  tooltipText: '#ffffff',
};

const engineerWorkbenchDarkColors: ThemeColors = {
  // Background colors - Deep Costco navy
  bgPrimary: '#0a1525',
  bgSurface: '#112035',
  bgElevated: '#1a2d45',
  bgHover: '#1e3450',
  bgInput: '#112035',
  bgInset: '#0d1a2d',

  // Text colors - Light counterparts of the Costco navy
  textPrimary: '#e8ecf1',
  textSecondary: '#94a3b8',
  textMuted: '#64686C',
  textFaint: '#475569',

  // Border colors
  borderColor: '#1e3a5f',
  borderInput: '#2a4766',
  borderSubtle: '#162a42',

  // Shadows
  shadowSm: '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.5)',
  shadowLg: '0 8px 24px rgba(0,0,0,0.6)',

  // Accent - Brighter Costco blue for dark mode
  accent: '#4da6ff',
  accentBg: 'rgba(0,93,171,0.2)',
  accentText: '#6db8ff',

  // UI elements
  overlay: 'rgba(0,22,44,0.75)',
  scrollbar: 'rgba(255,255,255,0.08)',
  scrollbarHover: 'rgba(255,255,255,0.15)',
  codeBg: 'rgba(0,93,171,0.15)',
  codeText: '#93c5fd',

  navActiveBg: 'rgba(0,93,171,0.2)',
  navActiveIndicator: '#4da6ff',
  navHoverBg: '#1e3450',
  headerShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.4)',
  footerBg: '#0a1525',
  footerText: '#94a3b8',
  btnHoverBg: '#1e3450',
  btnActiveBg: '#243d5c',
  btnRadius: '3px',
  tooltipBg: '#e8ecf1',
  tooltipText: '#0a1525',
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
  fontFamily: "'Roboto', sans-serif",
  fontSize: '14px',
  light: {
    mode: 'light',
    colors: engineerWorkbenchLightColors,
  },
  dark: {
    mode: 'dark',
    colors: engineerWorkbenchDarkColors,
  },
};

// Matrix Theme
const matrixDarkColors: ThemeColors = {
  bgPrimary: '#000000',
  bgSurface: '#0a0a0a',
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  bgInput: '#0a0a0a',
  bgInset: '#050505',

  textPrimary: '#00ff41',
  textSecondary: '#00cc33',
  textMuted: '#009926',
  textFaint: '#006619',

  borderColor: '#003300',
  borderInput: '#004d00',
  borderSubtle: '#001a00',

  shadowSm: '0 1px 3px rgba(0,255,65,0.06)',
  shadowMd: '0 4px 16px rgba(0,255,65,0.1)',
  shadowLg: '0 20px 60px rgba(0,255,65,0.15)',

  accent: '#00ff41',
  accentBg: 'rgba(0,255,65,0.08)',
  accentText: '#00ff41',

  overlay: 'rgba(0,0,0,0.85)',
  scrollbar: 'rgba(0,255,65,0.15)',
  scrollbarHover: 'rgba(0,255,65,0.3)',
  codeBg: 'rgba(0,255,65,0.06)',
  codeText: '#00ff41',

  navActiveBg: 'rgba(0,255,65,0.08)',
  navActiveIndicator: '#00ff41',
  navHoverBg: '#1a1a1a',
  headerShadow: '0 1px 3px rgba(0,255,65,0.1)',
  footerBg: '#050505',
  footerText: '#009926',
  btnHoverBg: '#1a1a1a',
  btnActiveBg: '#222222',
  btnRadius: '2px',
  tooltipBg: '#00ff41',
  tooltipText: '#000000',
};

const matrixLightColors: ThemeColors = {
  bgPrimary: '#0d1a0d',
  bgSurface: '#0a140a',
  bgElevated: '#112211',
  bgHover: '#1a2e1a',
  bgInput: '#0a140a',
  bgInset: '#061006',

  textPrimary: '#00ff41',
  textSecondary: '#00dd38',
  textMuted: '#00aa2a',
  textFaint: '#007a1e',

  borderColor: '#004400',
  borderInput: '#005500',
  borderSubtle: '#002200',

  shadowSm: '0 1px 3px rgba(0,255,65,0.08)',
  shadowMd: '0 4px 16px rgba(0,255,65,0.12)',
  shadowLg: '0 20px 60px rgba(0,255,65,0.18)',

  accent: '#00ff41',
  accentBg: 'rgba(0,255,65,0.1)',
  accentText: '#00ff41',

  overlay: 'rgba(0,0,0,0.85)',
  scrollbar: 'rgba(0,255,65,0.15)',
  scrollbarHover: 'rgba(0,255,65,0.3)',
  codeBg: 'rgba(0,255,65,0.08)',
  codeText: '#33ff66',

  navActiveBg: 'rgba(0,255,65,0.1)',
  navActiveIndicator: '#00ff41',
  navHoverBg: '#1a2e1a',
  headerShadow: '0 1px 3px rgba(0,255,65,0.12)',
  footerBg: '#061006',
  footerText: '#00aa2a',
  btnHoverBg: '#1a2e1a',
  btnActiveBg: '#224422',
  btnRadius: '2px',
  tooltipBg: '#00ff41',
  tooltipText: '#000000',
};

export const MATRIX_THEME: Theme = {
  id: 'matrix',
  name: 'Matrix',
  description: 'Wake up, Neo... Green phosphor on black, hacker aesthetic',
  author: 'The Architect',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '16px',
  light: {
    mode: 'light',
    colors: matrixLightColors,
  },
  dark: {
    mode: 'dark',
    colors: matrixDarkColors,
  },
};

// Registry of all available themes
export const THEMES: Record<string, Theme> = {
  'default': DEFAULT_THEME,
  'engineer-workbench': ENGINEER_WORKBENCH_THEME,
  'matrix': MATRIX_THEME,
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

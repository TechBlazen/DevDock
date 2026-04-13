import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../store';
import { defaultNavigation } from '../../lib/default-navigation';

/** Snapshot the initial settings by cloning them before each test. */
function resetSettings() {
  const initial = useSettingsStore.getInitialState().settings;
  useSettingsStore.setState({ settings: structuredClone(initial) });
}

describe('useSettingsStore', () => {
  beforeEach(resetSettings);

  it('initializes with default AI provider and OTel enabled', () => {
    const { settings } = useSettingsStore.getState();
    expect(settings.ai.provider).toBe('anthropic');
    expect(settings.otel.enabled).toBe(true);
    expect(settings.aiEnabled).toBe(true);
    expect(Array.isArray(settings.dashboardWidgets)).toBe(true);
    expect(settings.dashboardWidgets.length).toBeGreaterThan(0);
  });

  it('updates AI provider', () => {
    useSettingsStore.getState().updateAIProvider('openai');
    expect(useSettingsStore.getState().settings.ai.provider).toBe('openai');
  });

  it('updates API key for a specific provider without touching others', () => {
    useSettingsStore.getState().updateApiKey('anthropic', 'sk-anth');
    useSettingsStore.getState().updateApiKey('openai', 'sk-openai');
    const keys = useSettingsStore.getState().settings.ai.apiKeys;
    expect(keys.anthropic).toBe('sk-anth');
    expect(keys.openai).toBe('sk-openai');
    expect(keys.gemini).toBe('');
  });

  it('updates OTel config partially, preserving other fields', () => {
    const original = useSettingsStore.getState().settings.otel.endpoint;
    useSettingsStore.getState().updateOTelConfig({ enabled: false });
    const otel = useSettingsStore.getState().settings.otel;
    expect(otel.enabled).toBe(false);
    expect(otel.endpoint).toBe(original);
  });

  it('updates GitHub config partially', () => {
    useSettingsStore.getState().updateGitHubConfig({ accessToken: 'ghp_xxx' });
    expect(useSettingsStore.getState().settings.github.accessToken).toBe('ghp_xxx');
  });

  it('updates ADO config partially', () => {
    useSettingsStore.getState().updateADOConfig({ organization: 'costco' });
    expect(useSettingsStore.getState().settings.ado.organization).toBe('costco');
  });

  it('replaces dashboard widgets array', () => {
    useSettingsStore.getState().updateDashboardWidgets(['repos_github']);
    expect(useSettingsStore.getState().settings.dashboardWidgets).toEqual(['repos_github']);
  });

  it('updates branding partially', () => {
    useSettingsStore.getState().updateBranding({ appName: 'MyPortal' });
    const branding = useSettingsStore.getState().settings.branding;
    expect(branding.appName).toBe('MyPortal');
    expect(branding.tagline).toBeTruthy(); // other fields preserved
  });

  it('resets navigation to defaults', () => {
    useSettingsStore.getState().updateNavigation({ items: [] });
    expect(useSettingsStore.getState().settings.navigation.items).toEqual([]);
    useSettingsStore.getState().resetNavigation();
    expect(useSettingsStore.getState().settings.navigation).toEqual(defaultNavigation);
  });

  it('toggles aiEnabled', () => {
    useSettingsStore.getState().updateAIEnabled(false);
    expect(useSettingsStore.getState().settings.aiEnabled).toBe(false);
    useSettingsStore.getState().updateAIEnabled(true);
    expect(useSettingsStore.getState().settings.aiEnabled).toBe(true);
  });

  it('updates Overwatch config partially', () => {
    useSettingsStore.getState().updateOverwatchConfig({ enabled: true, endpoint: 'http://ow' });
    const ow = useSettingsStore.getState().settings.overwatch;
    expect(ow.enabled).toBe(true);
    expect(ow.endpoint).toBe('http://ow');
    expect(ow.apiKey).toBe(''); // preserved
  });

  it('persists settings to localStorage under devdock-settings', () => {
    useSettingsStore.getState().updateAIProvider('openai');
    const raw = localStorage.getItem('devdock-settings');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.settings.ai.provider).toBe('openai');
  });
});

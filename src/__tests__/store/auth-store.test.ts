import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../store';
import type { UserProfile } from '../../types';

const mockUser: UserProfile = {
  id: 'u-1',
  displayName: 'Judge',
  email: 'judge@example.com',
  avatarUrl: 'https://avatar/u1.png',
  provider: 'github',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset the store between tests (persist middleware preserves across tests in same module)
    useAuthStore.setState({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      provider: null,
      expiresAt: null,
    });
  });

  it('initializes with unauthenticated status', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('signs in with an OAuth provider and transitions to authenticated', () => {
    useAuthStore.getState().signIn('github', mockUser, 'token-123', '2099-01-01');
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('token-123');
    expect(state.provider).toBe('github');
    expect(state.expiresAt).toBe('2099-01-01');
  });

  it('signs in as guest with a guest profile', () => {
    useAuthStore.getState().signInAsGuest();
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.provider).toBe('guest');
    expect(state.user?.id).toBe('guest');
    expect(state.user?.displayName).toBe('Guest');
  });

  it('signs out and clears all auth state', () => {
    useAuthStore.getState().signIn('github', mockUser, 'token');
    useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.provider).toBeNull();
    expect(state.expiresAt).toBeNull();
  });

  it('setLoading transitions status to loading', () => {
    useAuthStore.getState().setLoading();
    expect(useAuthStore.getState().status).toBe('loading');
  });

  it('setToken updates accessToken without touching user', () => {
    useAuthStore.getState().signIn('github', mockUser, 'initial');
    useAuthStore.getState().setToken('refreshed');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('refreshed');
    expect(state.user).toEqual(mockUser);
  });

  it('persists authenticated state to localStorage under devdock-auth', () => {
    useAuthStore.getState().signIn('github', mockUser, 'token-xyz');
    const raw = localStorage.getItem('devdock-auth');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.user).toEqual(mockUser);
    expect(parsed.state.status).toBe('authenticated');
  });

  it('handles signIn without an explicit expiresAt', () => {
    useAuthStore.getState().signIn('google', { ...mockUser, provider: 'google' }, 'g-token');
    expect(useAuthStore.getState().expiresAt).toBeNull();
  });

  it('signIn triggers user account provisioning via useUserAccountsStore.ensureAccount', async () => {
    const { useUserAccountsStore } = await import('../../store');
    const ensureSpy = vi.spyOn(useUserAccountsStore.getState(), 'ensureAccount');
    useAuthStore.getState().signIn('github', mockUser, 'token');
    expect(ensureSpy).toHaveBeenCalledWith(mockUser);
    ensureSpy.mockRestore();
  });
});

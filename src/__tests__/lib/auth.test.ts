import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTH_PROVIDERS,
  generateCodeVerifier,
  generateCodeChallenge,
  buildOAuthUrl,
  createGuestUser,
  fetchGitHubUser,
  fetchMicrosoftUser,
  fetchGoogleUser,
  fetchUserProfile,
} from '../../lib/auth';

describe('auth / AUTH_PROVIDERS', () => {
  it('includes github, microsoft, and google with oauth endpoints and scopes', () => {
    const ids = AUTH_PROVIDERS.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['github', 'microsoft', 'google']));
    for (const p of AUTH_PROVIDERS) {
      expect(p.oauthEndpoint).toMatch(/^https:\/\//);
      expect(p.scopes?.length).toBeGreaterThan(0);
    }
  });

  it('includes read:user scope for GitHub', () => {
    const gh = AUTH_PROVIDERS.find((p) => p.id === 'github')!;
    expect(gh.scopes).toContain('read:user');
  });

  it('includes openid scope for Microsoft and Google', () => {
    const ms = AUTH_PROVIDERS.find((p) => p.id === 'microsoft')!;
    const g = AUTH_PROVIDERS.find((p) => p.id === 'google')!;
    expect(ms.scopes).toContain('openid');
    expect(g.scopes).toContain('openid');
  });
});

describe('auth / PKCE helpers', () => {
  it('generateCodeVerifier returns base64url string (no +, /, =)', () => {
    const v = generateCodeVerifier();
    expect(v.length).toBeGreaterThan(20);
    expect(v).not.toMatch(/[+/=]/);
  });

  it('generateCodeVerifier returns a different value each call', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });

  it('generateCodeChallenge produces a deterministic SHA-256 hash for a known verifier', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});

describe('auth / buildOAuthUrl', () => {
  it('builds a Microsoft URL with PKCE params', async () => {
    const ms = AUTH_PROVIDERS.find((p) => p.id === 'microsoft')!;
    const { url, codeVerifier, state } = await buildOAuthUrl(ms, 'client-123', 'http://localhost/cb');
    expect(url).toContain('login.microsoftonline.com');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('client_id=client-123');
    expect(url).toContain('redirect_uri=');
    expect(codeVerifier).toBeTruthy();
    expect(state).toBeTruthy();
  });

  it('builds a Google URL with PKCE params', async () => {
    const g = AUTH_PROVIDERS.find((p) => p.id === 'google')!;
    const { url } = await buildOAuthUrl(g, 'client-xyz', 'http://localhost/cb');
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('omits PKCE params for GitHub', async () => {
    const gh = AUTH_PROVIDERS.find((p) => p.id === 'github')!;
    const { url } = await buildOAuthUrl(gh, 'gh-id', 'http://localhost/cb');
    expect(url).toContain('github.com/login/oauth/authorize');
    expect(url).not.toContain('code_challenge');
    expect(url).not.toContain('code_challenge_method');
  });

  it('includes the provider scopes in the URL', async () => {
    const ms = AUTH_PROVIDERS.find((p) => p.id === 'microsoft')!;
    const { url } = await buildOAuthUrl(ms, 'client', 'http://localhost/cb');
    const u = new URL(url);
    const scope = u.searchParams.get('scope') ?? '';
    expect(scope).toContain('openid');
    expect(scope).toContain('profile');
  });
});

describe('auth / createGuestUser', () => {
  it('returns a valid guest UserProfile', () => {
    const guest = createGuestUser();
    expect(guest.id).toBe('guest');
    expect(guest.displayName).toBe('Guest');
    expect(guest.provider).toBe('guest');
  });
});

describe('auth / user fetchers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetchGitHubUser parses GitHub API response', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 999,
        login: 'octocat',
        name: 'The Octocat',
        email: 'octo@example.com',
        avatar_url: 'https://avatar/octo.png',
      }),
    });
    const user = await fetchGitHubUser('ghp_test');
    expect(user).toEqual({
      id: '999',
      displayName: 'The Octocat',
      email: 'octo@example.com',
      avatarUrl: 'https://avatar/octo.png',
      provider: 'github',
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ghp_test',
        }),
      })
    );
  });

  it('fetchGitHubUser falls back to login when name is missing', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, login: 'fallback' }),
    });
    const user = await fetchGitHubUser('t');
    expect(user.displayName).toBe('fallback');
  });

  it('fetchGitHubUser throws on HTTP error', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    await expect(fetchGitHubUser('bad')).rejects.toThrow(/GitHub API error: 401/);
  });

  it('fetchMicrosoftUser parses Graph API response', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'ms-id',
        displayName: 'Judge',
        mail: 'judge@costco.com',
      }),
    });
    const user = await fetchMicrosoftUser('ms-token');
    expect(user).toEqual({
      id: 'ms-id',
      displayName: 'Judge',
      email: 'judge@costco.com',
      provider: 'microsoft',
    });
  });

  it('fetchGoogleUser parses Google API response', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'g-id',
        name: 'Judge G',
        email: 'judge@gmail.com',
        picture: 'https://g/avatar.png',
      }),
    });
    const user = await fetchGoogleUser('g-token');
    expect(user).toEqual({
      id: 'g-id',
      displayName: 'Judge G',
      email: 'judge@gmail.com',
      avatarUrl: 'https://g/avatar.png',
      provider: 'google',
    });
  });

  it('fetchUserProfile routes guest to createGuestUser', async () => {
    const user = await fetchUserProfile('guest', 'ignored');
    expect(user.provider).toBe('guest');
    expect(user.id).toBe('guest');
  });
});

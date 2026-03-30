import type { AuthProvider, AuthProviderConfig, UserProfile } from '../types';

// ─── Provider Configurations ─────────────────────────────────────────────────
export const AUTH_PROVIDERS: AuthProviderConfig[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: 'Github',
    color: '#24292f',
    description: 'Sign in with your GitHub account',
    oauthEndpoint: 'https://github.com/login/oauth/authorize',
    scopes: ['read:user', 'user:email', 'repo'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: 'Building2',
    color: '#0078d4',
    description: 'Sign in with Microsoft or Azure AD',
    oauthEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
  },
  {
    id: 'google',
    name: 'Google',
    icon: 'Chrome',
    color: '#4285f4',
    description: 'Sign in with your Google account',
    oauthEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'profile', 'email'],
  },
];

// ─── PKCE Helpers ────────────────────────────────────────────────────────────
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

// ─── OAuth URL Builder ───────────────────────────────────────────────────────
export async function buildOAuthUrl(
  provider: AuthProviderConfig,
  clientId: string,
  redirectUri: string
): Promise<{ url: string; codeVerifier: string; state: string }> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateCodeVerifier(); // random state for CSRF

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: (provider.scopes ?? []).join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // GitHub doesn't support PKCE natively in the authorize step, but we include
  // the params for Microsoft/Google. GitHub ignores unknown params.
  if (provider.id === 'github') {
    params.delete('code_challenge');
    params.delete('code_challenge_method');
  }

  return {
    url: `${provider.oauthEndpoint}?${params.toString()}`,
    codeVerifier,
    state,
  };
}

// ─── User Profile Fetchers ───────────────────────────────────────────────────
export async function fetchGitHubUser(token: string): Promise<UserProfile> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();

  return {
    id: String(data.id),
    displayName: data.name || data.login,
    email: data.email ?? undefined,
    avatarUrl: data.avatar_url,
    provider: 'github',
  };
}

export async function fetchMicrosoftUser(token: string): Promise<UserProfile> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Microsoft Graph error: ${res.status}`);
  const data = await res.json();

  return {
    id: data.id,
    displayName: data.displayName,
    email: data.mail || data.userPrincipalName,
    provider: 'microsoft',
  };
}

export async function fetchGoogleUser(token: string): Promise<UserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Google API error: ${res.status}`);
  const data = await res.json();

  return {
    id: data.id,
    displayName: data.name,
    email: data.email,
    avatarUrl: data.picture,
    provider: 'google',
  };
}

export function createGuestUser(): UserProfile {
  return {
    id: 'guest',
    displayName: 'Guest',
    provider: 'guest',
  };
}

// ─── Fetch User by Provider ──────────────────────────────────────────────────
export async function fetchUserProfile(
  provider: AuthProvider,
  token: string
): Promise<UserProfile> {
  switch (provider) {
    case 'github':
      return fetchGitHubUser(token);
    case 'microsoft':
      return fetchMicrosoftUser(token);
    case 'google':
      return fetchGoogleUser(token);
    case 'guest':
    case 'local':
      return createGuestUser();
  }
}

// ─── OAuth Client ID Helpers ─────────────────────────────────────────────────
export function getOAuthClientId(provider: AuthProvider): string | null {
  switch (provider) {
    case 'github':
      return import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID ?? null;
    case 'microsoft':
      return import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_ID ?? null;
    case 'google':
      return import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? null;
    default:
      return null;
  }
}

export function getRedirectUri(): string {
  return import.meta.env.VITE_AUTH_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
}

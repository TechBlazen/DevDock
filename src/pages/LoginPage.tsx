import { useState } from 'react';
import {
  Zap, GitFork, Building2, Globe, UserCircle, LogIn,
  ChevronDown, ChevronUp, AlertCircle, Loader2,
} from 'lucide-react';
import { useAuthStore, useUserAccountsStore, useSettingsStore } from '../store';
import {
  AUTH_PROVIDERS,
  buildOAuthUrl,
  getOAuthClientId,
  getRedirectUri,
  fetchUserProfile,
} from '../lib/auth';
import type { AuthProvider } from '../types';

export const LoginPage = () => {
  const { signIn, signInAsGuest, setLoading } = useAuthStore();
  const { authenticate } = useUserAccountsStore();
  const branding = useSettingsStore((s) => s.settings.branding);
  const [showTokenEntry, setShowTokenEntry] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AuthProvider>('github');
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleLocalSignIn = () => {
    if (!username.trim() || !password.trim()) return;
    setError('');
    setLocalLoading(true);

    const account = authenticate(username.trim(), password);
    if (account) {
      signIn('local', {
        id: account.id,
        displayName: account.displayName,
        email: account.email,
        provider: 'local',
        role: account.role,
      }, null);
    } else {
      setError('Invalid username or password.');
    }
    setLocalLoading(false);
  };

  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLocalSignIn();
  };

  const iconMap: Record<string, React.ReactNode> = {
    Github: <GitFork size={20} />,
    Building2: <Building2 size={20} />,
    Chrome: <Globe size={20} />,
  };

  const handleOAuthSignIn = async (providerId: AuthProvider) => {
    const clientId = getOAuthClientId(providerId);
    const provider = AUTH_PROVIDERS.find((p) => p.id === providerId);

    if (!clientId || !provider) {
      setError(`OAuth not configured for ${providerId}. Use "Sign in with token" below, or set VITE_${providerId.toUpperCase()}_OAUTH_CLIENT_ID in your .env file.`);
      setShowTokenEntry(true);
      setSelectedProvider(providerId);
      return;
    }

    setLoading();
    try {
      const { url, codeVerifier, state } = await buildOAuthUrl(provider, clientId, getRedirectUri());
      // Store PKCE verifier and state for callback
      sessionStorage.setItem('forge_oauth_verifier', codeVerifier);
      sessionStorage.setItem('forge_oauth_state', state);
      sessionStorage.setItem('forge_oauth_provider', providerId);
      window.location.assign(url);
    } catch (e) {
      setError(`OAuth error: ${String(e)}`);
    }
  };

  const handleTokenSignIn = async () => {
    if (!tokenInput.trim()) return;
    setError('');
    setTokenLoading(true);

    try {
      const user = await fetchUserProfile(selectedProvider, tokenInput.trim());
      signIn(selectedProvider, user, tokenInput.trim());
    } catch (e) {
      setError(`Authentication failed: ${String(e)}`);
      setTokenLoading(false);
    }
  };

  const handleTokenKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTokenSignIn();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'var(--bg-primary)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          {branding?.logoType === 'upload' && branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.appName} style={{ height: 48, maxWidth: 200, objectFit: 'contain', margin: '0 auto 16px' }} />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4" style={{
              background: 'var(--accent)',
            }}>
              <Zap size={28} color="#fff" strokeWidth={2.5} />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {(branding?.appName || 'DEVDOCK').toUpperCase()}
          </h1>
          <p className="text-xs uppercase tracking-[2px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {branding?.tagline || 'AI Developer Portal'}
          </p>
        </div>

        {/* Sign-in Card */}
        <div className="rounded-lg p-6" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Sign in to {branding?.appName || 'DevDock'}
          </h2>
          <p className="text-[11px] mb-5" style={{ color: 'var(--text-muted)' }}>
            Choose an authentication method to get started.
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-2xl text-[11px]" style={{
              background: 'rgba(248, 113, 113, 0.08)',
              border: '1px solid rgba(255, 71, 87, 0.2)',
              color: '#ff4757',
            }}>
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Local Login */}
          <div className="space-y-2.5 mb-4">
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              onKeyDown={handleLocalKeyDown}
              placeholder="Username"
              autoFocus
              className="w-full rounded-2xl px-3.5 py-2.5 text-xs outline-none transition-all duration-300"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid var(--border-input)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleLocalKeyDown}
              placeholder="Password"
              className="w-full rounded-2xl px-3.5 py-2.5 text-xs outline-none transition-all duration-300"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid var(--border-input)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              onClick={handleLocalSignIn}
              disabled={!username.trim() || !password.trim() || localLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[12px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(59, 130, 246, 0.85)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              }}
            >
              {localLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
              Sign In
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          </div>

          {/* OAuth Provider Buttons */}
          <div className="space-y-2.5 mb-4">
            {AUTH_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleOAuthSignIn(provider.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${provider.color}10`;
                  e.currentTarget.style.borderColor = `${provider.color}30`;
                  e.currentTarget.style.boxShadow = `0 4px 16px ${provider.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${provider.color}15`, color: provider.color }}
                >
                  {iconMap[provider.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {provider.name}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {provider.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          </div>

          {/* Token Entry Toggle */}
          <button
            onClick={() => setShowTokenEntry(!showTokenEntry)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>Sign in with access token</span>
            {showTokenEntry ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Token Entry Form */}
          {showTokenEntry && (
            <div className="mt-3 space-y-3 animate-[fadeIn_0.2s_ease]">
              {/* Provider selector */}
              <div className="flex gap-1.5">
                {(['github', 'microsoft', 'google'] as AuthProvider[]).map((p) => {
                  const config = AUTH_PROVIDERS.find((ap) => ap.id === p)!;
                  return (
                    <button
                      key={p}
                      onClick={() => { setSelectedProvider(p); setError(''); }}
                      className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={
                        selectedProvider === p
                          ? {
                              background: `${config.color}15`,
                              color: config.color,
                              border: `1px solid ${config.color}40`,
                            }
                          : {
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                            }
                      }
                    >
                      {config.name}
                    </button>
                  );
                })}
              </div>

              {/* Token input */}
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={handleTokenKeyDown}
                  placeholder={
                    selectedProvider === 'github'
                      ? 'ghp_xxxxxxxxxxxx'
                      : selectedProvider === 'microsoft'
                        ? 'Azure AD access token'
                        : 'Google access token'
                  }
                  className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-all duration-200"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-input)',
                    color: 'var(--text-primary)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(42, 111, 255, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(42, 111, 255, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid var(--border-input)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={handleTokenSignIn}
                  disabled={!tokenInput.trim() || tokenLoading}
                  className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(42, 111, 255, 0.8)',
                    color: 'white',
                    border: '1px solid rgba(42, 111, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 16px rgba(42, 111, 255, 0.3)',
                  }}
                >
                  {tokenLoading ? <Loader2 size={14} className="animate-spin" /> : 'Sign in'}
                </button>
              </div>

              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                {selectedProvider === 'github'
                  ? 'Enter a GitHub Personal Access Token with read:user and repo scopes.'
                  : selectedProvider === 'microsoft'
                    ? 'Enter a Microsoft access token from Azure AD.'
                    : 'Enter a Google OAuth access token.'}
              </p>
            </div>
          )}

          {/* Guest Access */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={signInAsGuest}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px dashed var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
              >
                <UserCircle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Continue as Guest
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  Limited access — configure API tokens in Settings later
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] mt-6" style={{ color: 'var(--text-faint)' }}>
          Built with ⚡ by Terry Ashley · TechBlazen
        </p>
      </div>
    </div>
  );
};

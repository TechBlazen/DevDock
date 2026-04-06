import { useState, useCallback, useMemo } from 'react';
import {
  Key, CheckCircle, AlertCircle, Copy, Check, Clock,
  User, Shield, FileText, ArrowRightLeft, Trash2, AlertTriangle,
} from 'lucide-react';
import { Button, Card, CardHeader, Pill } from '../ui';

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
}

interface JwtAnalysis {
  valid: boolean;
  error?: string;
  parts?: JwtParts;
  isExpired?: boolean;
  expiresIn?: string;
  issuedAt?: string;
  issuer?: string;
  subject?: string;
  audience?: string;
  claims: { key: string; value: unknown; description: string }[];
}

// Known JWT claim descriptions
const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
  name: 'Full Name',
  email: 'Email Address',
  role: 'User Role',
  roles: 'User Roles',
  scope: 'OAuth Scope',
  permissions: 'Permissions',
  azp: 'Authorized Party',
  nonce: 'Nonce',
  at_hash: 'Access Token Hash',
  c_hash: 'Code Hash',
  auth_time: 'Authentication Time',
  acr: 'Authentication Context',
  amr: 'Authentication Methods',
  typ: 'Token Type',
  sid: 'Session ID',
  org_id: 'Organization ID',
  tenant_id: 'Tenant ID',
  preferred_username: 'Preferred Username',
  given_name: 'Given Name',
  family_name: 'Family Name',
  picture: 'Profile Picture',
  locale: 'Locale',
  zoneinfo: 'Time Zone',
  updated_at: 'Updated At',
};

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const full = pad ? padded + '='.repeat(4 - pad) : padded;
  return atob(full);
}

function decodeJwt(token: string): JwtAnalysis {
  const trimmed = token.trim();
  if (!trimmed) return { valid: false, error: 'Paste a JWT token to decode', claims: [] };

  const parts = trimmed.split('.');
  if (parts.length !== 3) return { valid: false, error: `Invalid JWT structure — expected 3 parts separated by dots, got ${parts.length}`, claims: [] };

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;

  try {
    header = JSON.parse(base64UrlDecode(parts[0]));
  } catch {
    return { valid: false, error: 'Failed to decode JWT header — invalid base64url encoding', claims: [] };
  }

  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return { valid: false, error: 'Failed to decode JWT payload — invalid base64url encoding', claims: [] };
  }

  // Analyze claims
  const claims: JwtAnalysis['claims'] = [];
  for (const [key, value] of Object.entries(payload)) {
    claims.push({ key, value, description: CLAIM_DESCRIPTIONS[key] ?? 'Custom Claim' });
  }

  // Time analysis
  const now = Math.floor(Date.now() / 1000);
  let isExpired: boolean | undefined;
  let expiresIn: string | undefined;
  let issuedAt: string | undefined;

  if (typeof payload.exp === 'number') {
    isExpired = payload.exp < now;
    const diff = payload.exp - now;
    if (diff > 0) {
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      expiresIn = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    } else {
      const ago = Math.abs(diff);
      const days = Math.floor(ago / 86400);
      const hours = Math.floor((ago % 86400) / 3600);
      expiresIn = days > 0 ? `${days}d ${hours}h ago` : hours > 0 ? `${hours}h ago` : `${Math.floor(ago / 60)}m ago`;
    }
  }

  if (typeof payload.iat === 'number') {
    issuedAt = new Date(payload.iat * 1000).toLocaleString();
  }

  return {
    valid: true,
    parts: {
      header, payload, signature: parts[2],
      raw: { header: parts[0], payload: parts[1], signature: parts[2] },
    },
    isExpired,
    expiresIn,
    issuedAt,
    issuer: payload.iss ? String(payload.iss) : undefined,
    subject: payload.sub ? String(payload.sub) : undefined,
    audience: payload.aud ? (Array.isArray(payload.aud) ? payload.aud.join(', ') : String(payload.aud)) : undefined,
    claims,
  };
}

function encodeJwt(header: string, payload: string): string {
  try {
    JSON.parse(header);
    JSON.parse(payload);
  } catch {
    return '';
  }
  const b64url = (str: string) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const h = b64url(header);
  const p = b64url(payload);
  return `${h}.${p}.signature_placeholder`;
}

// ─── Component ──────────────────────────────────────────────────────────────
export const JwtDecoder = () => {
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');
  const [token, setToken] = useState('');
  const [encHeader, setEncHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const [encPayload, setEncPayload] = useState('{\n  "sub": "1234567890",\n  "name": "Terry Ashley",\n  "role": "admin",\n  "iat": ' + Math.floor(Date.now() / 1000) + ',\n  "exp": ' + (Math.floor(Date.now() / 1000) + 3600) + '\n}');
  const [copied, setCopied] = useState<string | null>(null);

  const analysis = useMemo(() => mode === 'decode' ? decodeJwt(token) : null, [token, mode]);
  const encoded = useMemo(() => mode === 'encode' ? encodeJwt(encHeader, encPayload) : '', [encHeader, encPayload, mode]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTimestamp = (ts: unknown) => {
    if (typeof ts !== 'number') return String(ts);
    return new Date(ts * 1000).toLocaleString();
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Source Code Pro', monospace", fontSize: 13, lineHeight: 1.6,
    background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', borderRadius: 8, padding: '12px 16px',
    width: '100%', outline: 'none', resize: 'vertical' as const,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-input)' }}>
          <button onClick={() => setMode('decode')} className="px-3 py-1 text-[11px] font-bold cursor-pointer" style={{ background: mode === 'decode' ? 'var(--accent-bg)' : 'transparent', color: mode === 'decode' ? 'var(--accent)' : 'var(--text-muted)', border: 'none' }}>
            Decode
          </button>
          <button onClick={() => setMode('encode')} className="px-3 py-1 text-[11px] font-bold cursor-pointer" style={{ background: mode === 'encode' ? 'rgba(245,158,11,0.1)' : 'transparent', color: mode === 'encode' ? '#f59e0b' : 'var(--text-muted)', border: 'none', borderLeft: '1px solid var(--border-input)' }}>
            Encode
          </button>
        </div>

        {mode === 'decode' && (
          <Button variant="ghost" size="sm" onClick={() => { setToken(''); }}>
            <Trash2 size={12} /> Clear
          </Button>
        )}

        {mode === 'encode' && encoded && (
          <Button variant="ghost" size="sm" onClick={() => handleCopy('encoded', encoded)}>
            {copied === 'encoded' ? <Check size={12} /> : <Copy size={12} />}
            {copied === 'encoded' ? 'Copied' : 'Copy Token'}
          </Button>
        )}

        <div className="ml-auto">
          <Pill color={mode === 'decode' ? '#3b82f6' : '#f59e0b'}>{mode === 'decode' ? 'Decoder' : 'Encoder'}</Pill>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {mode === 'decode' ? (
          <div className="flex gap-4 h-full">
            {/* Input */}
            <div className="w-[400px] shrink-0 flex flex-col gap-3">
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                <Key size={12} className="inline mr-1" />Paste JWT Token
              </div>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                style={{ ...inputStyle, flex: 1, minHeight: 120 }}
              />

              {/* Status */}
              {analysis && token.trim() && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold" style={{
                  background: analysis.valid ? 'rgba(16,185,129,0.08)' : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${analysis.valid ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  color: analysis.valid ? '#10b981' : '#ef4444',
                }}>
                  {analysis.valid ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {analysis.valid ? 'Valid JWT structure' : analysis.error}
                </div>
              )}

              {/* Expiry status */}
              {analysis?.valid && analysis.isExpired !== undefined && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold" style={{
                  background: analysis.isExpired ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
                  border: `1px solid ${analysis.isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  color: analysis.isExpired ? '#dc2626' : '#16a34a',
                }}>
                  {analysis.isExpired ? <AlertTriangle size={13} /> : <Clock size={13} />}
                  {analysis.isExpired ? `Expired ${analysis.expiresIn}` : `Expires in ${analysis.expiresIn}`}
                </div>
              )}
            </div>

            {/* Decoded output */}
            <div className="flex-1 min-w-0 space-y-3 overflow-y-auto">
              {!analysis?.valid && !token.trim() && (
                <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-faint)' }}>
                  <Key size={40} />
                  <span className="text-[13px]">Paste a JWT token to decode</span>
                </div>
              )}

              {analysis?.valid && analysis.parts && (
                <>
                  {/* Header */}
                  <Card>
                    <CardHeader className="justify-between">
                      <div className="flex items-center gap-2">
                        <Shield size={13} style={{ color: '#f59e0b' }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Header</span>
                        <Pill color="#f59e0b">{String(analysis.parts.header.alg ?? 'none')}</Pill>
                        {analysis.parts.header.typ && <Pill color="#6b7280">{String(analysis.parts.header.typ)}</Pill>}
                      </div>
                      <button onClick={() => handleCopy('header', JSON.stringify(analysis.parts!.header, null, 2))} className="p-1 cursor-pointer" style={{ color: copied === 'header' ? '#22c55e' : 'var(--text-faint)', background: 'none', border: 'none' }}>
                        {copied === 'header' ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </CardHeader>
                    <pre style={{ padding: '12px 20px', fontSize: 12, fontFamily: "'Source Code Pro', monospace", color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap', background: 'var(--bg-inset)' }}>
                      {JSON.stringify(analysis.parts.header, null, 2)}
                    </pre>
                  </Card>

                  {/* Payload */}
                  <Card>
                    <CardHeader className="justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={13} style={{ color: '#3b82f6' }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Payload</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{analysis.claims.length} claims</span>
                      </div>
                      <button onClick={() => handleCopy('payload', JSON.stringify(analysis.parts!.payload, null, 2))} className="p-1 cursor-pointer" style={{ color: copied === 'payload' ? '#22c55e' : 'var(--text-faint)', background: 'none', border: 'none' }}>
                        {copied === 'payload' ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </CardHeader>
                    <div>
                      {analysis.claims.map(({ key, value, description }) => {
                        const isTime = ['exp', 'iat', 'nbf', 'auth_time', 'updated_at'].includes(key) && typeof value === 'number';
                        return (
                          <div key={key} className="flex items-start gap-3" style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <code className="text-[11px] font-bold shrink-0" style={{ color: 'var(--accent)', width: 120, fontFamily: "'Source Code Pro', monospace" }}>{key}</code>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-mono break-all" style={{ color: 'var(--text-primary)' }}>
                                {isTime ? (
                                  <span>
                                    <span>{formatTimestamp(value)}</span>
                                    <span className="ml-2 text-[10px]" style={{ color: 'var(--text-faint)' }}>({String(value)})</span>
                                  </span>
                                ) : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Signature */}
                  <Card>
                    <CardHeader>
                      <Key size={13} style={{ color: '#7c3aed' }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Signature</span>
                    </CardHeader>
                    <div style={{ padding: '12px 20px' }}>
                      <code className="text-[11px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>{analysis.parts.signature}</code>
                      <p className="text-[10px] mt-2" style={{ color: 'var(--text-faint)' }}>
                        Signature verification requires the secret key and is not performed client-side.
                      </p>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Encode mode */
          <div className="flex gap-4 h-full">
            <div className="flex-1 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                <Shield size={12} className="inline mr-1" />Header (JSON)
              </div>
              <textarea value={encHeader} onChange={(e) => setEncHeader(e.target.value)} style={{ ...inputStyle, minHeight: 100 }} />

              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                <FileText size={12} className="inline mr-1" />Payload (JSON)
              </div>
              <textarea value={encPayload} onChange={(e) => setEncPayload(e.target.value)} style={{ ...inputStyle, minHeight: 180 }} />
            </div>

            <div className="w-[400px] shrink-0 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                <Key size={12} className="inline mr-1" />Encoded Token (unsigned)
              </div>
              {encoded ? (
                <>
                  <div className="rounded-lg p-4 font-mono text-[12px] break-all" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    <span style={{ color: '#f59e0b' }}>{encoded.split('.')[0]}</span>
                    <span style={{ color: 'var(--text-faint)' }}>.</span>
                    <span style={{ color: '#3b82f6' }}>{encoded.split('.')[1]}</span>
                    <span style={{ color: 'var(--text-faint)' }}>.</span>
                    <span style={{ color: '#7c3aed' }}>{encoded.split('.')[2]}</span>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      This token is unsigned. To create a production JWT, sign it server-side with your secret key using a library like <code>jsonwebtoken</code>.
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-lg p-4 text-center text-[12px]" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-faint)' }}>
                  Enter valid JSON in both header and payload to generate a token
                </div>
              )}

              {/* Quick insert buttons */}
              <div className="text-[10px] font-bold uppercase tracking-wider mt-4" style={{ color: 'var(--text-muted)' }}>Quick Insert Claims</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'exp (+1h)', claim: `"exp": ${Math.floor(Date.now() / 1000) + 3600}` },
                  { label: 'iat (now)', claim: `"iat": ${Math.floor(Date.now() / 1000)}` },
                  { label: 'role', claim: '"role": "admin"' },
                  { label: 'email', claim: '"email": "user@example.com"' },
                  { label: 'scope', claim: '"scope": "read write"' },
                ].map(({ label, claim }) => (
                  <button
                    key={label}
                    onClick={() => {
                      try {
                        const obj = JSON.parse(encPayload);
                        const kv = JSON.parse(`{${claim}}`);
                        const merged = { ...obj, ...kv };
                        setEncPayload(JSON.stringify(merged, null, 2));
                      } catch { /* ignore */ }
                    }}
                    className="px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

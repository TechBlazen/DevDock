import { useState, useMemo } from 'react';
import {
  Key, Plus, Eye, EyeOff, Copy, Check, Trash2, Star, Search,
  RefreshCw, Globe, User, Lock, FileText, X, ChevronDown, ChevronRight,
  Shield, Pencil,
} from 'lucide-react';
import { useAuthStore } from '../../store';
import {
  useVaultStore, generatePassword, getPasswordStrength,
  type PasswordOptions, type VaultEntry,
} from '../../store/vault-store';
import { Button, Pill } from '../ui';

const CATEGORIES = ['Login', 'API Key', 'Database', 'Server', 'Certificate', 'Other'];
const CATEGORY_COLORS: Record<string, string> = {
  Login: '#3b82f6', 'API Key': '#f59e0b', Database: '#7c3aed',
  Server: '#059669', Certificate: '#dc2626', Other: '#6b7280',
};

// ─── Password Generator Panel ───────────────────────────────────────────────
const GeneratorPanel = ({ onUse }: { onUse: (password: string) => void }) => {
  const [opts, setOpts] = useState<PasswordOptions>({
    length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true,
  });
  const [generated, setGenerated] = useState(() => generatePassword(opts));
  const [copied, setCopied] = useState(false);

  const strength = getPasswordStrength(generated);

  const handleGenerate = () => {
    const pw = generatePassword(opts);
    setGenerated(pw);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg" style={{ padding: '16px', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
      <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        <Key size={12} className="inline mr-1" />Password Generator
      </div>

      {/* Generated password */}
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 rounded-lg px-3 py-2.5 text-[13px] font-mono truncate" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}>
          {generated}
        </code>
        <button onClick={handleCopy} className="p-2 rounded-lg cursor-pointer" style={{ color: copied ? '#22c55e' : 'var(--text-muted)', background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button onClick={handleGenerate} className="p-2 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)', background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Strength bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(strength.score / 6) * 100}%`, background: strength.color }} />
        </div>
        <span className="text-[10px] font-bold" style={{ color: strength.color }}>{strength.label}</span>
      </div>

      {/* Options */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)', width: 45 }}>Length</span>
          <input type="range" min={8} max={64} value={opts.length} onChange={(e) => { const o = { ...opts, length: Number(e.target.value) }; setOpts(o); setGenerated(generatePassword(o)); }} className="w-20 accent-[var(--accent)]" />
          <span className="font-bold w-6 text-center">{opts.length}</span>
        </label>
        {([
          { key: 'uppercase', label: 'A-Z' },
          { key: 'lowercase', label: 'a-z' },
          { key: 'numbers', label: '0-9' },
          { key: 'symbols', label: '!@#' },
        ] as const).map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={opts[key]} onChange={(e) => { const o = { ...opts, [key]: e.target.checked }; setOpts(o); setGenerated(generatePassword(o)); }} className="accent-[var(--accent)]" />
            {label}
          </label>
        ))}
      </div>

      <Button variant="primary" size="sm" onClick={() => onUse(generated)}>
        <Check size={11} /> Use This Password
      </Button>
    </div>
  );
};

// ─── Entry Form ─────────────────────────────────────────────────────────────
const EntryForm = ({ initial, onSave, onCancel }: { initial?: VaultEntry; onSave: (data: Omit<VaultEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void; onCancel: () => void }) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Login');
  const [showGen, setShowGen] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const inputStyle: React.CSSProperties = { background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', borderRadius: 8, padding: '8px 12px', fontSize: 12, width: '100%', outline: 'none' };

  return (
    <div className="rounded-lg" style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {initial ? 'Edit Entry' : 'New Entry'}
        </h4>
        <button onClick={onCancel} style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. GitHub Account" style={inputStyle} />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Username / Email</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" style={inputStyle} />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            Password
            <button onClick={() => setShowGen(!showGen)} className="text-[9px] font-semibold px-1.5 py-0.5 rounded cursor-pointer" style={{ color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
              <Key size={9} className="inline mr-0.5" />Generate
            </button>
          </label>
          <div className="flex items-center gap-2">
            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }} />
            <button onClick={() => setShowPw(!showPw)} className="p-2 rounded-lg cursor-pointer" style={{ color: 'var(--text-faint)', background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {showGen && <GeneratorPanel onUse={(pw) => { setPassword(pw); setShowGen(false); }} />}

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>URL (optional)</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com" style={inputStyle} />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." className="resize-y" style={{ ...inputStyle, minHeight: 60 }} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="primary" size="sm" onClick={() => onSave({ title, username, password, url, notes, category, favorite: initial?.favorite ?? false })} disabled={!title.trim() || !password.trim()}>
            <Lock size={11} /> {initial ? 'Update' : 'Save Entry'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Vault Widget ──────────────────────────────────────────────────────
export const PasswordVault = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';
  const { addEntry, updateEntry, removeEntry, toggleFavorite, getEntriesForUser } = useVaultStore();

  const entries = useMemo(() => getEntriesForUser(userId), [getEntriesForUser, userId]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = entries;
    if (catFilter) result = result.filter((e) => e.category === catFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.url?.toLowerCase().includes(q));
    }
    return result.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [entries, search, catFilter]);

  const togglePasswordVisible = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = (data: Omit<VaultEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (editingId) {
      updateEntry(editingId, data);
      setEditingId(null);
    } else {
      addEntry({ ...data, userId });
    }
    setShowForm(false);
  };

  const usedCategories = [...new Set(entries.map((e) => e.category))];

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <Search size={12} style={{ color: 'var(--text-faint)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vault..." className="bg-transparent border-none outline-none text-[12px] flex-1" style={{ color: 'var(--text-primary)' }} />
        </div>
        <Button variant="primary" size="sm" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus size={11} /> Add
        </Button>
      </div>

      {/* Category filter */}
      {usedCategories.length > 1 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <button onClick={() => setCatFilter(null)} className="text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer" style={{ background: !catFilter ? 'var(--accent-bg)' : 'transparent', color: !catFilter ? 'var(--accent)' : 'var(--text-faint)', border: !catFilter ? '1px solid var(--accent)' : '1px solid var(--border-subtle)' }}>
            All ({entries.length})
          </button>
          {usedCategories.map((cat) => {
            const count = entries.filter((e) => e.category === cat).length;
            const color = CATEGORY_COLORS[cat] ?? '#6b7280';
            return (
              <button key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)} className="text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer" style={{ background: catFilter === cat ? `${color}15` : 'transparent', color: catFilter === cat ? color : 'var(--text-faint)', border: catFilter === cat ? `1px solid ${color}40` : '1px solid var(--border-subtle)' }}>
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-3">
          <EntryForm
            initial={editingId ? entries.find((e) => e.id === editingId) : undefined}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
          />
        </div>
      )}

      {/* Entry list */}
      {filtered.length === 0 && !showForm && (
        <div className="text-center py-8" style={{ color: 'var(--text-faint)' }}>
          <Lock size={28} style={{ margin: '0 auto 8px' }} />
          <div className="text-[12px]">{entries.length === 0 ? 'No saved passwords yet' : 'No matches'}</div>
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const isVisible = visiblePasswords.has(entry.id);
          const catColor = CATEGORY_COLORS[entry.category] ?? '#6b7280';
          const strength = getPasswordStrength(entry.password);

          return (
            <div key={entry.id} className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              {/* Row */}
              <div
                className="flex items-center gap-3 cursor-pointer transition-colors"
                style={{ padding: '12px 16px' }}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {isExpanded ? <ChevronDown size={12} style={{ color: 'var(--text-faint)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-faint)' }} />}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${catColor}12`, border: `1px solid ${catColor}25` }}>
                  <Lock size={14} style={{ color: catColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{entry.title}</span>
                    {entry.favorite && <Star size={10} fill="#f59e0b" style={{ color: '#f59e0b' }} />}
                  </div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>
                    {entry.username}{entry.url ? ` · ${entry.url}` : ''}
                  </div>
                </div>
                <Pill color={catColor}>{entry.category}</Pill>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: strength.color }} title={strength.label} />
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-subtle)' }} className="pt-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <User size={11} style={{ color: 'var(--text-faint)' }} />
                    <span className="text-[12px] font-mono flex-1" style={{ color: 'var(--text-secondary)' }}>{entry.username}</span>
                    <button onClick={() => handleCopy(`user-${entry.id}`, entry.username)} className="p-1 cursor-pointer" style={{ color: copiedId === `user-${entry.id}` ? '#22c55e' : 'var(--text-faint)', background: 'none', border: 'none' }}>
                      {copiedId === `user-${entry.id}` ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Key size={11} style={{ color: 'var(--text-faint)' }} />
                    <span className="text-[12px] font-mono flex-1" style={{ color: 'var(--text-secondary)' }}>
                      {isVisible ? entry.password : '•'.repeat(Math.min(entry.password.length, 24))}
                    </span>
                    <button onClick={() => togglePasswordVisible(entry.id)} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}>
                      {isVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                    <button onClick={() => handleCopy(`pw-${entry.id}`, entry.password)} className="p-1 cursor-pointer" style={{ color: copiedId === `pw-${entry.id}` ? '#22c55e' : 'var(--text-faint)', background: 'none', border: 'none' }}>
                      {copiedId === `pw-${entry.id}` ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>

                  {/* Strength */}
                  <div className="flex items-center gap-2">
                    <Shield size={11} style={{ color: strength.color }} />
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(strength.score / 6) * 100}%`, background: strength.color }} />
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: strength.color }}>{strength.label}</span>
                  </div>

                  {entry.url && (
                    <div className="flex items-center gap-2">
                      <Globe size={11} style={{ color: 'var(--text-faint)' }} />
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[11px] truncate" style={{ color: 'var(--accent)' }}>{entry.url}</a>
                    </div>
                  )}

                  {entry.notes && (
                    <div className="flex items-start gap-2">
                      <FileText size={11} style={{ color: 'var(--text-faint)', marginTop: 2 }} />
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{entry.notes}</span>
                    </div>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    <button onClick={() => toggleFavorite(entry.id)} className="p-1.5 rounded cursor-pointer" style={{ color: entry.favorite ? '#f59e0b' : 'var(--text-faint)', background: 'none', border: 'none' }} title="Favorite">
                      <Star size={12} fill={entry.favorite ? '#f59e0b' : 'none'} />
                    </button>
                    <button onClick={() => { setEditingId(entry.id); setShowForm(true); }} className="p-1.5 rounded cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Edit">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => removeEntry(entry.id)} className="p-1.5 rounded cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Delete" onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 mt-4 rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <Shield size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Passwords are stored locally in your browser's localStorage. This is a convenience tool for development — for production credentials, use a dedicated password manager.
        </p>
      </div>
    </div>
  );
};

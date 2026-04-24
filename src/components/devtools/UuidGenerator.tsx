import { useState, useCallback } from 'react';
import {
  RefreshCw, Copy, Check, Minus, CaseSensitive, SlidersHorizontal,
  Hash, Download, Trash2,
} from 'lucide-react';
import { Button, Toggle } from '../ui';

// ─── UUID generators ────────────────────────────────────────────────────────
function generateUUIDv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateUUIDv1(): string {
  // Simplified v1-like UUID (timestamp-based, not true v1 with MAC)
  const now = BigInt(Date.now()) * 10000n + 122192928000000000n; // 100ns intervals since UUID epoch
  const timeLow = Number(now & 0xffffffffn).toString(16).padStart(8, '0');
  const timeMid = Number((now >> 32n) & 0xffffn).toString(16).padStart(4, '0');
  const timeHigh = Number((now >> 48n) & 0x0fffn | 0x1000n).toString(16).padStart(4, '0');
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  bytes[0] = (bytes[0] & 0x3f) | 0x80; // variant
  const rest = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${timeLow}-${timeMid}-${timeHigh}-${rest.slice(0, 4)}-${rest.slice(4, 16)}`;
}

function generateNilUUID(): string {
  return '00000000-0000-0000-0000-000000000000';
}

function generateUUIDv7(): string {
  // UUIDv7: Unix timestamp (ms) in first 48 bits + random
  const now = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Timestamp in first 6 bytes (48 bits)
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type UUIDVersion = '1' | '4' | '7' | 'nil';

const VERSION_INFO: Record<UUIDVersion, { label: string; description: string }> = {
  '1': { label: '1 (Timestamp)', description: 'Time-based — includes timestamp and node ID' },
  '4': { label: '4 (GUID)', description: 'Random — cryptographically secure random bytes' },
  '7': { label: '7 (Sortable)', description: 'Unix timestamp + random — sortable by creation time' },
  nil: { label: 'Nil', description: 'All zeros — represents an empty/null UUID' },
};

function generateUUID(version: UUIDVersion): string {
  switch (version) {
    case '1': return generateUUIDv1();
    case '4': return generateUUIDv4();
    case '7': return generateUUIDv7();
    case 'nil': return generateNilUUID();
  }
}

function formatUUID(uuid: string, hyphens: boolean, uppercase: boolean): string {
  const result = hyphens ? uuid : uuid.replace(/-/g, '');
  return uppercase ? result.toUpperCase() : result.toLowerCase();
}

// ─── Component ──────────────────────────────────────────────────────────────
export const UuidGenerator = () => {
  const [hyphens, setHyphens] = useState(true);
  const [uppercase, setUppercase] = useState(false);
  const [version, setVersion] = useState<UUIDVersion>('4');
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>(() => [generateUUID('4')]);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const handleGenerate = useCallback(() => {
    const newUuids = Array.from({ length: count }, () => generateUUID(version));
    setUuids(newUuids);
    setHistory((prev) => [...newUuids, ...prev].slice(0, 50));
    setCopied(false);
  }, [version, count]);

  const formatted = uuids.map((u) => formatUUID(u, hyphens, uppercase));

  const handleCopyAll = () => {
    navigator.clipboard.writeText(formatted.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySingle = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([formatted.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-v${version}-${count}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: '20px 24px',
  };

  return (
    <div className="h-full overflow-y-auto" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Configuration */}
        <div className="text-[13px] font-bold" style={{ color: 'var(--text-secondary)' }}>Configuration</div>

        {/* Hyphens */}
        <div style={cardStyle} className="flex items-center gap-4">
          <Minus size={20} style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Hyphens</div>
          </div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>{hyphens ? 'On' : 'Off'}</span>
          <Toggle checked={hyphens} onChange={setHyphens} />
        </div>

        {/* Uppercase */}
        <div style={cardStyle} className="flex items-center gap-4">
          <CaseSensitive size={20} style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Uppercase</div>
          </div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>{uppercase ? 'On' : 'Off'}</span>
          <Toggle checked={uppercase} onChange={setUppercase} />
        </div>

        {/* Version */}
        <div style={cardStyle} className="flex items-center gap-4">
          <SlidersHorizontal size={20} style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>UUID Version</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>{VERSION_INFO[version].description}</div>
          </div>
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value as UUIDVersion)}
            className="rounded-lg px-3 py-2 text-[13px] font-semibold outline-none cursor-pointer"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', minWidth: 130 }}
          >
            {(Object.keys(VERSION_INFO) as UUIDVersion[]).map((v) => (
              <option key={v} value={v}>{VERSION_INFO[v].label}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        <div style={cardStyle} className="flex items-center gap-4">
          <Hash size={20} style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Generation Count</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>Number of UUIDs to generate</div>
          </div>
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-input)' }}>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value))))}
              className="w-16 text-center text-[14px] font-semibold outline-none py-2"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: 'none' }}
            />
            <div className="flex flex-col" style={{ borderLeft: '1px solid var(--border-input)' }}>
              <button onClick={() => setCount((c) => Math.min(100, c + 1))} className="px-2 py-0.5 cursor-pointer hover:bg-[var(--bg-hover)]" style={{ background: 'var(--bg-input)', border: 'none', borderBottom: '1px solid var(--border-input)', color: 'var(--text-muted)', fontSize: 10 }}>▲</button>
              <button onClick={() => setCount((c) => Math.max(1, c - 1))} className="px-2 py-0.5 cursor-pointer hover:bg-[var(--bg-hover)]" style={{ background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)', fontSize: 10 }}>▼</button>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold" style={{ color: 'var(--text-secondary)' }}>UUID(s)</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw size={12} /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download size={12} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopyAll}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* UUID list */}
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          {formatted.map((uuid, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors"
              style={{ borderBottom: i < formatted.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
              onClick={() => handleCopySingle(uuid)}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              title="Click to copy"
            >
              <span className="text-[12px] font-semibold tabular-nums w-8 text-right" style={{ color: 'var(--accent)' }}>{i + 1}</span>
              <code className="text-[14px] flex-1" style={{ fontFamily: "'Source Code Pro', monospace", color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                {uuid}
              </code>
              <Copy size={12} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
            </div>
          ))}
        </div>

        {/* History */}
        {history.length > count && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Recent History</span>
              <button onClick={() => setHistory([])} className="text-[10px] cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}>
                <Trash2 size={11} className="inline mr-0.5" />Clear
              </button>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              {history.slice(count, count + 10).map((uuid, i) => (
                <div
                  key={`h-${i}`}
                  className="flex items-center gap-3 px-5 py-2 cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--border-subtle)', opacity: 0.6 }}
                  onClick={() => handleCopySingle(formatUUID(uuid, hyphens, uppercase))}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <code className="text-[12px] flex-1" style={{ fontFamily: "'Source Code Pro', monospace", color: 'var(--text-muted)' }}>
                    {formatUUID(uuid, hyphens, uppercase)}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import { useState, useMemo } from 'react';
import { Regex, AlertCircle, Clock, Hash } from 'lucide-react';

interface MatchResult {
  text: string;
  index: number;
  groups: Record<string, string> | undefined;
}

interface RegexResult {
  matches: MatchResult[];
  error: string;
  duration: number;
}

function executeRegex(pattern: string, flags: string, testString: string): RegexResult {
  if (!pattern) return { matches: [], error: '', duration: 0 };

  const start = performance.now();
  try {
    const re = new RegExp(pattern, flags);
    const matches: MatchResult[] = [];

    if (flags.includes('g')) {
      let match: RegExpExecArray | null;
      let safety = 0;
      while ((match = re.exec(testString)) !== null && safety < 10000) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.groups ? { ...match.groups } : undefined,
        });
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) re.lastIndex++;
        safety++;
      }
    } else {
      const match = re.exec(testString);
      if (match) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.groups ? { ...match.groups } : undefined,
        });
      }
    }

    const duration = performance.now() - start;
    return { matches, error: '', duration };
  } catch (e) {
    const duration = performance.now() - start;
    return { matches: [], error: String(e).replace('SyntaxError: ', ''), duration };
  }
}

function highlightMatches(text: string, matches: MatchResult[]): React.ReactNode[] {
  if (matches.length === 0) return [text];

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  // Sort matches by index
  const sorted = [...matches].sort((a, b) => a.index - b.index);

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    if (m.index > lastEnd) {
      parts.push(
        <span key={`t-${i}`}>{text.slice(lastEnd, m.index)}</span>
      );
    }
    parts.push(
      <mark
        key={`m-${i}`}
        style={{
          background: i % 2 === 0 ? 'rgba(59,130,246,0.25)' : 'rgba(139,92,246,0.25)',
          color: 'inherit',
          borderRadius: 2,
          padding: '1px 0',
          borderBottom: '2px solid',
          borderBottomColor: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
        }}
      >
        {m.text}
      </mark>
    );
    lastEnd = m.index + m.text.length;
  }

  if (lastEnd < text.length) {
    parts.push(<span key="tail">{text.slice(lastEnd)}</span>);
  }

  return parts;
}

const SAMPLE_PATTERN = '(\\w+)@(\\w+\\.\\w+)';
const SAMPLE_TEST = `Contact us at hello@example.com or support@forge.dev for help.
Invalid: @missing.com, also-invalid@, and just plain text.
Another match: admin@portal.io is valid too.`;

type Flag = 'g' | 'i' | 'm' | 's' | 'u';

export const RegexTester = () => {
  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [flags, setFlags] = useState<Set<Flag>>(new Set(['g']));
  const [testString, setTestString] = useState(SAMPLE_TEST);

  const flagStr = Array.from(flags).sort().join('');

  const result = useMemo(
    () => executeRegex(pattern, flagStr, testString),
    [pattern, flagStr, testString]
  );

  const toggleFlag = (flag: Flag) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <Regex size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Regex Tester
        </span>

        <div className="ml-auto flex items-center gap-3 text-[10px] font-mono">
          {result.matches.length > 0 && (
            <>
              <span className="flex items-center gap-1" style={{ color: '#10b981' }}>
                <Hash size={10} /> {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
              </span>
              <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Clock size={10} /> {result.duration.toFixed(2)}ms
              </span>
            </>
          )}
        </div>
      </div>

      {/* Pattern input */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <span
          className="text-[14px] font-mono font-bold flex-shrink-0"
          style={{ color: 'var(--text-faint)' }}
        >
          /
        </span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Enter regex pattern..."
          className="flex-1 text-[13px] font-mono outline-none"
          style={{
            background: 'transparent',
            color: 'var(--text-primary)',
            border: 'none',
          }}
          spellCheck={false}
        />
        <span
          className="text-[14px] font-mono font-bold flex-shrink-0"
          style={{ color: 'var(--text-faint)' }}
        >
          /{flagStr}
        </span>

        <div
          className="flex gap-1 ml-2"
          style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 8 }}
        >
          {(['g', 'i', 'm', 's', 'u'] as Flag[]).map((f) => (
            <button
              key={f}
              onClick={() => toggleFlag(f)}
              className="w-7 h-7 rounded-md text-[12px] font-mono font-bold transition-all"
              style={
                flags.has(f)
                  ? {
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                    }
                  : {
                      background: 'var(--bg-surface)',
                      color: 'var(--text-faint)',
                      border: '1px solid var(--border-input)',
                    }
              }
              title={
                f === 'g' ? 'Global' :
                f === 'i' ? 'Case insensitive' :
                f === 'm' ? 'Multiline' :
                f === 's' ? 'Dot matches newline' :
                'Unicode'
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error bar */}
      {result.error && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono flex-shrink-0"
          style={{
            background: 'rgba(248,113,113,0.08)',
            borderBottom: '1px solid var(--border-subtle)',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={13} />
          {result.error}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Test string with highlights */}
        <div className="flex-1 flex flex-col" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
            style={{
              color: 'var(--text-faint)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
            }}
          >
            Test String
          </div>
          <div className="flex-1 flex min-h-0">
            <textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter test string..."
              className="flex-1 w-full resize-none outline-none p-4 text-[13px] font-mono"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: 'none',
              }}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Highlighted preview */}
        {testString && pattern && !result.error && (
          <div
            className="flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-color)', maxHeight: '30%' }}
          >
            <div
              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: 'var(--text-faint)',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-inset)',
              }}
            >
              Highlighted Matches
            </div>
            <div
              className="p-4 text-[13px] font-mono overflow-auto whitespace-pre-wrap"
              style={{ color: 'var(--text-primary)', maxHeight: 120 }}
            >
              {highlightMatches(testString, result.matches)}
            </div>
          </div>
        )}

        {/* Match results */}
        <div className="flex-shrink-0 overflow-auto" style={{ maxHeight: '35%' }}>
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider sticky top-0"
            style={{
              color: 'var(--text-faint)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
              zIndex: 1,
            }}
          >
            Match Details ({result.matches.length})
          </div>
          {result.matches.length === 0 && !result.error && pattern && (
            <div
              className="px-4 py-4 text-[12px] text-center"
              style={{ color: 'var(--text-faint)' }}
            >
              No matches found
            </div>
          )}
          {result.matches.map((m, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 px-4 py-2 text-[12px] font-mono"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span
                className="flex-shrink-0 w-6 text-right"
                style={{ color: 'var(--text-faint)' }}
              >
                {idx + 1}
              </span>
              <span style={{ color: '#3b82f6' }}>"{m.text}"</span>
              <span style={{ color: 'var(--text-muted)' }}>
                index: {m.index}
              </span>
              {m.groups && Object.keys(m.groups).length > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>
                  groups: {JSON.stringify(m.groups)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

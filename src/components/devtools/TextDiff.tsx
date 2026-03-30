import { useState, useMemo } from 'react';
import { GitCompareArrows, RotateCcw } from 'lucide-react';
import { Button } from '../ui';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  lineNumOld?: number;
  lineNumNew?: number;
  text: string;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const lines: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      lines.push({ type: 'unchanged', lineNumOld: i, lineNumNew: j, text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      lines.push({ type: 'added', lineNumNew: j, text: newLines[j - 1] });
      j--;
    } else {
      lines.push({ type: 'removed', lineNumOld: i, text: oldLines[i - 1] });
      i--;
    }
  }
  lines.reverse();

  return lines.length > 0 ? lines : result;
}

const SAMPLE_ORIGINAL = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

const x = 42;`;

const SAMPLE_MODIFIED = `function greet(name, greeting) {
  console.log(greeting + ", " + name);
  return true;
}

const x = 100;
const y = 200;`;

export const TextDiff = () => {
  const [original, setOriginal] = useState(SAMPLE_ORIGINAL);
  const [modified, setModified] = useState(SAMPLE_MODIFIED);

  const diff = useMemo(() => computeDiff(original, modified), [original, modified]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, unchanged = 0;
    for (const line of diff) {
      if (line.type === 'added') added++;
      else if (line.type === 'removed') removed++;
      else unchanged++;
    }
    return { added, removed, unchanged };
  }, [diff]);

  const handleClear = () => {
    setOriginal('');
    setModified('');
  };

  const lineStyle = (type: DiffLine['type']): React.CSSProperties => {
    switch (type) {
      case 'added':
        return { background: 'rgba(16,185,129,0.1)', color: '#10b981' };
      case 'removed':
        return { background: 'rgba(239,68,68,0.1)', color: '#ef4444' };
      default:
        return { color: 'var(--text-primary)' };
    }
  };

  const prefix = (type: DiffLine['type']) => {
    switch (type) {
      case 'added': return '+';
      case 'removed': return '-';
      default: return ' ';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <GitCompareArrows size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Text Diff
        </span>

        <Button variant="ghost" size="sm" onClick={handleClear}>
          <RotateCcw size={12} /> Clear
        </Button>

        <div className="ml-auto flex items-center gap-3 text-[10px] font-mono">
          <span style={{ color: '#10b981' }}>+{stats.added} additions</span>
          <span style={{ color: '#ef4444' }}>-{stats.removed} deletions</span>
          <span style={{ color: 'var(--text-muted)' }}>{stats.unchanged} unchanged</span>
        </div>
      </div>

      {/* Input panels */}
      <div className="flex flex-shrink-0" style={{ height: '40%', borderBottom: '1px solid var(--border-color)' }}>
        {/* Original */}
        <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
            style={{
              color: 'var(--text-faint)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
            }}
          >
            Original
          </div>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Paste original text..."
            className="flex-1 w-full resize-none outline-none p-4 text-[13px] font-mono"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: 'none',
            }}
            spellCheck={false}
          />
        </div>

        {/* Modified */}
        <div className="flex-1 flex flex-col">
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
            style={{
              color: 'var(--text-faint)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
            }}
          >
            Modified
          </div>
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            placeholder="Paste modified text..."
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

      {/* Diff output */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
          style={{
            color: 'var(--text-faint)',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-inset)',
          }}
        >
          Diff Output
        </div>
        <div
          className="flex-1 overflow-auto font-mono text-[13px]"
          style={{ background: 'var(--bg-surface)' }}
        >
          {diff.length === 0 && (!original && !modified) && (
            <div
              className="flex items-center justify-center h-full text-[12px]"
              style={{ color: 'var(--text-faint)' }}
            >
              Enter text in both panels to see the diff
            </div>
          )}
          {diff.map((line, idx) => (
            <div
              key={idx}
              className="flex"
              style={{
                ...lineStyle(line.type),
                borderBottom: '1px solid var(--border-subtle)',
                minHeight: 24,
              }}
            >
              <span
                className="w-10 text-right px-2 flex-shrink-0 select-none"
                style={{
                  color: 'var(--text-faint)',
                  borderRight: '1px solid var(--border-subtle)',
                  fontSize: 11,
                  lineHeight: '24px',
                }}
              >
                {line.lineNumOld ?? ''}
              </span>
              <span
                className="w-10 text-right px-2 flex-shrink-0 select-none"
                style={{
                  color: 'var(--text-faint)',
                  borderRight: '1px solid var(--border-subtle)',
                  fontSize: 11,
                  lineHeight: '24px',
                }}
              >
                {line.lineNumNew ?? ''}
              </span>
              <span
                className="w-6 text-center flex-shrink-0 font-bold select-none"
                style={{ lineHeight: '24px' }}
              >
                {prefix(line.type)}
              </span>
              <span
                className="flex-1 px-2 whitespace-pre"
                style={{ lineHeight: '24px' }}
              >
                {line.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

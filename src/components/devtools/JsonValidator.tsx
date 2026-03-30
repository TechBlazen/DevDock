import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { CheckCircle, AlertCircle, Wand2, Copy, Check, Braces } from 'lucide-react';
import { Button } from '../ui';

const SAMPLE_JSON = `{
  "name": "forge-portal",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.2.4",
    "zustand": "^5.0.12"
  }
}`;

interface ValidationResult {
  valid: boolean;
  error?: string;
  line?: number;
  column?: number;
  parsed?: unknown;
}

function validateJson(input: string): ValidationResult {
  if (!input.trim()) return { valid: false, error: 'Empty input' };
  try {
    const parsed = JSON.parse(input);
    return { valid: true, parsed };
  } catch (e) {
    const msg = String(e);
    const match = msg.match(/position (\d+)/);
    let line = 0, column = 0;
    if (match) {
      const pos = parseInt(match[1]);
      const before = input.substring(0, pos);
      line = (before.match(/\n/g) || []).length + 1;
      column = pos - before.lastIndexOf('\n');
    }
    return { valid: false, error: msg.replace('SyntaxError: ', ''), line, column };
  }
}

function getJsonStats(parsed: unknown): { keys: number; depth: number; type: string; size: string } {
  const type = Array.isArray(parsed) ? 'array' : typeof parsed;
  const json = JSON.stringify(parsed);
  const size = json.length > 1024 ? `${(json.length / 1024).toFixed(1)} KB` : `${json.length} B`;
  let keys = 0;
  let depth = 0;
  function walk(obj: unknown, d: number) {
    if (d > depth) depth = d;
    if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      keys += entries.length;
      for (const [, v] of entries) walk(v, d + 1);
    }
  }
  walk(parsed, 0);
  return { keys, depth, type, size };
}

export const JsonValidator = () => {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleValidate = useCallback(() => {
    setResult(validateJson(input));
  }, [input]);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
      setResult({ valid: true, parsed });
    } catch {
      setResult(validateJson(input));
    }
  }, [input]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      setResult({ valid: true, parsed });
    } catch {
      setResult(validateJson(input));
    }
  }, [input]);

  const handleCopy = () => {
    navigator.clipboard.writeText(input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const stats = result?.valid && result.parsed ? getJsonStats(result.parsed) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Button variant="primary" size="sm" onClick={handleValidate}>
          <CheckCircle size={12} /> Validate
        </Button>
        <Button variant="outline" size="sm" onClick={handleFormat}>
          <Wand2 size={12} /> Format
        </Button>
        <Button variant="ghost" size="sm" onClick={handleMinify}>
          <Braces size={12} /> Minify
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>

        <div className="ml-auto flex items-center gap-3">
          {stats && (
            <div className="flex gap-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              <span>type: {stats.type}</span>
              <span>keys: {stats.keys}</span>
              <span>depth: {stats.depth}</span>
              <span>{stats.size}</span>
            </div>
          )}
        </div>
      </div>

      {/* Result bar */}
      {result && (
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono flex-shrink-0" style={{
          background: result.valid ? 'rgba(16,185,129,0.08)' : 'rgba(248,113,113,0.08)',
          borderBottom: '1px solid var(--border-subtle)',
          color: result.valid ? '#10b981' : '#ef4444',
        }}>
          {result.valid ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {result.valid ? 'Valid JSON' : `${result.error}${result.line ? ` (line ${result.line}, col ${result.column})` : ''}`}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="json"
          value={input}
          onChange={(v) => { setInput(v ?? ''); setResult(null); }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Source Code Pro', monospace",
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            contextmenu: true,
            tabSize: 2,
            theme: 'vs',
            renderLineHighlight: 'gutter',
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
        />
      </div>
    </div>
  );
};

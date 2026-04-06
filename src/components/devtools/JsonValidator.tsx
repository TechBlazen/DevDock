import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  CheckCircle, AlertCircle, Wand2, Copy, Check, Braces,
  ArrowRightLeft, Download, FileText,
} from 'lucide-react';
import { stringify as yamlStringify, parse as yamlParse } from 'yaml';
import { Button, Pill } from '../ui';

const SAMPLE_JSON = `{
  "name": "devdock",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.2.4",
    "zustand": "^5.0.12"
  }
}`;

type EditorMode = 'json' | 'yaml';

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

function validateYaml(input: string): ValidationResult {
  if (!input.trim()) return { valid: false, error: 'Empty input' };
  try {
    const parsed = yamlParse(input);
    return { valid: true, parsed };
  } catch (e) {
    const msg = String(e);
    return { valid: false, error: msg.split('\n')[0] };
  }
}

function getStats(parsed: unknown): { keys: number; depth: number; type: string; size: string } {
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
  const [mode, setMode] = useState<EditorMode>('json');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2);

  const validate = useCallback(() => {
    setResult(mode === 'json' ? validateJson(input) : validateYaml(input));
  }, [input, mode]);

  const handleFormat = useCallback(() => {
    try {
      const parsed = mode === 'json' ? JSON.parse(input) : yamlParse(input);
      if (mode === 'json') {
        setInput(JSON.stringify(parsed, null, indent));
      } else {
        setInput(yamlStringify(parsed, { indent }));
      }
      setResult({ valid: true, parsed });
    } catch {
      setResult(mode === 'json' ? validateJson(input) : validateYaml(input));
    }
  }, [input, mode, indent]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = mode === 'json' ? JSON.parse(input) : yamlParse(input);
      if (mode === 'json') {
        setInput(JSON.stringify(parsed));
      } else {
        setInput(yamlStringify(parsed, { indent: 2, lineWidth: 0 }));
      }
      setResult({ valid: true, parsed });
    } catch {
      setResult(mode === 'json' ? validateJson(input) : validateYaml(input));
    }
  }, [input, mode]);

  const handleConvert = useCallback(() => {
    try {
      if (mode === 'json') {
        // JSON → YAML
        const parsed = JSON.parse(input);
        setInput(yamlStringify(parsed, { indent }));
        setMode('yaml');
        setResult({ valid: true, parsed });
      } else {
        // YAML → JSON
        const parsed = yamlParse(input);
        setInput(JSON.stringify(parsed, null, indent));
        setMode('json');
        setResult({ valid: true, parsed });
      }
    } catch {
      setResult(mode === 'json' ? validateJson(input) : validateYaml(input));
    }
  }, [input, mode, indent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = () => {
    const ext = mode === 'json' ? 'json' : 'yaml';
    const blob = new Blob([input], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = '.json,.yaml,.yml,.txt';
    el.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      setInput(text);
      const isYaml = file.name.endsWith('.yaml') || file.name.endsWith('.yml');
      setMode(isYaml ? 'yaml' : 'json');
      setResult(null);
    };
    el.click();
  };

  const stats = result?.valid && result.parsed ? getStats(result.parsed) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-input)' }}>
          <button
            onClick={() => setMode('json')}
            className="px-3 py-1 text-[11px] font-bold cursor-pointer"
            style={{
              background: mode === 'json' ? 'var(--accent-bg)' : 'transparent',
              color: mode === 'json' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
            }}
          >JSON</button>
          <button
            onClick={() => setMode('yaml')}
            className="px-3 py-1 text-[11px] font-bold cursor-pointer"
            style={{
              background: mode === 'yaml' ? 'rgba(203,23,30,0.1)' : 'transparent',
              color: mode === 'yaml' ? '#cb171e' : 'var(--text-muted)',
              border: 'none',
              borderLeft: '1px solid var(--border-input)',
            }}
          >YAML</button>
        </div>

        <Button variant="primary" size="sm" onClick={validate}>
          <CheckCircle size={12} /> Validate
        </Button>
        <Button variant="outline" size="sm" onClick={handleFormat}>
          <Wand2 size={12} /> Beautify
        </Button>
        <Button variant="ghost" size="sm" onClick={handleMinify}>
          <Braces size={12} /> Minify
        </Button>
        <Button variant="ghost" size="sm" onClick={handleConvert}>
          <ArrowRightLeft size={12} /> {mode === 'json' ? 'To YAML' : 'To JSON'}
        </Button>

        {/* Separator */}
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />

        {/* Indent selector */}
        <select
          value={indent}
          onChange={(e) => setIndent(Number(e.target.value))}
          className="rounded px-2 py-1 text-[10px] outline-none cursor-pointer"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          title="Indent size"
        >
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
          <option value={8}>8 spaces</option>
        </select>

        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download size={12} /> Export
        </Button>
        <Button variant="ghost" size="sm" onClick={handleImport}>
          <FileText size={12} /> Import
        </Button>

        <div className="ml-auto flex items-center gap-3">
          <Pill color={mode === 'json' ? '#f59e0b' : '#cb171e'}>{mode.toUpperCase()}</Pill>
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
          {result.valid ? `Valid ${mode.toUpperCase()}` : `${result.error}${result.line ? ` (line ${result.line}, col ${result.column})` : ''}`}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={mode === 'json' ? 'json' : 'yaml'}
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
            tabSize: indent,
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

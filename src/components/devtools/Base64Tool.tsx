import { useState, useCallback, useRef } from 'react';
import { Copy, Check, ArrowRightLeft, Upload, AlertCircle } from 'lucide-react';
import { Button } from '../ui';

type Mode = 'encode' | 'decode';

export const Base64Tool = () => {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const convert = useCallback((text: string, m: Mode) => {
    if (!text.trim()) {
      setOutput('');
      setError('');
      return;
    }
    try {
      if (m === 'encode') {
        // Handle unicode by encoding to UTF-8 first
        const encoded = btoa(
          encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
          )
        );
        setOutput(encoded);
      } else {
        const decoded = decodeURIComponent(
          Array.from(atob(text), (c) =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          ).join('')
        );
        setOutput(decoded);
      }
      setError('');
    } catch {
      setError(m === 'decode' ? 'Invalid Base64 input' : 'Failed to encode input');
      setOutput('');
    }
  }, []);

  const handleInputChange = (text: string) => {
    setInput(text);
    convert(text, mode);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    convert(input, m);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFileUpload = () => {
    fileRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 portion from data URL
      const base64 = result.split(',')[1] || '';
      setMode('decode');
      setInput(base64);
      setOutput('');
      // For file uploads, show the base64 as input and set mode contextually
      setMode('encode');
      setInput(file.name);
      setOutput(base64);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div
          className="flex rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-color)' }}
        >
          {(['encode', 'decode'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className="px-3 py-1.5 text-[12px] font-semibold capitalize transition-all"
              style={
                mode === m
                  ? { background: 'var(--accent)', color: '#ffffff' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-muted)' }
              }
            >
              {m}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={handleFileUpload}>
          <Upload size={12} /> File to Base64
        </Button>
        <input
          ref={fileRef}
          type="file"
          onChange={handleFile}
          style={{ display: 'none' }}
        />

        <div className="ml-auto flex items-center gap-2">
          {input && (
            <span
              className="text-[10px] font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {mode === 'encode' ? 'Input' : 'Base64'}: {input.length} chars
              {output && ` | Output: ${output.length} chars`}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!output}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy Output'}
          </Button>
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono flex-shrink-0"
          style={{
            background: 'rgba(248,113,113,0.08)',
            borderBottom: '1px solid var(--border-subtle)',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Main panels */}
      <div className="flex-1 flex min-h-0">
        {/* Input panel */}
        <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 flex-shrink-0"
            style={{
              color: 'var(--text-faint)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
            }}
          >
            <ArrowRightLeft size={10} />
            {mode === 'encode' ? 'Plain Text' : 'Base64 Input'}
          </div>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              mode === 'encode'
                ? 'Enter text to encode...'
                : 'Enter Base64 string to decode...'
            }
            className="flex-1 w-full resize-none outline-none p-4 text-[13px] font-mono"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: 'none',
            }}
            spellCheck={false}
          />
        </div>

        {/* Output panel */}
        <div className="flex-1 flex flex-col">
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 flex-shrink-0"
            style={{
              color: 'var(--text-faint)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
            }}
          >
            <ArrowRightLeft size={10} />
            {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Output will appear here..."
            className="flex-1 w-full resize-none outline-none p-4 text-[13px] font-mono"
            style={{
              background: 'var(--bg-inset)',
              color: 'var(--text-primary)',
              border: 'none',
            }}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

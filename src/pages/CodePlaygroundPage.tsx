import { useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Loader2, Terminal, Copy, Check, Trash2, Download, Upload,
  Code2, Eye, Paintbrush,
} from 'lucide-react';
import { codeApi } from '../lib/api';
import { SectionTitle, Card, CardHeader, Button } from '../components/ui';

type Language = {
  id: string;
  label: string;
  monacoId: string;
  color: string;
  runMode: 'browser' | 'server';
  template: string;
};

const LANGUAGES: Language[] = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript', color: '#F1E05A', runMode: 'browser', template: `// JavaScript Playground\nconsole.log("Hello, World!");\n\nconst sum = (a, b) => a + b;\nconsole.log("2 + 3 =", sum(2, 3));\n` },
  { id: 'typescript', label: 'TypeScript', monacoId: 'typescript', color: '#3178C6', runMode: 'browser', template: `// TypeScript Playground\ninterface User {\n  name: string;\n  age: number;\n}\n\nconst greet = (user: User): string => \`Hello, \${user.name}! You are \${user.age}.\`;\n\nconsole.log(greet({ name: "Terry", age: 30 }));\n` },
  { id: 'html', label: 'HTML/CSS/JS', monacoId: 'html', color: '#E34C26', runMode: 'browser', template: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; padding: 20px; background: #1a1a2e; color: #eee; }\n    h1 { color: #4a9eff; }\n    .card { background: #222; border-radius: 8px; padding: 16px; margin-top: 12px; }\n  </style>\n</head>\n<body>\n  <h1>Hello, DevDock!</h1>\n  <div class="card">\n    <p>This is a live HTML preview.</p>\n    <button onclick="alert('Clicked!')">Click me</button>\n  </div>\n  <script>\n    console.log("Page loaded");\n  </script>\n</body>\n</html>` },
  { id: 'css', label: 'CSS', monacoId: 'css', color: '#563D7C', runMode: 'browser', template: `/* CSS Playground — preview renders below */\n.container {\n  display: flex;\n  gap: 12px;\n  padding: 20px;\n}\n\n.box {\n  width: 80px;\n  height: 80px;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-weight: bold;\n  color: white;\n  font-size: 14px;\n}\n\n.box:nth-child(1) { background: #ef4444; }\n.box:nth-child(2) { background: #3b82f6; }\n.box:nth-child(3) { background: #22c55e; }\n.box:nth-child(4) { background: #f59e0b; }` },
  { id: 'python', label: 'Python', monacoId: 'python', color: '#3572A5', runMode: 'server', template: `# Python Playground\nimport json\n\ndef fibonacci(n):\n    a, b = 0, 1\n    result = []\n    for _ in range(n):\n        result.append(a)\n        a, b = b, a + b\n    return result\n\nprint("Fibonacci(10):", fibonacci(10))\nprint("Sum:", sum(fibonacci(10)))\n` },
  { id: 'ruby', label: 'Ruby', monacoId: 'ruby', color: '#CC342D', runMode: 'server', template: `# Ruby Playground\ndef factorial(n)\n  return 1 if n <= 1\n  n * factorial(n - 1)\nend\n\n(1..10).each do |i|\n  puts "#{i}! = #{factorial(i)}"\nend\n` },
  { id: 'go', label: 'Go', monacoId: 'go', color: '#00ADD8', runMode: 'server', template: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfor i := 1; i <= 10; i++ {\n\t\tif i%3 == 0 && i%5 == 0 {\n\t\t\tfmt.Println("FizzBuzz")\n\t\t} else if i%3 == 0 {\n\t\t\tfmt.Println("Fizz")\n\t\t} else if i%5 == 0 {\n\t\t\tfmt.Println("Buzz")\n\t\t} else {\n\t\t\tfmt.Println(i)\n\t\t}\n\t}\n}\n` },
  { id: 'bash', label: 'Bash', monacoId: 'shell', color: '#89E051', runMode: 'server', template: `#!/bin/bash\n# Bash Playground\n\necho "Hello from Bash!"\necho "Date: $(date)"\necho "User: $(whoami)"\necho "Shell: $SHELL"\n\nfor i in {1..5}; do\n  echo "Count: $i"\ndone\n` },
];

const CSS_PREVIEW_HTML = `<!DOCTYPE html><html><head><style>CSS_CONTENT</style></head><body>
<div class="container">
  <div class="box">1</div><div class="box">2</div><div class="box">3</div><div class="box">4</div>
</div>
</body></html>`;

export const CodePlaygroundPage = () => {
  const [langId, setLangId] = useState('javascript');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [output, setOutput] = useState('');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const lang = LANGUAGES.find((l) => l.id === langId)!;

  const handleLangChange = (id: string) => {
    const newLang = LANGUAGES.find((l) => l.id === id)!;
    setLangId(id);
    setCode(newLang.template);
    setOutput('');
    setHtmlPreview('');
    setDuration(null);
  };

  const runBrowserCode = useCallback(() => {
    const start = Date.now();

    if (lang.id === 'html') {
      setHtmlPreview(code);
      setOutput('');
      setDuration(Date.now() - start);
      return;
    }

    if (lang.id === 'css') {
      setHtmlPreview(CSS_PREVIEW_HTML.replace('CSS_CONTENT', code));
      setOutput('');
      setDuration(Date.now() - start);
      return;
    }

    // JavaScript / TypeScript — capture console output
    const logs: string[] = [];
    const fakeConsole = {
      log: (...args: unknown[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
      warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
      info: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      table: (data: unknown) => logs.push(JSON.stringify(data, null, 2)),
    };

    let execCode = code;
    // Strip TypeScript type annotations for browser execution (basic transpilation)
    if (lang.id === 'typescript') {
      execCode = code
        .replace(/:\s*(string|number|boolean|any|void|never|unknown|object)\b/g, '')
        .replace(/:\s*\w+\[\]/g, '')
        .replace(/<\w+>/g, '')
        .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
        .replace(/as\s+\w+/g, '');
    }

    try {
      const fn = new Function('console', execCode);
      fn(fakeConsole);
      setOutput(logs.join('\n') || '(no output)');
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setHtmlPreview('');
    setDuration(Date.now() - start);
  }, [code, lang]);

  const runServerCode = useCallback(async () => {
    setRunning(true);
    setOutput('');
    setHtmlPreview('');
    try {
      const result = await codeApi.run(lang.id, code);
      const out = [result.stdout, result.stderr].filter(Boolean).join('\n');
      setOutput(out || '(no output)');
      setDuration(result.duration);
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setDuration(null);
    }
    setRunning(false);
  }, [code, lang]);

  const handleRun = () => {
    if (lang.runMode === 'browser') runBrowserCode();
    else runServerCode();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const ext = lang.id === 'html' ? 'html' : lang.id === 'css' ? 'css' : lang.id === 'typescript' ? 'ts' : lang.id === 'javascript' ? 'js' : lang.id;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playground.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.ts,.py,.rb,.go,.sh,.php,.rs,.html,.css,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) setCode(await file.text());
    };
    input.click();
  };

  const vFont: React.CSSProperties = { fontFamily: 'Verdana, Geneva, sans-serif' };

  return (
    <div className="p-8" style={vFont}>
      <SectionTitle sub="Write and execute code in multiple languages with instant output">
        Code Playground
      </SectionTitle>

      {/* Language selector */}
      <div className="flex gap-3 flex-wrap" style={{ marginTop: 24, marginBottom: 24 }}>
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={() => handleLangChange(l.id)}
            className="rounded-lg transition-all cursor-pointer"
            style={{
              ...vFont,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              ...(langId === l.id
                ? { background: `${l.color}20`, color: l.color, border: `2px solid ${l.color}` }
                : { color: 'var(--text-primary)', border: '2px solid var(--border-color)', background: 'transparent' }
              ),
            }}
          >
            <Code2 size={13} className="inline mr-1.5" style={{ verticalAlign: '-2px' }} />
            {l.label}
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, opacity: 0.6 }}>
              {l.runMode === 'browser' ? 'browser' : 'server'}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-5 items-start">
        {/* Editor */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="justify-between">
              <div className="flex items-center gap-2">
                <Code2 size={13} style={{ color: lang.color }} />
                <span className="font-bold uppercase tracking-wider" style={{ ...vFont, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {lang.label} Editor
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleImport} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Import file"><Upload size={13} /></button>
                <button onClick={handleExport} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Export code"><Download size={13} /></button>
                <button onClick={handleCopy} className="p-1 cursor-pointer" style={{ color: copied ? '#22c55e' : 'var(--text-faint)', background: 'none', border: 'none' }} title="Copy code">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
                <button onClick={() => { setCode(''); setOutput(''); setHtmlPreview(''); }} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Clear"><Trash2 size={13} /></button>
              </div>
            </CardHeader>
            <div style={{ height: 400 }}>
              <Editor
                height="100%"
                language={lang.monacoId}
                value={code}
                onChange={(v) => setCode(v ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontFamily: "'Source Code Pro', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 12 },
                  tabSize: 2,
                  fontLigatures: true,
                }}
              />
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }} className="flex items-center gap-3">
              <Button variant="primary" size="sm" onClick={handleRun} disabled={running || !code.trim()}>
                {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Run {lang.runMode === 'browser' ? '' : `(${lang.label})`}
              </Button>
              <span style={{ ...vFont, fontSize: 11, color: 'var(--text-muted)' }}>
                {lang.runMode === 'browser' ? 'Runs in browser sandbox' : 'Runs on server'}
                {' · Ctrl+Enter to execute'}
              </span>
              {duration != null && (
                <span style={{ ...vFont, fontSize: 11, color: 'var(--text-secondary)' }} className="ml-auto">{duration}ms</span>
              )}
            </div>
          </Card>
        </div>

        {/* Output */}
        <div className="w-[400px] shrink-0">
          <Card>
            <CardHeader>
              {(lang.id === 'html' || lang.id === 'css') ? (
                <>
                  {lang.id === 'css' ? <Paintbrush size={13} style={{ color: lang.color }} /> : <Eye size={13} style={{ color: lang.color }} />}
                  <span className="font-bold uppercase tracking-wider" style={{ ...vFont, fontSize: 12, color: 'var(--text-secondary)' }}>Preview</span>
                </>
              ) : (
                <>
                  <Terminal size={13} style={{ color: 'var(--accent)' }} />
                  <span className="font-bold uppercase tracking-wider" style={{ ...vFont, fontSize: 12, color: 'var(--text-secondary)' }}>Output</span>
                </>
              )}
            </CardHeader>

            {/* HTML/CSS preview iframe */}
            {htmlPreview ? (
              <iframe
                ref={iframeRef}
                srcDoc={htmlPreview}
                sandbox="allow-scripts"
                style={{ width: '100%', height: 380, border: 'none', background: '#fff' }}
                title="Preview"
              />
            ) : (
              <pre
                className="font-mono overflow-auto"
                style={{
                  padding: '16px 20px',
                  height: 380,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: output.startsWith('Error:') || output.includes('[ERROR]') ? '#ef4444' : 'var(--text-secondary)',
                  background: 'var(--bg-inset)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {output || 'Click Run to see output...'}
              </pre>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import { Copy, Check, RefreshCw, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui';
import { sendChatMessage } from '../../lib/ai';
import { useSettingsStore } from '../../store';

// ─── Lorem ipsum generator ──────────────────────────────────────────────────
// Two flavors:
//   • Generate — synchronous, sentence-assembly from the classic word list.
//   • Generate with AI — prompts the user for a topic, then asks the active
//     AI provider (via lib/ai.ts) to produce topical placeholder copy. The
//     same action is also exposed via a right-click menu on the output area.

const LOREM_WORDS = [
  'lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do',
  'eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim',
  'ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip',
  'ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate',
  'velit','esse','cillum','eu','fugiat','nulla','pariatur','excepteur','sint','occaecat',
  'cupidatat','non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim',
  'id','est','laborum','at','vero','eos','accusamus','iusto','odio','dignissimos',
];

type Length = 'short' | 'medium' | 'long';

const LENGTH_PRESETS: Record<Length, { sentencesPerPara: [number, number]; wordsPerSentence: [number, number] }> = {
  short:  { sentencesPerPara: [2, 3], wordsPerSentence: [5, 10] },
  medium: { sentencesPerPara: [4, 6], wordsPerSentence: [8, 14] },
  long:   { sentencesPerPara: [6, 9], wordsPerSentence: [10, 18] },
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateLorem(paragraphCount: number, length: Length, startWithClassic: boolean): string {
  const preset = LENGTH_PRESETS[length];
  const paras: string[] = [];
  for (let p = 0; p < paragraphCount; p++) {
    const sentenceCount = rand(preset.sentencesPerPara[0], preset.sentencesPerPara[1]);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      const wc = rand(preset.wordsPerSentence[0], preset.wordsPerSentence[1]);
      const words: string[] = [];
      for (let w = 0; w < wc; w++) {
        words.push(LOREM_WORDS[rand(0, LOREM_WORDS.length - 1)]);
      }
      const sentence = words.join(' ');
      sentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.');
    }
    paras.push(sentences.join(' '));
  }
  if (startWithClassic && paras.length > 0) {
    paras[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + paras[0];
  }
  return paras.join('\n\n');
}

// ─── Component ──────────────────────────────────────────────────────────────

export const LoremIpsum = () => {
  const [paragraphs, setParagraphs] = useState(3);
  const [length, setLength] = useState<Length>('medium');
  const [startWithClassic, setStartWithClassic] = useState(true);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const ai = useSettingsStore((s) => s.settings.ai);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close right-click menu when the user clicks anywhere outside it.
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const handleGenerate = () => {
    setAiError(null);
    setOutput(generateLorem(paragraphs, length, startWithClassic));
  };

  const handleAIGenerate = async () => {
    const topic = window.prompt('Topic for AI-generated placeholder text (e.g. "release notes for a payments API"):');
    if (!topic) return;

    setAiBusy(true);
    setAiError(null);
    try {
      const text = await aiGenerate(topic, paragraphs, length, ai);
      setOutput(text);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const wordCount = output ? output.trim().split(/\s+/).length : 0;
  const charCount = output.length;

  return (
    <div className="h-full flex flex-col gap-3 px-8 py-6 overflow-auto max-w-5xl w-full mx-auto">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>Paragraphs</label>
          <input
            type="number"
            min={1}
            max={50}
            value={paragraphs}
            onChange={(e) => setParagraphs(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="px-2 py-1 text-[12px] outline-none rounded w-20"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>Length</label>
          <div className="flex gap-1">
            {(['short', 'medium', 'long'] as Length[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setLength(opt)}
                className="px-2.5 py-1 text-[11px] rounded transition-colors capitalize"
                style={{
                  background: length === opt ? 'var(--accent)' : 'var(--bg-inset)',
                  color: length === opt ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${length === opt ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >{opt}</button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={startWithClassic} onChange={(e) => setStartWithClassic(e.target.checked)} />
          Start with "Lorem ipsum dolor sit amet…"
        </label>

        <div className="flex gap-2 ml-auto">
          <Button variant="primary" onClick={handleGenerate}>
            <RefreshCw size={13} />
            Generate
          </Button>
          <Button variant="outline" onClick={handleAIGenerate} disabled={aiBusy}>
            {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Generate with AI
          </Button>
        </div>
      </div>

      {aiError && (
        <div className="flex items-start gap-2 px-3 py-2 rounded text-[12px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Output */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>
            Output {output && <span style={{ color: 'var(--text-muted)' }}>· {wordCount} words · {charCount} chars</span>}
          </label>
          <button
            onClick={handleCopy}
            disabled={!output}
            className="flex items-center gap-1 text-[11px] disabled:opacity-40"
            style={{ color: copied ? '#2e7d32' : 'var(--text-muted)', background: 'transparent', border: 'none', cursor: output ? 'pointer' : 'default' }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <textarea
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          onContextMenu={handleContextMenu}
          placeholder="Click Generate to produce lorem ipsum, or right-click here to ask the AI."
          className="flex-1 min-h-[200px] px-3 py-2 text-[12px] outline-none rounded font-mono"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', resize: 'vertical' }}
        />
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 rounded shadow-lg overflow-hidden"
          style={{
            top: menu.y,
            left: menu.x,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            minWidth: 200,
          }}
        >
          <button
            onClick={() => { setMenu(null); handleAIGenerate(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Sparkles size={13} />
            Have AI generate text
          </button>
        </div>
      )}
    </div>
  );
};

// ─── AI helper ──────────────────────────────────────────────────────────────
// Wraps the streaming sendChatMessage in a Promise — we don't need partial
// tokens here, just the final text.

async function aiGenerate(
  topic: string,
  paragraphCount: number,
  length: Length,
  ai: ReturnType<typeof useSettingsStore.getState>['settings']['ai'],
): Promise<string> {
  const lengthHint = length === 'short' ? '2-3 short sentences each'
    : length === 'long'  ? '6-9 sentences each'
    : '4-6 sentences each';

  const systemPrompt =
    'You generate placeholder copy for design mockups. Produce realistic, ' +
    'on-topic prose suitable as filler text. No headings, no markdown, no ' +
    'commentary — output only the requested paragraphs separated by blank lines.';
  const userPrompt =
    `Generate ${paragraphCount} paragraph${paragraphCount === 1 ? '' : 's'} of ` +
    `placeholder text on the topic: "${topic}". ` +
    `Each paragraph should be ${lengthHint}.`;

  return new Promise<string>((resolve, reject) => {
    sendChatMessage(
      [{ id: 'lorem-prompt', role: 'user', content: userPrompt, timestamp: new Date() }],
      ai,
      {
        onToken: () => {},
        onDone: (text) => resolve(text),
        onError: (err) => reject(new Error(err)),
      },
      systemPrompt,
    );
  });
}

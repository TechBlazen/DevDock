import { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor, Selection } from 'monaco-editor';
import { useDocsStore, useSettingsStore } from '../../store';
import { sendChatMessage } from '../../lib/ai';
import { Spinner } from '../ui';
import type { ChatMessage } from '../../types';
import { nanoid } from 'nanoid';

interface DocEditorProps {
  docId: string;
}

const AI_ACTIONS = [
  { id: 'ai-improve', label: 'AI: Improve Writing', prompt: 'Improve the writing quality, clarity, and grammar of the following markdown text. Return only the improved markdown, no explanations:' },
  { id: 'ai-summarize', label: 'AI: Summarize', prompt: 'Summarize the following markdown text concisely. Return the summary as markdown:' },
  { id: 'ai-expand', label: 'AI: Expand Section', prompt: 'Expand on the following markdown text with more detail, examples, and depth. Return only the expanded markdown:' },
  { id: 'ai-fix', label: 'AI: Fix Formatting', prompt: 'Fix the markdown formatting of the following text. Ensure proper headers, lists, code blocks, and spacing. Return only the corrected markdown:' },
  { id: 'ai-simplify', label: 'AI: Simplify', prompt: 'Simplify the following markdown text to be more concise and easier to understand. Return only the simplified markdown:' },
  { id: 'ai-table', label: 'AI: Convert to Table', prompt: 'Convert the following content into a well-formatted markdown table. Return only the table:' },
];

export const DocEditor = ({ docId }: DocEditorProps) => {
  const { docs, updateDoc } = useDocsStore();
  const settingsRef = useRef(useSettingsStore.getState().settings);
  const doc = docs.find((d) => d.id === docId);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const docIdRef = useRef(docId);
  docIdRef.current = docId;

  // Keep settings ref current
  useEffect(() => {
    return useSettingsStore.subscribe((s) => { settingsRef.current = s.settings; });
  }, []);

  const runAiAction = useCallback((
    prompt: string,
    selectedText: string,
    selection: Selection,
    ed: editor.IStandaloneCodeEditor,
    model: editor.ITextModel
  ) => {
    setAiLoading(true);
    setAiStatus('Thinking...');

    const messages: ChatMessage[] = [
      {
        id: nanoid(),
        role: 'user',
        content: `${prompt}\n\n${selectedText}`,
        timestamp: new Date(),
      },
    ];

    sendChatMessage(
      messages,
      settingsRef.current.ai,
      {
        onToken: () => {},
        onDone: (fullText) => {
          const cleaned = fullText.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```$/, '').trim();
          ed.executeEdits('ai-action', [{
            range: selection,
            text: cleaned,
          }]);
          const newContent = model.getValue();
          updateDoc(docIdRef.current, { content: newContent });
          setAiLoading(false);
          setAiStatus('Done');
          setTimeout(() => setAiStatus(''), 2000);
        },
        onError: (error) => {
          setAiLoading(false);
          setAiStatus(`Error: ${error}`);
          setTimeout(() => setAiStatus(''), 4000);
        },
      },
      'You are a markdown editing assistant. When given markdown text with an instruction, return ONLY the transformed markdown. No explanations, no code fences wrapping the output, just the raw markdown.'
    );
  }, [updateDoc]);

  const runAiActionRef = useRef(runAiAction);
  runAiActionRef.current = runAiAction;

  const handleEditorMount: OnMount = useCallback((editorInstance, monaco) => {
    editorRef.current = editorInstance;

    // Register AI context menu actions
    for (const action of AI_ACTIONS) {
      editorInstance.addAction({
        id: action.id,
        label: action.label,
        contextMenuGroupId: 'ai',
        contextMenuOrder: 1,
        run: (ed) => {
          const casted = ed as editor.IStandaloneCodeEditor;
          const selection = casted.getSelection();
          if (!selection) return;
          const model = casted.getModel();
          if (!model) return;
          const selectedText = model.getValueInRange(selection);
          if (!selectedText.trim()) return;
          runAiActionRef.current(action.prompt, selectedText, selection, casted, model);
        },
      });
    }

    // Custom keybinding: Ctrl+Shift+I for AI improve
    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
      () => {
        const selection = editorInstance.getSelection();
        if (!selection) return;
        const model = editorInstance.getModel();
        if (!model) return;
        const selectedText = model.getValueInRange(selection);
        if (!selectedText.trim()) return;
        runAiActionRef.current(AI_ACTIONS[0].prompt, selectedText, selection, editorInstance, model);
      }
    );
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateDoc(docIdRef.current, { content: value });
    }
  }, [updateDoc]);

  useEffect(() => {
    return () => { editorRef.current = null; };
  }, []);

  if (!doc) return null;

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden" style={{
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
    }}>
      {/* AI status bar */}
      {(aiLoading || aiStatus) && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono" style={{
          background: aiLoading ? 'var(--accent-bg)' : aiStatus.startsWith('Error') ? 'rgba(255,71,87,0.08)' : 'rgba(0,229,160,0.08)',
          borderBottom: '1px solid var(--border-subtle)',
          color: aiLoading ? 'var(--accent)' : aiStatus.startsWith('Error') ? '#ff4757' : '#00e5a0',
        }}>
          {aiLoading && <Spinner size={12} />}
          <span>{aiLoading ? 'AI is transforming your selection...' : aiStatus}</span>
        </div>
      )}

      {/* Editor hint */}
      <div className="px-3 py-1 text-[10px] flex items-center justify-between" style={{
        background: 'var(--bg-inset)',
        borderBottom: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
      }}>
        <span>Markdown · Right-click for AI actions · Ctrl+Shift+I to improve selection</span>
        <span>{doc.content.length} chars</span>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="markdown"
          value={doc.content}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Source Code Pro', 'JetBrains Mono', monospace",
            lineNumbers: 'on',
            wordWrap: 'on',
            wrappingIndent: 'same',
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            renderLineHighlight: 'gutter',
            contextmenu: true,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            tabSize: 2,
            theme: 'vs',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
};

import { useState, useMemo, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Bot, Zap, Plus, Trash2, Copy, Download, Upload,
  FileText, User, Send, Eye, Code2,
  X, Loader2, PlayCircle, Clock, AlertCircle, Star,
  HardDrive, ChevronDown, ChevronRight, FolderOpen,
  RefreshCw, Save, CircleDot,
} from 'lucide-react';
import { useAuthStore, useDocsStore, useSettingsStore, useUserAccountsStore } from '../store';
import { useBuilderStore } from '../store/builder-store';
import { BUILDER_TEMPLATES } from '../lib/builder-templates';
import { sendChatMessage } from '../lib/ai';
import { isAxiosError } from 'axios';
import { skillFilesApi, type SkillFileEntry } from '../lib/api';
import { ForumMarkdownBody } from '../components/forum/ForumMarkdownBody';
import { SectionTitle, Card, CardHeader, Button, Pill } from '../components/ui';
import type { BuilderItemType, MockMessage, ChatMessage } from '../types';

const FavButton = ({ toolId }: { toolId: string }) => {
  const favUser = useAuthStore((s) => s.user);
  const toggle = useUserAccountsStore((s) => s.toggleFavoriteTool);
  const isFav = useUserAccountsStore((s) => s.isFavoriteTool);
  const fav = favUser ? isFav(favUser.id, toolId) : false;
  if (!favUser) return null;
  return (
    <button onClick={() => toggle(favUser.id, toolId)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer flex-shrink-0" style={{ color: fav ? '#f59e0b' : 'var(--text-muted)', background: fav ? 'rgba(245,158,11,0.08)' : 'transparent', border: `1px solid ${fav ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}` }}>
      <Star size={14} fill={fav ? '#f59e0b' : 'none'} />{fav ? 'Favorited' : 'Add to favorites'}
    </button>
  );
};

// ─── Disk Skill Browser ──────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  'codex': 'Codex Skills',
  'agents': 'Agent Skills',
  'warp-bundled': 'Warp Built-in',
  'custom': 'Custom',
};

/** Map an API failure to a message that names the actual cause instead of always blaming the server. */
function describeSkillFileError(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    if (status === undefined) return 'Could not reach the server — it may be offline';
    if (status === 401) return 'Session expired — sign in again to load skill files';
    if (status === 403) return 'You do not have permission to load skill files';
    if (status === 404) return 'Skill-files endpoint not found (404)';
    const detail = (err.response?.data as { error?: string } | undefined)?.error;
    return `Could not load skill files — server error ${status}${detail ? `: ${detail}` : ''}`;
  }
  return 'Could not load skill files — unexpected error';
}

function DiskSkillBrowser({
  onLoad,
  loadedPaths,
}: {
  onLoad: (file: SkillFileEntry) => Promise<void>;
  loadedPaths: Set<string>;
}) {
  const [files, setFiles] = useState<SkillFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await skillFilesApi.list();
      setFiles(list);
    } catch (err) {
      setError(describeSkillFileError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const byProvider = useMemo(() => {
    const map = new Map<string, SkillFileEntry[]>();
    for (const f of files) {
      const group = map.get(f.provider) ?? [];
      group.push(f);
      map.set(f.provider, group);
    }
    return map;
  }, [files]);

  const toggleProvider = (p: string) =>
    setCollapsedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });

  return (
    <Card>
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)' }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <HardDrive size={13} style={{ color: 'var(--accent)' }} />
        <span className="text-[11px] font-bold uppercase tracking-wider flex-1" style={{ color: 'var(--text-secondary)' }}>
          Disk Skills
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); refresh(); }}
          className="p-0.5 cursor-pointer hover:opacity-70"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
          title="Refresh"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
        {collapsed ? <ChevronRight size={12} style={{ color: 'var(--text-faint)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-faint)' }} />}
      </div>

      {!collapsed && (
        <div className="max-h-[360px] overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-[11px]" style={{ color: '#dc2626' }}>{error}</div>
          )}
          {!error && files.length === 0 && !loading && (
            <div className="px-4 py-4 text-[11px] text-center" style={{ color: 'var(--text-faint)' }}>
              No skill files found in<br /><code>~/.codex/skills</code> or<br /><code>~/.agents/skills</code>
            </div>
          )}
          {Array.from(byProvider.entries()).map(([provider, provFiles]) => (
            <div key={provider}>
              <button
                className="w-full flex items-center gap-2 px-4 py-1.5 text-left cursor-pointer"
                style={{ background: 'var(--bg-inset)', border: 'none' }}
                onClick={() => toggleProvider(provider)}
              >
                {collapsedProviders.has(provider)
                  ? <ChevronRight size={10} style={{ color: 'var(--text-faint)' }} />
                  : <ChevronDown size={10} style={{ color: 'var(--text-faint)' }} />}
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {PROVIDER_LABELS[provider] ?? provider}
                </span>
                <span className="ml-auto text-[9px]" style={{ color: 'var(--text-faint)' }}>{provFiles.length}</span>
              </button>

              {!collapsedProviders.has(provider) && provFiles.map((file) => {
                const isLoaded = loadedPaths.has(file.path);
                return (
                  <div
                    key={file.path}
                    className="flex items-start gap-2 px-4 py-2 cursor-pointer group"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isLoaded ? 'var(--accent-bg)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isLoaded) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { if (!isLoaded) e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => onLoad(file)}
                    title={file.path}
                  >
                    {file.kind === 'agent'
                      ? <Bot size={12} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                      : <Zap size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate" style={{ color: isLoaded ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {file.name}
                      </div>
                      {file.description && (
                        <div className="text-[10px] line-clamp-1" style={{ color: 'var(--text-faint)' }}>
                          {file.description}
                        </div>
                      )}
                    </div>
                    {isLoaded && (
                      <FolderOpen size={10} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export const AgentBuilderPage = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';
  const isAdmin = user?.role === 'admin';

  const {
    items, activeItemId, addItem, updateItem, removeItem,
    setActiveItem, duplicateItem, getItemsForUser, getAllItems,
    loadFromDisk, resetOriginalContent,
  } = useBuilderStore();
  const { addDoc } = useDocsStore();

  // Disk skill loading
  const [diskLoadingPath, _setDiskLoadingPath] = useState<string | null>(null);
  void diskLoadingPath; // tracked for future loading indicator
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [diskSaving, setDiskSaving] = useState(false);

  const loadedPaths = useMemo(
    () => new Set(items.filter((i) => i.sourcePath).map((i) => i.sourcePath!)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );

  const handleLoadFromDisk = useCallback(async (file: SkillFileEntry) => {
    // If already loaded, just activate it.
    const existing = items.find((i) => i.sourcePath === file.path);
    if (existing) { setActiveItem(existing.id); return; }

    _setDiskLoadingPath(file.path);
    try {
      const { content } = await skillFilesApi.read(file.path);
      loadFromDisk(file, userId, content);
    } catch {
      /* ignore — file read failed */
    } finally {
      _setDiskLoadingPath(null);
    }
  }, [items, userId, loadFromDisk, setActiveItem]);

  const activeItem = items.find((i) => i.id === activeItemId) ?? null;

  const handleReloadFromDisk = useCallback(async () => {
    if (!activeItem?.sourcePath) return;
    try {
      const { content } = await skillFilesApi.read(activeItem.sourcePath);
      resetOriginalContent(activeItem.id, content);
    } catch { /* ignore */ }
  }, [activeItem, resetOriginalContent]);

  const handleSaveToDisk = useCallback(async () => {
    if (!activeItem?.sourcePath) return;
    setDiskSaving(true);
    try {
      await skillFilesApi.save(activeItem.sourcePath, activeItem.content);
      updateItem(activeItem.id, { originalContent: activeItem.content });
    } catch { /* ignore */ } finally {
      setDiskSaving(false);
      setSaveConfirmOpen(false);
    }
  }, [activeItem, updateItem]);

  // Admins see all items; others see only their own
  const visibleItems = useMemo(
    () => isAdmin ? getAllItems() : getItemsForUser(userId),
    [isAdmin, getAllItems, getItemsForUser, userId, items]
  );

  const aiConfig = useSettingsStore((s) => s.settings.ai);

  const [showTemplates, setShowTemplates] = useState(false);
  const [filter, setFilter] = useState<BuilderItemType | 'all'>('all');
  const [mockInput, setMockInput] = useState('');
  const [previewTab, setPreviewTab] = useState<'mock' | 'preview' | 'live'>('mock');

  // Live test state
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [liveInput, setLiveInput] = useState('');
  const [liveStreaming, setLiveStreaming] = useState(false);
  const [liveStreamText, setLiveStreamText] = useState('');
  const [liveDuration, setLiveDuration] = useState<number | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const hasApiKey = aiConfig.apiKeys[aiConfig.provider]?.trim() || aiConfig.provider === 'local';

  const filtered = filter === 'all' ? visibleItems : visibleItems.filter((i) => i.type === filter);

  const handleCreateFromTemplate = (templateId: string) => {
    const tpl = BUILDER_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    addItem({
      userId,
      type: tpl.type,
      name: tpl.name,
      description: tpl.description,
      content: tpl.content,
      mockConversation: [...tpl.mockConversation],
      tags: [...tpl.tags],
      templateId: tpl.id,
    });
    setShowTemplates(false);
  };

  const handleCreateBlank = (type: BuilderItemType) => {
    addItem({
      userId,
      type,
      name: type === 'agent' ? 'New Agent' : 'New Skill',
      description: '',
      content: type === 'agent'
        ? '---\nname: my-agent\ndescription: \nmodel: claude-sonnet-4-20250514\ntools: []\n---\n\n# My Agent\n\n## System Prompt\n\nYou are...\n\n## Instructions\n\n- \n'
        : '---\nname: my-skill\ndescription: \ntrigger: /myskill\n---\n\n# My Skill\n\n## When to Use\n\n## Behavior\n\n## Output Format\n',
      mockConversation: [],
      tags: [],
    });
    setShowTemplates(false);
  };

  const handleAddMockMessage = (role: 'user' | 'assistant') => {
    if (!activeItem || !mockInput.trim()) return;
    const msg: MockMessage = { role, content: mockInput.trim() };
    updateItem(activeItem.id, { mockConversation: [...activeItem.mockConversation, msg] });
    setMockInput('');
  };

  const handleRemoveMockMessage = (index: number) => {
    if (!activeItem) return;
    const updated = activeItem.mockConversation.filter((_, i) => i !== index);
    updateItem(activeItem.id, { mockConversation: updated });
  };

  // Extract system prompt from agent/skill definition frontmatter + body
  const parseSystemPrompt = (content: string): string => {
    // Remove YAML frontmatter
    const bodyMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1].trim() : content;
    // Extract sections that form the system prompt
    return body || content;
  };

  const handleLiveTest = async () => {
    if (!activeItem || !liveInput.trim() || liveStreaming) return;

    const userMsg: ChatMessage = {
      id: `live-${Date.now()}`,
      role: 'user',
      content: liveInput.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...liveMessages, userMsg];
    setLiveMessages(updatedMessages);
    setLiveInput('');
    setLiveStreaming(true);
    setLiveStreamText('');
    setLiveError(null);

    const systemPrompt = parseSystemPrompt(activeItem.content);
    const start = Date.now();

    try {
      await sendChatMessage(
        updatedMessages,
        aiConfig,
        {
          onToken: (token) => setLiveStreamText((prev) => prev + token),
          onDone: (fullText) => {
            setLiveDuration(Date.now() - start);
            setLiveMessages((prev) => [
              ...prev,
              { id: `live-resp-${Date.now()}`, role: 'assistant', content: fullText, timestamp: new Date(), provider: aiConfig.provider },
            ]);
            setLiveStreamText('');
            setLiveStreaming(false);
          },
          onError: (error) => {
            setLiveError(error);
            setLiveStreaming(false);
            setLiveStreamText('');
          },
        },
        systemPrompt
      );
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : 'Failed to send message');
      setLiveStreaming(false);
    }
  };

  const handleClearLiveChat = () => {
    setLiveMessages([]);
    setLiveStreamText('');
    setLiveDuration(null);
    setLiveError(null);
  };

  const handleExportToFile = () => {
    if (!activeItem) return;
    const ext = activeItem.type === 'agent' ? 'agent.md' : 'skill.md';
    const blob = new Blob([activeItem.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeItem.name.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToDocs = () => {
    if (!activeItem) return;
    addDoc({
      title: `${activeItem.type === 'agent' ? 'Agent' : 'Skill'}: ${activeItem.name}`,
      content: activeItem.content,
      tags: [activeItem.type, ...activeItem.tags, 'builder'],
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.yaml,.yml,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const content = await file.text();
      const name = file.name.replace(/\.(agent|skill)?\.md$/, '').replace(/\.(yaml|yml|txt)$/, '');
      const type: BuilderItemType = file.name.includes('skill') ? 'skill' : 'agent';
      addItem({ userId, type, name, description: '', content, mockConversation: [], tags: ['imported'] });
    };
    input.click();
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <SectionTitle sub="Create, test, and export AI agents and skill definitions">
          Agent & Skill Builder
        </SectionTitle>
        <FavButton toolId="agent-builder" />
      </div>

      <div className="flex gap-6 items-start" style={{ marginTop: 24 }}>
        {/* Left sidebar: item list */}
        <div className="w-[280px] shrink-0 space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowTemplates(true)} className="flex-1">
              <Plus size={12} /> New
            </Button>
            <Button variant="ghost" size="sm" onClick={handleImport}>
              <Upload size={12} /> Import
            </Button>
          </div>

          {/* Filter */}
          <div className="flex gap-1">
            {(['all', 'agent', 'skill'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center cursor-pointer transition-colors"
                style={{
                  color: filter === f ? 'var(--accent)' : 'var(--text-muted)',
                  background: filter === f ? 'var(--accent-bg)' : 'transparent',
                  border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                }}
              >
                {f === 'all' ? 'All' : f === 'agent' ? 'Agents' : 'Skills'}
              </button>
            ))}
          </div>

          {/* Disk skill browser */}
          <DiskSkillBrowser
            onLoad={handleLoadFromDisk}
            loadedPaths={loadedPaths}
          />

          {/* Item list */}
          <Card>
            <CardHeader>
              <Bot size={13} style={{ color: 'var(--accent)' }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {filtered.length} {filter === 'all' ? 'Items' : filter === 'agent' ? 'Agents' : 'Skills'}
              </span>
            </CardHeader>
            <div className="max-h-[500px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                  No {filter === 'all' ? 'agents or skills' : `${filter}s`} yet
                </div>
              )}
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveItem(item.id)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    background: activeItemId === item.id ? 'var(--accent-bg)' : 'transparent',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderLeft: activeItemId === item.id ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (activeItemId !== item.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (activeItemId !== item.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.type === 'agent' ? <Bot size={14} style={{ color: '#7c3aed' }} /> : <Zap size={14} style={{ color: '#f59e0b' }} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>
                      {item.type} · {item.mockConversation.length} mock msg{item.mockConversation.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isAdmin && item.userId !== userId && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-inset)', color: 'var(--text-faint)' }}>other</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Main area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Template picker modal */}
          {showTemplates && (
            <Card>
              <div style={{ padding: '20px 24px' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Create New</h3>
                  <button onClick={() => setShowTemplates(false)} style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                <div className="flex gap-3 mb-4">
                  <Button variant="outline" size="sm" onClick={() => handleCreateBlank('agent')}>
                    <Bot size={12} /> Blank Agent
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateBlank('skill')}>
                    <Zap size={12} /> Blank Skill
                  </Button>
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Or start from a template</div>
                <div className="grid grid-cols-2 gap-3">
                  {BUILDER_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleCreateFromTemplate(tpl.id)}
                      className="text-left rounded-lg p-4 transition-all cursor-pointer"
                      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {tpl.type === 'agent' ? <Bot size={14} style={{ color: '#7c3aed' }} /> : <Zap size={14} style={{ color: '#f59e0b' }} />}
                        <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{tpl.name}</span>
                      </div>
                      <p className="text-[10px] line-clamp-2" style={{ color: 'var(--text-muted)' }}>{tpl.description}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {tpl.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-faint)' }}>{tag}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Editor + Preview (split view) */}
          {activeItem && (
            <>
              {/* Name + meta bar */}
              <Card>
                <div style={{ padding: '14px 20px' }} className="flex items-center gap-3 flex-wrap">
                  {activeItem.type === 'agent' ? <Bot size={16} style={{ color: '#7c3aed' }} /> : <Zap size={16} style={{ color: '#f59e0b' }} />}
                  <input
                    value={activeItem.name}
                    onChange={(e) => updateItem(activeItem.id, { name: e.target.value })}
                    className="text-[14px] font-bold bg-transparent border-none outline-none flex-1"
                    style={{ color: 'var(--text-primary)', minWidth: 100 }}
                  />
                  <Pill color={activeItem.type === 'agent' ? '#7c3aed' : '#f59e0b'}>{activeItem.type}</Pill>

                  {/* Disk source badges */}
                  {activeItem.sourceType === 'disk' && activeItem.sourcePath && (
                    <span
                      className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: 'var(--bg-inset)', color: 'var(--text-faint)', border: '1px solid var(--border-subtle)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={activeItem.sourcePath}
                    >
                      <HardDrive size={9} /> {activeItem.sourcePath.replace(/.*\/(\.codex|\.agents|\.warp)/, '$1')}
                    </span>
                  )}
                  {activeItem.sourceType === 'disk' && activeItem.content !== activeItem.originalContent && (
                    <span
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ background: 'rgba(234,179,8,0.1)', color: '#b45309', border: '1px solid rgba(234,179,8,0.3)' }}
                    >
                      <CircleDot size={9} /> Modified
                    </span>
                  )}

                  <div className="flex gap-1">
                    {/* Disk-specific controls */}
                    {activeItem.sourceType === 'disk' && (
                      <>
                        <button
                          onClick={handleReloadFromDisk}
                          className="p-1 cursor-pointer"
                          style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}
                          title="Reload from disk"
                        >
                          <RefreshCw size={13} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setSaveConfirmOpen(true)}
                            className="p-1 cursor-pointer"
                            style={{ color: activeItem.content !== activeItem.originalContent ? '#f59e0b' : 'var(--text-faint)', background: 'none', border: 'none' }}
                            title="Save to disk"
                            disabled={diskSaving}
                          >
                            {diskSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={() => duplicateItem(activeItem.id)} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Duplicate"><Copy size={13} /></button>
                    <button onClick={handleExportToFile} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Export file"><Download size={13} /></button>
                    <button onClick={handleSaveToDocs} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Save to Docs"><FileText size={13} /></button>
                    <button onClick={() => removeItem(activeItem.id)} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Delete" onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Save-to-disk confirmation */}
                {saveConfirmOpen && (
                  <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(234,179,8,0.06)' }}>
                    <AlertCircle size={13} style={{ color: '#b45309', flexShrink: 0 }} />
                    <span className="text-[11px] flex-1" style={{ color: 'var(--text-secondary)' }}>
                      Overwrite <code style={{ fontSize: 10 }}>{activeItem.sourcePath}</code> on disk?
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSaveConfirmOpen(false)}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleSaveToDisk}>
                      {diskSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                    </Button>
                  </div>
                )}
              </Card>

              {/* Split: editor + mock preview */}
              <div className="flex gap-4">
                {/* Editor */}
                <div className="flex-1 min-w-0">
                  <Card>
                    <CardHeader>
                      <Code2 size={13} style={{ color: 'var(--accent)' }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Definition</span>
                    </CardHeader>
                    <div style={{ height: 450 }}>
                      <Editor
                        height="100%"
                        language="markdown"
                        value={activeItem.content}
                        onChange={(v) => updateItem(activeItem.id, { content: v ?? '' })}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontFamily: "'Source Code Pro', monospace",
                          fontSize: 13,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          padding: { top: 12 },
                          tabSize: 2,
                        }}
                      />
                    </div>
                  </Card>
                </div>

                {/* Mock Preview */}
                <div className="w-[380px] shrink-0">
                  <Card>
                    <CardHeader className="justify-between">
                      <div className="flex gap-1">
                        {([
                          { key: 'live' as const, icon: PlayCircle, label: 'Live Test', color: '#22c55e' },
                          { key: 'mock' as const, icon: Send, label: 'Mock Chat', color: undefined },
                          { key: 'preview' as const, icon: Eye, label: 'Preview', color: undefined },
                        ]).map(({ key, icon: Icon, label, color }) => (
                          <button
                            key={key}
                            onClick={() => setPreviewTab(key)}
                            className="px-3 py-1 rounded text-[11px] font-semibold cursor-pointer"
                            style={{
                              color: previewTab === key ? (color ?? 'var(--accent)') : 'var(--text-muted)',
                              background: previewTab === key ? (color ? `${color}12` : 'var(--accent-bg)') : 'transparent',
                              border: 'none',
                            }}
                          >
                            <Icon size={10} className="inline mr-1" />{label}
                          </button>
                        ))}
                      </div>
                    </CardHeader>

                    {previewTab === 'mock' ? (
                      <div>
                        {/* Mock conversation */}
                        <div className="overflow-y-auto" style={{ height: 350, padding: '12px 16px' }}>
                          {activeItem.mockConversation.length === 0 && (
                            <div className="text-center py-8 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                              Add mock messages to simulate how this {activeItem.type} responds
                            </div>
                          )}
                          {activeItem.mockConversation.map((msg, i) => (
                            <div key={i} className="mb-3 group">
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5" style={{
                                  background: msg.role === 'user' ? '#3b82f6' : '#7c3aed',
                                }}>
                                  {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>
                                    {msg.role === 'user' ? 'User' : activeItem.name}
                                  </div>
                                  <div className="rounded-lg p-3" style={{
                                    background: msg.role === 'user' ? 'var(--bg-inset)' : 'var(--accent-bg)',
                                    border: `1px solid ${msg.role === 'user' ? 'var(--border-subtle)' : 'var(--accent)'}20`,
                                  }}>
                                    <ForumMarkdownBody content={msg.content} />
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveMockMessage(i)}
                                  className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}
                                ><X size={10} /></button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add mock message */}
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                          <textarea
                            value={mockInput}
                            onChange={(e) => setMockInput(e.target.value)}
                            placeholder="Type a mock message..."
                            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                            style={{ minHeight: 50, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => handleAddMockMessage('user')} disabled={!mockInput.trim()}>
                              <User size={10} /> As User
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => handleAddMockMessage('assistant')} disabled={!mockInput.trim()}>
                              <Bot size={10} /> As {activeItem.type === 'agent' ? 'Agent' : 'Skill'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Preview tab — rendered markdown */
                      <div className="overflow-y-auto" style={{ height: 420, padding: '16px 20px' }}>
                        <ForumMarkdownBody content={activeItem.content} />
                      </div>
                    )}

                    {previewTab === 'live' && (
                      <div className="flex flex-col" style={{ height: 470 }}>
                        {/* Modified-content notice */}
                        {activeItem.sourceType === 'disk' && activeItem.content !== activeItem.originalContent && (
                          <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold" style={{ background: 'rgba(234,179,8,0.08)', borderBottom: '1px solid rgba(234,179,8,0.2)', color: '#b45309' }}>
                            <CircleDot size={10} /> Testing edited version — not yet saved to disk
                          </div>
                        )}
                        {/* Live chat messages */}
                        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px' }}>
                          {liveMessages.length === 0 && !liveStreaming && (
                            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-faint)' }}>
                              <PlayCircle size={28} />
                              <span className="text-[12px] text-center">
                                Send a message to test your {activeItem.type} live
                                <br />using <strong>{aiConfig.provider}</strong>
                              </span>
                              {!hasApiKey && (
                                <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-[10px]" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
                                  <AlertCircle size={11} />
                                  No API key configured for {aiConfig.provider}. Set it in Settings.
                                </div>
                              )}
                            </div>
                          )}

                          {liveMessages.map((msg) => (
                            <div key={msg.id} className="mb-3">
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5" style={{
                                  background: msg.role === 'user' ? '#3b82f6' : '#22c55e',
                                }}>
                                  {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>
                                    {msg.role === 'user' ? 'You' : activeItem.name}
                                    {msg.provider && <span className="ml-1 opacity-60">via {msg.provider}</span>}
                                  </div>
                                  <div className="rounded-lg p-3" style={{
                                    background: msg.role === 'user' ? 'var(--bg-inset)' : 'rgba(34,197,94,0.06)',
                                    border: `1px solid ${msg.role === 'user' ? 'var(--border-subtle)' : 'rgba(34,197,94,0.2)'}`,
                                  }}>
                                    <ForumMarkdownBody content={msg.content} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Streaming response */}
                          {liveStreaming && (
                            <div className="mb-3">
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: '#22c55e' }}>
                                  <Bot size={10} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>
                                    {activeItem.name} <Loader2 size={9} className="inline animate-spin ml-1" />
                                  </div>
                                  <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                    {liveStreamText ? <ForumMarkdownBody content={liveStreamText} /> : (
                                      <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Thinking...</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Error */}
                          {liveError && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] mb-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
                              <AlertCircle size={12} />
                              {liveError}
                            </div>
                          )}
                        </div>

                        {/* Status bar */}
                        {(liveDuration != null || liveMessages.length > 0) && (
                          <div className="flex items-center gap-3 px-4 py-1.5" style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                            {liveDuration != null && (
                              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                                <Clock size={9} />{liveDuration}ms
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                              {liveMessages.filter((m) => m.role === 'user').length} turn{liveMessages.filter((m) => m.role === 'user').length !== 1 ? 's' : ''}
                            </span>
                            <button onClick={handleClearLiveChat} className="ml-auto text-[10px] font-semibold cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}>
                              <Trash2 size={9} className="inline mr-0.5" />Clear
                            </button>
                          </div>
                        )}

                        {/* Input */}
                        <div style={{ padding: '12px 16px' }}>
                          <div className="flex gap-2">
                            <input
                              value={liveInput}
                              onChange={(e) => setLiveInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleLiveTest(); } }}
                              placeholder={`Test your ${activeItem.type}... (Enter to send)`}
                              disabled={liveStreaming || !hasApiKey}
                              className="flex-1 rounded-lg px-3 py-2 text-[12px] outline-none"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                            />
                            <Button variant="primary" size="sm" onClick={handleLiveTest} disabled={liveStreaming || !liveInput.trim() || !hasApiKey}>
                              {liveStreaming ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!activeItem && !showTemplates && (
            <Card>
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <Bot size={40} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
                  Agent & Skill Builder
                </h3>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 20px' }}>
                  Create AI agent definitions and skill files, mock conversations to test behavior, and export to your repos or docs.
                </p>
                <Button variant="primary" size="sm" onClick={() => setShowTemplates(true)}>
                  <Plus size={12} /> Get Started
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

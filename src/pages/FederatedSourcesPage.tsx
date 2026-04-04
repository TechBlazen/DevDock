import { useState, useEffect } from 'react';
import { Globe, Plus, RefreshCw, Trash2, Pencil, Loader2, Database, Cpu, Rss, CheckCircle2, XCircle, BookOpen, Download } from 'lucide-react';
import { useFederatedSourceStore } from '../store';
import { SectionTitle, Card, Button, Toggle } from '../components/ui';
import { FederatedSourceForm } from '../components/federated/FederatedSourceForm';
import { formatDistanceToNow } from 'date-fns';
import type { FederatedSource } from '../lib/search/federated-types';

const SOURCE_ICONS: Record<string, typeof Globe> = {
  'rest-api': Database,
  'mcp-tool': Cpu,
  'opensearch': Rss,
};

const SOURCE_LABELS: Record<string, string> = {
  'rest-api': 'REST API',
  'mcp-tool': 'MCP Tool',
  'opensearch': 'OpenSearch',
};

// ─── Example source templates ───────────────────────────────────────────────
const EXAMPLE_SOURCES: { label: string; description: string; icon: typeof Globe; source: Partial<FederatedSource> }[] = [
  {
    label: 'GitHub Repository Search',
    description: 'Search public GitHub repositories via the REST API. Returns repo name, description, URL, language, and topics.',
    icon: Database,
    source: {
      name: 'GitHub Repos',
      type: 'rest-api',
      endpointUrl: 'https://api.github.com/search/repositories?q=devops+language:typescript&per_page=50',
      authType: 'none',
      authConfig: {},
      resultMapping: {
        resultsPath: 'items',
        titleField: 'full_name',
        descriptionField: 'description',
        urlField: 'html_url',
        contentField: 'topics',
        tagsField: 'language',
      },
      triggerConfig: { mode: 'always' },
    },
  },
  {
    label: 'MCP Server — File Search',
    description: 'Connect an MCP server that exposes a search tool. Calls the tools/call endpoint and maps results from the tool output.',
    icon: Cpu,
    source: {
      name: 'MCP File Search',
      type: 'mcp-tool',
      endpointUrl: 'http://localhost:3001/mcp',
      authType: 'bearer',
      authConfig: { token: 'your-mcp-token' },
      resultMapping: {
        resultsPath: 'result.content',
        titleField: 'name',
        descriptionField: 'summary',
        urlField: 'uri',
        contentField: 'text',
        tagsField: 'type',
      },
      triggerConfig: { mode: 'prefix', prefix: 'mcp:' },
    },
  },
  {
    label: 'Stack Overflow RSS Feed',
    description: 'Index questions from a Stack Overflow tag feed via OpenSearch/RSS. Automatically parses RSS <item> elements for title, link, and description.',
    icon: Rss,
    source: {
      name: 'Stack Overflow — DevOps',
      type: 'opensearch',
      endpointUrl: 'https://stackoverflow.com/feeds/tag?tagnames=devops&sort=newest',
      authType: 'none',
      authConfig: {},
      resultMapping: {
        resultsPath: 'entries',
        titleField: 'title',
        descriptionField: 'summary',
        urlField: 'link',
      },
      triggerConfig: { mode: 'always' },
    },
  },
];

export const FederatedSourcesPage = ({ embedded }: { embedded?: boolean } = {}) => {
  const { sources, loading, syncing, fetchSources, fetchDocuments, createSource, updateSource, deleteSource, syncSource } = useFederatedSourceStore();

  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingSource, setEditingSource] = useState<FederatedSource | null>(null);
  const [formInitial, setFormInitial] = useState<Partial<FederatedSource> | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: string; count: number } | null>(null);

  useEffect(() => {
    fetchSources();
    fetchDocuments();
  }, []);

  const handleCreate = async (partial: Partial<FederatedSource>) => {
    setSaving(true);
    await createSource(partial);
    setSaving(false);
    setMode('list');
  };

  const handleUpdate = async (partial: Partial<FederatedSource>) => {
    if (!editingSource) return;
    setSaving(true);
    await updateSource(editingSource.id, partial);
    setSaving(false);
    setMode('list');
    setEditingSource(null);
  };

  const handleSync = async (id: string) => {
    const result = await syncSource(id);
    if (result) {
      setSyncResult({ id, count: result.documentCount });
      setTimeout(() => setSyncResult(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSource(id);
    setConfirmDelete(null);
  };

  if (mode === 'add') {
    return (
      <div className={embedded ? '' : 'p-6 max-w-3xl'} style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
        {!embedded && <SectionTitle sub="Configure a new external search source">Add Search Source</SectionTitle>}
        {embedded && <div className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Search Source</div>}
        <FederatedSourceForm initial={formInitial} onSave={handleCreate} onCancel={() => { setMode('list'); setFormInitial(undefined); }} saving={saving} />
      </div>
    );
  }

  if (mode === 'edit' && editingSource) {
    return (
      <div className={embedded ? '' : 'p-6 max-w-3xl'} style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
        {!embedded && <SectionTitle sub={`Editing ${editingSource.name}`}>Edit Search Source</SectionTitle>}
        {embedded && <div className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Edit: {editingSource.name}</div>}
        <FederatedSourceForm initial={editingSource} onSave={handleUpdate} onCancel={() => { setMode('list'); setEditingSource(null); }} saving={saving} />
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'p-6 max-w-4xl'} style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {!embedded && (
        <SectionTitle sub="Manage external search sources — REST APIs, MCP tools, and OpenSearch feeds">
          Federated Search Sources
        </SectionTitle>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="primary" onClick={() => setMode('add')}>
          <Plus size={14} /> Add Source
        </Button>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {sources.length} source{sources.length !== 1 ? 's' : ''} configured
        </span>
      </div>

      {/* Quick Start Examples */}
      <Card className="mb-6">
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <BookOpen size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Quick Start Examples</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] mb-3" style={{ color: 'var(--text-faint)' }}>
            Use these pre-configured examples to quickly add a search source. Click "Use Template" to pre-fill the form with the example configuration.
          </p>
          {EXAMPLE_SOURCES.map((ex) => {
            const Icon = ex.icon;
            return (
              <div key={ex.label} className="flex items-start gap-3 p-3 rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{ex.label}</div>
                  <div className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>{ex.description}</div>
                  <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-faint)' }}>{ex.source.endpointUrl}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setFormInitial(ex.source); setMode('add'); }}>
                  <Download size={11} /> Use Template
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="animate-spin" /> Loading sources...
        </div>
      )}

      {/* Empty state */}
      {!loading && sources.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Globe size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>No search sources configured</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>
              Add external APIs, MCP tools, or OpenSearch feeds to make their content searchable.
            </p>
            <Button variant="outline" onClick={() => setMode('add')}><Plus size={13} /> Add Your First Source</Button>
          </div>
        </Card>
      )}

      {/* Source list */}
      <div className="space-y-3">
        {sources.map((source) => {
          const Icon = SOURCE_ICONS[source.type] ?? Globe;
          const isSyncing = syncing[source.id];
          const justSynced = syncResult?.id === source.id;

          return (
            <Card key={source.id}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                    <Icon size={20} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{source.name}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-faint)' }}>
                        {SOURCE_LABELS[source.type] ?? source.type}
                      </span>
                      {!source.enabled && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Disabled</span>
                      )}
                    </div>
                    <div className="text-xs truncate mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{source.endpointUrl}</div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                      <span><strong style={{ color: 'var(--text-secondary)' }}>{source.documentCount}</strong> documents</span>
                      <span>Auth: {source.authType}</span>
                      <span>Trigger: {source.triggerConfig?.mode ?? 'always'}</span>
                      {source.lastSyncedAt && (
                        <span>Synced {formatDistanceToNow(new Date(source.lastSyncedAt), { addSuffix: true })}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle
                      checked={source.enabled}
                      onChange={(v) => updateSource(source.id, { enabled: v })}
                      label=""
                      color="var(--accent)"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(source.id)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? <Loader2 size={12} className="animate-spin" /> : justSynced ? <CheckCircle2 size={12} style={{ color: '#10b981' }} /> : <RefreshCw size={12} />}
                      {isSyncing ? 'Syncing...' : justSynced ? `${syncResult.count} docs` : 'Sync'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingSource(source); setMode('edit'); }}>
                      <Pencil size={12} />
                    </Button>
                    {confirmDelete === source.id ? (
                      <div className="flex gap-1">
                        <Button variant="danger" size="sm" onClick={() => handleDelete(source.id)}>Confirm</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(source.id)}>
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

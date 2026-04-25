import { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Workflow, ExternalLink, AlertTriangle, Settings as SettingsIcon,
  CheckCircle2, XCircle, Play, Loader2, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store';
import { n8nApi, type N8nWorkflow, type N8nExecution } from '../lib/api';
import { Button, EmptyState, SectionTitle, Spinner } from '../components/ui';

// /n8n page. Lists workflows and executions from a user-configured n8n
// instance. Triggering on demand only works when a workflow has a Webhook
// node — n8n's public REST API doesn't expose generic execute-by-id.

export const N8nPage = () => {
  const navigate = useNavigate();
  const n8n = useSettingsStore((s) => s.settings.n8n);
  const configured = !!n8n.baseUrl && !!n8n.apiKey;

  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<N8nWorkflow | null>(null);

  const load = async () => {
    if (!configured) return;
    setLoading(true);
    setError(null);
    try {
      const res = await n8nApi.listWorkflows(n8n.baseUrl, n8n.apiKey);
      setWorkflows(res.data ?? []);
    } catch (e) {
      setError(extractMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [n8n.baseUrl, n8n.apiKey]);

  const toggleActive = async (wf: N8nWorkflow) => {
    try {
      const updated = wf.active
        ? await n8nApi.deactivate(n8n.baseUrl, n8n.apiKey, wf.id)
        : await n8nApi.activate(n8n.baseUrl, n8n.apiKey, wf.id);
      setWorkflows((list) => list.map((w) => w.id === wf.id ? { ...w, active: updated.active } : w));
    } catch (e) {
      setError(extractMsg(e));
    }
  };

  if (!configured) {
    return (
      <div className="p-6">
        <SectionTitle sub="Manage workflows and executions on your configured n8n instance.">n8n</SectionTitle>
        <EmptyState
          icon={<Workflow size={40} />}
          title="n8n not configured"
          body="Set the base URL and API key for your n8n instance in Settings."
        />
        <div className="flex justify-center mt-4">
          <Button variant="primary" onClick={() => navigate('/settings')}>
            <SettingsIcon size={13} /> Open Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <SectionTitle sub={`Connected to ${n8n.baseUrl}`}>n8n</SectionTitle>

      <div className="flex items-center gap-2 mb-4">
        <Button variant="primary" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
        <a
          href={n8n.baseUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium"
          style={{ background: 'var(--bg-inset)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          <ExternalLink size={13} /> Open n8n
        </a>
        <span className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {workflows.length} workflow{workflows.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 mb-4 rounded text-[12px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && workflows.length === 0 ? (
        <div className="flex justify-center py-12"><Spinner size={24} /></div>
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={<Workflow size={40} />}
          title="No workflows"
          body="Create your first workflow in n8n to see it here."
        />
      ) : (
        <div className="rounded overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-inset)' }}>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--text-faint)' }}>Name</th>
                <th className="text-left px-3 py-2 font-semibold w-24" style={{ color: 'var(--text-faint)' }}>Active</th>
                <th className="text-left px-3 py-2 font-semibold w-32" style={{ color: 'var(--text-faint)' }}>Trigger</th>
                <th className="text-left px-3 py-2 font-semibold w-40" style={{ color: 'var(--text-faint)' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr
                  key={wf.id}
                  onClick={() => setSelected(wf)}
                  style={{ borderTop: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  className="hover:opacity-90"
                >
                  <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{wf.name}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); void toggleActive(wf); }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{
                        background: wf.active ? 'rgba(46,125,50,0.12)' : 'rgba(120,120,120,0.12)',
                        color: wf.active ? '#2e7d32' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {wf.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                    {triggerKind(wf)}
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                    {wf.updatedAt ? new Date(wf.updatedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <WorkflowDrawer workflow={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

// ─── Drawer with executions + webhook trigger ───────────────────────────────

const WorkflowDrawer = ({ workflow, onClose }: { workflow: N8nWorkflow; onClose: () => void }) => {
  const n8n = useSettingsStore((s) => s.settings.n8n);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState('{}');
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  const webhookUrl = useMemo(() => extractWebhookUrl(workflow, n8n.baseUrl), [workflow, n8n.baseUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    n8nApi.listExecutions(n8n.baseUrl, n8n.apiKey, workflow.id)
      .then((r) => { if (!cancelled) setExecutions(r.data ?? []); })
      .catch((e) => { if (!cancelled) setError(extractMsg(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workflow.id, n8n.baseUrl, n8n.apiKey]);

  const handleTrigger = async () => {
    if (!webhookUrl) return;
    setTriggering(true);
    setTriggerResult(null);
    try {
      const parsed = payload.trim() ? JSON.parse(payload) : {};
      const res = await n8nApi.triggerWebhook(webhookUrl, parsed);
      setTriggerResult(`HTTP ${res.status} · ${res.durationMs}ms\n${res.body}`);
    } catch (e) {
      setTriggerResult(`Error: ${extractMsg(e)}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      onClick={onClose}
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-full overflow-y-auto"
        style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-color)' }}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-3" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{workflow.name}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {webhookUrl && (
            <div className="flex flex-col gap-2 p-3 rounded" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <div className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>Webhook trigger</div>
              <div className="text-[11px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>{webhookUrl}</div>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={4}
                placeholder='{"key": "value"}'
                className="px-2 py-1 text-[12px] outline-none rounded font-mono"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
              <Button variant="primary" onClick={handleTrigger} disabled={triggering}>
                {triggering ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Trigger workflow
              </Button>
              {triggerResult && (
                <pre className="text-[11px] font-mono p-2 rounded overflow-auto" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', maxHeight: 200, margin: 0 }}>{triggerResult}</pre>
              )}
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase font-semibold mb-2" style={{ color: 'var(--text-faint)' }}>Recent executions</div>
            {loading ? (
              <div className="flex justify-center py-6"><Spinner size={20} /></div>
            ) : error ? (
              <div className="text-[12px] px-3 py-2 rounded" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>{error}</div>
            ) : executions.length === 0 ? (
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No executions yet.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {executions.slice(0, 30).map((ex) => {
                  const ok = ex.finished && (ex.status === 'success' || ex.status === undefined);
                  const failed = ex.status === 'failed' || ex.status === 'error';
                  return (
                    <div key={ex.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px]" style={{ background: 'var(--bg-inset)' }}>
                      {failed ? <XCircle size={13} style={{ color: '#dc2626' }} />
                        : ok ? <CheckCircle2 size={13} style={{ color: '#2e7d32' }} />
                        : <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
                      <span className="font-mono" style={{ color: 'var(--text-primary)' }}>#{ex.id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{ex.mode}</span>
                      <span className="ml-auto" style={{ color: 'var(--text-faint)' }}>
                        {new Date(ex.startedAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function triggerKind(wf: N8nWorkflow): string {
  const triggers = wf.nodes?.filter((n) => n.type?.toLowerCase().includes('trigger') || n.type?.toLowerCase().includes('webhook'));
  if (!triggers || triggers.length === 0) return 'Manual';
  if (triggers.some((n) => n.type?.toLowerCase().includes('webhook'))) return 'Webhook';
  if (triggers.some((n) => n.type?.toLowerCase().includes('cron') || n.type?.toLowerCase().includes('schedule'))) return 'Schedule';
  return 'Trigger';
}

function extractWebhookUrl(wf: N8nWorkflow, baseUrl: string): string | null {
  const webhookNode = wf.nodes?.find((n) => n.type?.toLowerCase().includes('webhook') && n.webhookId);
  if (!webhookNode) return null;
  // n8n exposes test+production webhook URLs at /webhook/<id> on the same host.
  return `${baseUrl.replace(/\/$/, '')}/webhook/${webhookNode.webhookId}`;
}

function extractMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e && 'response' in e) {
    const resp = (e as { response?: { data?: { error?: string } } }).response;
    return resp?.data?.error ?? 'Request failed';
  }
  return String(e);
}

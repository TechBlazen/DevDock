import { useState } from 'react';
import { Input, Button, Card, CardHeader } from '../ui';
import { Globe, Key, Database, Cpu, Rss, Save, X } from 'lucide-react';
import type { FederatedSource, FederatedSourceType, FederatedAuthType, ResultMapping, TriggerConfig, FederatedAuthConfig } from '../../lib/search/federated-types';

const SOURCE_TYPES: { value: FederatedSourceType; label: string; icon: typeof Globe; desc: string }[] = [
  { value: 'rest-api', label: 'REST API', icon: Database, desc: 'JSON API endpoint' },
  { value: 'mcp-tool', label: 'MCP Tool', icon: Cpu, desc: 'MCP server search tool' },
  { value: 'opensearch', label: 'OpenSearch / RSS', icon: Rss, desc: 'OpenSearch or RSS/Atom feed' },
];

const AUTH_TYPES: { value: FederatedAuthType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'api-key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
];

const TRIGGER_MODES: { value: TriggerConfig['mode']; label: string; desc: string }[] = [
  { value: 'always', label: 'Always', desc: 'Query this source for every search' },
  { value: 'prefix', label: 'Prefix', desc: 'Only when query starts with a keyword' },
  { value: 'pattern', label: 'Pattern', desc: 'Only when query matches a regex' },
];

interface Props {
  initial?: Partial<FederatedSource>;
  onSave: (source: Partial<FederatedSource>) => void;
  onCancel: () => void;
  saving?: boolean;
}

export const FederatedSourceForm = ({ initial, onSave, onCancel, saving }: Props) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<FederatedSourceType>(initial?.type ?? 'rest-api');
  const [endpointUrl, setEndpointUrl] = useState(initial?.endpointUrl ?? '');
  const [authType, setAuthType] = useState<FederatedAuthType>(initial?.authType ?? 'none');
  const [authConfig, setAuthConfig] = useState<FederatedAuthConfig>(initial?.authConfig ?? {});
  const [resultMapping, setResultMapping] = useState<ResultMapping>(initial?.resultMapping ?? {
    resultsPath: 'data', titleField: 'title', descriptionField: 'description', urlField: 'url',
  });
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(initial?.triggerConfig ?? { mode: 'always' });

  const canSave = name.trim() && endpointUrl.trim() && resultMapping.resultsPath && resultMapping.titleField;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name, type, endpointUrl, authType, authConfig, resultMapping, triggerConfig });
  };

  const updateMapping = (key: keyof ResultMapping, value: string) => {
    setResultMapping((m) => ({ ...m, [key]: value }));
  };

  const updateAuth = (key: keyof FederatedAuthConfig, value: string) => {
    setAuthConfig((a) => ({ ...a, [key]: value }));
  };

  return (
    <div className="space-y-5" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Source Type */}
      <Card>
        <CardHeader>
          <Globe size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Source Type</span>
        </CardHeader>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_TYPES.map((st) => {
              const Icon = st.icon;
              return (
                <button
                  key={st.value}
                  onClick={() => setType(st.value)}
                  className="p-3 rounded-lg text-left transition-all"
                  style={{
                    background: type === st.value ? 'var(--accent-bg)' : 'transparent',
                    color: type === st.value ? 'var(--accent)' : 'var(--text-muted)',
                    border: type === st.value ? '2px solid var(--accent)' : '2px solid var(--border-input)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={16} className="mb-1" />
                  <div className="text-xs font-bold">{st.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: type === st.value ? 'var(--accent)' : 'var(--text-faint)' }}>{st.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Connection */}
      <Card>
        <CardHeader>
          <Database size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Connection</span>
        </CardHeader>
        <div className="p-4 space-y-3">
          <Input label="Source Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Confluence Wiki" />
          <Input label="Endpoint URL" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} placeholder="https://api.example.com/search" />
        </div>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <Key size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Authentication</span>
        </CardHeader>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Auth Type</label>
            <select
              value={authType}
              onChange={(e) => { setAuthType(e.target.value as FederatedAuthType); setAuthConfig({}); }}
              className="w-full rounded-md px-2.5 py-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              {AUTH_TYPES.map((at) => <option key={at.value} value={at.value}>{at.label}</option>)}
            </select>
          </div>
          {authType === 'api-key' && (
            <>
              <Input label="Header Name" value={authConfig.headerName ?? ''} onChange={(e) => updateAuth('headerName', e.target.value)} placeholder="X-API-Key" />
              <Input label="API Key" type="password" value={authConfig.token ?? ''} onChange={(e) => updateAuth('token', e.target.value)} placeholder="your-api-key" />
            </>
          )}
          {authType === 'bearer' && (
            <Input label="Bearer Token" type="password" value={authConfig.token ?? ''} onChange={(e) => updateAuth('token', e.target.value)} placeholder="your-token" />
          )}
          {authType === 'basic' && (
            <>
              <Input label="Username" value={authConfig.username ?? ''} onChange={(e) => updateAuth('username', e.target.value)} placeholder="username" />
              <Input label="Password" type="password" value={authConfig.password ?? ''} onChange={(e) => updateAuth('password', e.target.value)} placeholder="password" />
            </>
          )}
        </div>
      </Card>

      {/* Result Mapping */}
      <Card>
        <CardHeader>
          <Database size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Result Mapping</span>
        </CardHeader>
        <div className="p-4 space-y-3">
          <p className="text-[11px] mb-2" style={{ color: 'var(--text-faint)' }}>
            Map fields from the API response to search document fields. Use dot notation for nested paths (e.g. "data.results").
          </p>
          <Input label="Results Path (required)" value={resultMapping.resultsPath} onChange={(e) => updateMapping('resultsPath', e.target.value)} placeholder="data.items" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Title Field (required)" value={resultMapping.titleField} onChange={(e) => updateMapping('titleField', e.target.value)} placeholder="title" />
            <Input label="Description Field" value={resultMapping.descriptionField} onChange={(e) => updateMapping('descriptionField', e.target.value)} placeholder="summary" />
            <Input label="URL Field" value={resultMapping.urlField} onChange={(e) => updateMapping('urlField', e.target.value)} placeholder="url" />
            <Input label="Content Field" value={resultMapping.contentField ?? ''} onChange={(e) => updateMapping('contentField', e.target.value)} placeholder="body" />
            <Input label="Tags Field" value={resultMapping.tagsField ?? ''} onChange={(e) => updateMapping('tagsField', e.target.value)} placeholder="labels" />
            <Input label="Icon Field" value={resultMapping.iconField ?? ''} onChange={(e) => updateMapping('iconField', e.target.value)} placeholder="icon" />
          </div>
        </div>
      </Card>

      {/* Trigger Config */}
      <Card>
        <CardHeader>
          <Rss size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Trigger</span>
        </CardHeader>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            {TRIGGER_MODES.map((tm) => (
              <button
                key={tm.value}
                onClick={() => setTriggerConfig({ mode: tm.value })}
                className="flex-1 p-2.5 rounded-lg text-xs text-center transition-all"
                style={{
                  background: triggerConfig.mode === tm.value ? 'var(--accent-bg)' : 'transparent',
                  color: triggerConfig.mode === tm.value ? 'var(--accent)' : 'var(--text-muted)',
                  border: triggerConfig.mode === tm.value ? '1px solid var(--accent)' : '1px solid var(--border-input)',
                  cursor: 'pointer',
                }}
              >
                <div className="font-bold">{tm.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: triggerConfig.mode === tm.value ? 'var(--accent)' : 'var(--text-faint)' }}>{tm.desc}</div>
              </button>
            ))}
          </div>
          {triggerConfig.mode === 'prefix' && (
            <Input label="Prefix Keyword" value={triggerConfig.prefix ?? ''} onChange={(e) => setTriggerConfig({ ...triggerConfig, prefix: e.target.value })} placeholder="wiki:" />
          )}
          {triggerConfig.mode === 'pattern' && (
            <Input label="Regex Pattern" value={triggerConfig.pattern ?? ''} onChange={(e) => setTriggerConfig({ ...triggerConfig, pattern: e.target.value })} placeholder="^(kb|knowledge)\\s+" />
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="primary" size="lg" onClick={handleSave} disabled={!canSave || saving}>
          <Save size={14} /> {saving ? 'Saving...' : (initial?.id ? 'Update Source' : 'Add Source')}
        </Button>
        <Button variant="ghost" size="lg" onClick={onCancel}>
          <X size={14} /> Cancel
        </Button>
      </div>
    </div>
  );
};

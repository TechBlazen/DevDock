import { useState, useMemo } from 'react';
import {
  Database, Plus, Play, Save, Download, Upload, Trash2, X,
  CheckCircle, AlertTriangle, Loader2, Table, Columns3, Code2,
  ChevronRight, ChevronDown, Eye, Key, RefreshCw, FileText,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { useSqlToolStore } from '../store/sql-tool-store';
import { sqlApi } from '../lib/api';
import { SectionTitle, Card, CardHeader, Button, Pill, Input } from '../components/ui';
import type { DatabaseEngine, DatabaseConnection, QueryResult, TableInfo, ColumnInfo, StoredProcedure, SavedQuery } from '../types';

const ENGINE_CONFIG: Record<DatabaseEngine, { label: string; color: string; defaultPort: number }> = {
  postgresql: { label: 'PostgreSQL', color: '#336791', defaultPort: 5432 },
  mysql:      { label: 'MySQL',      color: '#4479A1', defaultPort: 3306 },
  mariadb:    { label: 'MariaDB',    color: '#003545', defaultPort: 3306 },
  sqlserver:  { label: 'SQL Server', color: '#CC2927', defaultPort: 1433 },
  oracle:     { label: 'Oracle',     color: '#F80000', defaultPort: 1521 },
  sqlite:     { label: 'SQLite',     color: '#003B57', defaultPort: 0 },
};

function connToApi(conn: DatabaseConnection): Record<string, unknown> {
  return { engine: conn.engine, host: conn.host, port: conn.port, database: conn.database, username: conn.username, password: conn.password, connectionString: conn.connectionString, ssl: conn.ssl };
}

// ─── Connection Form ────────────────────────────────────────────────────────
const ConnectionForm = ({ onSave, onCancel, initial }: { onSave: (conn: Omit<DatabaseConnection, 'id' | 'createdAt'>) => void; onCancel: () => void; initial?: DatabaseConnection }) => {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(initial?.name ?? '');
  const [engine, setEngine] = useState<DatabaseEngine>(initial?.engine ?? 'postgresql');
  const [host, setHost] = useState(initial?.host ?? 'localhost');
  const [port, setPort] = useState(String(initial?.port ?? ENGINE_CONFIG.postgresql.defaultPort));
  const [database, setDatabase] = useState(initial?.database ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [connectionString, setConnectionString] = useState(initial?.connectionString ?? '');
  const [ssl, setSsl] = useState(initial?.ssl ?? false);
  const [useConnStr, setUseConnStr] = useState(Boolean(initial?.connectionString));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleEngineChange = (e: DatabaseEngine) => {
    setEngine(e);
    setPort(String(ENGINE_CONFIG[e].defaultPort));
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sqlApi.testConnection({
        engine, host, port: Number(port), database, username, password,
        connectionString: useConnStr ? connectionString : undefined, ssl,
      });
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, message: e instanceof Error ? e.message : 'Test failed' });
    }
    setTesting(false);
  };

  return (
    <Card>
      <div style={{ padding: '20px 24px' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{initial ? 'Edit Connection' : 'New Connection'}</h3>
          <button onClick={onCancel} style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <Input label="Connection Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Production DB" />

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>Database Engine</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(ENGINE_CONFIG) as DatabaseEngine[]).map((e) => {
                const cfg = ENGINE_CONFIG[e];
                return (
                  <button key={e} onClick={() => handleEngineChange(e)} className="px-3 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer" style={engine === e ? { background: `${cfg.color}15`, color: cfg.color, border: `2px solid ${cfg.color}` } : { color: 'var(--text-muted)', border: '2px solid var(--border-subtle)', background: 'transparent' }}>
                    <Database size={12} className="inline mr-1" style={{ verticalAlign: '-2px' }} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setUseConnStr(false)} className="text-[11px] font-semibold cursor-pointer" style={{ color: !useConnStr ? 'var(--accent)' : 'var(--text-faint)', background: 'none', border: 'none', textDecoration: !useConnStr ? 'underline' : 'none' }}>Standard</button>
            <span style={{ color: 'var(--text-faint)' }}>|</span>
            <button onClick={() => setUseConnStr(true)} className="text-[11px] font-semibold cursor-pointer" style={{ color: useConnStr ? 'var(--accent)' : 'var(--text-faint)', background: 'none', border: 'none', textDecoration: useConnStr ? 'underline' : 'none' }}>Connection String</button>
          </div>

          {useConnStr ? (
            <Input label="Connection String" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder={engine === 'postgresql' ? 'postgresql://user:pass@host:5432/db' : 'host=...;database=...'} />
          ) : (
            <>
              {engine !== 'sqlite' && (
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost" />
                  <Input label="Port" type="number" value={port} onChange={(e) => setPort(e.target.value)} />
                  <Input label="Database" value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="mydb" />
                </div>
              )}
              {engine === 'sqlite' && (
                <Input label="Database File Path" value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="/path/to/database.db" />
              )}
              {engine !== 'sqlite' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
                  <div>
                    <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
              )}
            </>
          )}

          {engine !== 'sqlite' && (
            <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} className="accent-[var(--accent)]" />
              Use SSL/TLS
            </label>
          )}

          {testResult && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: testResult.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: testResult.success ? '#16a34a' : '#dc2626' }}>
              {testResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Test Connection
            </Button>
            <Button variant="primary" size="sm" onClick={() => onSave({ userId: user?.id ?? '', name, engine, host, port: Number(port), database, username, password, connectionString: useConnStr ? connectionString : undefined, ssl, color: ENGINE_CONFIG[engine].color })} disabled={!name.trim()}>
              <Save size={12} /> {initial ? 'Update' : 'Save Connection'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Schema Browser ─────────────────────────────────────────────────────────
const SchemaBrowser = ({ conn }: { conn: DatabaseConnection }) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [procedures, setProcedures] = useState<StoredProcedure[]>([]);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<Record<string, ColumnInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'tables' | 'procedures'>('tables');

  const loadSchema = async () => {
    setLoading(true);
    try {
      const [tablesData, procsData] = await Promise.all([
        sqlApi.getTables(connToApi(conn)),
        sqlApi.getProcedures(connToApi(conn)),
      ]);
      setTables(tablesData.tables);
      setProcedures(procsData.procedures);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadColumns = async (table: string, schema?: string) => {
    if (columns[table]) { setExpandedTable(expandedTable === table ? null : table); return; }
    setExpandedTable(table);
    try {
      const data = await sqlApi.getColumns(connToApi(conn), table, schema);
      setColumns((prev) => ({ ...prev, [table]: data.columns }));
    } catch { /* ignore */ }
  };

  return (
    <Card>
      <CardHeader className="justify-between">
        <div className="flex items-center gap-2">
          <Database size={13} style={{ color: conn.color ?? 'var(--accent)' }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Schema</span>
        </div>
        <button onClick={loadSchema} disabled={loading} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </button>
      </CardHeader>
      <div>
        <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {(['tables', 'procedures'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 text-[11px] font-semibold text-center cursor-pointer transition-colors" style={{ color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', border: 'none' }}>
              {t === 'tables' ? <><Table size={11} className="inline mr-1" />Tables ({tables.length})</> : <><Code2 size={11} className="inline mr-1" />Procedures ({procedures.length})</>}
            </button>
          ))}
        </div>

        {tables.length === 0 && procedures.length === 0 && !loading && (
          <div className="text-center py-6">
            <button onClick={loadSchema} className="text-[12px] font-semibold cursor-pointer" style={{ color: 'var(--accent)', background: 'none', border: 'none' }}>
              <RefreshCw size={12} className="inline mr-1" />Load Schema
            </button>
          </div>
        )}

        {tab === 'tables' && (
          <div className="max-h-[400px] overflow-y-auto">
            {tables.map((t) => (
              <div key={`${t.schema}.${t.name}`}>
                <div onClick={() => loadColumns(t.name, t.schema)} className="flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  {expandedTable === t.name ? <ChevronDown size={12} style={{ color: 'var(--text-faint)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-faint)' }} />}
                  <Table size={12} style={{ color: t.type === 'view' ? '#a855f7' : 'var(--accent)' }} />
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                  {t.type === 'view' && <Pill color="#a855f7">view</Pill>}
                  {t.schema && <span className="text-[10px] ml-auto" style={{ color: 'var(--text-faint)' }}>{t.schema}</span>}
                </div>
                {expandedTable === t.name && columns[t.name] && (
                  <div style={{ background: 'var(--bg-inset)' }}>
                    {columns[t.name].map((col) => (
                      <div key={col.name} className="flex items-center gap-2 pl-10 pr-4 py-1.5 text-[11px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {col.isPrimaryKey && <Key size={10} style={{ color: '#f59e0b' }} />}
                        <Columns3 size={10} style={{ color: 'var(--text-faint)' }} />
                        <span style={{ color: 'var(--text-primary)' }}>{col.name}</span>
                        <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{col.dataType}</span>
                        {col.nullable && <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>null</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'procedures' && (
          <div className="max-h-[400px] overflow-y-auto">
            {procedures.map((p) => (
              <div key={`${p.schema}.${p.name}`} className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Code2 size={12} style={{ color: '#f59e0b' }} />
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                {p.schema && <span className="text-[10px] ml-auto" style={{ color: 'var(--text-faint)' }}>{p.schema}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// ─── Main SQL Tool Page ─────────────────────────────────────────────────────
export const SqlToolPage = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';
  const { addConnection, updateConnection, removeConnection, setActiveConnection, touchConnection, activeConnectionId, addSavedQuery, removeSavedQuery, getConnectionsForUser, getSavedQueriesForUser } = useSqlToolStore();

  const connections = useMemo(() => getConnectionsForUser(userId), [getConnectionsForUser, userId]);
  const savedQueries = useMemo(() => getSavedQueriesForUser(userId), [getSavedQueriesForUser, userId]);
  const activeConn = connections.find((c) => c.id === activeConnectionId) ?? null;

  const [showAddForm, setShowAddForm] = useState(false);
  const [sql, setSql] = useState('SELECT 1;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [queryName, setQueryName] = useState('');

  const handleExecute = async () => {
    if (!activeConn || !sql.trim()) return;
    setExecuting(true);
    setResult(null);
    try {
      const data = await sqlApi.executeQuery(connToApi(activeConn), sql);
      setResult(data);
      touchConnection(activeConn.id);
    } catch (e) {
      setResult({ columns: [], rows: [], rowCount: 0, duration: 0, error: e instanceof Error ? e.message : 'Query failed' });
    }
    setExecuting(false);
  };

  const handleSaveQuery = () => {
    if (!queryName.trim() || !sql.trim()) return;
    addSavedQuery({ userId, connectionId: activeConnectionId ?? undefined, name: queryName.trim(), sql, tags: [] });
    setQueryName('');
  };

  const handleExportQueries = () => {
    const data = JSON.stringify(savedQueries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved-queries.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportQueries = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.sql';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        try {
          const queries = JSON.parse(text);
          if (Array.isArray(queries)) {
            for (const q of queries) {
              addSavedQuery({ userId, connectionId: q.connectionId, name: q.name ?? 'Imported Query', sql: q.sql ?? '', tags: q.tags ?? [] });
            }
          }
        } catch { /* ignore */ }
      } else {
        addSavedQuery({ userId, name: file.name.replace(/\.sql$/, ''), sql: text, tags: ['imported'] });
      }
    };
    input.click();
  };

  return (
    <div className="p-8">
      <SectionTitle sub="Connect to databases, browse schemas, and execute queries">
        SQL Tool
      </SectionTitle>

      <div className="flex gap-6 items-start" style={{ marginTop: 24 }}>
        {/* Left sidebar: connections + schema */}
        <div className="w-[280px] shrink-0 space-y-4">
          {/* Connections */}
          <Card>
            <CardHeader className="justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                <Database size={12} className="inline mr-1" />Connections
              </span>
              <button onClick={() => setShowAddForm(true)} className="p-1 cursor-pointer" style={{ color: 'var(--accent)', background: 'none', border: 'none' }}><Plus size={14} /></button>
            </CardHeader>
            <div>
              {connections.length === 0 && !showAddForm && (
                <div className="text-center py-6 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                  No connections yet
                </div>
              )}
              {connections.map((conn) => {
                const cfg = ENGINE_CONFIG[conn.engine];
                const isActive = activeConnectionId === conn.id;
                return (
                  <div
                    key={conn.id}
                    onClick={() => setActiveConnection(conn.id)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      background: isActive ? 'var(--accent-bg)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft: isActive ? `3px solid ${conn.color ?? cfg.color}` : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Database size={14} style={{ color: conn.color ?? cfg.color, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{conn.name}</div>
                      <div className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>{cfg.label} · {conn.host}:{conn.port}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeConnection(conn.id); }} className="p-0.5 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Schema browser */}
          {activeConn && <SchemaBrowser conn={activeConn} />}

          {/* Saved queries */}
          <Card>
            <CardHeader className="justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                <FileText size={12} className="inline mr-1" />Saved Queries ({savedQueries.length})
              </span>
              <div className="flex gap-1">
                <button onClick={handleImportQueries} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Import queries"><Upload size={12} /></button>
                <button onClick={handleExportQueries} className="p-1 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }} title="Export queries"><Download size={12} /></button>
              </div>
            </CardHeader>
            <div className="max-h-[200px] overflow-y-auto">
              {savedQueries.map((q) => (
                <div key={q.id} className="flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }} onClick={() => setSql(q.sql)} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <FileText size={11} style={{ color: 'var(--accent)' }} />
                  <span className="text-[11px] font-medium truncate flex-1" style={{ color: 'var(--text-primary)' }}>{q.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeSavedQuery(q.id); }} className="p-0.5 cursor-pointer" style={{ color: 'var(--text-faint)', background: 'none', border: 'none' }}><X size={10} /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Main area: add form or query editor + results */}
        <div className="flex-1 min-w-0 space-y-4">
          {showAddForm && (
            <ConnectionForm
              onSave={(conn) => { addConnection(conn); setShowAddForm(false); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Query editor */}
          <Card>
            <CardHeader className="justify-between">
              <div className="flex items-center gap-2">
                <Play size={13} style={{ color: 'var(--accent)' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Query Editor</span>
                {activeConn && (
                  <Pill color={activeConn.color ?? ENGINE_CONFIG[activeConn.engine].color}>
                    {activeConn.name}
                  </Pill>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input value={queryName} onChange={(e) => setQueryName(e.target.value)} placeholder="Query name..." className="rounded px-2 py-1 text-[11px] outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', width: 140 }} />
                <Button variant="ghost" size="sm" onClick={handleSaveQuery} disabled={!queryName.trim() || !sql.trim()}>
                  <Save size={11} /> Save
                </Button>
              </div>
            </CardHeader>
            <div>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleExecute(); } }}
                placeholder="Enter SQL query... (Ctrl+Enter to execute)"
                className="w-full outline-none resize-y font-mono"
                style={{ padding: '16px 20px', minHeight: 160, fontSize: 13, lineHeight: 1.6, background: 'var(--bg-inset)', color: 'var(--text-primary)', border: 'none', borderBottom: '1px solid var(--border-subtle)' }}
              />
              <div style={{ padding: '12px 20px' }} className="flex items-center gap-3">
                <Button variant="primary" size="sm" onClick={handleExecute} disabled={executing || !activeConn}>
                  {executing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Execute
                </Button>
                {!activeConn && <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Select a connection to execute queries</span>}
                {result && !result.error && (
                  <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                    {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} · {result.duration}ms
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <Eye size={13} style={{ color: result.error ? '#ef4444' : 'var(--accent)' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {result.error ? 'Error' : 'Results'}
                </span>
              </CardHeader>

              {result.error ? (
                <div style={{ padding: '16px 20px' }}>
                  <div className="flex items-start gap-2 text-[12px]" style={{ color: '#ef4444' }}>
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <pre className="whitespace-pre-wrap font-mono text-[11px]" style={{ color: '#ef4444' }}>{result.error}</pre>
                  </div>
                </div>
              ) : result.columns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-inset)' }}>
                        {result.columns.map((col) => (
                          <th key={col} className="px-4 py-2 text-left font-semibold whitespace-nowrap" style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-primary)' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 200).map((row, i) => (
                        <tr key={i} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                          {result.columns.map((col) => (
                            <td key={col} className="px-4 py-2 whitespace-nowrap" style={{ borderBottom: '1px solid var(--border-subtle)', color: row[col] == null ? 'var(--text-faint)' : 'var(--text-secondary)', fontStyle: row[col] == null ? 'italic' : 'normal' }}>
                              {row[col] == null ? 'NULL' : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.rows.length > 200 && (
                    <div className="text-center py-2 text-[11px]" style={{ color: 'var(--text-faint)' }}>Showing 200 of {result.rows.length} rows</div>
                  )}
                </div>
              ) : (
                <div className="text-[12px]" style={{ color: 'var(--text-muted)', padding: '16px 20px' }}>
                  Query executed successfully. {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} affected.
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

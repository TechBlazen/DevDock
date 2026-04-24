import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Search, Loader2, AlertCircle, Network,
} from 'lucide-react';
import { Button } from '../ui';

const SAMPLE_QUERY = `# Try a query against your GraphQL endpoint
query {
  __typename
}
`;

const INTROSPECTION_QUERY = `{
  __schema {
    types {
      name
      kind
      fields {
        name
        type {
          name
        }
      }
    }
  }
}`;

export const GraphqlExplorer = () => {
  const [endpoint, setEndpoint] = useState('https://countries.trevorblades.com/graphql');
  const [authHeader, setAuthHeader] = useState('');
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [variables, setVariables] = useState('{}');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(async (queryStr?: string) => {
    const q = queryStr ?? query;
    if (!endpoint.trim() || !q.trim()) return;

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      let parsedVars = {};
      try {
        const trimmed = variables.trim();
        if (trimmed && trimmed !== '{}') parsedVars = JSON.parse(trimmed);
      } catch {
        setError('Invalid JSON in variables');
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader.trim()) headers['Authorization'] = authHeader.trim();

      const res = await fetch(endpoint.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q, variables: parsedVars }),
      });

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponse(JSON.stringify(json, null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [endpoint, authHeader, query, variables]);

  const introspect = useCallback(() => {
    setQuery(INTROSPECTION_QUERY);
    executeQuery(INTROSPECTION_QUERY);
  }, [executeQuery]);

  return (
    <div className="h-full flex flex-col" style={{ color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div
        className="flex-shrink-0 flex flex-col gap-3 p-4"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-md px-3 py-2 text-[13px] outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
            }}
            placeholder="GraphQL Endpoint URL"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
          <input
            className="rounded-md px-3 py-2 text-[13px] outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
              width: 260,
            }}
            placeholder="Authorization header"
            value={authHeader}
            onChange={(e) => setAuthHeader(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={() => executeQuery()} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Execute
          </Button>
          <Button variant="ghost" size="md" onClick={introspect} disabled={loading}>
            <Search size={14} /> Introspect Schema
          </Button>
          {error && (
            <div className="flex items-center gap-1.5 text-[12px] ml-2" style={{ color: '#d32f2f' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left: Query + Variables */}
        <div
          className="flex flex-col"
          style={{ width: '50%', borderRight: '1px solid var(--border-color)' }}
        >
          {/* Query editor */}
          <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
            <div
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium"
              style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}
            >
              <Network size={12} /> Query
            </div>
            <div className="flex-1" style={{ minHeight: 0 }}>
              <Editor
                height="100%"
                defaultLanguage="graphql"
                language="graphql"
                value={query}
                onChange={(v) => setQuery(v ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 8 },
                  tabSize: 2,
                }}
                beforeMount={(monaco) => {
                  // Register graphql language if not already registered
                  const langs = monaco.languages.getLanguages();
                  if (!langs.some((l: { id: string }) => l.id === 'graphql')) {
                    monaco.languages.register({ id: 'graphql' });
                    monaco.languages.setMonarchTokensProvider('graphql', {
                      tokenizer: {
                        root: [
                          [/#.*$/, 'comment'],
                          [/"[^"]*"/, 'string'],
                          [/\b(query|mutation|subscription|fragment|on|type|schema|enum|input|interface|union|scalar|extend|implements|directive)\b/, 'keyword'],
                          [/\b(true|false|null)\b/, 'constant'],
                          [/\$\w+/, 'variable'],
                          [/@\w+/, 'annotation'],
                          [/[{}()[\]]/, 'delimiter.bracket'],
                          [/[!:=|&]/, 'delimiter'],
                          [/\d+/, 'number'],
                          [/\w+/, 'identifier'],
                        ],
                      },
                    });
                  }
                }}
              />
            </div>
          </div>

          {/* Variables editor */}
          <div
            className="flex flex-col"
            style={{ height: '30%', borderTop: '1px solid var(--border-color)', minHeight: 80 }}
          >
            <div
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium"
              style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}
            >
              Variables (JSON)
            </div>
            <div className="flex-1" style={{ minHeight: 0 }}>
              <Editor
                height="100%"
                defaultLanguage="json"
                value={variables}
                onChange={(v) => setVariables(v ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 8 },
                  tabSize: 2,
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Response */}
        <div className="flex flex-col" style={{ width: '50%' }}>
          <div
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium"
            style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}
          >
            Response
            {loading && <Loader2 size={12} className="animate-spin ml-1" />}
          </div>
          <div className="flex-1" style={{ minHeight: 0 }}>
            {response || error ? (
              <Editor
                height="100%"
                defaultLanguage="json"
                value={error ? `// Error: ${error}` : response}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 8 },
                  tabSize: 2,
                }}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center h-full gap-2"
                style={{ color: 'var(--text-faint)', background: 'var(--bg-inset)' }}
              >
                <Play size={32} />
                <span className="text-[13px]">Execute a query to see results</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

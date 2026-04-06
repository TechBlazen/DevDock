import { useNavigate } from 'react-router-dom';
import {
  Braces, Send, Wrench, ArrowRight, Globe, Wifi, FileSearch,
  ShieldCheck, LayoutList, Cable, Waypoints, FileDiff, Binary,
  Regex, Table, GitMerge, Container, Database, Play, Bot, Key, Fingerprint,
  type LucideIcon,
} from 'lucide-react';
import { Star } from 'lucide-react';
import { useSettingsStore, useAuthStore, useUserAccountsStore } from '../store';
import { JsonValidator } from '../components/devtools/JsonValidator';
import { ApiTester } from '../components/devtools/ApiTester';
import { DnsLookup } from '../components/devtools/DnsLookup';
import { PingTool } from '../components/devtools/PingTool';
import { WhoisLookup } from '../components/devtools/WhoisLookup';
import { SslChecker } from '../components/devtools/SslChecker';
import { HttpHeaders } from '../components/devtools/HttpHeaders';
import { WebSocketDebugger } from '../components/devtools/WebSocketDebugger';
import { GraphqlExplorer } from '../components/devtools/GraphqlExplorer';
import { TextDiff } from '../components/devtools/TextDiff';
import { Base64Tool } from '../components/devtools/Base64Tool';
import { RegexTester } from '../components/devtools/RegexTester';
import { CsvViewer } from '../components/devtools/CsvViewer';
import { GitGenerator } from '../components/devtools/GitGenerator';
import { CertDecoder } from '../components/devtools/CertDecoder';
import { JwtDecoder } from '../components/devtools/JwtDecoder';
import { UuidGenerator } from '../components/devtools/UuidGenerator';
import { DockerGenerator } from '../components/devtools/DockerGenerator';
import { SectionTitle, Card } from '../components/ui';

interface ToolDef {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: LucideIcon;
  color: string;
  tags: string[];
  category: string;
}

export const TOOLS: ToolDef[] = [
  // ── Development ──
  { id: 'json', name: 'JSON Validator', description: 'Validate, format, and minify JSON documents with syntax error detection and pretty-print.', path: '/devtools/json', icon: Braces, color: '#f59e0b', tags: ['json', 'validation', 'formatting'], category: 'Development' },
  { id: 'diff', name: 'Text Diff Checker', description: 'Compare two text inputs side-by-side and visualize additions, deletions, and unchanged lines.', path: '/devtools/diff', icon: FileDiff, color: '#8b5cf6', tags: ['diff', 'compare', 'text'], category: 'Development' },
  { id: 'base64', name: 'Base64 Encoder/Decoder', description: 'Encode and decode text or files to and from Base64 format instantly.', path: '/devtools/base64', icon: Binary, color: '#06b6d4', tags: ['base64', 'encoding', 'decoding'], category: 'Development' },
  { id: 'regex', name: 'Regex Tester', description: 'Test regular expressions in real-time with match highlighting, capture groups, and flag controls.', path: '/devtools/regex', icon: Regex, color: '#f97316', tags: ['regex', 'pattern', 'matching'], category: 'Development' },
  { id: 'csv', name: 'CSV/TSV Viewer', description: 'Parse, display, and sort CSV/TSV data in an interactive table with export to JSON.', path: '/devtools/csv', icon: Table, color: '#10b981', tags: ['csv', 'tsv', 'table', 'data'], category: 'Development' },
  { id: 'git-gen', name: 'Git Command Generator', description: 'Build git commands visually — select operations, flags, and parameters to generate the right command.', path: '/devtools/git-gen', icon: GitMerge, color: '#ef4444', tags: ['git', 'command', 'generator'], category: 'Development' },
  { id: 'docker-gen', name: 'Docker Command Generator', description: 'Build Docker commands visually with ports, volumes, environment variables, and network options.', path: '/devtools/docker-gen', icon: Container, color: '#2563eb', tags: ['docker', 'container', 'command'], category: 'Development' },
  // ── API Explorers ──
  { id: 'api', name: 'API Tester', description: 'Send HTTP requests and inspect responses. Supports all methods with custom headers, body, and history.', path: '/devtools/api', icon: Send, color: '#3b82f6', tags: ['http', 'rest', 'api', 'postman'], category: 'API Explorers' },
  { id: 'websocket', name: 'WebSocket Debugger', description: 'Connect to WebSocket endpoints, send and receive messages with real-time monitoring.', path: '/devtools/websocket', icon: Cable, color: '#a855f7', tags: ['websocket', 'realtime', 'debugging'], category: 'API Explorers' },
  { id: 'graphql', name: 'GraphQL Explorer', description: 'Explore and test GraphQL APIs with a query builder, variables panel, and schema introspection.', path: '/devtools/graphql', icon: Waypoints, color: '#e11d48', tags: ['graphql', 'api', 'query'], category: 'API Explorers' },
  // ── Network ──
  { id: 'dns', name: 'DNS Lookup', description: 'Query DNS records for any domain — A, AAAA, CNAME, MX, NS, TXT, SOA, and SRV records via Google DNS.', path: '/devtools/dns', icon: Globe, color: '#059669', tags: ['dns', 'domain', 'records'], category: 'Network' },
  { id: 'ping', name: 'Ping Tool', description: 'Measure network latency to any URL with min/max/avg statistics and success rate tracking.', path: '/devtools/ping', icon: Wifi, color: '#0ea5e9', tags: ['ping', 'latency', 'network'], category: 'Network' },
  { id: 'whois', name: 'WHOIS Lookup', description: 'Retrieve domain registration details including registrar, dates, nameservers, and status via RDAP.', path: '/devtools/whois', icon: FileSearch, color: '#6366f1', tags: ['whois', 'domain', 'registration'], category: 'Network' },
  // ── Security ──
  { id: 'ssl', name: 'SSL Checker', description: 'Check SSL connectivity and TLS status for any domain with connection timing analysis.', path: '/devtools/ssl', icon: ShieldCheck, color: '#16a34a', tags: ['ssl', 'tls', 'certificate', 'security'], category: 'Security' },
  { id: 'headers', name: 'HTTP Headers Analyzer', description: 'Analyze HTTP response headers with security header scoring — CSP, HSTS, X-Frame-Options, and more.', path: '/devtools/headers', icon: LayoutList, color: '#dc2626', tags: ['http', 'headers', 'security'], category: 'Security' },
  { id: 'cert-decoder', name: 'Certificate Decoder', description: 'Decode and validate PEM-encoded X.509 certificates — view subject, issuer, validity, key usage, and SANs.', path: '/devtools/cert-decoder', icon: ShieldCheck, color: '#059669', tags: ['certificate', 'x509', 'pem', 'ssl'], category: 'Security' },
  { id: 'jwt', name: 'JWT Encoder/Decoder', description: 'Decode JWT tokens to inspect header, payload, and claims. Encode custom JWTs with quick-insert claim buttons.', path: '/devtools/jwt', icon: Key, color: '#7c3aed', tags: ['jwt', 'token', 'auth', 'decode'], category: 'Security' },
  // ── Generators ──
  { id: 'uuid', name: 'UUID Generator', description: 'Generate UUIDs v1, v4, and v7 with configurable hyphens, case, and batch count. Click to copy, export, and history.', path: '/devtools/uuid', icon: Fingerprint, color: '#0891b2', tags: ['uuid', 'guid', 'generator', 'id'], category: 'Generators' },
  // ── Advanced ──
  { id: 'sql', name: 'SQL Tool', description: 'Connect to PostgreSQL, MySQL, SQL Server, and SQLite databases. Browse schemas, execute queries, and manage saved queries.', path: '/devtools/sql', icon: Database, color: '#336791', tags: ['sql', 'database', 'query'], category: 'Advanced' },
  { id: 'playground', name: 'Code Playground', description: 'Write and execute code in JavaScript, TypeScript, Python, Ruby, Go, and Bash with instant output.', path: '/devtools/playground', icon: Play, color: '#22c55e', tags: ['code', 'execute', 'playground'], category: 'Advanced' },
  { id: 'agent-builder', name: 'Agent & Skill Builder', description: 'Create AI agent definitions and skill files with templates, mock chat preview, and export to repos.', path: '/devtools/agent-builder', icon: Bot, color: '#7c3aed', tags: ['agent', 'skill', 'ai', 'builder'], category: 'Advanced' },
];

const CATEGORIES = ['Development', 'API Explorers', 'Network', 'Security', 'Generators', 'Advanced'];

// ─── Page wrappers ───────────────────────────────────────────────────────────
const glassStyle = {
  style: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  },
};

function ToolPage({ title, subtitle, toolId, children }: { title: string; subtitle: string; toolId?: string; children: React.ReactNode }) {
  const toolUser = useAuthStore((s) => s.user);
  const toolToggleFav = useUserAccountsStore((s) => s.toggleFavoriteTool);
  const toolIsFav = useUserAccountsStore((s) => s.isFavoriteTool);
  const isFav = toolId && toolUser ? toolIsFav(toolUser.id, toolId) : false;

  return (
    <div className="h-full flex flex-col">
      <div style={{ padding: '36px 28px 16px' }} className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
        {toolId && toolUser && (
          <button
            onClick={() => toolToggleFav(toolUser.id, toolId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer"
            style={{
              color: isFav ? '#f59e0b' : 'var(--text-muted)',
              background: isFav ? 'rgba(245,158,11,0.08)' : 'transparent',
              border: `1px solid ${isFav ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}`,
            }}
          >
            <Star size={14} fill={isFav ? '#f59e0b' : 'none'} />
            {isFav ? 'Favorited' : 'Add to favorites'}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden mx-4 mb-4 rounded-[20px]" {...glassStyle}>
        {children}
      </div>
    </div>
  );
}

export const JsonValidatorPage = () => <ToolPage title="JSON Validator" subtitle="Validate, format, and minify JSON." toolId="json"><JsonValidator /></ToolPage>;
export const ApiTesterPage = () => <ToolPage title="API Tester" subtitle="Send HTTP requests and inspect responses." toolId="api"><ApiTester /></ToolPage>;
export const DnsLookupPage = () => <ToolPage title="DNS Lookup" subtitle="Query DNS records for any domain via Google DNS." toolId="dns"><DnsLookup /></ToolPage>;
export const PingToolPage = () => <ToolPage title="Ping Tool" subtitle="Measure network latency with fetch-based timing." toolId="ping"><PingTool /></ToolPage>;
export const WhoisLookupPage = () => <ToolPage title="WHOIS Lookup" subtitle="Retrieve domain registration details via RDAP." toolId="whois"><WhoisLookup /></ToolPage>;
export const SslCheckerPage = () => <ToolPage title="SSL Checker" subtitle="Check SSL/TLS connectivity for any domain." toolId="ssl"><SslChecker /></ToolPage>;
export const HttpHeadersPage = () => <ToolPage title="HTTP Headers Analyzer" subtitle="Analyze response headers and security posture." toolId="headers"><HttpHeaders /></ToolPage>;
export const WebSocketDebuggerPage = () => <ToolPage title="WebSocket Debugger" subtitle="Connect, send, and monitor WebSocket messages." toolId="websocket"><WebSocketDebugger /></ToolPage>;
export const GraphqlExplorerPage = () => <ToolPage title="GraphQL Explorer" subtitle="Build and test GraphQL queries with schema introspection." toolId="graphql"><GraphqlExplorer /></ToolPage>;
export const TextDiffPage = () => <ToolPage title="Text Diff Checker" subtitle="Compare two texts and visualize the differences." toolId="diff"><TextDiff /></ToolPage>;
export const Base64ToolPage = () => <ToolPage title="Base64 Encoder/Decoder" subtitle="Encode and decode Base64 strings and files." toolId="base64"><Base64Tool /></ToolPage>;
export const RegexTesterPage = () => <ToolPage title="Regex Tester" subtitle="Test regular expressions with real-time matching." toolId="regex"><RegexTester /></ToolPage>;
export const CsvViewerPage = () => <ToolPage title="CSV/TSV Viewer" subtitle="Parse and view CSV/TSV data in a sortable table." toolId="csv"><CsvViewer /></ToolPage>;
export const GitGeneratorPage = () => <ToolPage title="Git Command Generator" subtitle="Build git commands visually." toolId="git-gen"><GitGenerator /></ToolPage>;
export const DockerGeneratorPage = () => <ToolPage title="Docker Command Generator" subtitle="Build Docker commands with a visual builder." toolId="docker-gen"><DockerGenerator /></ToolPage>;
export const CertDecoderPage = () => <ToolPage title="Certificate Decoder" subtitle="Decode and validate PEM-encoded X.509 certificates." toolId="cert-decoder"><CertDecoder /></ToolPage>;
export const JwtDecoderPage = () => <ToolPage title="JWT Encoder/Decoder" subtitle="Decode and encode JSON Web Tokens." toolId="jwt"><JwtDecoder /></ToolPage>;
export const UuidGeneratorPage = () => <ToolPage title="UUID Generator" subtitle="Generate UUIDs v1, v4, v7 with configurable formatting." toolId="uuid"><UuidGenerator /></ToolPage>;

// ─── Main DevTools page ──────────────────────────────────────────────────────
export const DevToolsPage = () => {
  const navigate = useNavigate();
  const disabledTools = useSettingsStore((s) => s.settings.disabledTools ?? []);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const toggleFavoriteTool = useUserAccountsStore((s) => s.toggleFavoriteTool);
  const isFavoriteTool = useUserAccountsStore((s) => s.isFavoriteTool);

  // Admins see all tools (disabled ones marked); non-admins see only enabled tools
  const visibleTools = isAdmin ? TOOLS : TOOLS.filter((t) => !disabledTools.includes(t.id));
  const enabledCount = TOOLS.filter((t) => !disabledTools.includes(t.id)).length;

  return (
    <div className="p-6">
      <SectionTitle sub="Built-in utilities for developers — validate data, test APIs, debug networks, and generate commands.">
        Developer Tools
      </SectionTitle>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2" style={{
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <Wrench size={14} style={{ color: '#8b5cf6' }} />
          <span className="text-[12px] font-semibold" style={{ color: '#8b5cf6' }}>{enabledCount} tools available</span>
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const catTools = visibleTools.filter((t) => t.category === cat);
        if (catTools.length === 0) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {catTools.map((tool) => {
                const Icon = tool.icon;
                const isDisabled = disabledTools.includes(tool.id);
                const isFav = user ? isFavoriteTool(user.id, tool.id) : false;
                return (
                  <Card key={tool.id} onClick={() => !isDisabled && navigate(tool.path)}>
                    <div className="p-5 flex flex-col gap-3 cursor-pointer group h-full" style={{ opacity: isDisabled ? 0.45 : 1 }}>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{
                          background: `${tool.color}12`,
                          border: `1px solid ${tool.color}25`,
                          boxShadow: `0 4px 16px ${tool.color}15`,
                        }}>
                          <Icon size={22} style={{ color: tool.color }} />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (user) toggleFavoriteTool(user.id, tool.id); }}
                          className="p-1 rounded transition-colors cursor-pointer"
                          style={{ background: 'none', border: 'none', color: isFav ? '#f59e0b' : 'var(--text-faint)' }}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star size={16} fill={isFav ? '#f59e0b' : 'none'} />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{tool.name}</h3>
                        <p className="text-[11px] leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }}>{tool.description}</p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap mt-auto">
                        {tool.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{
                            background: `${tool.color}0a`, color: `${tool.color}cc`, border: `1px solid ${tool.color}20`,
                          }}>{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: tool.color }}>
                        Open tool <ArrowRight size={12} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

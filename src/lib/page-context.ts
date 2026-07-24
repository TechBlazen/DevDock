/**
 * page-context.ts
 *
 * Maps the current URL pathname to a human-readable context string that is
 * injected into the AI system prompt when the chat panel opens.  This gives
 * the AI awareness of where the user is in the app so it can provide more
 * relevant responses without the user having to explain manually.
 *
 * The hook also enriches the context with the currently-selected entity
 * (e.g. a repo name) when one is available.
 */
import { useLocation } from 'react-router-dom';
import { useRepoStore } from '../store';

// ─── Route map ───────────────────────────────────────────────────────────────

const ROUTE_LABELS: Array<{ pattern: RegExp; label: (match: RegExpMatchArray) => string }> = [
  { pattern: /^\/$/, label: () => 'Dashboard — the home screen with widgets and activity' },
  { pattern: /^\/repos\/([^/]+)/, label: (m) => `Repository detail page for repo "${m[1]}"` },
  { pattern: /^\/repos/, label: () => 'Repositories page — list of GitHub and Azure DevOps repos' },
  { pattern: /^\/mcp/, label: () => 'MCP Servers page — manage Model Context Protocol server connections' },
  { pattern: /^\/analytics/, label: () => 'Analytics page — OpenTelemetry traces, spans, and metrics' },
  { pattern: /^\/docs/, label: () => 'Documentation page — internal docs and knowledge base' },
  { pattern: /^\/forum/, label: () => 'Forum page — community Q&A and discussion threads' },
  { pattern: /^\/plugins/, label: () => 'Plugins page — install and manage DevDock plugins' },
  { pattern: /^\/apis/, label: () => 'API Catalogue page — registered OpenAPI / Swagger specs' },
  { pattern: /^\/builder/, label: () => 'Agent Builder page — visual LLM agent construction tool' },
  { pattern: /^\/scaffold/, label: () => 'Scaffold page — AI-assisted project scaffolding' },
  { pattern: /^\/settings/, label: () => 'Settings page — app configuration, AI providers, and integrations' },
  { pattern: /^\/users/, label: () => 'Users page — manage user accounts and roles' },
  { pattern: /^\/bookmarks/, label: () => 'Bookmarks page — saved links and collections' },
  { pattern: /^\/grafana/, label: () => 'Grafana page — embedded Grafana dashboards and metrics' },
  { pattern: /^\/n8n/, label: () => 'n8n page — workflow automation management' },
  { pattern: /^\/sql/, label: () => 'SQL Tool page — direct database query interface' },
  { pattern: /^\/gallery/, label: () => 'Agent & Skill Gallery — browse and install agents and skills' },
  { pattern: /^\/registry/, label: () => 'Skill Registry — manage published agents and skills' },
  { pattern: /^\/overwatch/, label: () => 'Overwatch page — ITOps AI diagnostics across ServiceNow, Dynatrace, and Splunk' },
  { pattern: /^\/federated/, label: () => 'Federated Search page — search across all connected data sources' },
  { pattern: /^\/feature-requests/, label: () => 'Feature Requests page — user-submitted feature ideas' },
  { pattern: /^\/directory/, label: () => 'Directory page — LDAP / Active Directory user and group browser' },
];

/** Derive a page label for the given pathname. */
export function getPageLabel(pathname: string): string {
  for (const { pattern, label } of ROUTE_LABELS) {
    const match = pathname.match(pattern);
    if (match) return label(match);
  }
  return `DevDock page at ${pathname}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns a descriptive context string for the current page, enriched with
 * the currently-selected entity when available.  Safe to call in any component
 * under the React Router tree.
 */
export function usePageContext(): string {
  const { pathname } = useLocation();
  const selectedRepo = useRepoStore((s) => s.selectedRepo);

  const label = getPageLabel(pathname);

  // Enrichment: if a repo is selected, include its name and key metadata.
  if (selectedRepo && pathname.startsWith('/repos')) {
    const extras = [
      selectedRepo.fullName,
      selectedRepo.language ? `language: ${selectedRepo.language}` : null,
      selectedRepo.description ? `description: "${selectedRepo.description}"` : null,
      selectedRepo.environments?.length
        ? `environments: ${selectedRepo.environments.join(', ')}`
        : null,
    ].filter(Boolean).join('; ');
    return `${label} — viewing ${extras}`;
  }

  return label;
}

import type { DatabaseProvider, UserRow, RepoRow, SettingsRow, DocRow } from '../provider.js';

// Simple hash matching the frontend's hashPassword in src/lib/rbac.ts
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `forge_${Math.abs(hash).toString(36)}`;
}

const now = new Date().toISOString();

const SEED_USERS: UserRow[] = [
  {
    id: 'admin-001',
    username: 'admin',
    password_hash: hashPassword('admin'),
    display_name: 'Administrator',
    email: 'admin@forgeportal.dev',
    avatar_url: undefined,
    role: 'admin',
    permissions: JSON.stringify({
      pages: ['*'], widgets: ['*'], plugins: ['*'],
      canManageUsers: true, canManagePlugins: true, canEditDocs: true,
      canAccessTerminal: true, canAccessNetwork: true,
    }),
    dashboard_widgets: undefined,
    favorite_repos: undefined,
    preferences: undefined,
    created_at: now,
    last_login: undefined,
  },
  {
    id: 'editor-001',
    username: 'editor',
    password_hash: hashPassword('workbench'),
    display_name: 'Editor User',
    email: 'editor@forgeportal.dev',
    avatar_url: undefined,
    role: 'editor',
    permissions: JSON.stringify({
      pages: ['/', '/github', '/ado', '/mcp', '/telemetry', '/catalog', '/scaffold', '/docs', '/network', '/plugins'],
      widgets: ['*'], plugins: ['*'],
      canManageUsers: false, canManagePlugins: false, canEditDocs: true,
      canAccessTerminal: true, canAccessNetwork: true,
    }),
    dashboard_widgets: undefined,
    favorite_repos: undefined,
    preferences: undefined,
    created_at: now,
    last_login: undefined,
  },
  {
    id: 'reader-001',
    username: 'reader',
    password_hash: hashPassword('workbench'),
    display_name: 'Reader User',
    email: 'reader@forgeportal.dev',
    avatar_url: undefined,
    role: 'viewer',
    permissions: JSON.stringify({
      pages: ['/', '/github', '/ado', '/telemetry', '/catalog', '/docs'],
      widgets: ['repos_github', 'repos_ado', 'telemetry', 'activity_feed'],
      plugins: ['*'],
      canManageUsers: false, canManagePlugins: false, canEditDocs: false,
      canAccessTerminal: false, canAccessNetwork: false,
    }),
    dashboard_widgets: undefined,
    favorite_repos: undefined,
    preferences: undefined,
    created_at: now,
    last_login: undefined,
  },
];

const SEED_REPOS: RepoRow[] = [
  { id: 'gh1', name: 'overwatch-ai', full_name: 'judge/overwatch-ai', description: 'Agentic AI diagnostics framework', source: 'github', language: 'Python', default_branch: 'main', stars: 142, forks: 18, is_private: 1, updated_at: '2h ago', clone_url: 'https://github.com/judge/overwatch-ai.git', web_url: 'https://github.com/judge/overwatch-ai', topics: '["ai","kubernetes","diagnostics"]', environments: '["PRD","UAT","SBX"]', cloud_platform: 'GCP', owners: '[{"name":"judge","type":"user"},{"name":"Platform Team","type":"team"}]', custom_tags: '["ml-ops","critical"]', added_by: 'admin-001' },
  { id: 'gh2', name: 'forge-portal', full_name: 'judge/forge-portal', description: 'AI-powered developer IDE portal', source: 'github', language: 'TypeScript', default_branch: 'main', stars: 89, forks: 7, is_private: 0, updated_at: '1d ago', clone_url: 'https://github.com/judge/forge-portal.git', web_url: 'https://github.com/judge/forge-portal', topics: '["backstage","vite","mcp"]', environments: '["SBX","ADT"]', cloud_platform: 'Azure', owners: '[{"name":"judge","type":"user"}]', custom_tags: '["developer-portal"]', added_by: 'admin-001' },
  { id: 'gh3', name: 'mcp-server-hub', full_name: 'judge/mcp-server-hub', description: 'MCP server registry and runner', source: 'github', language: 'Go', default_branch: 'develop', stars: 67, forks: 4, is_private: 0, updated_at: '3d ago', clone_url: 'https://github.com/judge/mcp-server-hub.git', web_url: 'https://github.com/judge/mcp-server-hub', topics: '["mcp","go","registry"]', environments: '["SPD","PRD"]', cloud_platform: 'GCP', owners: '[{"name":"Infra Team","type":"team"}]', custom_tags: undefined, added_by: undefined },
  { id: 'ado1', name: 'Costco.Platform.Gateway', full_name: 'Costco/Costco.Platform.Gateway', description: 'API Gateway & ApigeeX configuration', source: 'ado', language: 'YAML', default_branch: 'main', stars: 0, forks: 0, is_private: 1, updated_at: '4h ago', clone_url: 'https://dev.azure.com/costco/Platform/_git/Costco.Platform.Gateway', web_url: 'https://dev.azure.com/costco/Platform/_git/Costco.Platform.Gateway', topics: '[]', environments: '["PRD","SPD","UAT","SBX"]', cloud_platform: 'GCP', owners: '[{"name":"Platform Team","type":"team"},{"name":"adithya","type":"user"}]', custom_tags: '["apigee","gateway"]', added_by: 'admin-001' },
  { id: 'ado2', name: 'Costco.K8s.Infra', full_name: 'Costco/Costco.K8s.Infra', description: 'GKE cluster infrastructure as code', source: 'ado', language: 'HCL', default_branch: 'main', stars: 0, forks: 0, is_private: 1, updated_at: '1d ago', clone_url: 'https://dev.azure.com/costco/Platform/_git/Costco.K8s.Infra', web_url: 'https://dev.azure.com/costco/Platform/_git/Costco.K8s.Infra', topics: '[]', environments: '["PRD","SPD","QAT"]', cloud_platform: 'GCP', owners: '[{"name":"Infra Team","type":"team"}]', custom_tags: '["terraform","gke"]', added_by: undefined },
];

const SEED_SETTINGS: SettingsRow = {
  id: 'global',
  user_id: undefined,
  ai_config: JSON.stringify({
    provider: 'anthropic',
    apiKeys: { anthropic: '', openai: '', gemini: '', local: '' },
    localEndpoint: 'http://localhost:11434/v1',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 2048,
  }),
  otel_config: JSON.stringify({
    endpoint: 'http://localhost:4317',
    serviceName: 'devdock',
    enabled: true,
    exportTraces: true,
    exportMetrics: true,
    exportLogs: false,
  }),
  github_config: JSON.stringify({ accessToken: '', orgs: [], includePersonal: true }),
  ado_config: JSON.stringify({ organization: '', personalAccessToken: '', projects: [] }),
  theme: 'dark',
  dashboard_widgets: JSON.stringify(['repos_github', 'repos_ado', 'mcp_status', 'telemetry', 'quick_actions', 'activity_feed', 'favorite_repos']),
};

const SEED_DOCS: DocRow[] = [
  {
    id: 'doc-welcome',
    title: 'Welcome to DevDock',
    content: '# Welcome\\n\\nDevDock is your AI-powered developer portal.',
    source_url: undefined,
    tags: '["getting-started"]',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function seed(db: DatabaseProvider): Promise<void> {
  const existingUsers = await db.getUsers();
  if (existingUsers.length > 0) {
    console.log('  Database already seeded, skipping');
    return;
  }

  console.log('  Seeding database...');

  for (const user of SEED_USERS) {
    await db.createUser(user);
  }

  for (const repo of SEED_REPOS) {
    await db.upsertRepo(repo);
  }

  await db.upsertSettings(SEED_SETTINGS);

  for (const doc of SEED_DOCS) {
    await db.createDoc(doc);
  }

  console.log(`  Seeded: ${SEED_USERS.length} users, ${SEED_REPOS.length} repos, 1 settings, ${SEED_DOCS.length} docs`);
}

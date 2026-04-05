import type { UserRole, Permission, UserAccount } from '../types';

// ─── Simple hash for demo (NOT cryptographically secure) ─────────────────────
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `forge_${Math.abs(hash).toString(36)}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ─── Default permissions per role ────────────────────────────────────────────
// Admin: Full access including widget/plugin management
// Editor (Contributor): Can use all features but cannot manage widgets/plugins
// Viewer (Reader): Read-only access
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    pages: ['*'],
    widgets: ['*'],
    plugins: ['*'],
    canManageUsers: true,
    canManagePlugins: true,
    canEditDocs: true,
    canAccessTerminal: true,
    canAccessNetwork: true,
  },
  editor: {
    pages: [
      '/', '/github', '/ado', '/mcp', '/telemetry', '/catalog',
      '/scaffold', '/docs', '/network', '/plugins',
    ],
    widgets: ['*'],
    plugins: ['*'],
    canManageUsers: false,
    canManagePlugins: false,  // Contributors cannot manage plugins/widgets
    canEditDocs: true,
    canAccessTerminal: true,
    canAccessNetwork: true,
  },
  viewer: {
    pages: [
      '/', '/github', '/ado', '/telemetry', '/catalog', '/docs',
    ],
    widgets: ['repos_github', 'repos_ado', 'telemetry', 'activity_feed'],
    plugins: ['*'],
    canManageUsers: false,
    canManagePlugins: false,
    canEditDocs: false,
    canAccessTerminal: false,
    canAccessNetwork: false,
  },
};

// ─── Seed accounts ──────────────────────────────────────────────────────────
export const SEED_ADMIN: UserAccount = {
  id: 'admin-001',
  username: 'admin',
  passwordHash: hashPassword('admin'),
  displayName: 'Administrator',
  email: 'admin@forgeportal.dev',
  role: 'admin',
  group: 'Admins',
  permissions: ROLE_PERMISSIONS.admin,
  createdAt: new Date().toISOString(),
};

export const SEED_EDITOR: UserAccount = {
  id: 'editor-001',
  username: 'editor',
  passwordHash: hashPassword('workbench'),
  displayName: 'Editor User',
  email: 'editor@forgeportal.dev',
  role: 'editor',
  group: 'Contributors',
  permissions: ROLE_PERMISSIONS.editor,
  createdAt: new Date().toISOString(),
};

export const SEED_READER: UserAccount = {
  id: 'reader-001',
  username: 'reader',
  passwordHash: hashPassword('workbench'),
  displayName: 'Reader User',
  email: 'reader@forgeportal.dev',
  role: 'viewer',
  group: 'Readers',
  permissions: ROLE_PERMISSIONS.viewer,
  createdAt: new Date().toISOString(),
};

// ─── Group definitions ─────────────────────────────────────────────────────
export const USER_GROUPS = [
  { name: 'Admins', role: 'admin' as UserRole, color: '#ef4444', description: 'Full access to all features and user management' },
  { name: 'Contributors', role: 'editor' as UserRole, color: '#3b82f6', description: 'Can use all features but cannot manage users or plugins' },
  { name: 'Readers', role: 'viewer' as UserRole, color: '#10b981', description: 'Read-only access to repos, telemetry, and docs' },
];

export const SEED_ACCOUNTS = [SEED_ADMIN, SEED_EDITOR, SEED_READER];

// ─── Permission checks ──────────────────────────────────────────────────────
export function canAccessPage(permissions: Permission, path: string): boolean {
  if (permissions.pages.includes('*')) return true;
  return permissions.pages.includes(path);
}

export function canAccessWidget(permissions: Permission, widgetId: string): boolean {
  if (permissions.widgets.includes('*')) return true;
  return permissions.widgets.includes(widgetId);
}

export function canAccessPlugin(permissions: Permission, pluginId: string): boolean {
  if (permissions.plugins.includes('*')) return true;
  return permissions.plugins.includes(pluginId);
}

export function getRoleLabel(role: UserRole): string {
  return { admin: 'Admin', editor: 'Contributor', viewer: 'Reader' }[role];
}

export function getRoleColor(role: UserRole): string {
  return { admin: '#ef4444', editor: '#3b82f6', viewer: '#10b981' }[role];
}

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
    canManagePlugins: true,
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

// ─── Seed admin account ──────────────────────────────────────────────────────
export const SEED_ADMIN: UserAccount = {
  id: 'admin-001',
  username: 'admin',
  passwordHash: hashPassword('admin'),
  displayName: 'Administrator',
  email: 'admin@forgeportal.dev',
  role: 'admin',
  permissions: ROLE_PERMISSIONS.admin,
  createdAt: new Date().toISOString(),
};

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
  return { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' }[role];
}

export function getRoleColor(role: UserRole): string {
  return { admin: '#ef4444', editor: '#3b82f6', viewer: '#10b981' }[role];
}

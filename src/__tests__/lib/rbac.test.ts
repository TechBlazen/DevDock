import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  ROLE_PERMISSIONS,
  SEED_ADMIN,
  SEED_EDITOR,
  SEED_READER,
  SEED_ACCOUNTS,
  canAccessPage,
  canAccessWidget,
  canAccessPlugin,
  getRoleLabel,
  getRoleColor,
} from '../../lib/rbac';

describe('rbac / hashPassword', () => {
  it('produces consistent hashes for the same input', () => {
    expect(hashPassword('admin')).toBe(hashPassword('admin'));
    expect(hashPassword('secret123')).toBe(hashPassword('secret123'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashPassword('admin')).not.toBe(hashPassword('editor'));
    expect(hashPassword('password')).not.toBe(hashPassword('password1'));
  });

  it('returns a non-empty string prefixed with forge_', () => {
    const hash = hashPassword('anything');
    expect(hash).toMatch(/^forge_[a-z0-9]+$/);
  });
});

describe('rbac / verifyPassword', () => {
  it('returns true for matching password', () => {
    const hash = hashPassword('admin');
    expect(verifyPassword('admin', hash)).toBe(true);
  });

  it('returns false for non-matching password', () => {
    const hash = hashPassword('admin');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('rbac / ROLE_PERMISSIONS', () => {
  it('admin role has wildcard access and full manage permissions', () => {
    const admin = ROLE_PERMISSIONS.admin;
    expect(admin.pages).toContain('*');
    expect(admin.widgets).toContain('*');
    expect(admin.plugins).toContain('*');
    expect(admin.canManageUsers).toBe(true);
    expect(admin.canManagePlugins).toBe(true);
    expect(admin.canEditDocs).toBe(true);
    expect(admin.canAccessTerminal).toBe(true);
    expect(admin.canAccessNetwork).toBe(true);
  });

  it('editor role can edit docs but cannot manage users/plugins', () => {
    const editor = ROLE_PERMISSIONS.editor;
    expect(editor.canEditDocs).toBe(true);
    expect(editor.canManageUsers).toBe(false);
    expect(editor.canManagePlugins).toBe(false);
  });

  it('viewer role is read-only', () => {
    const viewer = ROLE_PERMISSIONS.viewer;
    expect(viewer.canEditDocs).toBe(false);
    expect(viewer.canAccessTerminal).toBe(false);
    expect(viewer.canAccessNetwork).toBe(false);
    expect(viewer.canManageUsers).toBe(false);
  });
});

describe('rbac / SEED_ACCOUNTS', () => {
  it('admin seed password matches hashPassword("admin")', () => {
    expect(verifyPassword('admin', SEED_ADMIN.passwordHash)).toBe(true);
  });

  it('editor seed password matches hashPassword("workbench")', () => {
    expect(verifyPassword('workbench', SEED_EDITOR.passwordHash)).toBe(true);
  });

  it('reader seed password matches hashPassword("workbench")', () => {
    expect(verifyPassword('workbench', SEED_READER.passwordHash)).toBe(true);
  });

  it('exports all three seed accounts', () => {
    expect(SEED_ACCOUNTS).toHaveLength(3);
    expect(SEED_ACCOUNTS.map((a) => a.role).sort()).toEqual(['admin', 'editor', 'viewer']);
  });
});

describe('rbac / access helpers', () => {
  it('canAccessPage grants wildcard admins every path', () => {
    expect(canAccessPage(ROLE_PERMISSIONS.admin, '/any/weird/path')).toBe(true);
  });

  it('canAccessPage denies viewers for pages outside their list', () => {
    expect(canAccessPage(ROLE_PERMISSIONS.viewer, '/settings')).toBe(false);
    expect(canAccessPage(ROLE_PERMISSIONS.viewer, '/')).toBe(true);
  });

  it('canAccessWidget respects wildcard vs list', () => {
    expect(canAccessWidget(ROLE_PERMISSIONS.admin, 'telemetry')).toBe(true);
    expect(canAccessWidget(ROLE_PERMISSIONS.viewer, 'telemetry')).toBe(true);
    expect(canAccessWidget(ROLE_PERMISSIONS.viewer, 'mcp_status')).toBe(false);
  });

  it('canAccessPlugin allows wildcard for all roles', () => {
    expect(canAccessPlugin(ROLE_PERMISSIONS.admin, 'plugin-x')).toBe(true);
    expect(canAccessPlugin(ROLE_PERMISSIONS.editor, 'plugin-x')).toBe(true);
    expect(canAccessPlugin(ROLE_PERMISSIONS.viewer, 'plugin-x')).toBe(true);
  });
});

describe('rbac / getRoleLabel and getRoleColor', () => {
  it('returns human-readable labels', () => {
    expect(getRoleLabel('admin')).toBe('Admin');
    expect(getRoleLabel('editor')).toBe('Contributor');
    expect(getRoleLabel('viewer')).toBe('Reader');
  });

  it('returns distinct colors per role', () => {
    const colors = new Set([
      getRoleColor('admin'),
      getRoleColor('editor'),
      getRoleColor('viewer'),
    ]);
    expect(colors.size).toBe(3);
  });
});

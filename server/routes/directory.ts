import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import {
  testConnection,
  listUsers,
  listGroups,
  getGroupMembers,
  type LdapConfig,
} from '../lib/ldap-client.js';

function buildLdapConfig(body: Record<string, unknown>): LdapConfig {
  return {
    url: String(body.ldapUrl ?? body.url ?? ''),
    baseDn: String(body.baseDn ?? ''),
    bindDn: String(body.bindDn ?? ''),
    bindPassword: String(body.bindPassword ?? ''),
    useSsl: Boolean(body.useSsl ?? true),
    userSearchFilter: String(body.userSearchFilter ?? '(&(objectClass=user)(sAMAccountName={username}))'),
    userDisplayNameAttr: String(body.userDisplayNameAttr ?? 'displayName'),
    userEmailAttr: String(body.userEmailAttr ?? 'mail'),
    groupSearchFilter: String(body.groupSearchFilter ?? '(&(objectClass=group)(member={userDn}))'),
  };
}

export function registerDirectoryRoutes(app: FastifyInstance, _db: DatabaseProvider, _jwtSecret: string) {
  // Directory routes accept LDAP config in the request body.
  // Auth is handled client-side (admin-only route guard in React).

  // Test LDAP connection
  app.post('/api/directory/test', async (request, reply) => {
    const config = buildLdapConfig(request.body as Record<string, unknown>);
    if (!config.url || !config.baseDn || !config.bindDn) {
      return reply.status(400).send({ error: 'LDAP URL, Base DN, and Bind DN are required' });
    }

    try {
      const result = await testConnection(config);
      return result;
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Connection failed' };
    }
  });

  // List directory users
  app.post('/api/directory/users', async (request) => {
    const body = request.body as Record<string, unknown>;
    const config = buildLdapConfig(body);
    const search = body.search ? String(body.search) : undefined;
    const limit = body.limit ? Number(body.limit) : 100;

    const users = await listUsers(config, search, limit);
    return { users, count: users.length };
  });

  // List directory groups
  app.post('/api/directory/groups', async (request) => {
    const body = request.body as Record<string, unknown>;
    const config = buildLdapConfig(body);
    const search = body.search ? String(body.search) : undefined;
    const limit = body.limit ? Number(body.limit) : 100;

    const groups = await listGroups(config, search, limit);
    return { groups, count: groups.length };
  });

  // Get group members
  app.post('/api/directory/groups/members', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const config = buildLdapConfig(body);
    const groupDn = body.groupDn ? String(body.groupDn) : '';

    if (!groupDn) {
      return reply.status(400).send({ error: 'groupDn is required' });
    }

    const members = await getGroupMembers(config, groupDn);
    return { members, count: members.length };
  });
}

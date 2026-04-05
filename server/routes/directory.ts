import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';
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

export function registerDirectoryRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  // Test LDAP connection
  app.post('/api/directory/test', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only admins can test directory connections' });
    }

    const config = buildLdapConfig(request.body as Record<string, unknown>);
    if (!config.url || !config.baseDn || !config.bindDn) {
      return reply.status(400).send({ error: 'LDAP URL, Base DN, and Bind DN are required' });
    }

    const result = await testConnection(config);
    return result;
  });

  // List directory users
  app.post('/api/directory/users', { preHandler: guard }, async (request) => {
    const body = request.body as Record<string, unknown>;
    const config = buildLdapConfig(body);
    const search = body.search ? String(body.search) : undefined;
    const limit = body.limit ? Number(body.limit) : 100;

    const users = await listUsers(config, search, limit);
    return { users, count: users.length };
  });

  // List directory groups
  app.post('/api/directory/groups', { preHandler: guard }, async (request) => {
    const body = request.body as Record<string, unknown>;
    const config = buildLdapConfig(body);
    const search = body.search ? String(body.search) : undefined;
    const limit = body.limit ? Number(body.limit) : 100;

    const groups = await listGroups(config, search, limit);
    return { groups, count: groups.length };
  });

  // Get group members
  app.post('/api/directory/groups/members', { preHandler: guard }, async (request, reply) => {
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

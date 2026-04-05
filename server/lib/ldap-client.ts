import ldap from 'ldapjs';

export interface LdapConfig {
  url: string;           // ldaps://dc.contoso.com:636
  baseDn: string;        // DC=contoso,DC=com
  bindDn: string;        // CN=svc-portal,OU=Service Accounts,DC=contoso,DC=com
  bindPassword: string;
  useSsl: boolean;
  userSearchFilter: string;    // (&(objectClass=user)(sAMAccountName={username}))
  userDisplayNameAttr: string; // displayName
  userEmailAttr: string;       // mail
  groupSearchFilter: string;   // (&(objectClass=group)(member={userDn}))
}

export interface LdapUser {
  dn: string;
  sAMAccountName: string;
  displayName: string;
  email: string;
  memberOf: string[];
  department?: string;
  title?: string;
  whenCreated?: string;
  enabled: boolean;
}

export interface LdapGroup {
  dn: string;
  cn: string;
  description: string;
  members: string[];
  memberCount: number;
}

export interface LdapTestResult {
  success: boolean;
  message: string;
  serverInfo?: {
    hostname: string;
    port: number;
    ssl: boolean;
    baseDn: string;
  };
  userCount?: number;
  groupCount?: number;
}

function createClient(config: LdapConfig): ldap.Client {
  return ldap.createClient({
    url: config.url,
    tlsOptions: config.useSsl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000,
    timeout: 15000,
  });
}

function bindClient(client: ldap.Client, bindDn: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.bind(bindDn, password, (err) => {
      if (err) reject(new Error(`LDAP bind failed: ${err.message}`));
      else resolve();
    });
  });
}

function searchLdap(
  client: ldap.Client,
  baseDn: string,
  filter: string,
  attributes: string[],
  sizeLimit = 500,
): Promise<Record<string, string | string[]>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string | string[]>[] = [];

    client.search(baseDn, {
      filter,
      scope: 'sub',
      attributes,
      sizeLimit,
      timeLimit: 30,
    }, (err, res) => {
      if (err) return reject(new Error(`LDAP search failed: ${err.message}`));

      res.on('searchEntry', (entry) => {
        const obj: Record<string, string | string[]> = { dn: entry.dn.toString() };
        for (const attr of entry.attributes) {
          const vals = attr.values;
          obj[attr.type] = vals.length === 1 ? vals[0] : vals;
        }
        results.push(obj);
      });

      res.on('error', (err) => reject(new Error(`LDAP search error: ${err.message}`)));
      res.on('end', () => resolve(results));
    });
  });
}

function destroyClient(client: ldap.Client): void {
  try { client.unbind(); } catch { /* ignore */ }
  try { client.destroy(); } catch { /* ignore */ }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function testConnection(config: LdapConfig): Promise<LdapTestResult> {
  const client = createClient(config);
  try {
    await bindClient(client, config.bindDn, config.bindPassword);

    // Count users and groups
    const users = await searchLdap(client, config.baseDn, '(objectClass=user)', ['sAMAccountName'], 1000);
    const groups = await searchLdap(client, config.baseDn, '(objectClass=group)', ['cn'], 1000);

    const url = new URL(config.url);
    return {
      success: true,
      message: `Connected successfully. Found ${users.length} users and ${groups.length} groups.`,
      serverInfo: {
        hostname: url.hostname,
        port: parseInt(url.port || (config.useSsl ? '636' : '389')),
        ssl: config.useSsl,
        baseDn: config.baseDn,
      },
      userCount: users.length,
      groupCount: groups.length,
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Unknown connection error',
    };
  } finally {
    destroyClient(client);
  }
}

export async function listUsers(config: LdapConfig, search?: string, limit = 100): Promise<LdapUser[]> {
  const client = createClient(config);
  try {
    await bindClient(client, config.bindDn, config.bindPassword);

    let filter = '(&(objectClass=user)(objectCategory=person))';
    if (search) {
      filter = `(&(objectClass=user)(objectCategory=person)(|(sAMAccountName=*${search}*)(${config.userDisplayNameAttr}=*${search}*)(${config.userEmailAttr}=*${search}*)))`;
    }

    const attrs = [
      'sAMAccountName', config.userDisplayNameAttr, config.userEmailAttr,
      'memberOf', 'department', 'title', 'whenCreated', 'userAccountControl',
    ];

    const results = await searchLdap(client, config.baseDn, filter, attrs, limit);

    return results.map((r) => ({
      dn: String(r.dn ?? ''),
      sAMAccountName: String(r.sAMAccountName ?? ''),
      displayName: String(r[config.userDisplayNameAttr] ?? r.sAMAccountName ?? ''),
      email: String(r[config.userEmailAttr] ?? ''),
      memberOf: Array.isArray(r.memberOf) ? r.memberOf.map(String) : r.memberOf ? [String(r.memberOf)] : [],
      department: r.department ? String(r.department) : undefined,
      title: r.title ? String(r.title) : undefined,
      whenCreated: r.whenCreated ? String(r.whenCreated) : undefined,
      // userAccountControl bit 2 = disabled
      enabled: r.userAccountControl ? !(Number(r.userAccountControl) & 2) : true,
    }));
  } finally {
    destroyClient(client);
  }
}

export async function listGroups(config: LdapConfig, search?: string, limit = 100): Promise<LdapGroup[]> {
  const client = createClient(config);
  try {
    await bindClient(client, config.bindDn, config.bindPassword);

    let filter = '(objectClass=group)';
    if (search) {
      filter = `(&(objectClass=group)(|(cn=*${search}*)(description=*${search}*)))`;
    }

    const results = await searchLdap(client, config.baseDn, filter, ['cn', 'description', 'member'], limit);

    return results.map((r) => {
      const members = Array.isArray(r.member) ? r.member.map(String) : r.member ? [String(r.member)] : [];
      return {
        dn: String(r.dn ?? ''),
        cn: String(r.cn ?? ''),
        description: String(r.description ?? ''),
        members,
        memberCount: members.length,
      };
    });
  } finally {
    destroyClient(client);
  }
}

export async function getUser(config: LdapConfig, username: string): Promise<LdapUser | null> {
  const users = await listUsers(config, undefined, 1000);
  return users.find((u) => u.sAMAccountName === username) ?? null;
}

export async function getGroupMembers(config: LdapConfig, groupDn: string): Promise<LdapUser[]> {
  const client = createClient(config);
  try {
    await bindClient(client, config.bindDn, config.bindPassword);

    const filter = `(&(objectClass=user)(objectCategory=person)(memberOf=${groupDn}))`;
    const attrs = [
      'sAMAccountName', config.userDisplayNameAttr, config.userEmailAttr,
      'memberOf', 'department', 'title', 'userAccountControl',
    ];

    const results = await searchLdap(client, config.baseDn, filter, attrs, 500);

    return results.map((r) => ({
      dn: String(r.dn ?? ''),
      sAMAccountName: String(r.sAMAccountName ?? ''),
      displayName: String(r[config.userDisplayNameAttr] ?? r.sAMAccountName ?? ''),
      email: String(r[config.userEmailAttr] ?? ''),
      memberOf: Array.isArray(r.memberOf) ? r.memberOf.map(String) : r.memberOf ? [String(r.memberOf)] : [],
      department: r.department ? String(r.department) : undefined,
      title: r.title ? String(r.title) : undefined,
      enabled: r.userAccountControl ? !(Number(r.userAccountControl) & 2) : true,
    }));
  } finally {
    destroyClient(client);
  }
}

import type { NavigationConfig } from '../types';

export const defaultNavigation: NavigationConfig = {
  items: [
    // ── Main navigation ──
    { id: 'dashboard',  type: 'link', label: 'Dashboard',    icon: 'LayoutDashboard', route: '/',         visible: true, locked: true },
    { id: 'github',     type: 'link', label: 'GitHub',       icon: 'GitFork',         route: '/github',   visible: true },
    { id: 'ado',        type: 'link', label: 'Azure DevOps', icon: 'GitBranch',       route: '/ado',      visible: true },
    { id: 'mcp',        type: 'link', label: 'MCP Servers',  icon: 'Cpu',             route: '/mcp',      visible: true },

    // ── Tools & monitoring ──
    { id: 'telemetry',  type: 'link', label: 'Observability', icon: 'Activity',       route: '/telemetry', visible: true },
    { id: 'catalog',    type: 'link', label: 'Widgets',       icon: 'Layers',         route: '/catalog',   visible: true },
    { id: 'scaffold',   type: 'link', label: 'Scaffold',      icon: 'Hammer',         route: '/scaffold',  visible: true },
    { id: 'docs',       type: 'link', label: 'Docs',          icon: 'FileText',       route: '/docs',      visible: true },
    { id: 'network',    type: 'link', label: 'Network',       icon: 'Network',        route: '/network',   visible: true },
    { id: 'forum',      type: 'link', label: 'Community',     icon: 'MessageSquare',  route: '/forum',     visible: true },

    // ── Divider ──
    { id: 'div-devtools', type: 'divider', visible: true },

    // ── Dev Tools group ──
    {
      id: 'devtools',
      type: 'group',
      label: 'Dev Tools',
      icon: 'Wrench',
      route: '/devtools',
      visible: true,
      defaultExpanded: false,
      children: [
        { id: 'dt-json',       type: 'link', label: 'JSON Validator',    icon: 'Braces',      route: '/devtools/json',       visible: true },
        { id: 'dt-api',        type: 'link', label: 'API Tester',        icon: 'Send',         route: '/devtools/api',        visible: true },
        { id: 'dt-dns',        type: 'link', label: 'DNS Lookup',        icon: 'Globe',        route: '/devtools/dns',        visible: true },
        { id: 'dt-ping',       type: 'link', label: 'Ping Tool',         icon: 'Wifi',         route: '/devtools/ping',       visible: true },
        { id: 'dt-whois',      type: 'link', label: 'WHOIS Lookup',      icon: 'FileSearch',   route: '/devtools/whois',      visible: true },
        { id: 'dt-ssl',        type: 'link', label: 'SSL Checker',       icon: 'ShieldCheck',  route: '/devtools/ssl',        visible: true },
        { id: 'dt-headers',    type: 'link', label: 'HTTP Headers',      icon: 'LayoutList',   route: '/devtools/headers',    visible: true },
        { id: 'dt-websocket',  type: 'link', label: 'WebSocket',         icon: 'Cable',        route: '/devtools/websocket',  visible: true },
        { id: 'dt-graphql',    type: 'link', label: 'GraphQL',           icon: 'Waypoints',    route: '/devtools/graphql',    visible: true },
        { id: 'dt-diff',       type: 'link', label: 'Text Diff',         icon: 'FileDiff',     route: '/devtools/diff',       visible: true },
        { id: 'dt-base64',     type: 'link', label: 'Base64',            icon: 'Binary',       route: '/devtools/base64',     visible: true },
        { id: 'dt-regex',      type: 'link', label: 'Regex Tester',      icon: 'Regex',        route: '/devtools/regex',      visible: true },
        { id: 'dt-csv',        type: 'link', label: 'CSV Viewer',        icon: 'Table',        route: '/devtools/csv',        visible: true },
        { id: 'dt-git-gen',    type: 'link', label: 'Git Generator',     icon: 'GitMerge',     route: '/devtools/git-gen',    visible: true },
        { id: 'dt-docker-gen', type: 'link', label: 'Docker Generator',  icon: 'Container',    route: '/devtools/docker-gen', visible: true },
      ],
    },

    // ── Plugin slot ──
    { id: 'plugin-slot', type: 'plugin-slot', label: 'Plugins', visible: true },

    // ── Divider before admin ──
    { id: 'div-admin', type: 'divider', visible: true },

    // ── Profile & Admin ──
    { id: 'profile',   type: 'link', label: 'Profile',   icon: 'User',      route: '/profile',   visible: true },
    { id: 'analytics', type: 'link', label: 'Analytics',  icon: 'BarChart3', route: '/analytics', visible: true, adminOnly: true },
    { id: 'users',     type: 'link', label: 'Users',      icon: 'Users',     route: '/users',     visible: true, adminOnly: true },
    { id: 'settings',  type: 'link', label: 'Settings',   icon: 'Settings',  route: '/settings',  visible: true, adminOnly: true, locked: true },
  ],
};

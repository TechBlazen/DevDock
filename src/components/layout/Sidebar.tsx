import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, GitFork, GitBranch, Cpu, Activity,
  Settings, Layers, Hammer, Puzzle, FileText, Network, Users, LogOut,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight,
  Wrench, Braces, Send, Search,
} from 'lucide-react';
import { useMCPStore, useAuthStore } from '../../store';
import { usePluginExtensions } from '../../lib/plugins';

// Group 1: Main navigation (above divider)
const mainNavItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/github',     icon: GitFork,         label: 'GitHub' },
  { to: '/ado',        icon: GitBranch,       label: 'Azure DevOps' },
  { to: '/mcp',        icon: Cpu,             label: 'MCP Servers' },
];

// Group 2: Tools & monitoring (below divider)
const toolsNavItems = [
  { to: '/telemetry',  icon: Activity,        label: 'Observability' },
  { to: '/catalog',    icon: Layers,          label: 'Catalog' },
  { to: '/scaffold',   icon: Hammer,          label: 'Scaffold' },
  { to: '/docs',       icon: FileText,        label: 'Docs' },
  { to: '/network',    icon: Network,         label: 'Network' },
];

const adminNavItems = [
  { to: '/users',      icon: Users,           label: 'Users' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
];

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  microsoft: 'Microsoft',
  google: 'Google',
  guest: 'Guest',
};

// Shared nav link style function
const navLinkStyle = (isActive: boolean) => ({
  background: isActive ? '#e8f0fe' : 'transparent',
  color: isActive ? '#005DAA' : '#444',
  border: '1px solid transparent',
  fontWeight: isActive ? 600 : 400,
});

const hoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.getAttribute('aria-current') !== 'page') {
      el.style.background = '#f5f5f5';
      el.style.color = '#222';
    }
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.getAttribute('aria-current') !== 'page') {
      el.style.background = 'transparent';
      el.style.color = '#444';
    }
  },
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const servers = useMCPStore((s) => s.servers);
  const runningCount = servers.filter((s) => s.status === 'running').length;
  const { user, provider, signOut } = useAuthStore();
  const { navItems: pluginNavItems } = usePluginExtensions();
  const { pathname } = useLocation();

  const [pluginsExpanded, setPluginsExpanded] = useState(true);
  const [devtoolsExpanded, setDevtoolsExpanded] = useState(true);

  const isAdmin = user?.role === 'admin';
  const displayName = user?.displayName ?? 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const providerLabel = PROVIDER_LABELS[provider ?? 'guest'] ?? provider;

  // Check if any plugin route is active
  const pluginPaths = pluginNavItems.map((p) => p.to);
  const isPluginRouteActive = pluginPaths.includes(pathname);
  const isPluginsPageActive = pathname === '/plugins';

  const [searchQuery, setSearchQuery] = useState('');

  const renderNavLink = (to: string, Icon: React.ComponentType<{ size?: number; className?: string }>, label: string, indent = false) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      title={collapsed ? label : undefined}
      className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 ${collapsed ? 'px-0 py-2.5' : indent ? 'px-3 py-[10px]' : 'px-3 py-[10px]'} rounded-md text-[13px] font-medium transition-all duration-200`}
      style={({ isActive }) => ({ ...navLinkStyle(isActive), ...(indent && !collapsed ? { marginLeft: 44 } : {}) })}
      {...hoverHandlers}
    >
      <Icon size={indent ? 14 : 16} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && label === 'MCP Servers' && runningCount > 0 && (
        <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0" style={{
          background: '#e8f0fe',
          color: '#005DAA',
          border: '1px solid #c5d9f0',
        }}>
          {runningCount}
        </span>
      )}
    </NavLink>
  );

  return (
    <aside
      className="flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? 64 : 280,
        minWidth: collapsed ? 64 : 280,
        background: '#ffffff',
        borderRight: '1px solid #e0e0e0',
      }}
    >
      {/* Search */}
      {!collapsed && (
        <div style={{ marginLeft: 24, marginRight: 24, marginTop: 16, marginBottom: 8 }}>
          <div className="flex items-center gap-2.5 rounded-md px-3 py-2.5" style={{
            border: '2px solid #ccc',
          }}>
            <Search size={16} style={{ color: '#aaa' }} className="flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repos, MCP, Traces...."
              className="bg-transparent border-none outline-none text-[14px] flex-1 min-w-0"
              style={{ color: '#333' }}
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 ${collapsed ? 'px-1.5' : 'px-2'} py-2 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden`}>
        {/* Main nav group */}
        {mainNavItems.map(({ to, icon: Icon, label }) => renderNavLink(to, Icon, label))}

        {/* Tools & monitoring group */}
        {toolsNavItems.map(({ to, icon: Icon, label }) => renderNavLink(to, Icon, label))}

        {/* ── Divider before Dev Tools ── */}
        {!collapsed && <div style={{ marginTop: 12, marginBottom: 12, marginLeft: 24, marginRight: 24, borderTop: '1px solid #e0e0e0' }} />}

        {/* Developer Tools treeview */}
        {collapsed ? (
          renderNavLink('/devtools', Wrench, 'Dev Tools')
        ) : (
          <div>
            <div className="flex items-center">
              <NavLink
                to="/devtools"
                className="flex-1 flex items-center gap-2.5 px-3 py-[10px] rounded-md text-[13px] font-medium transition-all duration-200"
                style={() => navLinkStyle(pathname.startsWith('/devtools'))}
                {...hoverHandlers}
              >
                <Wrench size={16} className="flex-shrink-0" />
                <span className="truncate">Dev Tools</span>
              </NavLink>
              <button
                onClick={(e) => { e.stopPropagation(); setDevtoolsExpanded((v) => !v); }}
                className="p-1 mr-2 rounded transition-all duration-200"
                style={{ color: '#bbb' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#666'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#bbb'}
              >
                {devtoolsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
            {devtoolsExpanded && (
              <div className="flex flex-col gap-0.5 animate-[fadeIn_0.15s_ease]">
                {[
                  { to: '/devtools/json', icon: Braces, label: 'JSON Validator' },
                  { to: '/devtools/api', icon: Send, label: 'API Tester' },
                ].map((item) => renderNavLink(item.to, item.icon, item.label, true))}
              </div>
            )}
          </div>
        )}

        {/* Plugins treeview */}
        {collapsed ? (
          renderNavLink('/plugins', Puzzle, 'Plugins')
        ) : (
          <div>
            <div className="flex items-center">
              <NavLink
                to="/plugins"
                className="flex-1 flex items-center gap-2.5 px-3 py-[10px] rounded-md text-[13px] font-medium transition-all duration-200"
                style={() => navLinkStyle(isPluginsPageActive || isPluginRouteActive)}
                {...hoverHandlers}
              >
                <Puzzle size={16} className="flex-shrink-0" />
                <span className="truncate">Plugins</span>
              </NavLink>
              {pluginNavItems.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPluginsExpanded((v) => !v); }}
                  className="p-1 mr-2 rounded transition-all duration-200"
                  style={{ color: '#bbb' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#666'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#bbb'}
                >
                  {pluginsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
            </div>
            {pluginsExpanded && pluginNavItems.length > 0 && (
              <div className="flex flex-col gap-0.5 animate-[fadeIn_0.15s_ease]">
                {pluginNavItems.map((p) => renderNavLink(p.to, p.icon, p.label, true))}
              </div>
            )}
          </div>
        )}

        {/* ── Divider before Admin ── */}
        {isAdmin && !collapsed && <div style={{ marginTop: 12, marginBottom: 12, marginLeft: 24, marginRight: 24, borderTop: '1px solid #e0e0e0' }} />}

        {/* Admin-only nav items */}
        {isAdmin && adminNavItems.map(({ to, icon: Icon, label }) => renderNavLink(to, Icon, label))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-1">
        <button
          onClick={onToggle}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-2 px-2 py-2 rounded-xl transition-all duration-300`}
          style={{ color: '#aaa' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'transparent'; }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span className="text-[11px] font-medium">Collapse</span>}
        </button>
      </div>

      {/* User */}
      <div className={collapsed ? 'px-2 py-3' : 'px-4 py-3'}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-xl flex-shrink-0 object-cover"
              style={{ border: '1px solid #e0e0e0' }}
              title={collapsed ? displayName : undefined}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
              style={{
                background: '#005DAA',
              }}
              title={collapsed ? displayName : undefined}
            >
              {initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: '#222' }}>
                  {displayName}
                </div>
                <div className="text-[10px] truncate" style={{ color: '#888' }}>
                  {user?.email ?? `via ${providerLabel}`}
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 rounded-md transition-all duration-200"
                style={{ color: '#bbb' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#d32f2f'; e.currentTarget.style.background = '#fef2f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'transparent'; }}
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

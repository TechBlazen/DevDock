import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight,
  Search, LogOut, ExternalLink as ExternalLinkIcon,
} from 'lucide-react';
import { useMCPStore, useAuthStore, useSearchStore, useSettingsStore } from '../../store';
import { usePluginExtensions } from '../../lib/plugins';
import { getIcon } from '../../lib/icon-registry';
import { defaultNavigation } from '../../lib/default-navigation';
import type { NavItem, NavLinkItem, NavGroupItem } from '../../types';

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  microsoft: 'Microsoft',
  google: 'Google',
  guest: 'Guest',
};

// Shared nav link style function
const navLinkStyle = (isActive: boolean) => ({
  background: isActive ? 'var(--accent-bg)' : 'transparent',
  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  border: '1px solid transparent',
  fontWeight: isActive ? 600 : 400,
});

const hoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.getAttribute('aria-current') !== 'page') {
      el.style.background = 'var(--bg-hover)';
      el.style.color = 'var(--text-primary)';
    }
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.getAttribute('aria-current') !== 'page') {
      el.style.background = 'transparent';
      el.style.color = 'var(--text-secondary)';
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
  const navConfig = useSettingsStore((s) => s.settings.navigation) ?? defaultNavigation;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of navConfig.items) {
      if (item.type === 'group') {
        initial[item.id] = item.defaultExpanded;
      }
    }
    // Always init plugin expansion
    initial['__plugins__'] = false;
    return initial;
  });

  const isAdmin = user?.role === 'admin';
  const displayName = user?.displayName ?? 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const providerLabel = PROVIDER_LABELS[provider ?? 'guest'] ?? provider;

  const openSearch = useSearchStore((s) => s.open);

  const toggleGroup = (id: string) =>
    setExpandedGroups((g) => ({ ...g, [id]: !g[id] }));

  // ── Render helpers ──

  const renderNavLink = (to: string, iconName: string, label: string, indent = false) => {
    const Icon = getIcon(iconName);
    return (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        title={collapsed ? label : undefined}
        className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 ${collapsed ? 'px-0 py-2.5' : 'px-3 py-[10px]'} rounded-md text-[13px] font-medium transition-all duration-200`}
        style={({ isActive }) => ({ ...navLinkStyle(isActive), ...(indent && !collapsed ? { marginLeft: 44 } : {}) })}
        {...hoverHandlers}
      >
        <Icon size={indent ? 14 : 16} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && label === 'MCP Servers' && runningCount > 0 && (
          <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0" style={{
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
          }}>
            {runningCount}
          </span>
        )}
      </NavLink>
    );
  };

  const renderGroup = (item: NavGroupItem) => {
    const Icon = getIcon(item.icon);
    const isExpanded = expandedGroups[item.id] ?? item.defaultExpanded;
    const visibleChildren = item.children.filter((c) => c.visible);

    if (collapsed) {
      return renderNavLink(item.route, item.icon, item.label);
    }

    return (
      <div key={item.id}>
        <div className="flex items-center">
          <button
            onClick={() => toggleGroup(item.id)}
            className="flex-1 flex items-center gap-2.5 px-3 py-[10px] rounded-md text-[13px] font-medium transition-all duration-200 text-left"
            style={{
              ...navLinkStyle(pathname.startsWith(item.route)),
              background: pathname.startsWith(item.route) ? 'var(--accent-bg)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            {...hoverHandlers}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
          {visibleChildren.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleGroup(item.id); }}
              className="p-1 mr-2 rounded transition-all duration-200"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
        {isExpanded && visibleChildren.length > 0 && (
          <div className="flex flex-col gap-0.5 animate-[fadeIn_0.15s_ease]">
            {visibleChildren.map((child) => renderNavLink(child.route, child.icon, child.label, true))}
          </div>
        )}
      </div>
    );
  };

  const renderPluginSlot = () => {
    const isExpanded = expandedGroups['__plugins__'] ?? false;
    const pluginPaths = pluginNavItems.map((p) => p.to);
    const isPluginRouteActive = pluginPaths.includes(pathname);
    const isPluginsPageActive = pathname === '/plugins';

    if (collapsed) {
      return renderNavLink('/plugins', 'Puzzle', 'Plugins');
    }

    const PuzzleIcon = getIcon('Puzzle');

    return (
      <div key="plugin-slot">
        <div className="flex items-center">
          <NavLink
            to="/plugins"
            className="flex-1 flex items-center gap-2.5 px-3 py-[10px] rounded-md text-[13px] font-medium transition-all duration-200"
            style={() => navLinkStyle(isPluginsPageActive || isPluginRouteActive)}
            {...hoverHandlers}
          >
            <PuzzleIcon size={16} className="flex-shrink-0" />
            <span className="truncate">Plugins</span>
          </NavLink>
          {pluginNavItems.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleGroup('__plugins__'); }}
              className="p-1 mr-2 rounded transition-all duration-200"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
        {isExpanded && pluginNavItems.length > 0 && (
          <div className="flex flex-col gap-0.5 animate-[fadeIn_0.15s_ease]">
            {pluginNavItems.map((p) => {
              // Plugin items provide component icons, not string names — use NavLink directly
              const PluginIcon = p.icon as React.ComponentType<{ size?: number; className?: string }>;
              return (
                <NavLink
                  key={p.to}
                  to={p.to}
                  title={collapsed ? p.label : undefined}
                  className={`flex items-center gap-2.5 px-3 py-[10px] rounded-md text-[13px] font-medium transition-all duration-200`}
                  style={({ isActive }) => ({ ...navLinkStyle(isActive), marginLeft: 44 })}
                  {...hoverHandlers}
                >
                  <PluginIcon size={14} className="flex-shrink-0" />
                  <span className="truncate">{p.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderExternalLink = (item: { id: string; label: string; icon: string; url: string }) => {
    const Icon = getIcon(item.icon);
    return (
      <a
        key={item.id}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        title={collapsed ? item.label : undefined}
        className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 ${collapsed ? 'px-0 py-2.5' : 'px-3 py-[10px]'} rounded-md text-[13px] font-medium transition-all duration-200`}
        style={{ color: 'var(--text-secondary)', border: '1px solid transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <Icon size={16} className="flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            <ExternalLinkIcon size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          </>
        )}
      </a>
    );
  };

  const renderDivider = (id: string) => {
    if (collapsed) return null;
    return (
      <div key={id} style={{ marginTop: 12, marginBottom: 12, marginLeft: 24, marginRight: 24, borderTop: '1px solid var(--border-color)' }} />
    );
  };

  // ── Render nav item by type ──
  const renderItem = (item: NavItem) => {
    if (!item.visible) return null;

    // Admin-only check
    if (item.type === 'link' && item.adminOnly && !isAdmin) return null;

    switch (item.type) {
      case 'link':
        return renderNavLink(item.route, item.icon, item.label);
      case 'group':
        return renderGroup(item);
      case 'divider':
        return renderDivider(item.id);
      case 'external':
        return renderExternalLink(item);
      case 'plugin-slot':
        return renderPluginSlot();
      default:
        return null;
    }
  };

  return (
    <aside
      className="flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? 64 : 280,
        minWidth: collapsed ? 64 : 280,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Search trigger */}
      {!collapsed ? (
        <div style={{ marginLeft: 24, marginRight: 24, marginTop: 16, marginBottom: 8 }}>
          <button
            onClick={openSearch}
            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 w-full text-left"
            style={{ border: '2px solid var(--border-input)', background: 'transparent', cursor: 'pointer' }}
          >
            <Search size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
            <span className="text-[14px] flex-1 min-w-0" style={{ color: 'var(--text-muted)' }}>Search...</span>
            <kbd style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 6px' }}>
              {navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
          <button onClick={openSearch} title="Search (⌘K)" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8 }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 ${collapsed ? 'px-1.5' : 'px-2'} py-2 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden`}>
        {navConfig.items.map((item) => renderItem(item))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-1">
        <button
          onClick={onToggle}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-2 px-2 py-2 rounded-xl transition-all duration-300`}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
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
              style={{ border: '1px solid var(--border-color)' }}
              title={collapsed ? displayName : undefined}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
              style={{
                background: 'var(--accent)',
              }}
              title={collapsed ? displayName : undefined}
            >
              {initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {displayName}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {user?.email ?? `via ${providerLabel}`}
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 rounded-md transition-all duration-200"
                style={{ color: 'var(--text-faint)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#d32f2f'; e.currentTarget.style.background = '#fef2f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
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

import { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { useSettingsStore, useAuthStore, useUserAccountsStore, useWidgetSubmissionStore } from '../../store';
import { usePluginExtensions } from '../../lib/plugins';
import { canAccessWidget } from '../../lib/rbac';
import { RepoList } from '../repos/RepoList';
import { MCPRegistry } from '../mcp/MCPRegistry';
import { MetricsBar, TraceList } from '../telemetry';
import { ActivityWidget } from './ActivityWidget';
import { QuickActionsWidget } from './QuickActionsWidget';
import { AIMetricsWidget } from './QuickActionsWidget';
import { NetworkMap } from '../network/NetworkMap';
import { FavoritesWidget } from './FavoritesWidget';
import { UserWidgetContent } from '../widgets/UserWidgetContent';
import { CardHeader, Button } from '../ui';
import type { WidgetId, DashboardWidget } from '../../types';

// ─── Core widget catalog ─────────────────────────────────────────────────────
export const CORE_WIDGET_CATALOG: DashboardWidget[] = [
  { id: 'repos_github',  title: 'GitHub Repos',    icon: '󰊤',  description: 'Browse and open GitHub repositories',       defaultSize: 'md' },
  { id: 'repos_ado',     title: 'Azure DevOps',    icon: '',  description: 'Browse Azure DevOps repositories',          defaultSize: 'md' },
  { id: 'mcp_status',    title: 'MCP Servers',     icon: '⚙', description: 'Monitor and control MCP server processes',  defaultSize: 'md' },
  { id: 'telemetry',     title: 'OTel Traces',     icon: '📊', description: 'OpenTelemetry spans and metrics',          defaultSize: 'lg' },
  { id: 'quick_actions', title: 'Quick Actions',   icon: '⚡', description: 'Commonly used developer shortcuts',        defaultSize: 'sm' },
  { id: 'activity_feed', title: 'Activity Feed',   icon: '🔔', description: 'Recent events across all your services',   defaultSize: 'md' },
  { id: 'ai_metrics',    title: 'AI Metrics',      icon: '🤖', description: 'Token usage, latency, and cost tracking',  defaultSize: 'sm' },
  { id: 'network_map',   title: 'Network Map',     icon: '🌐', description: 'Discovered devices on your local network',  defaultSize: 'md' },
  { id: 'favorite_repos', title: 'My Favorites',     icon: '⭐', description: 'Your starred repositories and dev tools',  defaultSize: 'md' },
];

// ─── Core widget content router ──────────────────────────────────────────────
const CoreWidgetContent = ({ id }: { id: WidgetId }) => {
  switch (id) {
    case 'repos_github':  return <RepoList source="github" showFilter={false} />;
    case 'repos_ado':     return <RepoList source="ado" showFilter={false} />;
    case 'mcp_status':    return <MCPRegistry />;
    case 'telemetry':     return (
      <div className="space-y-3">
        <MetricsBar />
        <TraceList compact />
      </div>
    );
    case 'quick_actions': return <QuickActionsWidget />;
    case 'activity_feed': return <ActivityWidget />;
    case 'ai_metrics':    return <AIMetricsWidget />;
    case 'network_map':   return <NetworkMap compact />;
    case 'favorite_repos': return <FavoritesWidget />;
    default:              return null;
  }
};

// ─── Widget content with plugin + user widget support ───────────────────────
const WidgetContent = ({ id, pluginComponents }: { id: WidgetId; pluginComponents: Record<string, React.ComponentType> }) => {
  const core = CoreWidgetContent({ id });
  if (core) return core;
  const PluginComponent = pluginComponents[id];
  if (PluginComponent) return <PluginComponent />;
  // User-submitted widgets
  if (id.startsWith('user_widget_')) {
    const subId = id.replace('user_widget_', '');
    const submissions = useWidgetSubmissionStore.getState().submissions;
    const submission = submissions.find((s) => s.id === subId && s.status === 'approved');
    if (submission) return <UserWidgetContent submission={submission} />;
  }
  return null;
};

const widgetMeta = (id: WidgetId, catalog: DashboardWidget[]) => catalog.find((w) => w.id === id);

// ─── Widget wrapper ───────────────────────────────────────────────────────────
interface WidgetWrapperProps {
  id: WidgetId;
  editMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onRemove: () => void;
  catalog: DashboardWidget[];
  pluginComponents: Record<string, React.ComponentType>;
  isAdmin: boolean;
  dragHandleProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

const WidgetWrapper = ({ id, editMode, isDragging, isDragOver, onRemove, catalog, pluginComponents, isAdmin, dragHandleProps }: WidgetWrapperProps) => {
  const meta = widgetMeta(id, catalog);

  return (
    <div
      {...dragHandleProps}
      className="rounded-lg flex flex-col overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-surface)',
        border: isDragOver ? '2px solid var(--accent)' : '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        opacity: isDragging ? 0.4 : 1,
        transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
        ...(editMode && !isDragOver && {
          border: '2px dashed var(--border-input)',
        })
      }}
    >
      {/* Widget header */}
      <CardHeader className="justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {editMode && (
            <GripVertical size={14} className="cursor-grab flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>
            {meta?.title ?? id}
          </span>
        </div>

        {editMode && isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-5 h-5 flex items-center justify-center rounded bg-[#ff475715] text-[#ff4757] hover:bg-[#ff475730] transition-colors flex-shrink-0"
          >
            <X size={10} />
          </button>
        )}
      </CardHeader>

      {/* Widget body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-[180px] max-h-[380px]" style={{ padding: '16px 20px 16px 24px' }}>
        <WidgetContent id={id} pluginComponents={pluginComponents} />
      </div>
    </div>
  );
};

// ─── Drop placeholder ─────────────────────────────────────────────────────────
const AddWidgetPlaceholder = ({ onOpen }: { onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="rounded-lg border-2 border-dashed bg-transparent flex flex-col items-center justify-center gap-2 min-h-[200px] transition-all duration-200 group"
    style={{
      borderColor: 'var(--border-input)',
      color: 'var(--text-muted)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--accent)';
      e.currentTarget.style.color = 'var(--accent)';
      e.currentTarget.style.background = 'var(--bg-hover)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border-input)';
      e.currentTarget.style.color = 'var(--text-muted)';
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <Plus size={22} className="group-hover:scale-110 transition-transform" />
    <span className="text-xs">Add widget</span>
  </button>
);

// ─── Catalog modal ────────────────────────────────────────────────────────────
const CatalogModal = ({
  current,
  catalog,
  onToggle,
  onClose,
}: {
  current: WidgetId[];
  catalog: DashboardWidget[];
  onToggle: (id: WidgetId) => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{
    background: 'var(--overlay)',
  }}>
    <div
      className="rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <h3 className="text-base font-bold font-mono mb-1" style={{ color: 'var(--text-primary)' }}>Widget Catalog</h3>
      <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>Add or remove widgets from your dashboard.</p>

      <div className="space-y-2">
        {catalog.map((w) => {
          const active = current.includes(w.id);
          return (
            <div
              key={w.id}
              className="flex items-center gap-3 p-3 rounded-md transition-all duration-200"
              style={{
                border: active ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: active ? 'var(--accent-bg)' : 'var(--bg-inset)',
              }}
            >
              <span className="text-xl">{w.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{w.title}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{w.description}</div>
              </div>
              <Button
                variant={active ? 'danger' : 'outline'}
                size="sm"
                onClick={() => onToggle(w.id)}
              >
                {active ? 'Remove' : 'Add'}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" size="md" onClick={onClose}>Done</Button>
      </div>
    </div>
  </div>
);

// ─── Main dashboard grid ──────────────────────────────────────────────────────
export const DashboardGrid = ({ editMode }: { editMode: boolean }) => {
  const { settings, updateDashboardWidgets } = useSettingsStore();
  const currentUser = useAuthStore((s) => s.user);
  const { accounts, setDashboardWidgets } = useUserAccountsStore();
  const { widgetCatalog: pluginWidgetCatalog, widgetComponents } = usePluginExtensions();

  // Per-user dashboard: use user's saved widgets if available, otherwise global
  const userAccount = accounts.find((a) => a.id === currentUser?.id);
  const rawWidgets = userAccount?.dashboardWidgets ?? settings.dashboardWidgets;
  const userPerms = userAccount?.permissions;
  const isAdmin = currentUser?.role === 'admin';

  // Filter widgets by RBAC permissions
  const widgets = userPerms
    ? rawWidgets.filter((w) => canAccessWidget(userPerms, w))
    : rawWidgets;

  // Save to per-user or global depending on auth
  const saveWidgets = (newWidgets: string[]) => {
    if (userAccount) {
      setDashboardWidgets(userAccount.id, newWidgets);
    } else {
      updateDashboardWidgets(newWidgets);
    }
  };

  // Merge approved user-submitted widgets into the catalog
  const approvedUserWidgets = useWidgetSubmissionStore((s) => s.submissions)
    .filter((s) => s.status === 'approved')
    .map((s) => ({ id: `user_widget_${s.id}` as WidgetId, title: s.title, icon: s.icon, description: s.description, defaultSize: s.defaultSize }));
  const allWidgetCatalog = [...CORE_WIDGET_CATALOG, ...pluginWidgetCatalog, ...approvedUserWidgets];

  const [dragSrc, setDragSrc] = useState<WidgetId | null>(null);
  const [dragOver, setDragOver] = useState<WidgetId | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const handleDrop = (targetId: WidgetId) => {
    if (!dragSrc || dragSrc === targetId) return;
    const arr = [...widgets];
    const fromIdx = arr.indexOf(dragSrc);
    const toIdx = arr.indexOf(targetId);
    arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, dragSrc);
    saveWidgets(arr);
    setDragSrc(null);
    setDragOver(null);
  };

  const toggleWidget = (id: WidgetId) => {
    if (widgets.includes(id)) {
      saveWidgets(widgets.filter((w) => w !== id));
    } else {
      saveWidgets([...widgets, id]);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-8">
        {widgets.map((id) => (
          <WidgetWrapper
            key={id}
            id={id}
            editMode={editMode}
            isDragging={dragSrc === id}
            isDragOver={dragOver === id && dragSrc !== id}
            onRemove={() => saveWidgets(widgets.filter((w) => w !== id))}
            catalog={allWidgetCatalog}
            pluginComponents={widgetComponents}
            isAdmin={isAdmin}
            dragHandleProps={{
              draggable: editMode,
              onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); setDragSrc(id); },
              onDragEnd: () => { setDragSrc(null); setDragOver(null); },
              onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(id); },
              onDragLeave: () => setDragOver(null),
              onDrop: (e) => { e.preventDefault(); handleDrop(id); },
            }}
          />
        ))}

        {editMode && isAdmin && (
          <AddWidgetPlaceholder onOpen={() => setShowCatalog(true)} />
        )}
      </div>

      {showCatalog && (
        <CatalogModal
          current={widgets}
          catalog={allWidgetCatalog}
          onToggle={toggleWidget}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </>
  );
};

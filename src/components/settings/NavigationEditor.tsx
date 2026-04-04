import { useState } from 'react';
import { nanoid } from 'nanoid';
import {
  ChevronUp, ChevronDown, Pencil, Trash2, Eye, EyeOff,
  Plus, GripVertical, ExternalLink, Minus, RotateCcw,
  Check, X, ChevronRight, Lock,
} from 'lucide-react';
import { useSettingsStore } from '../../store';
import { getIcon, iconNames } from '../../lib/icon-registry';
import { defaultNavigation } from '../../lib/default-navigation';
import { Button, Card, CardHeader } from '../ui';
import type { NavItem, NavLinkItem, NavGroupItem, NavigationConfig } from '../../types';

// ─── Icon Picker ─────────────────────────────────────────────────────────────
const IconPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const Icon = getIcon(value);

  const filtered = search
    ? iconNames.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : iconNames;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px]"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
      >
        <Icon size={14} />
        <span>{value}</span>
        <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 rounded-lg p-2"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            width: 280,
            maxHeight: 260,
          }}
        >
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="w-full rounded-md px-2.5 py-1.5 text-[12px] outline-none mb-2"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-6 gap-1 overflow-y-auto" style={{ maxHeight: 190 }}>
            {filtered.map((name) => {
              const I = getIcon(name);
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => { onChange(name); setOpen(false); setSearch(''); }}
                  className="p-2 rounded-md flex items-center justify-center transition-colors"
                  style={{
                    background: name === value ? 'var(--accent-bg)' : 'transparent',
                    color: name === value ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => { if (name !== value) { e.currentTarget.style.background = 'var(--bg-hover)'; } }}
                  onMouseLeave={(e) => { if (name !== value) { e.currentTarget.style.background = 'transparent'; } }}
                >
                  <I size={16} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Edit Form ───────────────────────────────────────────────────────────────
const NavItemEditForm = ({
  item,
  onSave,
  onCancel,
}: {
  item: NavItem;
  onSave: (updated: NavItem) => void;
  onCancel: () => void;
}) => {
  const [draft, setDraft] = useState<NavItem>({ ...item });

  const updateDraft = (partial: Partial<NavItem>) =>
    setDraft((d) => ({ ...d, ...partial } as NavItem));

  return (
    <div
      className="rounded-lg p-4 space-y-3 animate-[fadeIn_0.15s_ease]"
      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
    >
      {(draft.type === 'link' || draft.type === 'external' || draft.type === 'group' || draft.type === 'plugin-slot') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Label</label>
          <input
            value={draft.label}
            onChange={(e) => updateDraft({ label: e.target.value })}
            className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {(draft.type === 'link' || draft.type === 'group') && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Icon</label>
            <IconPicker value={draft.icon} onChange={(icon) => updateDraft({ icon })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Route</label>
            <input
              value={draft.route}
              onChange={(e) => updateDraft({ route: e.target.value })}
              placeholder="/path"
              className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            />
          </div>
        </>
      )}

      {draft.type === 'external' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Icon</label>
            <IconPicker value={draft.icon} onChange={(icon) => updateDraft({ icon })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>URL</label>
            <input
              value={draft.url}
              onChange={(e) => updateDraft({ url: e.target.value } as Partial<NavItem>)}
              placeholder="https://..."
              className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            />
          </div>
        </>
      )}

      {draft.type === 'link' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.adminOnly ?? false}
            onChange={(e) => updateDraft({ adminOnly: e.target.checked })}
            className="accent-[var(--accent)]"
          />
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Admin only</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="primary" size="sm" onClick={() => onSave(draft)}>
          <Check size={12} /> Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
};

// ─── Group Children Editor ───────────────────────────────────────────────────
const GroupChildrenEditor = ({
  children,
  onChange,
}: {
  children: NavLinkItem[];
  onChange: (children: NavLinkItem[]) => void;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...children];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(children.filter((_, i) => i !== idx));
  };

  const addChild = () => {
    const newChild: NavLinkItem = {
      id: nanoid(8),
      type: 'link',
      label: 'New Item',
      icon: 'Circle',
      route: '/new',
      visible: true,
    };
    onChange([...children, newChild]);
    setEditingId(newChild.id);
  };

  const saveChild = (idx: number, updated: NavItem) => {
    const next = [...children];
    next[idx] = updated as NavLinkItem;
    onChange(next);
    setEditingId(null);
  };

  return (
    <div className="ml-6 mt-2 space-y-1">
      {children.map((child, idx) => {
        const Icon = getIcon(child.icon);
        if (editingId === child.id) {
          return (
            <NavItemEditForm
              key={child.id}
              item={child}
              onSave={(u) => saveChild(idx, u)}
              onCancel={() => setEditingId(null)}
            />
          );
        }
        return (
          <div
            key={child.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md group"
            style={{ opacity: child.visible ? 1 : 0.4 }}
          >
            <Icon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
              {child.label}
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{child.route}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconBtn icon={ChevronUp} title="Move up" onClick={() => move(idx, -1)} disabled={idx === 0} />
              <IconBtn icon={ChevronDown} title="Move down" onClick={() => move(idx, 1)} disabled={idx === children.length - 1} />
              <IconBtn icon={Pencil} title="Edit" onClick={() => setEditingId(child.id)} />
              <IconBtn
                icon={child.visible ? Eye : EyeOff}
                title={child.visible ? 'Hide' : 'Show'}
                onClick={() => {
                  const next = [...children];
                  next[idx] = { ...child, visible: !child.visible };
                  onChange(next);
                }}
              />
              <IconBtn icon={Trash2} title="Remove" onClick={() => remove(idx)} danger />
            </div>
          </div>
        );
      })}
      <button
        onClick={addChild}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        style={{ color: 'var(--accent)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus size={12} /> Add sub-item
      </button>
    </div>
  );
};

// ─── Small icon button ───────────────────────────────────────────────────────
const IconBtn = ({
  icon: Icon,
  title,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 rounded-md transition-colors disabled:opacity-30"
    style={{ color: danger ? '#d32f2f' : 'var(--text-faint)' }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    <Icon size={18} />
  </button>
);

// ─── Type label + color ──────────────────────────────────────────────────────
const typeLabel = (type: NavItem['type']) => {
  switch (type) {
    case 'link':        return { label: 'Link',     color: '#2a6fff' };
    case 'group':       return { label: 'Group',    color: '#8b5cf6' };
    case 'divider':     return { label: 'Divider',  color: 'var(--text-faint)' };
    case 'external':    return { label: 'External', color: '#f59e0b' };
    case 'plugin-slot': return { label: 'Plugins',  color: '#10b981' };
  }
};

// ─── Add Item Menu ───────────────────────────────────────────────────────────
const AddItemMenu = ({ onAdd }: { onAdd: (item: NavItem) => void }) => {
  const [open, setOpen] = useState(false);

  const addLink = () => {
    onAdd({ id: nanoid(8), type: 'link', label: 'New Link', icon: 'Circle', route: '/new', visible: true });
    setOpen(false);
  };

  const addGroup = () => {
    onAdd({ id: nanoid(8), type: 'group', label: 'New Group', icon: 'Folder', route: '/group', visible: true, defaultExpanded: false, children: [] });
    setOpen(false);
  };

  const addDivider = () => {
    onAdd({ id: nanoid(8), type: 'divider', visible: true });
    setOpen(false);
  };

  const addExternal = () => {
    onAdd({ id: nanoid(8), type: 'external', label: 'External Link', icon: 'ExternalLink', url: 'https://', visible: true });
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Plus size={13} /> Add Item
      </Button>
      {open && (
        <div
          className="absolute left-0 bottom-full mb-1 rounded-lg py-1 z-50"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 180,
          }}
        >
          {[
            { label: 'Nav Link', icon: Plus, action: addLink },
            { label: 'Group (accordion)', icon: GripVertical, action: addGroup },
            { label: 'Divider', icon: Minus, action: addDivider },
            { label: 'External Link', icon: ExternalLink, action: addExternal },
          ].map(({ label, icon: I, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <I size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Navigation Editor (main component)
// ═══════════════════════════════════════════════════════════════════════════════
export const NavigationEditor = () => {
  const { settings, updateNavigation } = useSettingsStore();
  const nav = settings.navigation ?? defaultNavigation;
  const [items, setItems] = useState<NavItem[]>(nav.items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (next: NavItem[]) => {
    setItems(next);
    setDirty(true);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update(next);
  };

  const toggleVisibility = (idx: number) => {
    const next = [...items];
    next[idx] = { ...next[idx], visible: !next[idx].visible };
    update(next);
  };

  const removeItem = (idx: number) => {
    update(items.filter((_, i) => i !== idx));
  };

  const saveItem = (idx: number, updated: NavItem) => {
    const next = [...items];
    next[idx] = updated;
    update(next);
    setEditingId(null);
  };

  const addItem = (item: NavItem) => {
    update([...items, item]);
    setEditingId(item.id);
  };

  const handleSave = () => {
    const config: NavigationConfig = { items };
    updateNavigation(config);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setItems(defaultNavigation.items);
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader>
        <GripVertical size={14} className="text-[#8b5cf6]" />
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Sidebar Navigation</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw size={12} /> Reset to Default
        </Button>
      </CardHeader>

      <div className="p-4 space-y-1">
        {items.map((item, idx) => {
          const isEditing = editingId === item.id;
          const isLocked = (item.type === 'link' && item.locked);

          if (isEditing) {
            return (
              <NavItemEditForm
                key={item.id}
                item={item}
                onSave={(u) => saveItem(idx, u)}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          // ── Divider row ──
          if (item.type === 'divider') {
            return (
              <div key={item.id} className="flex items-center gap-2 py-1.5 group" style={{ opacity: item.visible ? 1 : 0.4 }}>
                <div className="flex-1" style={{ borderTop: '1px dashed var(--border-color)', margin: '0 8px' }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>divider</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconBtn icon={ChevronUp} title="Move up" onClick={() => move(idx, -1)} disabled={idx === 0} />
                  <IconBtn icon={ChevronDown} title="Move down" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} />
                  <IconBtn icon={item.visible ? Eye : EyeOff} title={item.visible ? 'Hide' : 'Show'} onClick={() => toggleVisibility(idx)} />
                  <IconBtn icon={Trash2} title="Remove" onClick={() => removeItem(idx)} danger />
                </div>
              </div>
            );
          }

          // ── Plugin slot row ──
          if (item.type === 'plugin-slot') {
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-md group" style={{ opacity: item.visible ? 1 : 0.4 }}>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: '#10b98120', color: '#10b981' }}
                >
                  Plugins Slot
                </span>
                <span className="text-[11px] flex-1" style={{ color: 'var(--text-muted)' }}>
                  Dynamic plugin nav items appear here
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconBtn icon={ChevronUp} title="Move up" onClick={() => move(idx, -1)} disabled={idx === 0} />
                  <IconBtn icon={ChevronDown} title="Move down" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} />
                  <IconBtn icon={item.visible ? Eye : EyeOff} title={item.visible ? 'Hide' : 'Show'} onClick={() => toggleVisibility(idx)} />
                </div>
              </div>
            );
          }

          // ── Link / Group / External row ──
          const Icon = getIcon(item.icon);
          const tl = typeLabel(item.type);

          return (
            <div key={item.id}>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-md group transition-colors"
                style={{ opacity: item.visible ? 1 : 0.4 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span className="text-[13px] font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.label}
                </span>

                {/* Type pill */}
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: `${tl.color}18`, color: tl.color }}
                >
                  {tl.label}
                </span>

                {/* Route/URL */}
                <span className="text-[10px] font-mono max-w-[120px] truncate" style={{ color: 'var(--text-faint)' }}>
                  {item.type === 'external' ? item.url : item.route}
                </span>

                {item.type === 'link' && item.adminOnly && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#d32f2f18', color: '#d32f2f' }}>admin</span>
                )}

                {isLocked && <Lock size={11} style={{ color: 'var(--text-faint)' }} />}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconBtn icon={ChevronUp} title="Move up" onClick={() => move(idx, -1)} disabled={idx === 0} />
                  <IconBtn icon={ChevronDown} title="Move down" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} />
                  <IconBtn icon={Pencil} title="Edit" onClick={() => setEditingId(item.id)} />
                  <IconBtn icon={item.visible ? Eye : EyeOff} title={item.visible ? 'Hide' : 'Show'} onClick={() => toggleVisibility(idx)} />
                  {!isLocked && <IconBtn icon={Trash2} title="Remove" onClick={() => removeItem(idx)} danger />}
                </div>
              </div>

              {/* Group children */}
              {item.type === 'group' && (
                <GroupChildrenEditor
                  children={item.children}
                  onChange={(children) => {
                    const next = [...items];
                    next[idx] = { ...item, children } as NavGroupItem;
                    update(next);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <AddItemMenu onAdd={addItem} />
        <div className="flex-1" />
        {dirty && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Unsaved changes</span>
        )}
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!dirty && !saved}>
          {saved ? <><Check size={12} /> Saved!</> : <><Check size={12} /> Save Navigation</>}
        </Button>
      </div>
    </Card>
  );
};

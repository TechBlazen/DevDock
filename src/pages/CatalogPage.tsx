import { useSettingsStore } from '../store';
import { CORE_WIDGET_CATALOG } from '../components/dashboard/DashboardGrid';
import { usePluginExtensions } from '../lib/plugins';
import { SectionTitle, Button, Card } from '../components/ui';
import type { WidgetId } from '../types';

export const CatalogPage = () => {
  const { settings, updateDashboardWidgets } = useSettingsStore();
  const active = settings.dashboardWidgets;
  const { widgetCatalog: pluginWidgets } = usePluginExtensions();
  const allWidgets = [...CORE_WIDGET_CATALOG, ...pluginWidgets];

  const toggle = (id: WidgetId) => {
    if (active.includes(id)) {
      updateDashboardWidgets(active.filter((w) => w !== id));
    } else {
      updateDashboardWidgets([...active, id]);
    }
  };

  return (
    <div className="p-6">
      <SectionTitle sub="Add, remove, and reorder widgets on your dashboard. Drag to reorder from the dashboard.">
        Widget Catalog
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allWidgets.map((w) => {
          const isActive = active.includes(w.id);
          return (
            <Card key={w.id} highlight={isActive} className="p-4 flex items-center gap-3">
              <span className="text-2xl">{w.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold font-mono ${isActive ? 'text-[#e0e8ff]' : 'text-[#4a5a7a]'}`}>
                  {w.title}
                </div>
                <div className="text-xs text-[#3a4a6a] mt-0.5">{w.description}</div>
                <div className="text-[10px] text-[#2a3a5a] font-mono mt-1 uppercase tracking-wider">
                  size: {w.defaultSize}
                </div>
              </div>
              <Button
                variant={isActive ? 'danger' : 'outline'}
                size="sm"
                onClick={() => toggle(w.id)}
              >
                {isActive ? 'Remove' : 'Add'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

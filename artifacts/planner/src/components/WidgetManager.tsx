import { useState, useEffect, useCallback } from "react";
import { Monitor, X, Plus, LayoutGrid, Target, Clock, Move, GripVertical, Eye, EyeOff, Palette, Droplets, Save } from "lucide-react";

export type WidgetType = "tasks" | "progress" | "events";
export type WidgetTheme = "midnight" | "ember";

interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  translucent: boolean;
  theme: WidgetTheme;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "progress-main", type: "progress", enabled: true, translucent: true, theme: "midnight", x: 50, y: 50, width: 240, height: 260 },
  { id: "tasks-main", type: "tasks", enabled: true, translucent: true, theme: "midnight", x: 320, y: 50, width: 280, height: 360 },
];

function getDefaultSize(type: WidgetType): { width: number; height: number } {
  switch (type) {
    case "progress": return { width: 240, height: 260 };
    case "events": return { width: 280, height: 300 };
    default: return { width: 280, height: 360 };
  }
}

export default function WidgetManager() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__);
    const saved = localStorage.getItem("tb_widget_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.widgets)) {
          setWidgets(parsed.widgets);
          return;
        }
      } catch {}
    }
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  const saveToStorage = useCallback((list: WidgetConfig[]) => {
    setWidgets(list);
    localStorage.setItem("tb_widget_config", JSON.stringify({ widgets: list }));
  }, []);

  const addWidget = useCallback(() => {
    const types: WidgetType[] = ["tasks", "progress", "events"];
    const type = types[widgets.length % 3];
    const size = getDefaultSize(type);
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type,
      enabled: true,
      translucent: true,
      theme: "midnight",
      x: 50 + (widgets.length * 30),
      y: 50 + (widgets.length * 30),
      width: size.width,
      height: size.height,
    };
    saveToStorage([...widgets, newWidget]);
  }, [widgets, saveToStorage]);

  const removeWidget = useCallback((id: string) => {
    saveToStorage(widgets.filter((w) => w.id !== id));
  }, [widgets, saveToStorage]);

  const updateWidget = useCallback((id: string, patch: Partial<WidgetConfig>) => {
    saveToStorage(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, [widgets, saveToStorage]);

  const toggleEnabled = useCallback((id: string) => {
    const w = widgets.find((x) => x.id === id);
    if (w) updateWidget(id, { enabled: !w.enabled });
  }, [widgets, updateWidget]);

  const typeIcon = (type: WidgetType) => {
    switch (type) {
      case "progress": return <Target size={14} />;
      case "events": return <Clock size={14} />;
      default: return <LayoutGrid size={14} />;
    }
  };

  const typeLabel = (type: WidgetType) => {
    switch (type) {
      case "progress": return "Progress";
      case "events": return "Events";
      default: return "Tasks";
    }
  };

  if (!isTauri) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card">
        <h3 className="text-sm font-medium mb-2">Desktop Widgets</h3>
        <p className="text-xs text-muted-foreground">
          Floating widgets are only available in the desktop app.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Monitor size={14} className="text-primary" />
          Desktop Widgets
        </h3>
        <button
          onClick={addWidget}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          Add Widget
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Configure floating widgets. Install the <b>Task Battles Widgets</b> companion app to see them on your desktop. Changes sync automatically.
      </p>

      {widgets.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
          No widgets configured. Click "Add Widget" to create one.
        </p>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {widgets.map((w) => (
          <div
            key={w.id}
            className={`p-3 rounded-lg border transition-colors ${
              w.enabled ? "border-border bg-muted/50" : "border-border/50 bg-muted/20 opacity-60"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <GripVertical size={14} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {typeIcon(w.type)}
                <span>{typeLabel(w.type)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">#{w.id.slice(-4)}</span>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => toggleEnabled(w.id)}
                  className={`p-1.5 rounded-md transition-colors ${
                    w.enabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                  }`}
                  title={w.enabled ? "Hide widget" : "Show widget"}
                >
                  {w.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  onClick={() => removeWidget(w.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Remove widget"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {w.enabled && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Type</label>
                  <select
                    value={w.type}
                    onChange={(e) => {
                      const type = e.target.value as WidgetType;
                      const size = getDefaultSize(type);
                      updateWidget(w.id, { type, width: size.width, height: size.height });
                    }}
                    className="px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="tasks">Tasks</option>
                    <option value="progress">Progress</option>
                    <option value="events">Events</option>
                  </select>
                </div>

                {/* Theme */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Theme</label>
                  <select
                    value={w.theme}
                    onChange={(e) => updateWidget(w.id, { theme: e.target.value as WidgetTheme })}
                    className="px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="midnight">Midnight</option>
                    <option value="ember">Ember</option>
                  </select>
                </div>

                {/* Translucent toggle */}
                <div className="flex items-center gap-2 col-span-2">
                  <Droplets size={12} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Translucent</span>
                  <button
                    onClick={() => updateWidget(w.id, { translucent: !w.translucent })}
                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                      w.translucent ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 mt-0.5 ${
                        w.translucent ? "translate-x-3.5 ml-0" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Position & Size */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                    <Move size={10} /> Position
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={w.x}
                      onChange={(e) => updateWidget(w.id, { x: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="X"
                    />
                    <input
                      type="number"
                      value={w.y}
                      onChange={(e) => updateWidget(w.id, { y: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Y"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Size</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={w.width}
                      onChange={(e) => updateWidget(w.id, { width: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="W"
                    />
                    <input
                      type="number"
                      value={w.height}
                      onChange={(e) => updateWidget(w.id, { height: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="H"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          {widgets.filter((w) => w.enabled).length} of {widgets.length} active
        </span>
        <button
          onClick={() => {
            saveToStorage(DEFAULT_WIDGETS);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          <Save size={12} />
          Reset Defaults
        </button>
      </div>
    </div>
  );
}

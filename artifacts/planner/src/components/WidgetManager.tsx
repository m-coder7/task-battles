import { useState, useEffect, useCallback } from "react";
import { Monitor, X, Plus, LayoutGrid, Target, Clock, GripVertical, Eye, EyeOff, Droplets, Save, Calendar, Sun, BookOpen, Swords } from "lucide-react";

export type WidgetType = "tasks" | "progress" | "events" | "rivalry" | "calendar" | "dayview" | "diary";
export type WidgetTheme = "midnight" | "ember" | "light";

interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  translucent: boolean;
  theme: WidgetTheme;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [];

interface Props {
  onWidgetChange: () => void;
}

export default function WidgetManager({ onWidgetChange }: Props) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isTauri, setIsTauri] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<WidgetType>("tasks");

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && !!((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__));
    const saved = localStorage.getItem("tb_widget_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.widgets)) {
          const clean = parsed.widgets.map((w: any) => ({
            id: w.id,
            type: w.type,
            enabled: w.enabled,
            translucent: w.translucent,
            theme: w.theme,
          }));
          setWidgets(clean);
          return;
        }
      } catch {}
    }
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  const saveToStorage = useCallback((list: WidgetConfig[]) => {
    setWidgets(list);
    localStorage.setItem("tb_widget_config", JSON.stringify({ widgets: list }));
    onWidgetChange();
  }, [onWidgetChange]);

  const confirmAdd = useCallback(() => {
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: addType,
      enabled: true,
      translucent: true,
      theme: "midnight",
    };
    saveToStorage([...widgets, newWidget]);
    setShowAddDialog(false);
  }, [widgets, saveToStorage, addType]);

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
      case "rivalry": return <Swords size={14} />;
      case "calendar": return <Calendar size={14} />;
      case "dayview": return <Sun size={14} />;
      case "diary": return <BookOpen size={14} />;
      default: return <LayoutGrid size={14} />;
    }
  };

  const typeLabel = (type: WidgetType) => {
    switch (type) {
      case "progress": return "Progress";
      case "events": return "Events";
      case "rivalry": return "Rivalry";
      case "calendar": return "Calendar";
      case "dayview": return "Day View";
      case "diary": return "Diary";
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
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          Add Widget
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Configure floating widgets. Install the <b>Task Battles Widgets</b> companion app to see them on your desktop. Drag and resize widgets directly on your desktop.
      </p>

      {/* Add Widget Dialog */}
      {showAddDialog && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <h4 className="text-xs font-semibold">New Widget</h4>
            <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Type</label>
            <div className="flex flex-wrap gap-2">
              {(["tasks", "progress", "events", "rivalry", "calendar", "dayview", "diary"] as WidgetType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    addType === t ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {typeIcon(t)}
                  {typeLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={confirmAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={() => setShowAddDialog(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-2">
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
                    <option value="light">Light</option>
                  </select>
                </div>

                {/* Translucent toggle */}
                <div className="flex items-center gap-2">
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
          onClick={() => saveToStorage(DEFAULT_WIDGETS)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          <Save size={12} />
          Reset All
        </button>
      </div>
    </div>
  );
}

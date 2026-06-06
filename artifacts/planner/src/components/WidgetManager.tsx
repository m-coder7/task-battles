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

const THEME_PREVIEW: Record<WidgetTheme, { label: string; bg: string; text: string }> = {
  midnight: { label: "Midnight", bg: "bg-gray-900", text: "text-white" },
  ember:    { label: "Ember",    bg: "bg-orange-950", text: "text-orange-100" },
  light:    { label: "Light",     bg: "bg-white border border-border", text: "text-gray-900" },
};

interface Props {
  onWidgetChange: () => void;
}

export default function WidgetManager({ onWidgetChange }: Props) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isTauri, setIsTauri] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<WidgetType>("tasks");
  const [addTheme, setAddTheme] = useState<WidgetTheme>("midnight");
  const [addTranslucent, setAddTranslucent] = useState(true);

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && !!((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__));
    const saved = localStorage.getItem("tb_widget_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.widgets)) {
          const clean = parsed.widgets.map((w: any) => ({
            id: w.id, type: w.type, enabled: w.enabled,
            translucent: w.translucent, theme: w.theme,
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
      translucent: addTranslucent,
      theme: addTheme,
    };
    const updated = [...widgets, newWidget];
    localStorage.setItem("tb_widget_config", JSON.stringify({ widgets: updated }));
    setWidgets(updated);
    setShowAddDialog(false);
    setAddTheme("midnight");
    setAddTranslucent(true);
    setAddType("tasks");
    onWidgetChange();
  }, [widgets, addType, addTheme, addTranslucent, onWidgetChange]);

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

      {showAddDialog && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
          <h4 className="text-sm font-semibold">New Widget</h4>

          <div className="flex flex-col gap-1.5">
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

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Theme</label>
            <div className="flex gap-2">
              {(["midnight", "ember", "light"] as WidgetTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddTheme(t)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    addTheme === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${THEME_PREVIEW[t].bg}`} />
                  {THEME_PREVIEW[t].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Transparent background</span>
            </div>
            <button
              onClick={() => setAddTranslucent(!addTranslucent)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                addTranslucent ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 mt-0.5 ${
                  addTranslucent ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={confirmAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={12} />
              Add Widget
            </button>
            <button
              onClick={() => { setShowAddDialog(false); setAddTheme("midnight"); setAddTranslucent(true); setAddType("tasks"); }}
              className="px-4 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {widgets.length === 0 && !showAddDialog && (
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
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
                <span className={`w-2 h-2 rounded-full ${THEME_PREVIEW[w.theme].bg}`} />
                {THEME_PREVIEW[w.theme].label}
                {w.translucent && <span className="opacity-60">· Transparent</span>}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <select
                  value={w.theme}
                  onChange={(e) => updateWidget(w.id, { theme: e.target.value as WidgetTheme })}
                  className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="midnight">Midnight</option>
                  <option value="ember">Ember</option>
                  <option value="light">Light</option>
                </select>
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
import { useState, useEffect, useCallback } from "react";
import { LayoutGrid, Monitor, Clock, X, Save, RotateCcw, Power } from "lucide-react";

interface WidgetDef {
  label: string;
  title: string;
  url: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  description: string;
}

const WIDGETS: WidgetDef[] = [
  {
    label: "widget-tasks",
    title: "Today's Tasks",
    url: "widgets/tasks-widget.html",
    width: 260,
    height: 320,
    icon: <LayoutGrid size={16} />,
    description: "Checklist with toggles",
  },
  {
    label: "widget-progress",
    title: "Daily Progress",
    url: "widgets/progress-widget.html",
    width: 220,
    height: 240,
    icon: <Monitor size={16} />,
    description: "Circular completion ring",
  },
  {
    label: "widget-events",
    title: "Upcoming Events",
    url: "widgets/events-widget.html",
    width: 260,
    height: 280,
    icon: <Clock size={16} />,
    description: "Next events and dates",
  },
];

interface ActiveWidget {
  label: string;
  title: string;
  url: string;
}

export default function WidgetManager() {
  const [active, setActive] = useState<ActiveWidget[]>([]);
  const [isTauri, setIsTauri] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [startHidden, setStartHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__);
  }, []);

  const refreshList = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const list: ActiveWidget[] = await invoke("list_widget_windows");
      setActive(list);
    } catch {
      // ignore
    }
  }, [isTauri]);

  const refreshAutostart = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { isEnabled } = await import("@tauri-apps/plugin-autostart");
      const enabled = await isEnabled();
      setAutostartEnabled(enabled);
    } catch {
      // ignore
    }
  }, [isTauri]);

  useEffect(() => {
    refreshList();
    refreshAutostart();
    const id = setInterval(refreshList, 2000);
    return () => clearInterval(id);
  }, [refreshList, refreshAutostart]);

  const spawn = useCallback(async (widget: WidgetDef) => {
    if (!isTauri) return;
    setLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("create_widget_window", {
        label: widget.label,
        url: widget.url,
        title: widget.title,
        width: widget.width,
        height: widget.height,
        x: null,
        y: null,
      });
      await refreshList();
    } catch (e) {
      console.error("Failed to spawn widget:", e);
    } finally {
      setLoading(false);
    }
  }, [isTauri, refreshList]);

  const closeWidget = useCallback(async (label: string) => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("close_widget_window", { label });
      await refreshList();
    } catch (e) {
      console.error("Failed to close widget:", e);
    }
  }, [isTauri, refreshList]);

  const closeAll = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("close_all_widgets");
      await refreshList();
    } catch (e) {
      console.error("Failed to close widgets:", e);
    }
  }, [isTauri, refreshList]);

  const saveLayout = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_widget_positions");
    } catch (e) {
      console.error("Failed to save layout:", e);
    }
  }, [isTauri]);

  const restoreLayout = useCallback(async () => {
    if (!isTauri) return;
    setLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const widgets: Array<{
        label: string; title: string; url: string;
        width: number; height: number; x: number; y: number;
      }> = await invoke("load_widget_positions");
      for (const w of widgets) {
        await invoke("create_widget_window", {
          label: w.label,
          url: w.url,
          title: w.title,
          width: w.width,
          height: w.height,
          x: w.x || null,
          y: w.y || null,
        });
      }
      await refreshList();
    } catch (e) {
      console.error("Failed to restore layout:", e);
    } finally {
      setLoading(false);
    }
  }, [isTauri, refreshList]);

  const toggleAutostart = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { enable, disable, isEnabled } = await import("@tauri-apps/plugin-autostart");
      const currentlyEnabled = await isEnabled();
      if (currentlyEnabled) {
        await disable();
      } else {
        await enable();
      }
      setAutostartEnabled(await isEnabled());
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
    }
  }, [isTauri]);

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
        {active.length > 0 && (
          <button
            onClick={closeAll}
            className="text-xs text-red-500 hover:underline font-medium"
          >
            Close All
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Spawn translucent floating windows on your desktop. They stay behind other apps, read live data, and update automatically.
      </p>

      {/* Autostart */}
      <div className="flex items-center justify-between py-2 border-b border-border">
        <div>
          <span className="text-sm font-medium">Start on Login</span>
          <p className="text-[10px] text-muted-foreground">Run Task Battles when Windows starts</p>
        </div>
        <button
          onClick={toggleAutostart}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none
            ${autostartEnabled ? 'bg-primary' : 'bg-muted'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out mt-0.5
              ${autostartEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      {/* Spawn buttons */}
      <div className="grid grid-cols-3 gap-2">
        {WIDGETS.map((w) => {
          const isActive = active.some((a) => a.label === w.label);
          return (
            <button
              key={w.label}
              onClick={() => spawn(w)}
              disabled={isActive || loading}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors
                ${isActive
                  ? "border-primary/30 bg-primary/5 text-primary opacity-70 cursor-default"
                  : "border-border hover:border-primary/40 hover:bg-muted"
                }`}
            >
              <div className="flex items-center gap-2">
                {w.icon}
                <span className="text-xs font-medium">{w.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{w.description}</span>
              {isActive && <span className="text-[10px] text-primary font-medium mt-0.5">Active</span>}
            </button>
          );
        })}
      </div>

      {/* Layout controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={saveLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          <Save size={12} />
          Save Layout
        </button>
        <button
          onClick={restoreLayout}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Restore Layout
        </button>
      </div>

      {/* Active widgets */}
      {active.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Active Widgets</span>
          <div className="flex flex-wrap gap-2">
            {active.map((w) => (
              <div
                key={w.label}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted text-xs"
              >
                <span className="truncate max-w-[120px]">{w.title}</span>
                <button
                  onClick={() => closeWidget(w.label)}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  title="Close widget"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

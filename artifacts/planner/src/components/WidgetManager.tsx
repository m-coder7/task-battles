import { useState, useEffect, useCallback } from "react";
import { LayoutGrid, X, Plus, Monitor } from "lucide-react";

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
    url: "/widgets/tasks-widget.html",
    width: 260,
    height: 320,
    icon: <LayoutGrid size={16} />,
    description: "Checklist of today's goals",
  },
  {
    label: "widget-progress",
    title: "Daily Progress",
    url: "/widgets/progress-widget.html",
    width: 220,
    height: 240,
    icon: <Monitor size={16} />,
    description: "Circular completion ring",
  },
  {
    label: "widget-events",
    title: "Upcoming Events",
    url: "/widgets/events-widget.html",
    width: 260,
    height: 280,
    icon: <LayoutGrid size={16} />,
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

  useEffect(() => {
    refreshList();
    const id = setInterval(refreshList, 2000);
    return () => clearInterval(id);
  }, [refreshList]);

  const spawn = useCallback(async (widget: WidgetDef) => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("create_widget_window", {
        label: widget.label,
        url: widget.url,
        title: widget.title,
        width: widget.width,
        height: widget.height,
      });
      await refreshList();
    } catch (e) {
      console.error("Failed to spawn widget:", e);
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

  if (!isTauri) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card">
        <h3 className="text-sm font-medium mb-2">Desktop Widgets</h3>
        <p className="text-xs text-muted-foreground">
          Floating widgets are only available in the desktop app. They will not work in a browser.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Desktop Widgets</h3>
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
        Spawn small floating windows that stay on top of your desktop. They read your live data and update automatically.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {WIDGETS.map((w) => {
          const isActive = active.some((a) => a.label === w.label);
          return (
            <button
              key={w.label}
              onClick={() => spawn(w)}
              disabled={isActive}
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

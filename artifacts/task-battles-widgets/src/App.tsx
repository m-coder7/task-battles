import { useState, useCallback, useEffect } from "react";
import TaskWidget from "@/components/TaskWidget";
import ProgressWidget from "@/components/ProgressWidget";
import EventsWidget from "@/components/EventsWidget";
import { LayoutGrid, Target, Clock, Settings, X, Move, Plus } from "lucide-react";

type WidgetType = "tasks" | "progress" | "events";

export default function App() {
  const [widget, setWidget] = useState<WidgetType>("tasks");
  const [showSettings, setShowSettings] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [urlWidget, setUrlWidget] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get("widget");
    if (w) setUrlWidget(w);

    // Detect Tauri
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      setIsTauri(true);
    }
  }, []);

  const spawnWidget = useCallback(async (type: WidgetType) => {
    if (isTauri) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("spawn_widget_window", { widgetType: type });
    }
  }, [isTauri]);

  const quitApp = useCallback(async () => {
    if (isTauri) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("quit_app");
    }
  }, [isTauri]);

  const startDrag = useCallback(async () => {
    if (isTauri) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("enable_drag");
    }
  }, [isTauri]);

  // If URL has ?widget=, render that widget directly in a floating window
  if (urlWidget) {
    return (
      <div 
        className="w-full h-full bg-transparent text-white relative overflow-hidden select-none"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) startDrag();
        }}
      >
        {/* Drag handle bar */}
        <div 
          className="h-6 w-full bg-black/40 backdrop-blur-sm flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
          onMouseDown={startDrag}
        >
          <div className="flex items-center gap-1">
            <Move size={10} className="text-white/40" />
            <span className="text-[10px] text-white/60 font-medium">
              {urlWidget === "progress" && "Progress"}
              {urlWidget === "tasks" && "Tasks"}
              {urlWidget === "events" && "Events"}
            </span>
          </div>
          <button 
            onClick={quitApp}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <X size={10} />
          </button>
        </div>

        {/* Widget content */}
        <div className="bg-[#0a0a0a]/90 backdrop-blur-md rounded-b-lg overflow-hidden flex-1">
          {urlWidget === "progress" && <ProgressWidget />}
          {urlWidget === "tasks" && <TaskWidget />}
          {urlWidget === "events" && <EventsWidget />}
        </div>
      </div>
    );
  }

  // Otherwise render the main dashboard
  return (
    <div className="flex flex-col w-full h-full bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-white/5">
        <h1 className="text-sm font-semibold">Task Battles Widgets</h1>
        <button
          onClick={quitApp}
          className="p-1.5 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Widget content preview */}
      <div className="flex-1 overflow-hidden">
        {widget === "tasks" && <TaskWidget />}
        {widget === "progress" && <ProgressWidget />}
        {widget === "events" && <EventsWidget />}
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-[#111111] border-t border-white/5">
        <div className="flex items-center gap-1">
          {([
            { id: "tasks" as WidgetType, icon: <LayoutGrid size={14} />, label: "Tasks" },
            { id: "progress" as WidgetType, icon: <Target size={14} />, label: "Progress" },
            { id: "events" as WidgetType, icon: <Clock size={14} />, label: "Events" },
          ]).map((w) => (
            <button
              key={w.id}
              onClick={() => setWidget(w.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors
                ${widget === w.id ? "bg-[#FF9500]/15 text-[#FF9500]" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
            >
              {w.icon}
              {w.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => spawnWidget(widget)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#FF9500]/15 text-[#FF9500] hover:bg-[#FF9500]/25 transition-colors"
            title="Open in floating window"
          >
            <Plus size={12} />
            Float
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-12 left-2 right-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl p-3 z-50">
          <h3 className="text-xs font-semibold text-neutral-300 mb-2">Widget Settings</h3>
          <p className="text-[10px] text-neutral-500 mb-2">
            Make sure Task Battles is running to sync data.
          </p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => spawnWidget("progress")}
              className="text-left px-2 py-1.5 rounded text-xs text-neutral-300 hover:bg-white/5 transition-colors"
            >
              Open Progress Widget
            </button>
            <button
              onClick={() => spawnWidget("tasks")}
              className="text-left px-2 py-1.5 rounded text-xs text-neutral-300 hover:bg-white/5 transition-colors"
            >
              Open Tasks Widget
            </button>
            <button
              onClick={() => spawnWidget("events")}
              className="text-left px-2 py-1.5 rounded text-xs text-neutral-300 hover:bg-white/5 transition-colors"
            >
              Open Events Widget
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

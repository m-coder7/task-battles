import { useState, useCallback } from "react";
import TaskWidget from "@/components/TaskWidget";
import ProgressWidget from "@/components/ProgressWidget";
import EventsWidget from "@/components/EventsWidget";
import { LayoutGrid, Target, Clock, Settings, X } from "lucide-react";

type WidgetType = "tasks" | "progress" | "events";

export default function App() {
  const [widget, setWidget] = useState<WidgetType>("tasks");
  const [showSettings, setShowSettings] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  const quitApp = useCallback(async () => {
    if (isTauri) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("quit_app");
    }
  }, [isTauri]);

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Widget content */}
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
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={quitApp}
            className="p-1.5 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-12 left-2 right-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl p-3 z-50">
          <h3 className="text-xs font-semibold text-neutral-300 mb-2">Widget Settings</h3>
          <p className="text-[10px] text-neutral-500">
            Make sure Task Battles is running to sync data.
          </p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import TaskWidget from "@/components/TaskWidget";
import ProgressWidget from "@/components/ProgressWidget";
import EventsWidget from "@/components/EventsWidget";
import { X } from "lucide-react";

export default function App() {
  const [urlWidget, setUrlWidget] = useState<string | null>(null);
  const [theme, setTheme] = useState("midnight");
  const [translucent, setTranslucent] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get("widget");
    const t = params.get("theme");
    const tr = params.get("translucent");
    if (w) setUrlWidget(w);
    if (t) setTheme(t);
    if (tr !== null) setTranslucent(tr === "true");
  }, []);

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.close();
    } catch {
      // ignore
    }
  };

  // Controller window with no widget param
  if (!urlWidget) {
    return (
      <div className="w-full h-full bg-[#111] flex items-center justify-center">
        <span className="text-xs text-neutral-500">Task Battles Widgets</span>
      </div>
    );
  }

  const bgClass = translucent ? "bg-[#0a0a0a]/80 backdrop-blur-md" : "bg-[#0a0a0a]";

  return (
    <div className="w-full h-full text-white relative overflow-hidden select-none flex flex-col">
      {/* Draggable title bar */}
      <div
        data-tauri-drag-region
        className="shrink-0 h-7 w-full flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
        style={{ background: translucent ? "rgba(0,0,0,0.3)" : "#111", WebkitAppRegion: "drag" }}
      >
        <span className="text-[10px] text-white/60 font-medium">
          {urlWidget === "progress" && "Progress"}
          {urlWidget === "tasks" && "Tasks"}
          {urlWidget === "events" && "Events"}
        </span>
        <button
          onClick={handleClose}
          className="p-0.5 rounded text-white/40 hover:text-white/90 hover:bg-white/10 transition-colors"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className={`${bgClass} overflow-hidden flex-1`}>
        {urlWidget === "progress" && <ProgressWidget />}
        {urlWidget === "tasks" && <TaskWidget />}
        {urlWidget === "events" && <EventsWidget />}
      </div>
    </div>
  );
}

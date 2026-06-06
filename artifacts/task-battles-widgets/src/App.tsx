import { useEffect, useState } from "react";
import TaskWidget from "@/components/TaskWidget";
import ProgressWidget from "@/components/ProgressWidget";
import EventsWidget from "@/components/EventsWidget";

export default function App() {
  const [urlWidget, setUrlWidget] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get("widget");
    if (w) setUrlWidget(w);
  }, []);

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { invoke } = await import("@tauri-apps/api/core");
      const win = getCurrentWindow();
      await invoke("close_widget", { label: win.label });
    } catch {
      // ignore
    }
  };

  // Controller window with no widget param
  if (!urlWidget) {
    return <div className="w-full h-full bg-transparent" />;
  }

  return (
    <div className="w-full h-full text-white relative overflow-hidden select-none flex flex-col">
      {/* Invisible drag handle at very top */}
      <div
        data-tauri-drag-region
        className="shrink-0 h-5 w-full cursor-grab active:cursor-grabbing"
        style={{ WebkitAppRegion: "drag" }}
      />

      {/* Content - completely transparent */}
      <div className="overflow-hidden flex-1 px-3 pb-3">
        {urlWidget === "progress" && <ProgressWidget />}
        {urlWidget === "tasks" && <TaskWidget />}
        {urlWidget === "events" && <EventsWidget />}
      </div>
    </div>
  );
}

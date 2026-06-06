import { useEffect, useState } from "react";
import TaskWidget from "@/components/TaskWidget";
import ProgressWidget from "@/components/ProgressWidget";
import EventsWidget from "@/components/EventsWidget";

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
      const { invoke } = await import("@tauri-apps/api/core");
      const win = getCurrentWindow();
      await invoke("close_widget", { label: win.label });
    } catch {
      // ignore
    }
  };

  const handleOpenMain = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_main_app");
    } catch {
      // ignore
    }
  };

  if (!urlWidget) {
    return <div className="w-full h-full bg-transparent" />;
  }

  const themeClass = `theme-${theme}`;
  const containerBg = translucent ? "bg-transparent" : "bg-black/60 backdrop-blur-md rounded-lg";

  return (
    <div className={`w-full h-full text-white relative overflow-hidden select-none flex flex-col ${themeClass} ${containerBg}`}>
      <div
        data-tauri-drag-region
        className="shrink-0 h-5 w-full cursor-grab active:cursor-grabbing"
        style={{ WebkitAppRegion: "drag" }}
      />
      <div className="overflow-hidden flex-1 px-3 pb-3" onDoubleClick={handleOpenMain}>
        {urlWidget === "progress" && <ProgressWidget theme={theme} />}
        {urlWidget === "tasks" && <TaskWidget theme={theme} />}
        {urlWidget === "events" && <EventsWidget theme={theme} />}
      </div>
    </div>
  );
}

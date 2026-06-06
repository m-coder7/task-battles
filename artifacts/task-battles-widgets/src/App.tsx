import { useEffect, useState } from "react";
import TaskWidget from "@/components/TaskWidget";
import ProgressWidget from "@/components/ProgressWidget";
import EventsWidget from "@/components/EventsWidget";
import RivalryScoreWidget from "@/components/RivalryScoreWidget";
import CalendarWidget from "@/components/CalendarWidget";
import DayViewWidget from "@/components/DayViewWidget";
import DiaryWidget from "@/components/DiaryWidget";

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
  const containerBg = translucent
    ? "bg-transparent"
    : theme === "light"
      ? "bg-white/80 backdrop-blur-md rounded-lg"
      : "bg-black/60 backdrop-blur-md rounded-lg";

  return (
    <div className={`w-full h-full relative overflow-hidden select-none flex flex-col ${themeClass} ${containerBg}`}>
      <div
        data-tauri-drag-region
        className="shrink-0 h-5 w-full cursor-grab active:cursor-grabbing"
        style={{ WebkitAppRegion: "drag" }}
      />
      <div className="overflow-hidden flex-1 px-3 pb-3" onDoubleClick={handleOpenMain}>
        {urlWidget === "progress" && <ProgressWidget theme={theme} />}
        {urlWidget === "tasks" && <TaskWidget theme={theme} />}
        {urlWidget === "events" && <EventsWidget theme={theme} />}
        {urlWidget === "rivalry" && <RivalryScoreWidget theme={theme} />}
        {urlWidget === "calendar" && <CalendarWidget theme={theme} />}
        {urlWidget === "dayview" && <DayViewWidget theme={theme} />}
        {urlWidget === "diary" && <DiaryWidget theme={theme} />}
      </div>
    </div>
  );
}

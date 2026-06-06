import { useEffect, useState } from "react";
import { Target } from "lucide-react";

interface Goal {
  id: string;
  completed: boolean;
  completed_dates: string[];
  date: string;
  repeat: string | null;
  repeat_days: number[] | null;
}

function isActiveToday(g: Goal): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();
  if (!g.repeat || g.repeat === "none") return g.date === today;
  if (g.repeat === "daily") return true;
  if (g.repeat === "weekdays") return dow >= 1 && dow <= 5;
  if (g.repeat === "weekly") return new Date(g.date).getDay() === dow;
  if (g.repeat === "custom" && g.repeat_days) return g.repeat_days.includes(dow);
  return false;
}

function isDoneToday(g: Goal): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (g.completed) return true;
  if (Array.isArray(g.completed_dates) && g.completed_dates.includes(today)) return true;
  return false;
}

export default function ProgressWidget() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const data: any = await invoke("read_shared_data");
      setGoals((data?.goals || []) as Goal[]);
    } catch {
      setGoals([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const todayGoals = goals.filter(isActiveToday);
  const done = todayGoals.filter(isDoneToday).length;
  const total = todayGoals.length || 1;
  const pct = Math.round((done / total) * 100);
  const offset = 263.9 - (263.9 * pct) / 100;

  if (loading) return <div className="text-sm text-shadow">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex items-center gap-2 mb-3">
        <Target size={13} className="text-[#FF9500] drop-shadow" />
        <span className="text-[11px] font-bold text-[#FF9500] uppercase tracking-wide text-shadow">Daily Progress</span>
      </div>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke="#FF9500" strokeWidth="8"
            strokeLinecap="round" strokeDasharray="263.9" strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-[#FF9500] text-shadow">{pct}%</span>
        </div>
      </div>
      <p className="text-xs text-white/60 text-shadow mt-2">{done} / {total} goals done</p>
    </div>
  );
}

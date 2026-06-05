import { useEffect, useState } from "react";
import { CheckCircle2, Circle, LayoutGrid } from "lucide-react";

interface Goal {
  id: string;
  title: string;
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

export default function TaskWidget() {
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
  const doneCount = todayGoals.filter(isDoneToday).length;

  if (loading) return <div className="p-4 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid size={14} className="text-[#FF9500]" />
        <span className="text-xs font-bold text-[#FF9500] uppercase tracking-wide">Today's Tasks</span>
      </div>
      {todayGoals.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-8">No goals for today</p>
      ) : (
        <div className="space-y-1">
          {todayGoals.map((g) => {
            const done = isDoneToday(g);
            return (
              <div key={g.id} className="flex items-center gap-2 py-2">
                {done ? (
                  <CheckCircle2 size={16} className="text-[#FF9500] shrink-0" />
                ) : (
                  <Circle size={16} className="text-neutral-600 shrink-0" />
                )}
                <span className={`text-sm ${done ? "line-through text-neutral-500" : "text-white"}`}>
                  {g.title}
                </span>
              </div>
            );
          })}
          <p className="text-[10px] text-neutral-600 text-center mt-2">
            {doneCount}/{todayGoals.length} completed
          </p>
        </div>
      )}
    </div>
  );
}

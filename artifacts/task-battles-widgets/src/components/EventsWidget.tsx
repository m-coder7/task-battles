import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  start_time: string;
  all_day: boolean;
}

export default function EventsWidget() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const data: any = await invoke("read_shared_data");
      setEvents((data?.events || []) as Event[]);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const upcoming = events
    .filter((e) => {
      if (e.date > today) return true;
      if (e.date === today && !e.all_day) {
        const [h, m] = (e.start_time || "00:00").split(":").map(Number);
        return h * 60 + m >= nowMin;
      }
      return false;
    })
    .slice(0, 6);

  if (loading) return <div className="text-sm text-shadow">Loading...</div>;

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={13} className="text-[#FF9500] drop-shadow" />
        <span className="text-[11px] font-bold text-[#FF9500] uppercase tracking-wide text-shadow">Upcoming</span>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-shadow text-center py-6">No upcoming events</p>
      ) : (
        <div className="space-y-0.5">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center gap-2 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500] shrink-0 drop-shadow" />
              <span className="text-sm text-white truncate flex-1 text-shadow">{e.title}</span>
              <span className="text-[10px] text-white/50 shrink-0 text-shadow">
                {e.date === today ? e.start_time : new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

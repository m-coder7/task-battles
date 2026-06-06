import { useEffect, useState } from "react";
import { BookOpen, Smile, Meh, Frown } from "lucide-react";

interface DiaryEntry {
  id: string; date: string; content: string;
  mood: string; tags: string[]; createdAt: string; updatedAt: string;
}

export default function DiaryWidget({ theme }: { theme: string }) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const data: any = await invoke("read_shared_data");
      const diary = data?.diary || {};
      const list = Object.values(diary).sort((a: any, b: any) => (b?.date || "").localeCompare(a?.date || "")).slice(0, 5) as DiaryEntry[];
      setEntries(list);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="widget-muted text-sm">Loading...</div>;

  const moodIcon = (mood: string) => {
    const map: Record<string, string> = { "😄": "😄", "🙂": "🙂", "😐": "😐", "😔": "😔", "😤": "😤", "😴": "😴", "🔥": "🔥", "🤯": "🤯" };
    return map[mood] || "😐";
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={13} className="widget-accent" />
        <span className="text-[11px] font-bold widget-accent uppercase tracking-wide">Diary</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm widget-muted text-center py-6">No diary entries yet</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const isToday = entry.date === today;
            const shortDate = entry.date ? new Date(entry.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
            return (
              <div key={entry.id} className="py-1 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{moodIcon(entry.mood)}</span>
                  <span className={`text-[10px] font-medium ${isToday ? "widget-accent" : "widget-muted"}`}>
                    {isToday ? "Today" : shortDate}
                  </span>
                </div>
                <p className="text-xs widget-text ml-7 line-clamp-2 leading-relaxed">{entry.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

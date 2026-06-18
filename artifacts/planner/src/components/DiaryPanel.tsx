import { useState, useCallback } from "react";
import { format, parseISO, subDays, addDays, isToday, differenceInDays } from "date-fns";
import { ChevronLeft, ChevronRight, BookOpen, Trash2, Tag, X, Flame, Save } from "lucide-react";
import { useDiary, MOODS, type DiaryEntry } from "@/hooks/useDiary";
import { cn } from "@/lib/utils";

export default function DiaryPanel() {
  const { allEntries, getEntry, saveEntry, deleteEntry } = useDiary();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"write" | "history">("write");

  const entry = getEntry(selectedDate);

  function goBack()    { setSelectedDate((d) => subDays(d, 1)); }
  function goForward() { const next = addDays(selectedDate, 1); if (next <= new Date()) setSelectedDate(next); }

  const canGoForward = !isToday(selectedDate);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
        <BookOpen size={16} className="text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground flex-1">Diary</h1>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {(["write", "history"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize",
                view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "write" ? "Write" : "History"}
            </button>
          ))}
        </div>
      </header>

      {view === "write" ? (
        <WriteView
          key={format(selectedDate, "yyyy-MM-dd")}
          date={selectedDate}
          entry={entry}
          allEntries={allEntries}
          onPrev={goBack}
          onNext={goForward}
          canGoForward={canGoForward}
          onSave={(data) => saveEntry(selectedDate, data)}
          onDelete={() => deleteEntry(selectedDate)}
        />
      ) : (
        <HistoryView entries={allEntries} onSelectDate={(d) => { setSelectedDate(new Date(d + "T12:00:00")); setView("write"); }} />
      )}
    </div>
  );
}

function computeStreaks(entries: DiaryEntry[]): { title: string; startDate: string; currentDay: number; active: boolean }[] {
  const streaks: Map<string, { title: string; startDate: string; lastDate: string }> = new Map();
  const entryMap = new Map(entries.map((e) => [e.date, e]));

  for (const entry of entries) {
    if (entry.streakTitle) {
      const existing = streaks.get(entry.streakTitle);
      if (!existing || entry.date > existing.lastDate) {
        streaks.set(entry.streakTitle, { title: entry.streakTitle, startDate: entry.streakStartDate || entry.date, lastDate: entry.date });
      }
    }
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const result: { title: string; startDate: string; currentDay: number; active: boolean }[] = [];

  for (const [, s] of streaks) {
    const days = differenceInDays(parseISO(today), parseISO(s.startDate)) + 1;
    const lastEntryDate = s.lastDate;
    const diff = differenceInDays(parseISO(today), parseISO(lastEntryDate));
    result.push({
      title: s.title,
      startDate: s.startDate,
      currentDay: Math.max(1, days),
      active: diff <= 1,
    });
  }

  return result.sort((a, b) => a.title.localeCompare(b.title));
}

interface WriteViewProps {
  date: Date;
  entry: DiaryEntry | null;
  allEntries: DiaryEntry[];
  onPrev: () => void;
  onNext: () => void;
  canGoForward: boolean;
  onSave: (data: { content: string; mood: string; tags: string[]; streakTitle?: string; streakStartDate?: string }) => void;
  onDelete: () => void;
}

function WriteView({ date, entry, allEntries, onPrev, onNext, canGoForward, onSave, onDelete }: WriteViewProps) {
  const [content, setContent] = useState(entry?.content ?? "");
  const [mood, setMood] = useState(entry?.mood ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [dirty, setDirty] = useState(false);
  const [streakTitle, setStreakTitle] = useState(entry?.streakTitle ?? "");

  const activeStreaks = computeStreaks(allEntries);
  const matchingStreak = streakTitle ? activeStreaks.find((s) => s.title.toLowerCase() === streakTitle.toLowerCase()) : null;

  const sync = useCallback((c: string, m: string, t: string[], st?: string) => {
    if (!c && !m) return;
    onSave({
      content: c, mood: m, tags: t,
      streakTitle: st || undefined,
      streakStartDate: st && matchingStreak ? matchingStreak.startDate : (st && !matchingStreak ? format(date, "yyyy-MM-dd") : undefined),
    });
  }, [onSave, matchingStreak, date]);

  const handleContent = (val: string) => { setContent(val); setDirty(true); };

  const handleMood = (m: string) => {
    const next = mood === m ? "" : m;
    setMood(next);
    sync(content, next, tags, streakTitle || undefined);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) { setTagInput(""); return; }
    const next = [...tags, t];
    setTags(next); setTagInput("");
    sync(content, mood, next, streakTitle || undefined);
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    sync(content, mood, next, streakTitle || undefined);
  };

  const handleStreakChange = (val: string) => {
    setStreakTitle(val);
    sync(content, mood, tags, val || undefined);
  };

  const handleBlur = () => {
    if (dirty) {
      sync(content, mood, tags, streakTitle || undefined);
      setDirty(false);
    }
  };

  const handleSave = () => {
    sync(content, mood, tags, streakTitle || undefined);
    setDirty(false);
  };

  const label = isToday(date) ? "Today" : format(date, "EEEE, MMMM d, yyyy");
  const streakDay = matchingStreak ? matchingStreak.currentDay : (streakTitle ? 1 : null);

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-card/40 shrink-0">
        <button onClick={onPrev} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronLeft size={15} />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {streakDay && (
            <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Day {streakDay} of {streakTitle || "streak"}
            </span>
          )}
        </div>
        <button onClick={onNext} disabled={!canGoForward} className={cn("p-1.5 rounded-lg transition-colors", canGoForward ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-muted-foreground/30 cursor-not-allowed")}>
          <ChevronRight size={15} />
        </button>
        {entry && (
          <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0 px-5 py-4 max-w-2xl w-full mx-auto">
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">How are you feeling?</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.emoji}
                onClick={() => handleMood(m.emoji)}
                title={m.label}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all",
                  mood === m.emoji
                    ? "border-primary bg-primary/10 text-primary scale-105"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <span className="text-base leading-none">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame size={13} className="text-primary" />
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Streak title</label>
          </div>
          <input
            className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            placeholder="e.g. Attending college, No sugar challenge..."
            value={streakTitle}
            onChange={(e) => handleStreakChange(e.target.value)}
            onBlur={handleBlur}
          />
          {activeStreaks.length > 0 && !streakTitle && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeStreaks.map((s) => (
                <button
                  key={s.title}
                  onClick={() => handleStreakChange(s.title)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Flame size={10} />
                  {s.title} (Day {s.currentDay})
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          className="flex-1 min-h-[240px] w-full resize-none bg-[#faf8f5] dark:bg-[#1a1815] ember:bg-[#1f150f] border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30 transition-all leading-relaxed font-serif"
          style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,0,0.03) 31px, rgba(0,0,0,0.03) 32px)" }}
          placeholder={`What happened ${isToday(date) ? "today" : "on this day"}? How did it go?`}
          value={content}
          onChange={(e) => handleContent(e.target.value)}
          onBlur={handleBlur}
        />

        <button
          onClick={handleSave}
          className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors self-start"
        >
          <Save size={14} />
          Save Entry
        </button>

        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-primary/60"><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-muted-foreground" />
            <input
              className="flex-1 text-xs bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50"
              placeholder="Add a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {entry && (
          <p className="mt-2 text-[10px] text-muted-foreground/50 text-right">
            Last updated {format(parseISO(entry.updatedAt), "MMM d, h:mm a")}
          </p>
        )}
      </div>
    </div>
  );
}

function HistoryView({ entries, onSelectDate }: { entries: DiaryEntry[]; onSelectDate: (date: string) => void }) {
  const activeStreaks = computeStreaks(entries);

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        {activeStreaks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Active Streaks</p>
            <div className="flex flex-wrap gap-2">
              {activeStreaks.map((s) => (
                <div key={s.title} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Flame size={14} className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">Day {s.currentDay} · Started {format(parseISO(s.startDate), "MMM d")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 && activeStreaks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
            <BookOpen size={40} strokeWidth={1} />
            <div className="text-center">
              <p className="font-medium text-foreground">No entries yet</p>
              <p className="text-sm mt-1">Switch to Write to create your first entry</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelectDate(e.date)}
                className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {e.mood && <span className="text-xl leading-none">{e.mood}</span>}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">{format(parseISO(e.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}</p>
                        {e.streakTitle && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-0.5">
                            <Flame size={8} /> {e.streakTitle}
                          </span>
                        )}
                      </div>
                      {e.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {e.tags.map((t) => <span key={t} className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                </div>
                {e.content && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{e.content}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
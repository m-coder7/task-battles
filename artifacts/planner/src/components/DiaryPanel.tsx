import { useState, useCallback } from "react";
import { format, parseISO, subDays, addDays, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, BookOpen, Trash2, Tag, X, Plus, Sparkles, Pencil } from "lucide-react";
import { useDiary, MOODS, BUILTIN_TEMPLATES, type DiaryEntry, type DiaryTemplate } from "@/hooks/useDiary";
import { cn } from "@/lib/utils";

export default function DiaryPanel() {
  const { allEntries, getEntry, saveEntry, deleteEntry, templates, addTemplate, removeTemplate } = useDiary();
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
          onPrev={goBack}
          onNext={goForward}
          canGoForward={canGoForward}
          onSave={(data) => saveEntry(selectedDate, data)}
          onDelete={() => deleteEntry(selectedDate)}
          templates={templates}
          onAddTemplate={addTemplate}
          onRemoveTemplate={removeTemplate}
        />
      ) : (
        <HistoryView entries={allEntries} onSelectDate={(d) => { setSelectedDate(new Date(d + "T12:00:00")); setView("write"); }} />
      )}
    </div>
  );
}

interface WriteViewProps {
  date: Date;
  entry: DiaryEntry | null;
  onPrev: () => void;
  onNext: () => void;
  canGoForward: boolean;
  onSave: (data: { content: string; mood: string; tags: string[]; templateId?: string }) => void;
  onDelete: () => void;
  templates: DiaryTemplate[];
  onAddTemplate: (t: Omit<DiaryTemplate, "id" | "isDefault">) => DiaryTemplate;
  onRemoveTemplate: (id: string) => void;
}

function WriteView({ date, entry, onPrev, onNext, canGoForward, onSave, onDelete, templates, onAddTemplate, onRemoveTemplate }: WriteViewProps) {
  const [content, setContent] = useState(entry?.content ?? "");
  const [mood, setMood] = useState(entry?.mood ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [dirty, setDirty] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateIcon, setNewTemplateIcon] = useState("📝");
  const [newTemplateSections, setNewTemplateSections] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState(entry?.templateId ?? "");

  const sync = useCallback((c: string, m: string, t: string[], tid?: string) => {
    if (!c && !m) return;
    onSave({ content: c, mood: m, tags: t, templateId: tid });
  }, [onSave]);

  const handleContent = (val: string) => {
    setContent(val);
    setDirty(true);
  };

  const handleMood = (m: string) => {
    const next = mood === m ? "" : m;
    setMood(next);
    sync(content, next, tags, activeTemplateId || undefined);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) { setTagInput(""); return; }
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    sync(content, mood, next, activeTemplateId || undefined);
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    sync(content, mood, next, activeTemplateId || undefined);
  };

  const handleBlur = () => {
    if (dirty) { sync(content, mood, tags, activeTemplateId || undefined); setDirty(false); }
  };

  const applyTemplate = (template: DiaryTemplate) => {
    setActiveTemplateId(template.id);
    const lines = template.sections.map((s, i) => `## ${s}\n\n`).join("\n");
    const newContent = content || lines;
    setContent(newContent);
    setDirty(true);
    sync(newContent, mood, tags, template.id);
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    const sections = newTemplateSections
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sections.length === 0) return;
    onAddTemplate({
      name: newTemplateName.trim(),
      icon: newTemplateIcon,
      sections,
    });
    setNewTemplateName("");
    setNewTemplateIcon("📝");
    setNewTemplateSections("");
    setShowTemplateBuilder(false);
  };

  const label = isToday(date) ? "Today" : format(date, "EEEE, MMMM d, yyyy");

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-card/40 shrink-0">
        <button onClick={onPrev} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronLeft size={15} />
        </button>
        <span className="flex-1 text-center text-sm font-medium text-foreground">{label}</span>
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

        <div className="mb-3">
          <button
            onClick={() => setShowTemplateBuilder(!showTemplateBuilder)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <Sparkles size={13} />
            {showTemplateBuilder ? "Hide templates" : "Use a template"}
          </button>
          {showTemplateBuilder && (
            <div className="space-y-2 mb-2">
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      activeTemplateId === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                    {!t.isDefault && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveTemplate(t.id); }}
                        className="ml-0.5 text-muted-foreground/40 hover:text-destructive"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-lg border border-dashed border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">Create custom template</p>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="w-8 text-center text-lg bg-transparent outline-none"
                    value={newTemplateIcon}
                    onChange={(e) => setNewTemplateIcon(e.target.value)}
                    maxLength={2}
                  />
                  <input
                    className="flex-1 text-sm bg-transparent border border-border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Template name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>
                <textarea
                  className="w-full text-xs bg-transparent border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder={"One section per line:\nThings I'm grateful for\nWhat I accomplished\nWhat I want to improve"}
                  rows={3}
                  value={newTemplateSections}
                  onChange={(e) => setNewTemplateSections(e.target.value)}
                />
                <button
                  onClick={handleCreateTemplate}
                  disabled={!newTemplateName.trim() || !newTemplateSections.trim()}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={12} /> Add template
                </button>
              </div>
            </div>
          )}
        </div>

        <textarea
          className="flex-1 min-h-[240px] w-full resize-none bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30 transition-all leading-relaxed font-serif"
          placeholder={activeTemplateId ? "Fill in your template sections..." : `What happened ${isToday(date) ? "today" : "on this day"}? How did it go?`}
          value={content}
          onChange={(e) => handleContent(e.target.value)}
          onBlur={handleBlur}
        />

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
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <BookOpen size={40} strokeWidth={1} />
        <div className="text-center">
          <p className="font-medium text-foreground">No entries yet</p>
          <p className="text-sm mt-1">Switch to Write to create your first entry</p>
        </div>
      </div>
    );
  }

  const templateMap = new Map(BUILTIN_TEMPLATES.map((t) => [t.id, t]));

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="max-w-2xl mx-auto space-y-3">
        {entries.map((e) => {
          const template = e.templateId ? templateMap.get(e.templateId) : null;
          return (
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
                      {template && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {template.icon} {template.name}
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
          );
        })}
      </div>
    </div>
  );
}
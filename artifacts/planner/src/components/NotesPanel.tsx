import { useState, useRef, useEffect, useCallback } from "react";
import { Pin, PinOff, Plus, Trash2, Search, StickyNote, Bold, Italic, Underline, Type, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useNotes, type Note } from "@/hooks/useNotes";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = [
  { value: "system-ui, -apple-system, sans-serif", label: "System" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Times New Roman', serif", label: "Times" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
];

const FONT_SIZES = [
  { value: "12", label: "12" },
  { value: "14", label: "14" },
  { value: "16", label: "16" },
  { value: "18", label: "18" },
  { value: "20", label: "20" },
  { value: "24", label: "24" },
];

const COLOR_CONFIG: Record<Note["color"], { cardBg: string; cardBgDark: string; headerBg: string; headerBgDark: string; textColor: string; textColorDark: string; dot: string }> = {
  default: { cardBg: "#ffffff", cardBgDark: "hsl(var(--card))", headerBg: "#f5f5f5", headerBgDark: "hsl(var(--muted))", textColor: "#111111", textColorDark: "hsl(var(--foreground))", dot: "bg-gray-400" },
  yellow:  { cardBg: "#fefce8", cardBgDark: "#422006", headerBg: "#fef08a", headerBgDark: "#713f12", textColor: "#713f12", textColorDark: "#fef08a", dot: "bg-yellow-400" },
  green:   { cardBg: "#f0fdf4", cardBgDark: "#052e16", headerBg: "#bbf7d0", headerBgDark: "#14532d", textColor: "#14532d", textColorDark: "#bbf7d0", dot: "bg-green-500" },
  blue:    { cardBg: "#eff6ff", cardBgDark: "#172554", headerBg: "#bfdbfe", headerBgDark: "#1e3a5f", textColor: "#1e3a5f", textColorDark: "#bfdbfe", dot: "bg-blue-500" },
  pink:    { cardBg: "#fdf2f8", cardBgDark: "#4a0d2b", headerBg: "#fbcfe8", headerBgDark: "#831843", textColor: "#831843", textColorDark: "#fbcfe8", dot: "bg-pink-400" },
  purple:  { cardBg: "#faf5ff", cardBgDark: "#2e1065", headerBg: "#e9d5ff", headerBgDark: "#581c87", textColor: "#581c87", textColorDark: "#e9d5ff", dot: "bg-purple-500" },
};

const COLORS = Object.keys(COLOR_CONFIG) as Note["color"][];

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark") || document.documentElement.classList.contains("ember");
}

export default function NotesPanel() {
  const { notes, addNote, updateNote, deleteNote, togglePin } = useNotes();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = notes.filter((n) =>
    !query || n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase())
  );

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  function handleNew() {
    const id = addNote({ title: "", content: "", color: "default", pinned: false });
    setActiveId(id);
  }

  if (activeNote) {
    return (
      <NoteEditor
        note={activeNote}
        onUpdate={updateNote}
        onDelete={deleteNote}
        onPin={togglePin}
        onClose={() => setActiveId(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
        <StickyNote size={16} className="text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground flex-1">Notes</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-muted-foreground bg-background">
          <Search size={13} />
          <input
            className="text-xs bg-transparent outline-none w-40 text-foreground placeholder:text-muted-foreground"
            placeholder="Search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New Note
        </button>
      </header>

      <div className="flex-1 overflow-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <StickyNote size={40} strokeWidth={1} />
            <div className="text-center">
              <p className="font-medium text-foreground">No notes yet</p>
              <p className="text-sm mt-1">Click "New Note" to start writing</p>
            </div>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={() => setActiveId(note.id)}
                onPin={() => togglePin(note.id)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onOpen, onPin, onDelete }: { note: Note; onOpen: () => void; onPin: () => void; onDelete: () => void }) {
  const cfg = COLOR_CONFIG[note.color];
  const dark = isDarkMode();
  const bg = dark ? cfg.cardBgDark : cfg.cardBg;
  const hdrBg = dark ? cfg.headerBgDark : cfg.headerBg;
  const txt = dark ? cfg.textColorDark : cfg.textColor;

  return (
    <div
      className="break-inside-avoid rounded-xl border border-border overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
      style={{ backgroundColor: bg }}
      onClick={onOpen}
    >
      {(note.title || note.pinned) && (
        <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: hdrBg }}>
          <span className="text-xs font-semibold truncate" style={{ color: txt }}>{note.title || "Untitled"}</span>
          {note.pinned && <Pin size={11} className="text-primary shrink-0" />}
        </div>
      )}
      <div className="px-3 py-2.5">
        {note.content ? (
          <div className="text-xs leading-relaxed line-clamp-6" style={{ color: txt }} dangerouslySetInnerHTML={{ __html: note.content }} />
        ) : (
          <p className="text-xs italic opacity-40" style={{ color: txt }}>Empty note</p>
        )}
      </div>
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] opacity-50" style={{ color: txt }}>{format(parseISO(note.updatedAt), "MMM d")}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            style={{ color: txt }}
          >
            {note.pinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteEditor({ note, onUpdate, onDelete, onPin, onClose }: {
  note: Note;
  onUpdate: (id: string, data: Partial<Omit<Note, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onClose: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontFamily, setFontFamily] = useState("system-ui, -apple-system, sans-serif");
  const [fontSize, setFontSize] = useState("14");
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content || "";
      editorRef.current.focus();
    }
  }, [note.id]);

  const handleInput = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (editorRef.current) {
        onUpdate(note.id, { content: editorRef.current.innerHTML, updatedAt: new Date().toISOString() });
      }
    }, 300);
  }, [note.id, onUpdate]);

  const execCmd = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const cfg = COLOR_CONFIG[note.color];
  const dark = isDarkMode();
  const editorBg = dark ? cfg.cardBgDark : cfg.cardBg;
  const editorText = dark ? cfg.textColorDark : cfg.textColor;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showFontMenu || showSizeMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest(".font-menu-wrap")) {
          setShowFontMenu(false);
          setShowSizeMenu(false);
        }
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showFontMenu, showSizeMenu]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card shrink-0 flex-wrap">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Notes
        </button>
        <span className="text-muted-foreground">/</span>
        <input
          className="flex-1 min-w-[120px] bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Untitled note"
          defaultValue={note.title}
          onBlur={(e) => onUpdate(note.id, { title: e.target.value })}
        />
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate(note.id, { color: c })}
              className={cn("w-4 h-4 rounded-full transition-transform hover:scale-125", COLOR_CONFIG[c].dot, note.color === c && "ring-2 ring-offset-1 ring-foreground/40 scale-110")}
            />
          ))}
        </div>
        <button onClick={() => onPin(note.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Pin">
          {note.pinned ? <Pin size={14} className="text-primary" /> : <PinOff size={14} />}
        </button>
        <button onClick={() => { onDelete(note.id); onClose(); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 size={14} />
        </button>
      </header>

      <div className="flex items-center gap-1 px-5 py-1.5 border-b border-border/50 bg-card/40 shrink-0 flex-wrap">
        <div className="relative font-menu-wrap">
          <button
            onClick={() => { setShowFontMenu(!showFontMenu); setShowSizeMenu(false); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Type size={12} />
            {FONT_FAMILIES.find((f) => f.value === fontFamily)?.label || "System"}
          </button>
          {showFontMenu && (
            <div className="absolute top-full left-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setFontFamily(f.value); setShowFontMenu(false); editorRef.current?.focus(); document.execCommand("fontName", false, f.value); }}
                  className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors", fontFamily === f.value ? "text-primary font-medium" : "text-foreground")}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative font-menu-wrap">
          <button
            onClick={() => { setShowSizeMenu(!showSizeMenu); setShowFontMenu(false); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {fontSize}
          </button>
          {showSizeMenu && (
            <div className="absolute top-full left-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[60px]">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setFontSize(s.value); setShowSizeMenu(false); editorRef.current?.focus(); document.execCommand("fontSize", false, "7"); const fontEl = editorRef.current?.querySelector("font[size='7']"); if (fontEl) { (fontEl as HTMLElement).removeAttribute("size"); (fontEl as HTMLElement).style.fontSize = s.value + "px"; } }}
                  className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors", fontSize === s.value ? "text-primary font-medium" : "text-foreground")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <button onClick={() => execCmd("bold")} title="Bold" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bold size={13} />
        </button>
        <button onClick={() => execCmd("italic")} title="Italic" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Italic size={13} />
        </button>
        <button onClick={() => execCmd("underline")} title="Underline" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Underline size={13} />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button onClick={() => execCmd("justifyLeft")} title="Align left" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <AlignLeft size={13} />
        </button>
        <button onClick={() => execCmd("justifyCenter")} title="Align center" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <AlignCenter size={13} />
        </button>
        <button onClick={() => execCmd("justifyRight")} title="Align right" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <AlignRight size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-auto" style={{ backgroundColor: editorBg }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="w-full min-h-full px-8 py-6 text-sm outline-none leading-relaxed focus:ring-0 focus:outline-none"
          style={{ fontFamily, fontSize: fontSize + "px", color: editorText }}
          data-placeholder="Start writing..."
        />
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #999;
          pointer-events: none;
        }
      `}</style>

      <div className="px-5 py-2 border-t border-border bg-card/60 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Last edited {format(parseISO(note.updatedAt), "MMM d, h:mm a")}</span>
      </div>
    </div>
  );
}
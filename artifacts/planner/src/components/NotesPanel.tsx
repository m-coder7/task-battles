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
  { value: "12px", label: "12" },
  { value: "14px", label: "14" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
];

const COLOR_STYLES: Record<Note["color"], { card: string; header: string; text: string }> = {
  default: { card: "bg-card",        header: "bg-muted/50",   text: "text-foreground" },
  yellow:  { card: "bg-yellow-50 dark:bg-yellow-950/30",  header: "bg-yellow-100 dark:bg-yellow-900/40",  text: "text-yellow-900 dark:text-yellow-100" },
  green:   { card: "bg-green-50 dark:bg-green-950/30",    header: "bg-green-100 dark:bg-green-900/40",    text: "text-green-900 dark:text-green-100" },
  blue:    { card: "bg-blue-50 dark:bg-blue-950/30",      header: "bg-blue-100 dark:bg-blue-900/40",       text: "text-blue-900 dark:text-blue-100" },
  pink:    { card: "bg-pink-50 dark:bg-pink-950/30",      header: "bg-pink-100 dark:bg-pink-900/40",       text: "text-pink-900 dark:text-pink-100" },
  purple:  { card: "bg-purple-50 dark:bg-purple-950/30",  header: "bg-purple-100 dark:bg-purple-900/40",   text: "text-purple-900 dark:text-purple-100" },
};

const COLOR_DOTS: Record<Note["color"], string> = {
  default: "bg-muted-foreground/40",
  yellow:  "bg-yellow-400",
  green:   "bg-green-500",
  blue:    "bg-blue-500",
  pink:    "bg-pink-400",
  purple:  "bg-purple-500",
};

const COLORS = Object.keys(COLOR_DOTS) as Note["color"][];

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
  const styles = COLOR_STYLES[note.color];
  return (
    <div
      className={cn("break-inside-avoid rounded-xl border border-border overflow-hidden group cursor-pointer hover:shadow-md transition-shadow", styles.card)}
      onClick={onOpen}
    >
      {(note.title || note.pinned) && (
        <div className={cn("px-3 py-2 flex items-center justify-between", styles.header)}>
          <span className={cn("text-xs font-semibold truncate", styles.text)}>{note.title || "Untitled"}</span>
          {note.pinned && <Pin size={11} className="text-primary shrink-0" />}
        </div>
      )}
      <div className="px-3 py-2.5">
        {note.content ? (
          <div className={cn("text-xs leading-relaxed line-clamp-6", styles.text)} dangerouslySetInnerHTML={{ __html: note.content }} />
        ) : (
          <p className="text-xs text-muted-foreground/40 italic">Empty note</p>
        )}
      </div>
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className={cn("text-[10px]", styles.text, "opacity-50")}>{format(parseISO(note.updatedAt), "MMM d")}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className={cn("p-1 rounded hover:bg-background/60 transition-colors", styles.text)}
          >
            {note.pinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
  const [fontSize, setFontSize] = useState("14px");
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

  const handleColorChange = useCallback((color: Note["color"]) => {
    onUpdate(note.id, { color });
  }, [note.id, onUpdate]);

  const styles = COLOR_STYLES[note.color];

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
              onClick={() => handleColorChange(c)}
              className={cn("w-4 h-4 rounded-full transition-transform hover:scale-125", COLOR_DOTS[c], note.color === c && "ring-2 ring-offset-1 ring-foreground/40 scale-110")}
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
            {fontSize.replace("px", "")}
          </button>
          {showSizeMenu && (
            <div className="absolute top-full left-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[60px]">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setFontSize(s.value); setShowSizeMenu(false); editorRef.current?.focus(); document.execCommand("fontSize", false, "7"); const fontEl = editorRef.current?.querySelector("font[size='7']"); if (fontEl) { (fontEl as HTMLElement).removeAttribute("size"); (fontEl as HTMLElement).style.fontSize = s.value; }}}
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

      <div className={cn("flex-1 overflow-auto", styles.card)}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="w-full min-h-full px-8 py-6 text-sm outline-none leading-relaxed focus:ring-0 focus:outline-none"
          style={{ fontFamily, fontSize, color: "var(--tw-foreground, inherit)" }}
          data-placeholder="Start writing..."
        />
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--tw-text-muted-foreground, #999);
          pointer-events: none;
        }
        [contenteditable] {
          color: inherit;
        }
      `}</style>

      <div className="px-5 py-2 border-t border-border bg-card/60 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Last edited {format(parseISO(note.updatedAt), "MMM d, h:mm a")}</span>
      </div>
    </div>
  );
}
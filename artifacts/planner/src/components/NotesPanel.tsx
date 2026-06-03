import { useState, useRef, useEffect } from "react";
import { Pin, PinOff, Plus, Trash2, Search, StickyNote } from "lucide-react";
import { useNotes, type Note } from "@/hooks/useNotes";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const COLOR_STYLES: Record<Note["color"], { card: string; header: string }> = {
  default: { card: "bg-card",        header: "bg-muted/50" },
  yellow:  { card: "bg-yellow-50 dark:bg-yellow-950/30",  header: "bg-yellow-100 dark:bg-yellow-900/40" },
  green:   { card: "bg-green-50 dark:bg-green-950/30",    header: "bg-green-100 dark:bg-green-900/40" },
  blue:    { card: "bg-blue-50 dark:bg-blue-950/30",      header: "bg-blue-100 dark:bg-blue-900/40" },
  pink:    { card: "bg-pink-50 dark:bg-pink-950/30",      header: "bg-pink-100 dark:bg-pink-900/40" },
  purple:  { card: "bg-purple-50 dark:bg-purple-950/30",  header: "bg-purple-100 dark:bg-purple-900/40" },
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = notes.filter((n) =>
    !query || n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase())
  );

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  useEffect(() => {
    if (activeNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeId]);

  function handleNew() {
    const id = addNote({ title: "", content: "", color: "default", pinned: false });
    setActiveId(id);
  }

  function handleTitleBlur(id: string, value: string) {
    updateNote(id, { title: value });
  }

  if (activeNote) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setActiveId(null)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Notes
          </button>
          <span className="text-muted-foreground">/</span>
          <input
            className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Untitled note"
            defaultValue={activeNote.title}
            onBlur={(e) => handleTitleBlur(activeNote.id, e.target.value)}
          />
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateNote(activeNote.id, { color: c })}
                className={cn("w-4 h-4 rounded-full transition-transform hover:scale-125", COLOR_DOTS[c], activeNote.color === c && "ring-2 ring-offset-1 ring-foreground/40 scale-110")}
              />
            ))}
          </div>
          <button onClick={() => togglePin(activeNote.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Pin">
            {activeNote.pinned ? <Pin size={14} className="text-primary" /> : <PinOff size={14} />}
          </button>
          <button onClick={() => { deleteNote(activeNote.id); setActiveId(null); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </header>
        <div className={cn("flex-1 overflow-auto", COLOR_STYLES[activeNote.color].card)}>
          <textarea
            ref={textareaRef}
            className="w-full h-full min-h-full resize-none bg-transparent px-8 py-6 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none leading-relaxed"
            placeholder="Start writing…"
            defaultValue={activeNote.content}
            onBlur={(e) => updateNote(activeNote.id, { content: e.target.value })}
          />
        </div>
        <div className="px-5 py-2 border-t border-border bg-card/60 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Last edited {format(parseISO(activeNote.updatedAt), "MMM d, h:mm a")}</span>
        </div>
      </div>
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
            placeholder="Search notes…"
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
          <span className="text-xs font-semibold text-foreground truncate">{note.title || "Untitled"}</span>
          {note.pinned && <Pin size={11} className="text-primary shrink-0" />}
        </div>
      )}
      <div className="px-3 py-2.5">
        {note.content ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">{note.content}</p>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic">Empty note</p>
        )}
      </div>
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/60">{format(parseISO(note.updatedAt), "MMM d")}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className="p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
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

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { CalendarEvent, EventColor, COLOR_MAP } from "@/hooks/useEvents";
import { format } from "date-fns";

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  onDelete?: (id: string) => void;
  initialDate?: string;
  initialStartTime?: string;
  editEvent?: CalendarEvent | null;
}

const COLORS: EventColor[] = ["blue", "red", "green", "orange", "purple", "pink"];

const COLOR_LABELS: Record<EventColor, string> = {
  blue: "Blue", red: "Red", green: "Green",
  orange: "Orange", purple: "Purple", pink: "Pink",
};

const DOT_CLASSES: Record<EventColor, string> = {
  blue: "bg-blue-500", red: "bg-red-500", green: "bg-green-500",
  orange: "bg-orange-500", purple: "bg-purple-500", pink: "bg-pink-500",
};

export default function EventDialog({
  open,
  onClose,
  onSave,
  onDelete,
  initialDate,
  initialStartTime,
  editEvent,
}: EventDialogProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate ?? format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(initialStartTime ?? "09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState<EventColor>("blue");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDate(editEvent.date);
      setStartTime(editEvent.startTime);
      setEndTime(editEvent.endTime);
      setColor(editEvent.color);
      setDescription(editEvent.description ?? "");
      setAllDay(editEvent.allDay ?? false);
    } else {
      setTitle("");
      setDate(initialDate ?? format(new Date(), "yyyy-MM-dd"));
      setStartTime(initialStartTime ?? "09:00");
      setEndTime("10:00");
      setColor("blue");
      setDescription("");
      setAllDay(false);
    }
  }, [editEvent, initialDate, initialStartTime, open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), date, startTime, endTime, color, description, allDay });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {editEvent ? "Edit Event" : "New Event"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              autoFocus
              type="text"
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="allDay" className="text-sm text-foreground">All day</label>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Start</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">End</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={COLOR_LABELS[c]}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${DOT_CLASSES[c]} transition-transform ${
                    color === c ? "scale-125 ring-2 ring-offset-2 ring-primary/50" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            {editEvent && onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(editEvent.id); onClose(); }}
                className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {editEvent ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import {
  format, addMonths, subMonths, startOfWeek, endOfWeek,
  addWeeks, subWeeks,
} from "date-fns";
import { Plus, Calendar, LayoutGrid, CalendarDays, Sun, Moon, Target } from "lucide-react";
import MiniCalendar from "@/components/MiniCalendar";
import MonthView from "@/components/MonthView";
import DayView from "@/components/DayView";
import WeekView from "@/components/WeekView";
import GoalsPanel from "@/components/GoalsPanel";
import EventDialog from "@/components/EventDialog";
import { useEvents, CalendarEvent } from "@/hooks/useEvents";
import { useGoals } from "@/hooks/useGoals";
import { useNotifications } from "@/hooks/useNotifications";

type View = "month" | "week" | "day";
type Section = "calendar" | "goals";

function useTheme() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const toggle = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };
  if (dark) document.documentElement.classList.add("dark");
  return { dark, toggle };
}

export default function App() {
  const [section, setSection] = useState<Section>("calendar");
  const [view, setView] = useState<View>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitialDate, setDialogInitialDate] = useState<string | undefined>();
  const [dialogInitialTime, setDialogInitialTime] = useState<string | undefined>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { goals, markNotified } = useGoals();
  const { dark, toggle } = useTheme();

  useNotifications(goals, markNotified);

  const openNew = useCallback((date?: string, time?: string) => {
    setEditingEvent(null);
    setDialogInitialDate(date ?? format(selectedDate, "yyyy-MM-dd"));
    setDialogInitialTime(time);
    setDialogOpen(true);
  }, [selectedDate]);

  const openEdit = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setDialogInitialDate(undefined);
    setDialogInitialTime(undefined);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback((data: Omit<CalendarEvent, "id">) => {
    if (editingEvent) {
      updateEvent(editingEvent.id, data);
    } else {
      addEvent(data);
    }
  }, [editingEvent, addEvent, updateEvent]);

  const navigate = useCallback((dir: -1 | 1) => {
    if (view === "month") {
      const next = dir === 1 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
      setCurrentMonth(next);
    } else if (view === "week") {
      const next = dir === 1 ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1);
      setSelectedDate(next);
    } else {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + dir);
      setSelectedDate(next);
    }
  }, [view, currentMonth, selectedDate]);

  const goToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCurrentMonth(now);
  };

  const headerLabel = () => {
    if (view === "month") return format(currentMonth, "MMMM yyyy");
    if (view === "week") {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return format(selectedDate, "EEEE, MMMM d, yyyy");
  };

  const overdueGoals = goals.filter(
    (g) => !g.completed && new Date(g.date) < new Date(new Date().toDateString())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-[hsl(var(--sidebar))]">
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={20} className="text-primary" />
            <span className="text-base font-semibold text-foreground">Day Planner</span>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <button
              onClick={() => setSection("calendar")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${section === "calendar"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))]"
                }`}
            >
              <Calendar size={15} />
              Calendar
            </button>
            <button
              onClick={() => setSection("goals")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative
                ${section === "goals"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))]"
                }`}
            >
              <Target size={15} />
              Goals
              {overdueGoals.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                  {overdueGoals.length}
                </span>
              )}
            </button>
          </div>

          {section === "calendar" && (
            <button
              onClick={() => openNew()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus size={16} />
              New Event
            </button>
          )}
        </div>

        {section === "calendar" && (
          <div className="px-3 pb-3">
            <MiniCalendar
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              events={events}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setCurrentMonth(d);
                if (view === "month") setView("day");
              }}
              onMonthChange={setCurrentMonth}
            />
          </div>
        )}

        <div className="mt-auto px-3 pb-4 space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {section === "calendar" && (
          <>
            <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Today
              </button>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => navigate(1)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <h1 className="text-base font-semibold text-foreground min-w-48">
                {headerLabel()}
              </h1>

              <div className="ml-auto flex items-center gap-1 p-1 bg-muted rounded-lg">
                {(["month", "week", "day"] as View[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize
                      ${view === v
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {v === "month" && <LayoutGrid size={14} />}
                    {v === "week" && <Calendar size={14} />}
                    {v === "day" && <Sun size={14} />}
                    {v}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-hidden bg-card">
              {view === "month" && (
                <MonthView
                  currentMonth={currentMonth}
                  selectedDate={selectedDate}
                  events={events}
                  onSelectDate={(d) => { setSelectedDate(d); setView("day"); }}
                  onNewEvent={(date) => openNew(date)}
                  onEditEvent={openEdit}
                />
              )}
              {view === "week" && (
                <WeekView
                  selectedDate={selectedDate}
                  events={events}
                  onSelectDate={(d) => { setSelectedDate(d); setView("day"); }}
                  onNewEvent={(date, time) => openNew(date, time)}
                  onEditEvent={openEdit}
                />
              )}
              {view === "day" && (
                <DayView
                  selectedDate={selectedDate}
                  events={events}
                  onNewEvent={(date, time) => openNew(date, time)}
                  onEditEvent={openEdit}
                />
              )}
            </div>
          </>
        )}

        {section === "goals" && <GoalsPanel />}
      </main>

      <EventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingEvent(null); }}
        onSave={handleSave}
        onDelete={deleteEvent}
        initialDate={dialogInitialDate}
        initialStartTime={dialogInitialTime}
        editEvent={editingEvent}
      />
    </div>
  );
}

import { useMemo } from "react";
import { format, isToday, parseISO } from "date-fns";
import { Target, CheckCircle2, Circle, Clock, Flame } from "lucide-react";
import type { CalendarEvent } from "@/hooks/useEvents";
import type { Goal } from "@/hooks/useGoals";
import { isActiveToday, isCompletedToday } from "@/hooks/useGoals";

interface Props {
  events: CalendarEvent[];
  goals: Goal[];
}

export default function WidgetsPanel({ events, goals }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");

  const todayGoals = useMemo(() => {
    return goals.filter((g) => {
      const repeat = g.repeat ?? "none";
      if (repeat !== "none") return isActiveToday(g);
      return g.date === today;
    });
  }, [goals, today]);

  const completedCount = todayGoals.filter((g) => isCompletedToday(g)).length;
  const totalCount = todayGoals.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return events
      .filter((e) => {
        if (e.date > today) return true;
        if (e.date === today && !e.allDay) {
          const [h, m] = e.startTime.split(":").map(Number);
          return h * 60 + m >= nowMin;
        }
        return false;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);
  }, [events, today]);

  const overdueGoals = useMemo(() => {
    return goals.filter(
      (g) =>
        !g.completed &&
        (g.repeat ?? "none") === "none" &&
        new Date(g.date) < new Date(new Date().toDateString())
    );
  }, [goals]);

  return (
    <div className="flex-1 overflow-auto p-8">
      <h2 className="text-xl font-semibold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {/* Progress Widget */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center justify-center min-h-[200px]">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={263.9}
                strokeDashoffset={263.9 - (263.9 * progress) / 100}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{progress}%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Goals Done Today</p>
          <p className="text-sm font-medium mt-1">
            {completedCount} / {totalCount}
          </p>
        </div>

        {/* Today's Tasks Widget */}
        <div className="rounded-xl border border-border bg-card p-5 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Today's Tasks</span>
          </div>
          {todayGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No goals for today</p>
          ) : (
            <div className="space-y-2">
              {todayGoals.slice(0, 6).map((g) => {
                const done = isCompletedToday(g);
                return (
                  <div key={g.id} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                    ) : (
                      <Circle size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <span className={done ? "line-through text-muted-foreground" : "text-foreground"}>
                      {g.title}
                    </span>
                  </div>
                );
              })}
              {todayGoals.length > 6 && (
                <p className="text-xs text-muted-foreground pl-6">
                  +{todayGoals.length - 6} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Events Widget */}
        <div className="rounded-xl border border-border bg-card p-5 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Upcoming</span>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 text-foreground">{e.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {isToday(parseISO(e.date)) ? e.startTime : format(parseISO(e.date), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Widget */}
        <div className="rounded-xl border border-border bg-card p-5 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Circle size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overdue</span>
          </div>
          {overdueGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No overdue goals</p>
          ) : (
            <div className="space-y-2">
              {overdueGoals.slice(0, 6).map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-sm">
                  <Circle size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">{g.title}</span>
                  <span className="text-xs text-muted-foreground/70 shrink-0 ml-auto">
                    {format(parseISO(g.date), "MMM d")}
                  </span>
                </div>
              ))}
              {overdueGoals.length > 6 && (
                <p className="text-xs text-muted-foreground pl-6">
                  +{overdueGoals.length - 6} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Streak Widget */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center justify-center min-h-[200px]">
          <Flame size={32} className="text-primary mb-2" />
          <span className="text-3xl font-bold text-foreground">
            {completedCount > 0 ? "1" : "0"}
          </span>
          <p className="text-xs text-muted-foreground mt-1">Day Streak</p>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {completedCount > 0
              ? "Keep the momentum going!"
              : "Complete a goal to start your streak"}
          </p>
        </div>

        {/* Quick Stats Widget */}
        <div className="rounded-xl border border-border bg-card p-5 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Quick Stats</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted text-center">
              <span className="text-lg font-bold text-foreground">{goals.length}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total Goals</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <span className="text-lg font-bold text-foreground">{events.length}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total Events</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <span className="text-lg font-bold text-primary">{overdueGoals.length}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Overdue</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <span className="text-lg font-bold text-foreground">
                {goals.filter((g) => g.completed).length}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

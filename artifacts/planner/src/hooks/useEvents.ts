import { useState, useCallback, useEffect } from "react";
import { getDay, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth, getStorageKey } from "@/hooks/useAuth";
import {
  syncUpsert,
  syncDelete,
  flushOfflineWrites,
  applyPendingWrites,
  pushLocalOnly,
  isDeleteQueued,
} from "@/hooks/useSupabaseSync";

export type EventColor = "blue" | "red" | "green" | "orange" | "purple" | "pink";
export type EventRepeat = "none" | "daily" | "weekdays" | "weekly" | "custom";

export const EVENT_REPEAT_META: Record<EventRepeat, { label: string }> = {
  none:     { label: "No repeat" },
  daily:    { label: "Daily"     },
  weekdays: { label: "Weekdays"  },
  weekly:   { label: "Weekly"    },
  custom:   { label: "Custom"    },
};

export const EVENT_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: EventColor;
  description?: string;
  allDay?: boolean;
  repeat?: EventRepeat;
  repeatDays?: number[];
}

const TABLE = "events";

function loadEvents(key: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(key: string, events: CalendarEvent[]) {
  localStorage.setItem(key, JSON.stringify(events));
}

function fromRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    startTime: (row.start_time as string) ?? "",
    endTime: (row.end_time as string) ?? "",
    color: (row.color as EventColor) ?? "blue",
    description: row.description as string | undefined,
    allDay: (row.all_day as boolean | undefined) ?? false,
    repeat: (row.repeat as EventRepeat | undefined) ?? "none",
    repeatDays: (row.repeat_days as number[] | undefined) ?? [],
  };
}
function toRow(userId: string, event: CalendarEvent): Record<string, unknown> {
  return {
    id: event.id,
    user_id: userId,
    title: event.title,
    date: event.date,
    start_time: event.startTime,
    end_time: event.endTime,
    color: event.color,
    description: event.description ?? null,
    all_day: event.allDay ?? false,
    repeat: event.repeat ?? "none",
    repeat_days: event.repeatDays ?? [],
  };
}

export function useEvents() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = getStorageKey("planner_events", user?.id);
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents(storageKey));
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setEvents(loadEvents(storageKey));
  }, [storageKey]);

  useEffect(() => {
    saveEvents(storageKey, events);
  }, [events, storageKey]);

  // On mount / auth change / reconnect: flush pending writes, then fetch and merge server state.
  useEffect(() => {
    const up = () => setRefresh((r) => r + 1);
    window.addEventListener("online", up);
    return () => window.removeEventListener("online", up);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    flushOfflineWrites().then(() => {
      if (cancelled) return;
      supabase.from(TABLE as never).select().eq("user_id", userId)
        .then(({ data }) => {
          if (cancelled || !data) return;
          setEvents((prev) => {
            const remote = applyPendingWrites<CalendarEvent>(TABLE, data as unknown as Record<string, unknown>[], fromRow);
            const remoteIds = new Set(remote.map((e) => e.id));
            const localOnly = prev.filter((e) => !remoteIds.has(e.id) && !isDeleteQueued(TABLE, e.id));
            pushLocalOnly(TABLE, localOnly, (e) => toRow(userId, e));
            return [...remote, ...localOnly];
          });
        }, () => {});
    });
    return () => { cancelled = true; };
  }, [userId, refresh]);

  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: crypto.randomUUID(),
    };
    setEvents((prev) => [...prev, newEvent]);
    if (userId) syncUpsert(TABLE, newEvent.id, toRow(userId, newEvent));
    return newEvent;
  }, [userId]);

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      const updated = next.find((e) => e.id === id);
      if (userId && updated) syncUpsert(TABLE, id, toRow(userId, updated));
      return next;
    });
  }, [userId]);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (userId) syncDelete(TABLE, id);
  }, [userId]);

  const getEventsForDate = useCallback(
    (dateStr: string) => events.filter((e) => {
      const repeat = e.repeat ?? "none";
      if (repeat === "none") return e.date === dateStr;
      // Only show recurring events on/after start date
      if (dateStr < e.date) return false;
      const dow = getDay(parseISO(dateStr));
      if (repeat === "daily")    return true;
      if (repeat === "weekdays") return dow >= 1 && dow <= 5;
      if (repeat === "weekly")   return getDay(parseISO(e.date)) === dow;
      if (repeat === "custom")   return (e.repeatDays ?? []).includes(dow);
      return false;
    }),
    [events]
  );

  return { events, addEvent, updateEvent, deleteEvent, getEventsForDate };
}

export const COLOR_MAP: Record<EventColor, { bg: string; text: string; dot: string }> = {
  blue:   { bg: "bg-blue-500/15",   text: "text-blue-700",   dot: "bg-blue-500"   },
  red:    { bg: "bg-red-500/15",    text: "text-red-700",    dot: "bg-red-500"    },
  green:  { bg: "bg-green-500/15",  text: "text-green-700",  dot: "bg-green-500"  },
  orange: { bg: "bg-orange-500/15", text: "text-orange-700", dot: "bg-orange-500" },
  purple: { bg: "bg-purple-500/15", text: "text-purple-700", dot: "bg-purple-500" },
  pink:   { bg: "bg-pink-500/15",   text: "text-pink-700",   dot: "bg-pink-500"   },
};

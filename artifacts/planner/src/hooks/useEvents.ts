import { useState, useCallback, useEffect } from "react";

export type EventColor = "blue" | "red" | "green" | "orange" | "purple" | "pink";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: EventColor;
  description?: string;
  allDay?: boolean;
}

const STORAGE_KEY = "planner_events";

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: crypto.randomUUID(),
    };
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getEventsForDate = useCallback(
    (date: string) => events.filter((e) => e.date === date),
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

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type EventColor =
  | "blue"
  | "red"
  | "green"
  | "orange"
  | "purple"
  | "pink";

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

export const EVENT_COLORS: { color: EventColor; hex: string }[] = [
  { color: "blue", hex: "#3B82F6" },
  { color: "red", hex: "#EF4444" },
  { color: "green", hex: "#10B981" },
  { color: "orange", hex: "#F59E0B" },
  { color: "purple", hex: "#8B5CF6" },
  { color: "pink", hex: "#EC4899" },
];

const STORAGE_KEY = "planner_events";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

interface EventsContextValue {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: string) => CalendarEvent[];
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          setEvents(JSON.parse(val));
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = { ...event, id: genId() };
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback(
    (id: string, updates: Partial<CalendarEvent>) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    },
    []
  );

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getEventsForDate = useCallback(
    (date: string) => events.filter((e) => e.date === date),
    [events]
  );

  return (
    <EventsContext.Provider
      value={{ events, addEvent, updateEvent, deleteEvent, getEventsForDate }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}

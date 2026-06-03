import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";

const STORAGE_KEY = "task_battles_diary";

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const MOODS = [
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🔥", label: "Fired up" },
  { emoji: "🤯", label: "Overwhelmed" },
];

function load(): Record<string, DiaryEntry> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}
function save(entries: Record<string, DiaryEntry>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useDiary() {
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>(load);

  useEffect(() => { save(entries); }, [entries]);

  const getEntry = useCallback((date: Date) => {
    return entries[format(date, "yyyy-MM-dd")] ?? null;
  }, [entries]);

  const saveEntry = useCallback((date: Date, data: { content: string; mood: string; tags: string[] }) => {
    const key = format(date, "yyyy-MM-dd");
    const now = new Date().toISOString();
    setEntries((prev) => ({
      ...prev,
      [key]: {
        id: prev[key]?.id ?? crypto.randomUUID(),
        date: key,
        ...data,
        createdAt: prev[key]?.createdAt ?? now,
        updatedAt: now,
      },
    }));
  }, []);

  const deleteEntry = useCallback((date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    setEntries((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const allEntries = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));

  return { entries, allEntries, getEntry, saveEntry, deleteEntry };
}

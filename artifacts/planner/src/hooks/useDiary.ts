import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
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
import { requestWidgetExport } from "@/lib/widgetExportBus";

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  tags: string[];
  streakTitle?: string;
  streakStartDate?: string;
  createdAt: string;
  updatedAt: string;
}

const TABLE = "diary";

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

function load(key: string): Record<string, DiaryEntry> {
  try { return JSON.parse(localStorage.getItem(key) ?? "{}"); }
  catch { return {}; }
}
function save(key: string, entries: Record<string, DiaryEntry>) {
  localStorage.setItem(key, JSON.stringify(entries));
}

function fromRow(row: Record<string, unknown>): DiaryEntry {
  return {
    id: row.id as string,
    date: (row.date as string) ?? "",
    content: (row.content as string) ?? "",
    mood: (row.mood as string) ?? "",
    tags: (row.tags as string[] | undefined) ?? [],
    streakTitle: row.streak_title as string | undefined,
    streakStartDate: row.streak_start_date as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}
function toRow(userId: string, entry: DiaryEntry): Record<string, unknown> {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    content: entry.content,
    mood: entry.mood,
    tags: entry.tags,
    streak_title: entry.streakTitle ?? null,
    streak_start_date: entry.streakStartDate ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

export function useDiary() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = getStorageKey("task_battles_diary", user?.id);
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>(() => load(storageKey));
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { setEntries(load(storageKey)); }, [storageKey]);
  useEffect(() => { save(storageKey, entries); }, [entries, storageKey]);

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
          setEntries((prev) => {
            const remote = applyPendingWrites<DiaryEntry>(TABLE, data as unknown as Record<string, unknown>[], fromRow);
            const remoteDates = new Set(remote.map((e) => e.date));
            const localOnly = Object.values(prev)
              .filter((e) => !remoteDates.has(e.date) && !isDeleteQueued(TABLE, e.id));
            pushLocalOnly(TABLE, localOnly, (e) => toRow(userId, e));
            const next: Record<string, DiaryEntry> = {};
            for (const entry of [...remote, ...localOnly]) next[entry.date] = entry;
            return next;
          });
        }, () => {});
    });
    return () => { cancelled = true; };
  }, [userId, refresh]);

  const getEntry = useCallback((date: Date) => {
    return entries[format(date, "yyyy-MM-dd")] ?? null;
  }, [entries]);

  const saveEntry = useCallback((date: Date, data: { content: string; mood: string; tags: string[]; streakTitle?: string; streakStartDate?: string }) => {
    const key = format(date, "yyyy-MM-dd");
    const now = new Date().toISOString();
    setEntries((prev) => {
      const entry: DiaryEntry = {
        id: prev[key]?.id ?? crypto.randomUUID(),
        date: key,
        ...data,
        createdAt: prev[key]?.createdAt ?? now,
        updatedAt: now,
      };
      if (userId) syncUpsert(TABLE, entry.id, toRow(userId, entry));
      requestWidgetExport();
      return { ...prev, [key]: entry };
    });
  }, [userId]);

  const deleteEntry = useCallback((date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    setEntries((prev) => {
      const id = prev[key]?.id;
      const next = { ...prev };
      delete next[key];
      if (userId && id) syncDelete(TABLE, id);
      requestWidgetExport();
      return next;
    });
  }, [userId]);

  const allEntries = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));

  return { entries, allEntries, getEntry, saveEntry, deleteEntry };
}

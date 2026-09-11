import { useState, useCallback, useEffect } from "react";
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

export interface Note {
  id: string;
  title: string;
  content: string;
  color: "default" | "yellow" | "green" | "blue" | "pink" | "purple";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const TABLE = "notes";

function load(key: string): Note[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); }
  catch { return []; }
}
function save(key: string, notes: Note[]) {
  localStorage.setItem(key, JSON.stringify(notes));
}

function fromRow(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    content: (row.content as string) ?? "",
    color: (row.color as Note["color"]) ?? "default",
    pinned: (row.pinned as boolean) ?? false,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}
function toRow(userId: string, note: Note): Record<string, unknown> {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
    color: note.color,
    pinned: note.pinned,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

export function useNotes() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = getStorageKey("task_battles_notes", user?.id);
  const [notes, setNotes] = useState<Note[]>(() => load(storageKey));
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { setNotes(load(storageKey)); }, [storageKey]);
  useEffect(() => { save(storageKey, notes); }, [notes, storageKey]);

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
          setNotes((prev) => {
            const remote = applyPendingWrites<Note>(TABLE, data as unknown as Record<string, unknown>[], fromRow);
            const remoteIds = new Set(remote.map((n) => n.id));
            const localOnly = prev.filter((n) => !remoteIds.has(n.id) && !isDeleteQueued(TABLE, n.id));
            pushLocalOnly(TABLE, localOnly, (n) => toRow(userId, n));
            return [...remote, ...localOnly];
          });
        }, () => {});
    });
    return () => { cancelled = true; };
  }, [userId, refresh]);

  const addNote = useCallback((data: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const note: Note = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    setNotes((prev) => [note, ...prev]);
    if (userId) syncUpsert(TABLE, note.id, toRow(userId, note));
    return note.id;
  }, [userId]);

  const updateNote = useCallback((id: string, data: Partial<Omit<Note, "id" | "createdAt">>) => {
    setNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n);
      const note = next.find((n) => n.id === id);
      if (userId && note) syncUpsert(TABLE, id, toRow(userId, note));
      return next;
    });
  }, [userId]);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (userId) syncDelete(TABLE, id);
  }, [userId]);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n);
      const note = next.find((n) => n.id === id);
      if (userId && note) syncUpsert(TABLE, id, toRow(userId, note));
      return next;
    });
  }, [userId]);

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return { notes: sorted, addNote, updateNote, deleteNote, togglePin };
}

import { useState, useCallback, useEffect } from "react";
import { useAuth, getStorageKey } from "@/hooks/useAuth";

export interface Note {
  id: string;
  title: string;
  content: string;
  color: "default" | "yellow" | "green" | "blue" | "pink" | "purple";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

function load(key: string): Note[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); }
  catch { return []; }
}
function save(key: string, notes: Note[]) {
  localStorage.setItem(key, JSON.stringify(notes));
}

export function useNotes() {
  const { user } = useAuth();
  const storageKey = getStorageKey("task_battles_notes", user?.id);
  const [notes, setNotes] = useState<Note[]>(() => load(storageKey));

  useEffect(() => { setNotes(load(storageKey)); }, [storageKey]);
  useEffect(() => { save(storageKey, notes); }, [notes, storageKey]);

  const addNote = useCallback((data: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const note: Note = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    setNotes((prev) => [note, ...prev]);
    return note.id;
  }, []);

  const updateNote = useCallback((id: string, data: Partial<Omit<Note, "id" | "createdAt">>) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n));
  }, []);

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return { notes: sorted, addNote, updateNote, deleteNote, togglePin };
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "task_battles_notes";

export interface Note {
  id: string;
  title: string;
  content: string;
  color: "default" | "yellow" | "green" | "blue" | "pink" | "purple";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

async function loadNotes(): Promise<Note[]> {
  try { return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "[]"); }
  catch { return []; }
}
async function saveNotes(notes: Note[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    loadNotes().then(setNotes);
  }, []);

  const persist = useCallback((updater: (prev: Note[]) => Note[]) => {
    setNotes((prev) => {
      const next = updater(prev);
      saveNotes(next);
      return next;
    });
  }, []);

  const addNote = useCallback((data: Omit<Note, "id" | "createdAt" | "updatedAt">): string => {
    const now = new Date().toISOString();
    const note: Note = { ...data, id: `${Date.now()}-${Math.random().toString(36).substring(2)}`, createdAt: now, updatedAt: now };
    persist((prev) => [note, ...prev]);
    return note.id;
  }, [persist]);

  const updateNote = useCallback((id: string, data: Partial<Omit<Note, "id" | "createdAt">>) => {
    persist((prev) => prev.map((n) => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n));
  }, [persist]);

  const deleteNote = useCallback((id: string) => {
    persist((prev) => prev.filter((n) => n.id !== id));
  }, [persist]);

  const togglePin = useCallback((id: string) => {
    persist((prev) => prev.map((n) => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n));
  }, [persist]);

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return { notes: sorted, addNote, updateNote, deleteNote, togglePin };
}

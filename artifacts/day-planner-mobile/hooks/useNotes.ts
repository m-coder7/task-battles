import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useCallback, useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

export interface Note {
  id: string;
  title: string;
  content: string;
  color: "default" | "yellow" | "green" | "blue" | "pink" | "purple";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useNotes() {
  const { user } = useAuth();
  const storageKey = user ? `notes_${user.id}` : "notes_anon";
  const [notes, setNotes] = useState<Note[]>([]);

  async function loadNotes(): Promise<Note[]> {
    try { return JSON.parse((await AsyncStorage.getItem(storageKey)) ?? "[]"); }
    catch { return []; }
  }
  async function saveNotes(notes: Note[]) {
    await AsyncStorage.setItem(storageKey, JSON.stringify(notes));
  }

  useEffect(() => {
    loadNotes().then(setNotes);
  }, [storageKey]);

  const persist = useCallback((updater: (prev: Note[]) => Note[]) => {
    setNotes((prev) => {
      const next = updater(prev);
      saveNotes(next);
      return next;
    });
  }, [storageKey]);

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

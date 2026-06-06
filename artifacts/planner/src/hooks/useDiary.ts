import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { useAuth, getStorageKey } from "@/hooks/useAuth";

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  tags: string[];
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryTemplate {
  id: string;
  name: string;
  icon: string;
  sections: string[];
  isDefault: boolean;
}

export const BUILTIN_TEMPLATES: DiaryTemplate[] = [
  { id: "gratitude", name: "Gratitude", icon: "🙏", sections: ["Three things I'm grateful for", "Why each matters to me"], isDefault: true },
  { id: "reflection", name: "Daily Reflection", icon: "🪞", sections: ["What went well today", "What could have gone better", "What I learned"], isDefault: true },
  { id: "challenges", name: "Challenges", icon: "💪", sections: ["Today's challenges", "How I handled them", "What I'd do differently"], isDefault: true },
  { id: "energy", name: "Energy Check", icon: "⚡", sections: ["Energy level today", "What drained me", "What energized me"], isDefault: true },
  { id: "wins", name: "Small Wins", icon: "🏆", sections: ["Accomplishments today", "Progress toward goals", "Something I'm proud of"], isDefault: true },
];

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

function loadTemplates(key: string): DiaryTemplate[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const custom = JSON.parse(saved) as DiaryTemplate[];
      return [...BUILTIN_TEMPLATES, ...custom];
    }
  } catch {}
  return [...BUILTIN_TEMPLATES];
}

function saveTemplates(key: string, templates: DiaryTemplate[]) {
  const custom = templates.filter((t) => !t.isDefault);
  localStorage.setItem(key, JSON.stringify(custom));
}

export function useDiary() {
  const { user } = useAuth();
  const storageKey = getStorageKey("task_battles_diary", user?.id);
  const templateKey = getStorageKey("task_battles_diary_templates", user?.id);
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>(() => load(storageKey));
  const [templates, setTemplates] = useState<DiaryTemplate[]>(() => loadTemplates(templateKey));

  useEffect(() => { setEntries(load(storageKey)); }, [storageKey]);
  useEffect(() => { save(storageKey, entries); }, [entries, storageKey]);

  const getEntry = useCallback((date: Date) => {
    return entries[format(date, "yyyy-MM-dd")] ?? null;
  }, [entries]);

  const saveEntry = useCallback((date: Date, data: { content: string; mood: string; tags: string[]; templateId?: string }) => {
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

  const addTemplate = useCallback((template: Omit<DiaryTemplate, "id" | "isDefault">) => {
    const newTemplate: DiaryTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      isDefault: false,
    };
    setTemplates((prev) => {
      const next = [...prev, newTemplate];
      saveTemplates(templateKey, next);
      return next;
    });
    return newTemplate;
  }, [templateKey]);

  const removeTemplate = useCallback((id: string) => {
    if (BUILTIN_TEMPLATES.find((t) => t.id === id)) return;
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTemplates(templateKey, next);
      return next;
    });
  }, [templateKey]);

  const allEntries = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));

  return {
    entries, allEntries, getEntry, saveEntry, deleteEntry,
    templates, addTemplate, removeTemplate,
  };
}
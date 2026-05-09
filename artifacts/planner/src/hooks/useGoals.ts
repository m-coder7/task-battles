import { useState, useCallback, useEffect } from "react";

export type GoalCategory = "must-do" | "should-do" | "nice-to-have";

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  date: string;
  time?: string;
  completed: boolean;
  notificationsEnabled: boolean;
  notificationMessage: string;
  lastNotifiedDate?: string;
}

const STORAGE_KEY = "planner_goals";

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export const CATEGORY_META: Record<GoalCategory, { label: string; color: string; bg: string; text: string; border: string }> = {
  "must-do": {
    label: "Must Do",
    color: "red",
    bg: "bg-red-500/15",
    text: "text-red-700",
    border: "border-red-300",
  },
  "should-do": {
    label: "Should Do",
    color: "orange",
    bg: "bg-orange-500/15",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  "nice-to-have": {
    label: "Nice to Have",
    color: "blue",
    bg: "bg-blue-500/15",
    text: "text-blue-700",
    border: "border-blue-300",
  },
};

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(loadGoals);

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  const addGoal = useCallback((goal: Omit<Goal, "id" | "completed" | "lastNotifiedDate">) => {
    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      completed: false,
    };
    setGoals((prev) => [...prev, newGoal]);
    return newGoal;
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  }, []);

  const markNotified = useCallback((id: string, date: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, lastNotifiedDate: date } : g))
    );
  }, []);

  return { goals, addGoal, updateGoal, deleteGoal, toggleComplete, markNotified };
}

import { useState, useCallback, useEffect } from "react";
import { format, parseISO, isBefore, startOfDay, getDay } from "date-fns";

export type GoalCategory = "must-do" | "should-do" | "nice-to-have";
export type GoalRepeat = "none" | "daily" | "weekdays" | "weekly";

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  date: string;
  time?: string;
  completed: boolean;
  completedDates?: string[];
  repeat?: GoalRepeat;
  notificationsEnabled: boolean;
  notificationMessage: string;
  lastNotifiedDate?: string;
}

const STORAGE_KEY = "planner_goals";
const TODAY = () => format(new Date(), "yyyy-MM-dd");

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export const CATEGORY_META: Record<GoalCategory, { label: string; color: string; bg: string; text: string; border: string }> = {
  "must-do":      { label: "Must Do",      color: "red",    bg: "bg-red-500/15",    text: "text-red-700",    border: "border-red-300" },
  "should-do":    { label: "Should Do",    color: "orange", bg: "bg-orange-500/15", text: "text-orange-700", border: "border-orange-300" },
  "nice-to-have": { label: "Nice to Have", color: "blue",   bg: "bg-blue-500/15",   text: "text-blue-700",   border: "border-blue-300" },
};

export const REPEAT_META: Record<GoalRepeat, { label: string; short: string }> = {
  none:     { label: "No repeat",  short: "" },
  daily:    { label: "Every day",  short: "Daily" },
  weekdays: { label: "Weekdays",   short: "Weekdays" },
  weekly:   { label: "Every week", short: "Weekly" },
};

export function isCompletedToday(goal: Goal): boolean {
  const repeat = goal.repeat ?? "none";
  if (repeat === "none") return goal.completed;
  return (goal.completedDates ?? []).includes(TODAY());
}

export function isActiveToday(goal: Goal): boolean {
  const repeat = goal.repeat ?? "none";
  if (repeat === "none") return false;

  const startDate = parseISO(goal.date);
  const todayStart = startOfDay(new Date());
  if (isBefore(todayStart, startOfDay(startDate))) return false;

  const dow = getDay(new Date());
  if (repeat === "daily") return true;
  if (repeat === "weekdays") return dow >= 1 && dow <= 5;
  if (repeat === "weekly") return getDay(startDate) === dow;
  return false;
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(loadGoals);

  useEffect(() => { saveGoals(goals); }, [goals]);

  const addGoal = useCallback((goal: Omit<Goal, "id" | "completed" | "completedDates" | "lastNotifiedDate">) => {
    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      completed: false,
      completedDates: [],
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
    const today = TODAY();
    setGoals((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      const repeat = g.repeat ?? "none";
      if (repeat === "none") return { ...g, completed: !g.completed };
      const dates = g.completedDates ?? [];
      const alreadyDone = dates.includes(today);
      return {
        ...g,
        completedDates: alreadyDone ? dates.filter((d) => d !== today) : [...dates, today],
      };
    }));
  }, []);

  const markNotified = useCallback((id: string, date: string) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, lastNotifiedDate: date } : g)));
  }, []);

  return { goals, addGoal, updateGoal, deleteGoal, toggleComplete, markNotified };
}

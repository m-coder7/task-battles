import { useState, useCallback, useEffect, useRef } from "react";
import { format, parseISO, isBefore, startOfDay, getDay, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { useAuth, getStorageKey } from "@/hooks/useAuth";

export type GoalCategory = "must-do" | "should-do" | "nice-to-have";
export type GoalRepeat = "none" | "daily" | "weekdays" | "weekly" | "custom";

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  date: string;
  time?: string;
  completed: boolean;
  completedDates?: string[];
  repeat?: GoalRepeat;
  repeatDays?: number[];
  notificationsEnabled: boolean;
  notificationMessage: string;
  lastNotifiedDate?: string;
}

const TODAY = () => format(new Date(), "yyyy-MM-dd");
const OVERDUE_DELETE_AFTER_DAYS = 3;

function loadGoals(key: string): Goal[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGoals(key: string, goals: Goal[]) {
  localStorage.setItem(key, JSON.stringify(goals));
}

/** Non-recurring, incomplete, due date before today. */
export function isOverdueGoal(goal: Goal, today = new Date()): boolean {
  if (goal.completed) return false;
  if ((goal.repeat ?? "none") !== "none") return false;
  try {
    return isBefore(startOfDay(parseISO(goal.date)), startOfDay(today));
  } catch {
    return false;
  }
}

/** Overdue for more than 3 calendar days → eligible for auto-delete. */
export function isExpiredOverdueGoal(goal: Goal, today = new Date()): boolean {
  if (!isOverdueGoal(goal, today)) return false;
  try {
    return differenceInCalendarDays(startOfDay(today), startOfDay(parseISO(goal.date))) > OVERDUE_DELETE_AFTER_DAYS;
  } catch {
    return false;
  }
}

function purgeExpiredOverdue(goals: Goal[]): { kept: Goal[]; removed: number } {
  const kept: Goal[] = [];
  let removed = 0;
  for (const g of goals) {
    if (isExpiredOverdueGoal(g)) removed += 1;
    else kept.push(g);
  }
  return { kept, removed };
}

export const CATEGORY_META: Record<GoalCategory, { label: string; color: string; bg: string; text: string; border: string }> = {
  "must-do":      { label: "Must Do",      color: "red",    bg: "bg-red-500/15",    text: "text-red-700",    border: "border-red-300" },
  "should-do":    { label: "Should Do",    color: "orange", bg: "bg-orange-500/15", text: "text-orange-700", border: "border-orange-300" },
  "nice-to-have": { label: "Nice to Have", color: "blue",   bg: "bg-blue-500/15",   text: "text-blue-700",   border: "border-blue-300" },
};

export const REPEAT_META: Record<GoalRepeat, { label: string; short: string }> = {
  none:     { label: "No repeat",     short: "" },
  daily:    { label: "Every day",     short: "Daily" },
  weekdays: { label: "Weekdays",      short: "Weekdays" },
  weekly:   { label: "Every week",    short: "Weekly" },
  custom:   { label: "Custom days",   short: "Custom" },
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  if (repeat === "custom") return (goal.repeatDays ?? []).includes(dow);
  return false;
}

export function useGoals() {
  const { user } = useAuth();
  const storageKey = getStorageKey("planner_goals", user?.id);
  const purgedKeyRef = useRef<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>(() => {
    const { kept } = purgeExpiredOverdue(loadGoals(storageKey));
    return kept;
  });

  useEffect(() => {
    const loaded = loadGoals(storageKey);
    const { kept, removed } = purgeExpiredOverdue(loaded);
    setGoals(kept);
    if (removed > 0) {
      saveGoals(storageKey, kept);
      if (purgedKeyRef.current !== storageKey) {
        purgedKeyRef.current = storageKey;
        toast.message(
          removed === 1
            ? "1 overdue goal was removed"
            : `${removed} overdue goals were removed`,
          { description: "Goals overdue for more than 3 days are cleaned up automatically." },
        );
      }
    } else {
      purgedKeyRef.current = storageKey;
    }
  }, [storageKey]);

  useEffect(() => { saveGoals(storageKey, goals); }, [goals, storageKey]);

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

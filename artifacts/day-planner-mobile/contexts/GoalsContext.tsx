import AsyncStorage from "@react-native-async-storage/async-storage";
import { format, getDay, isBefore, parseISO, startOfDay } from "date-fns";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

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

export const CATEGORY_META: Record<
  GoalCategory,
  { label: string; colorKey: "goalMustDo" | "goalShouldDo" | "goalNiceToHave" }
> = {
  "must-do": { label: "Must Do", colorKey: "goalMustDo" },
  "should-do": { label: "Should Do", colorKey: "goalShouldDo" },
  "nice-to-have": { label: "Nice to Have", colorKey: "goalNiceToHave" },
};

export const REPEAT_OPTIONS: { value: GoalRepeat; label: string }[] = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every week" },
  { value: "custom", label: "Custom days" },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TODAY = () => format(new Date(), "yyyy-MM-dd");

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

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

interface GoalsContextValue {
  goals: Goal[];
  addGoal: (
    goal: Omit<Goal, "id" | "completed" | "completedDates" | "lastNotifiedDate">
  ) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  toggleComplete: (id: string) => void;
  getTodayStats: () => { completed: number; total: number };
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `goals_${user.id}` : "goals_anon";
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((val) => {
      if (val) {
        try {
          setGoals(JSON.parse(val));
        } catch {}
      } else {
        setGoals([]);
      }
    });
  }, [storageKey]);

  useEffect(() => {
    AsyncStorage.setItem(storageKey, JSON.stringify(goals));
  }, [goals, storageKey]);

  const addGoal = useCallback(
    (
      goal: Omit<
        Goal,
        "id" | "completed" | "completedDates" | "lastNotifiedDate"
      >
    ) => {
      const newGoal: Goal = {
        ...goal,
        id: genId(),
        completed: false,
        completedDates: [],
      };
      setGoals((prev) => [...prev, newGoal]);
      return newGoal;
    },
    []
  );

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    const today = TODAY();
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const repeat = g.repeat ?? "none";
        if (repeat === "none") return { ...g, completed: !g.completed };
        const dates = g.completedDates ?? [];
        const alreadyDone = dates.includes(today);
        return {
          ...g,
          completedDates: alreadyDone
            ? dates.filter((d) => d !== today)
            : [...dates, today],
        };
      })
    );
  }, []);

  const getTodayStats = useCallback(() => {
    const todayGoals = goals.filter(
      (g) => g.repeat !== "none" ? isActiveToday(g) : format(parseISO(g.date), "yyyy-MM-dd") === TODAY()
    );
    const completed = todayGoals.filter(isCompletedToday).length;
    return { completed, total: todayGoals.length };
  }, [goals]);

  return (
    <GoalsContext.Provider
      value={{ goals, addGoal, updateGoal, deleteGoal, toggleComplete, getTodayStats }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
